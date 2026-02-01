
const express = require("express")
const CartModel = require("../../Model/CartModel");
const authMiddleware = require("../../Middleware/jwtMiddleware");
const productModel = require("../../Model/productModel");

const router = express.Router()



router.post("/cart/add", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    let { productId, qty } = req.body;

    if (!userId) return res.status(401).json({ err: "Unauthorized" });

    qty = Number(qty);
    if (!productId || !qty || qty < 1) {
      return res.status(400).json({ err: "Invalid input" });
    }

    const product = await productModel.findById(productId);
    if (!product) return res.status(404).json({ err: "Product not found" });
    if (product.productStock < qty) return res.status(400).json({ err: "Insufficient stock" });

    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      cart = await CartModel.create({
        userId,
        items: [{ productId, qty }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (i) => i.productId.toString() === productId
      );

      if (itemIndex > -1) {
        const newQty = cart.items[itemIndex].qty + qty;
        if (newQty > product.productStock) {
          return res.status(400).json({ err: "Stock limit exceeded" });
        }
        cart.items[itemIndex].qty = newQty;
      } else {
        cart.items.push({ productId, qty });
      }
      await cart.save();
    }

  
    await cart.populate("items.productId");

    res.status(200).json({
      success: true,
      msg: "Cart updated successfully",
      cart,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ err: "Server error" });
  }
});


router.get("/getAllcart", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await CartModel.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res.status(200).json({ success: true, cart: { items: [] } });
    }
    res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ err: "Server error" });
  }
});

router.delete("/cart/delete/:id", authMiddleware, async (req, res) => {
  try {
    const productId = req.params.id;

    // Pull the product from the items array
    const updatedCart = await CartModel.findOneAndUpdate(
      { "items.productId": productId }, // find cart containing the product
      { $pull: { items: { productId: productId } } }, // remove the item
      { new: true } // return the updated cart
    ).populate("items.productId");

    if (!updatedCart) {
      return res.status(404).json({ error: "Product not found in cart" });
    }

    res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});



router.patch("/cart/update/qty/:id", authMiddleware, async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id;
    const { qty } = req.body;

    if (typeof qty !== "number" || qty < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    
    const product = await productModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (qty > product.productStock) {
      return res.status(400).json({ message: "Stock limit exceeded" });
    }

    const cart = await CartModel.findOneAndUpdate(
      { userId, "items.productId": productId },
      { $set: { "items.$.qty": qty } },
      { new: true, runValidators: true }
    ).populate("items.productId");

    if (!cart) return res.status(404).json({ message: "Item not found in cart" });

    res.status(200).json({ cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});




module.exports = router;