const express = require("express");
const authMiddleware = require("../../Middleware/jwtMiddleware");
const { AsyncHandler } = require("../../Middleware/AsynHandler");
const SaveLaterModel = require("../../Model/SaveLaterModel");
const CartModel = require("../../Model/CartModel");
const productModel = require("../../Model/productModel");

const Router = express.Router();

Router.post(
  "/savelater/create",
  authMiddleware,
  AsyncHandler(async (req, res) => {
    const { productIds, reason } = req.body;
    const userId = req.user.id;

    if (!productIds || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No products provided",
      });
    }

    // 1️⃣ Add to SaveLater (upsert, no duplicates)
    await SaveLaterModel.updateOne(
      { userId },
      {
        $addToSet: {
          items: productIds.map((id) => ({
            productId: id,
            reason,
          })),
        },
      },
      { upsert: true },
    );

    // 2️⃣ Remove those items from cart
    await CartModel.updateOne(
      { userId },
      {
        $pull: {
          items: { productId: { $in: productIds } },
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Items saved for later and removed from cart",
    });
  }),
);
Router.get(
  "/savelater",
  authMiddleware,
  AsyncHandler(async (req, res) => {
    const userId = req.user.id;

    const saveLater = await SaveLaterModel.findOne({ userId }).populate(
      "items.productId",
      "productName productPrice productImage productStock",
    );

    return res.status(200).json({
      success: true,
      items: saveLater?.items || [],
    });
  }),
);

Router.post(
  "/savelater/move-to-cart",
  authMiddleware,
  AsyncHandler(async (req, res) => {
    const { productId, qty = 1 } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }

    // 1️⃣ Remove from SaveLater
    await SaveLaterModel.updateOne(
      { userId },
      {
        $pull: {
          items: { productId },
        },
      },
    );

    // 2️⃣ Add to Cart (no duplicates)
    await CartModel.updateOne(
      { userId, "items.productId": { $ne: productId } },
      {
        $push: {
          items: {
            productId,
            qty,
          },
        },
      },
      { upsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Moved item from Save Later to Cart",
    });
  }),
);

Router.post(
  "/cart/check-stock",
  authMiddleware,
  AsyncHandler(async (req, res) => {
    const userId = req.user.id;

    // 1️⃣ Get cart
    const cart = await CartModel.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        outOfStockItems: [],
      });
    }

    // 2️⃣ Get product IDs
    const productIds = cart.items.map((item) => item.productId);

    // 3️⃣ Fetch latest product stock
    const products = await productModel
      .find({
        _id: { $in: productIds },
      })
      .select("productName productStock productImage");

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // 4️⃣ Check stock
    const outOfStockItems = [];

    for (const item of cart.items) {
      const product = productMap.get(item.productId.toString());

      if (
        !product || // product deleted
        product.productStock === 0 || // no stock
        product.productStock < item.qty // insufficient stock
      ) {
        outOfStockItems.push({
          productId: item.productId,
          name: product?.productName || "Product unavailable",
          image: product?.productImage?.[0],
          availableStock: product?.productStock || 0,
          requestedQty: item.qty,
        });
      }
    }

    // 5️⃣ Response
    if (outOfStockItems.length > 0) {
      return res.status(200).json({
        success: false,
        message: "Some items are out of stock",
        outOfStockItems,
      });
    }

    return res.status(200).json({
      success: true,
      message: "All items are in stock",
      outOfStockItems: [],
    });
  }),
);

Router.delete(
  "/savelater/delete/:id",
  authMiddleware,
  AsyncHandler(async (req, res) => {
    const productId = req.params.id;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({ err: "Product not provided" });
    }

    const result = await SaveLaterModel.updateOne(
      { userId },
      {
        $pull: {
          items: { productId}
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        msg: "Item not found or already removed"
      });
    }

    res.status(200).json({
      success: true,
      msg: "Item removed from save later"
    });
  })
);


module.exports = Router;
