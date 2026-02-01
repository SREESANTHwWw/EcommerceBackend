const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

 
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      name: { type: String, required: true },           
      qty: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },          
      total: { type: Number, required: true },          
                            
    },
  ],

  
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: "India" },
    pincode: { type: String, required: true },
    // phone: { type: String, required: true },
  },

 
  payment: {
    method: {
      type: String,
      enum: ["COD", "CARD", "UPI", "WALLET","RAZORPAY"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    transactionId: { type: String },      
    gatewayOrderId: { type: String },     
    paidAt: { type: Date },
  },


  subtotal: { type: Number, required: true },       
  discount: { type: Number, default: 0 },           
  deliveryFee: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },   


  orderStatus: {
    type: String,
    enum: ["PLACED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"],
    default: "PLACED",
  },
  tracking: [
    {
      status: { type: String },
      timestamp: { type: Date, default: Date.now },
      comment: { type: String },
    },
  ],

//   // Optional fields
//   coupon: { type: String },                 // Applied coupon code
//   notes: { type: String },                  // Customer notes
//   isGift: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
