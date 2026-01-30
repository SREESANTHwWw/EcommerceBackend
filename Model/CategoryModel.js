const mongoose = require("mongoose")


const categorySchema = new mongoose.Schema({

    categoryName:{
        type:String,
        trim:true,
        uniqe:true,
        require:true,
    },
    categoryImage:{
        type:String,
        required:true
    },

    parentCategory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"category",
        default:null
    },
    description: String,
     isActive: {
      type: Boolean,
      default: true,
    },


},{timestamps:true})

module.exports = mongoose.model("category",categorySchema)