 const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const LoginUserSchema = new mongoose.Schema({
  firstname: {
    type: String,
    // required: true,
    trim: true,
    minlength: 3,
  },
  
   phonenumber:{
        type:String,
        trim:true
   },

   username: {
    type: String,
    unique: true,
    index: true,
    // required: true,
  },

   role: {
    type: String,
    enum: ["user", "admin", "super_admin"],
    default: "user"
  },

  lastname: {
    type: String,
    trim: true,
    // required: function () {
    //   return this.provider === "local";
    // },
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: function () {
      return this.provider === "local";
    },
    select: false,
  },

  provider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  terms: {
    type: Boolean,
    default: false,
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  registerToken: {
    type: String,
  },
   resetToken: String,
  resetTokenExpiry: Date,
});




// Hash password before saving
LoginUserSchema.pre("save", async function (next) {
  if (!this.password) return next();

  
  if (this.password.startsWith("$2b$")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare entered password with hashed one
LoginUserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

LoginUserSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id, email: this.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "90d",
  });
};

module.exports = mongoose.model("User", LoginUserSchema);
