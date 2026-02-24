const express = require("express");
const router = express.Router();
const productModel = require("../../Model/productModel");
const razorpay = require("../../config/RazorPay");
const authMiddleware = require("../../Middleware/jwtMiddleware");
const OrderSchema = require("../../Model/OrderSchema");
const crypto = require("crypto");
const adminMiddleware = require("../../Middleware/AdminMiddleware");
const { getIO } = require("../../config/InitSocket");
const { AsyncHandler } = require("../../Middleware/AsynHandler");
const mongoose = require("mongoose")

router.post("/order/create", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      items,
      address,
      paymentMethod,
      deliveryFee = 0,
      discount = 0,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items found" });
    }
    // console.log(items)

    const productIds = items.map((item) => item.productId._id);

    const products = await productModel.find({ _id: { $in: productIds } });

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    //  console.log(productMap);

    let subtotal = 0;

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId._id);

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.productStock < item.qty) {
        throw new Error(`${product.productName} is out of stock`);
      }

      const price = product.productPrice;
      const total = price * item.qty;

      subtotal += total;

      return {
        productId: product._id,
        image: product.productImage[0],
        name: product.productName,
        qty: item.qty,
        stock: Number(product.productStock),
        price,
        total,
      };
    });

    // console.log(subtotal)

    const totalAmount = subtotal - discount + deliveryFee;

    // 2️⃣ Create Razorpay Order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // INR paise
      currency: "INR",
      receipt: `order_rcpt_${Date.now()}`,
    });

    // 3️⃣ Save Order in DB
    const order = await OrderSchema.create({
      userId,
      items: orderItems,
      address,
      payment: {
        method: paymentMethod,
        status: "PENDING",
        gatewayOrderId: razorpayOrder.id,
      },
      subtotal,
      discount,
      deliveryFee,
      totalAmount,
      orderStatus: "PLACED",
    });

    const io = getIO();
    io.to("admins").emit("new-order", {
      type: "ORDER",
      message: "New order received",
      orderId: order._id,
      totalAmount: order.totalAmount,
    });

    // 4️⃣ Send to frontend
    res.status(201).json({
      success: true,
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Order creation failed" });
  }
});




