
const express = require("express");
const router = express.Router();
const productModel = require("../../Model/productModel");
const razorpay = require("../../config/RazorPay");
const authMiddleware = require("../../Middleware/jwtMiddleware");
const OrderSchema = require("../../Model/OrderSchema");
const crypto = require("crypto");


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

const productIds = items.map(item => item.productId._id);


const products = await productModel.find({ _id: { $in: productIds } });


const productMap = new Map(
  products.map(p => [p._id.toString(), p])
);


let subtotal = 0;

const orderItems = items.map(item => {
  const product = productMap.get(item.productId._id);

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.productStock < item.qty) {
    throw new Error(`${product.productName} is out of stock`);
  }

  const price =  product.productPrice;
  const total = price * item.qty;

  subtotal += total;

  return {
    productId: product._id,
    name: product.productName,
    qty: item.qty,
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

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
    const order = await OrderSchema.findOne({ "payment.gatewayOrderId": razorpay_order_id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // 3️⃣ Update order payment status
    order.payment.status = "SUCCESS";
    order.payment.transactionId = razorpay_payment_id;
    order.payment.paidAt = new Date();
    order.orderStatus = "PROCESSING"; // or keep as PLACED until fulfillment
    await order.save();

    res.status(200).json({ success: true, message: "Payment verified", orderId: order._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payment verification failed" });
  }
});
module.exports = router;
