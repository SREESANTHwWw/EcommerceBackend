
const express = require("express")
const CartModel = require("../../Model/CartModel");
const authMiddleware = require("../../Middleware/jwtMiddleware");
const productModel = require("../../Model/productModel");

const router = express.Router()



router.post("/cart/add", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; 
    const { productId, qty } = req.body;

    if(!userId){

        return res.status(401).json({   err: "Unauthorized" });

    }

  
    if (!productId || !qty || qty < 1) {
      return res.status(400).json({ err: "Invalid input" });
    }

    
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ err: "Product not found" });
    }

    if (product.productStock < qty) {
      return res.status(400).json({ err: "Insufficient stock" });
    }

    let cart = await CartModel.findOne({ userId });

   
    if (!cart) {
      cart = await CartModel.create({
        userId,
        items: [{ productId, qty }],
      });
    } 
  
    else {
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


module.exports = router;