router.post("/order/verify-payment", authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Payment details missing" });
    }

    // 1️⃣ Generate HMAC to verify signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // 2️⃣ Find the order
    const order = await OrderSchema.findOne({
      "payment.gatewayOrderId": razorpay_order_id,
    }).populate("items.productId"); // populate product details

    if (!order) return res.status(404).json({ message: "Order not found" });

    // 3️⃣ Check stock for each item
    for (const item of order.items) {
      const product = item.productId;
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      if (Number(product.stock) < item.qty) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for product ${product.name}` });
      }
    }

    // 4️⃣ Reduce stock
    for (const item of order.items) {
      const product = item.productId;

      product.productStock -= item.qty;
      await product.save();
    }

    // 5️⃣ Update order payment status
    order.payment.status = "SUCCESS";
    order.payment.transactionId = razorpay_payment_id;
    order.payment.paidAt = new Date();
    order.orderStatus = "PROCESSING"; // ready for fulfillment
    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment verified and stock updated",
      orderId: order._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

router.get(
  "/order/getAll",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const { search, date, status, priceRange, paymentStatus, paymentMethod } =
        req.query;

      const filter = {};

      if (search) {
        filter.$or = [
          { "items.name": { $regex: search, $options: "i" } },
          { "address.pincode": { $regex: search, $options: "i" } },
          { "userId.email": { $regex: search, $options: "i" } },
        ];
      }

      // Filter by order status
      if (status) {
        filter.orderStatus = status;
      }

      if (paymentStatus) {
        filter["payment.status"] = paymentStatus;
      }
      if (paymentMethod) {
        filter["payment.method"] = paymentMethod;
      }

      // Filter by date range (expects "startDate,endDate" format)
      if (date) {
        const [start, end] = date.split(",");
        filter.createdAt = {};
        if (start) filter.createdAt.$gte = new Date(start);
        if (end) filter.createdAt.$lte = new Date(end);
      }

      // Filter by price range (expects "min,max" format)
      if (priceRange) {
        const [min, max] = priceRange.split(",").map(Number);
        filter.totalAmount = {};
        if (!isNaN(min)) filter.totalAmount.$gte = min;
        if (!isNaN(max)) filter.totalAmount.$lte = max;
      }

      // 2️⃣ Fetch paginated orders with filters
      const orders = await OrderSchema.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "firstname lastname email status lastActive role");

      // 3️⃣ Count total orders with filters
      const totalOrders = await OrderSchema.countDocuments(filter);

      // 4️⃣ Aggregate for order status counts (with filters)
      const statusCountsAgg = await OrderSchema.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
          },
        },
      ]);

      const statusCounts = {};
      statusCountsAgg.forEach((item) => {
        statusCounts[item._id] = item.count;
      });

      // 5️⃣ Handle empty orders
      if (!orders || orders.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          statusCounts,
        });
      }

      // 6️⃣ Send response
      res.status(200).json({
        success: true,
        totalOrders,
        page,
        limit,
        totalPages: Math.ceil(totalOrders / limit),
        statusCounts,
        orders,
      });
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
);

router.patch(
  "/order/update/status/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const { orderStatus } = req.body;

      if (!orderId || !orderStatus) {
        return res.status(400).json({ msg: "Order ID and status are required" });
      }

      const allowedStatus = [
        "PLACED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      
      ];

      if (!allowedStatus.includes(orderStatus)) {
        return res.status(400).json({ msg: "Invalid order status" });
      }

      const order = await OrderSchema.findById(orderId);
      if (!order) {
        return res.status(404).json({ msg: "Order not found" });
      }

      const validTransitions = {
       
        PLACED: ["SHIPPED", "CANCELLED"],
         PROCESSING:["SHIPPED","CANCELLED","OUT_FOR_DELIVERY","DELIVERED"],
        SHIPPED: ["OUT_FOR_DELIVERY",],
        OUT_FOR_DELIVERY: ["DELIVERED",],
        DELIVERED: [],
        CANCELLED: [],
        RETURNED: [],
      };

      if (!validTransitions[order.orderStatus]?.includes(orderStatus)) {
        return res.status(400).json({
          msg: `Cannot change status from ${order.orderStatus} to ${orderStatus}`,
        });
      }

      // ✅ Payment logic (COD-safe)
      if (
        order.payment.method === "ONLINE" &&
        orderStatus === "DELIVERED" &&
        order.payment.status !== "SUCCESS"
      ) {
        return res
          .status(400)
          .json({ msg: "Online payment not completed" });
      }

      order.orderStatus = orderStatus;
 

      await order.save();

      res.status(200).json({
        msg: "Order status updated successfully",
        order,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ msg: "Internal Server Error" });
    }
  }
);

router.get(
  "/order/get/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          msg: "Invalid order ID",
        });
      }

      const order = await OrderSchema.findById(id)
        .populate("userId", "firstname email")
        .populate("items.productId", "name price");

      if (!order) {
        return res.status(404).json({
          success: false,
          msg: "Order not found",
        });
      }

      return res.status(200).json({
        success: true,
        msg: "Order fetched successfully",
        order,
      });
    } catch (error) {
      console.error("Get Order Error:", error);
      return res.status(500).json({
        success: false,
        msg: "Internal server error",
      });
    }
  }
);


module.exports = router;

//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//     if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//       return res.status(400).json({ message: "Payment details missing" });
//     }

//     // 1️⃣ Generate HMAC to verify signature
//     const generated_signature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest("hex");

//     if (generated_signature !== razorpay_signature) {
//       return res.status(400).json({ message: "Invalid payment signature" });
//     }

//     // 2️⃣ Find the order
//     const order = await OrderSchema.findOne({
//       "payment.gatewayOrderId": razorpay_order_id,
//     }).populate("items.productId"); // populate product details

//     if (!order) return res.status(404).json({ message: "Order not found" });

//     // 3️⃣ Check stock for each item
//     for (const item of order.items) {
//       const product = item.productId;
//       if (!product) return res.status(404).json({ message: "Product not found" });

//       if (Number(product.productStock) < item.qty) {
//         return res
//           .status(400)
//           .json({ message: `Insufficient stock for product ${product.name}` });
//       }
//     }

//     // 4️⃣ Reduce stock
//     for (const item of order.items) {
//       const product = item.productId;
//       product.productStock -= item.qty;
//       await product.save();
//     }

//     // 5️⃣ Update order payment status
//     order.payment.status = "SUCCESS";
//     order.payment.transactionId = razorpay_payment_id;
//     order.payment.paidAt = new Date();
//     order.orderStatus = "PROCESSING"; // ready for fulfillment
//     await order.save();

//     res.status(200).json({
//       success: true,
//       message: "Payment verified and stock updated",
//       orderId: order._id,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Payment verification failed" });
//   }
// });
