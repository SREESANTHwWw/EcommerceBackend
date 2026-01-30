const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
    trim: true,
    index:true
  },
  otp: {
    type: String,
    required: true,
    select:false
  },
  purpose:{
    type:String,
    enum:["REGISTER","RESET_PASSWORD"],
    required:true

  },
  expiresAt: {
    type: Date,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },

 
  sessionToken: {
    type: String,
  },
  sessionExpiry: {
    type: Date,
  },

  otpVerified: {
    type:Boolean,
    default:false
}
},{timestamps:true});

OtpSchema.index({ email: 1, purpose: 1 }, { unique: true });

OtpSchema.index({ expiresAt: 1 },{ expireAfterSeconds: 0 })

module.exports = mongoose.model("OTP",OtpSchema)