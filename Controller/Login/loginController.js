const crypto = require("crypto");
const UserModel = require("../../Model/userLoginModel");
const { sendToken, resetSession } = require("../../Utils/JwtToken");
const loginLimiter = require("../../Middleware/LoginLimitMiddleware");
const authMiddleware = require("../../Middleware/jwtMiddleware");
const { otpMail, RegisterMail } = require("../../Utils/Mails");
const bcrypt = require("bcrypt");
const express = require("express");
const pool = require("../../DB/SqlDb");
const router = express.Router();
const jwt = require("jsonwebtoken");
const userLoginModel = require("../../Model/userLoginModel");
const OtpModel = require("../../Model/OtpModel");
const { generateUsername } = require("../../Utils/UserNameGen");
const otpVerifyLimiter = require("../../Middleware/otpVerifyLimiter");




router.post("/admin/create", async (req,res)=>{
  try {

    const {email ,password} = req.body

    const admin = await userLoginModel.create({
      email,password,role:"admin"
    })

    res.status(200).json({msg:"admin created"},admin)
    
  } catch (error) {
    console.log(error)
    
  }
})

router.post("/auth/send-otp", async (req, res) => {
  try {
    const { email, } = req.body;

    if (!email) {
      return res.status(400).json({ err: "Email is required" });
    }

    const user = await userLoginModel.findOne({ email });

    if (user) {
      return res.status(400).json({ err: "User already exists" });
    }

    await OtpModel.deleteOne({ email, purpose: "REGISTER" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashOtp = await bcrypt.hash(otp, 10);

    const registerToken = jwt.sign(
      { email, purpose: "REGISTER" },
      process.env.JWT_SECRET,

      { expiresIn: "5m" }
    );

    await OtpModel.create({
      email,
      otp: hashOtp,
      purpose: "REGISTER",
      expiresAt: Date.now() + 5 * 60 * 1000,
      registerToken,
    });

    await otpMail(email, otp, "Register OTP");

    return res.status(200).json({
      msg: "OTP sent successfully",
      registerToken,
    });
  } catch (error) {
    console.error("OTP Error:", error);
    return res.status(500).json({ err: "Something went wrong" });
  }
});

router.post("/auth/verify-otp", otpVerifyLimiter, async (req, res) => {
  try {
    const { email, otp, registerToken } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ err: "Email and OTP are required" });
    }

    if (!registerToken) {
      return res.status(400).json({ err: "Register Token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(registerToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        await OtpModel.deleteOne({ email, purpose: "REGISTER" });
        return res.status(401).json({
          err: "OTP Page expired. Verify OTP again.",
          expiredPage:true
        });
      }
    }

    // Fetch OTP record
    const otpDoc = await OtpModel.findOne({
      email,
      purpose: "REGISTER",
    }).select("+otp");

    if (!otpDoc) {
      return res.status(401).json({ err: "OTP expired or invalid" });
    }

    if (otpDoc.expiresAt < Date.now()) {
      await OtpModel.deleteOne({ email, purpose: "REGISTER" });
      return res.status(401).json({ err: "OTP expired" });
    }

    if (otpDoc.attempts >= 7) {
      await OtpModel.deleteOne({ email, purpose: "REGISTER" });
      return res.status(429).json({ err: "Too many attempts" });
    }

    const isValid = await bcrypt.compare(otp, otpDoc.otp);

    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ err: "Invalid OTP" });
    }

    const RegisterToken = jwt.sign(
      { email, purpose: "REGISTER" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    otpDoc.otpVerified = true;
    await otpDoc.save();

    return res.status(200).json({
      success: true,
      msg: "OTP verified successfully",
      RegisterToken,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ err: "Something went wrong" });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const { firstname, lastname, email, password, terms, registerToken } =
      req.body;

    const otpDoc = await OtpModel.findOne({
      email,
      purpose: "REGISTER",
      otpVerified: true,
    });

    if (!otpDoc) {
      return res.status(403).json({ err: "OTP not verified" });
    }

    if (!registerToken) {
      return res.status(401).json({ err: "Register token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(registerToken, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        await OtpModel.deleteOne({ email, purpose: "REGISTER" });
        return res.status(401).json({
          err: "Register session expired. Verify OTP again.",
        });
      }
      return res.status(401).json({ err: "Invalid register token" });
    }

    if (decoded.purpose !== "REGISTER") {
      return res.status(403).json({ err: "Invalid register token" });
    }

    const emailFromToken = decoded.email;

    const existUser = await userLoginModel.findOne({ email: emailFromToken });

    if (existUser) {
      return res.status(400).json({ err: "Email already exists" });
    }

    if (!firstname || !lastname || !email || !password || !terms) {
      return res.status(400).json({ err: "All fields are required" });
    }
   const username = await generateUsername(firstname, lastname);

    const hashedPassword = await bcrypt.hash(password, 10);

    await userLoginModel.create({
      email: emailFromToken,
      password: hashedPassword,
      firstname,
      lastname,
      terms,
      username,
      isVerified: true,
    });

    await OtpModel.deleteOne({
      email,
      purpose: "REGISTER",
    });

    await RegisterMail(emailFromToken, firstname);

    res.json({ msg: "Account created successfully", success: true });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/auth/googleAuth", async (req, res) => {
  try {
    const { firstname, email, terms } = req.body;

    if (!firstname || !email ) {
      return res.status(400).json({ err: "Email and firstname are required" });
    }

    if (!terms) {
      return res.status(400).json({ err: "Terms must be accepted" });
    }

     const username = await generateUsername(firstname);
    let user = await userLoginModel.findOne({ email });

    if (!user) {
      user = await userLoginModel.create({
        firstname,
        email,
        username,
        provider: "google",
        terms: true,
        isVerified: true,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      msg: "Google authentication success",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstname: user.firstname,
        
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userLoginModel.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ err: "Invalid email or password" });
    }

    if (user.provider === "google") {
      return res.status(400).json({
        err: "This account uses Google login",
      });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ err: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id,role:user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      msg: "Login successful",
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstname: user.firstname,
        role:user.role
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/forgot-password/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ err: "Email is required" });
    }
    const user = await userLoginModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ err: "No account found with this email" });
    }

    await OtpModel.deleteOne({ email, purpose: "RESET_PASSWORD" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashOtp = await bcrypt.hash(otp, 10);
    await OtpModel.create({
      email,
      otp: hashOtp,
      purpose: "RESET_PASSWORD",
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    await otpMail(email, otp, "Password Reset OTP");

    return res.status(200).json({
      msg: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Error sending forgot-password OTP:", error);
    return res.status(500).json({ err: "Internal server error" });
  }
});

router.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ err: "Email and OTP are required" });
    }

    const user = await userLoginModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ err: "No account found with this email" });
    }

    const otpDoc = await OtpModel.findOne({
      email,
      purpose: "RESET_PASSWORD",
    }).select("+otp");

    if (!otpDoc) {
      return res.status(404).json({ err: "OTP not found" });
    }

    if (otpDoc.expiresAt < Date.now()) {
      await OtpModel.deleteOne({ email, purpose: "RESET_PASSWORD" });
      return res.status(401).json({ err: "OTP expired" });
    }

    if (otpDoc.attempts >= 7) {
      await OtpModel.deleteOne({ email, purpose: "RESET_PASSWORD" });
      return res.status(429).json({ err: "Too many attempts" });
    }

    const isValid = await bcrypt.compare(otp, otpDoc.otp);
    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ err: "Invalid OTP" });
    }

    // ✅ Delete OTP
    await OtpModel.deleteOne({ email, purpose: "RESET_PASSWORD" });

    // ✅ Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    res.status(200).json({
      success: true,
      resetToken,
      msg: "OTP verified successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email, password, resetToken } = req.body;

    if (!email || !password || !resetToken) {
      return res.status(400).json({ err: "Missing required fields" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ err: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await userLoginModel.findOne({
      email,
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ err: "Invalid or expired token" });
    }

    // ✅ Assign plain password
    user.password = password;

    // ✅ Clear token
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save(); // pre-save hook hashes password

    res.status(200).json({
      success: true,
      msg: "Password reset successful",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ err: "Internal server error" });
  }
});

router.patch("/update/user/:id", async(req,res)=>{
  try {
     const  userID = req.params.id
      const {firstname,lastname, email,} =req.body
     const Updateuser = await userLoginModel.findOne({userID})
        Updateuser.lastname= req.body
         await Updateuser.save
     if(!Updateuser){
      return res.status(401).json({err:"user not found"})
     }
     res.status(200).json({success:true,Updateuser})
    
  } catch (error) {
     console.log(error);
     
    
  }
})

module.exports = router;
