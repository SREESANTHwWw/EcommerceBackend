

const mongoose = require("mongoose")

const SaveLaterSchema = new mongoose.Schema({
       
       userId :{
         type:mongoose.Schema.Types.ObjectId,
          ref:"User",
          required:true,
          unique:true
       },

       items:[
          {
             productId:{
                
                type:mongoose.Schema.Types.ObjectId,
                 ref:"Product",
                 required:true
            },
            addAt:{
                 type:Date,
                 default:Date.now
            },
            reason:{
                 type:String,
                 enum:["OUT_OF_STCOK ","USER_ADDED"],
                 default:"USER_ADDED"
            }
             
          }
       ]
})
SaveLaterSchema.index(
  { userId: 1, "items.productId": 1 },
  { unique: true }
);


module.exports = mongoose.model("SaveForLater", SaveLaterSchema)