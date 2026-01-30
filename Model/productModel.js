const monogoose = require("mongoose");

const productSchema = new monogoose.Schema({

  productName: {
    type: String,
    required: true,
    trim: true,
  },
  productImage: {
    type: [String],
    required: true,
    trim: true,
  },
  productPrice: {
    type: Number,
    required: true,
  },

  productCategory: {
    type: String,
   
    trim: true,
  },
  productStock: {
    type: Number,
    required: true,
    default: 0,
  },

  productDescription: {
    type: String,
    required: true,
    trim: true,
  },
  productdiscount: {
    type: Number,
  },
  productOfferPrice: {
    type: Number,
  },
  productQuantity: {
    type: Number,
    default: 0,
  },
  productUnit: {
    type: String,
    required: true,
    trim: true,
  },
  productOrderNumber: {
    type: Number,
  },
  productStatus: {
    type: String,
    trim: true,
  },

  averageRating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },


  createdAt: {
    type: Date,
    default: Date.now,
  },
});


productSchema.index({
  productName:"text",
  productDescription:"text"
})

module.exports = monogoose.model("Product", productSchema);
