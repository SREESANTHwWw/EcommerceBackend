const rateLimit = require("express-rate-limit");

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // OTP typing + retries
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    err: "Too many requests. Please wait and try again.",
    blocked: true
  }
});

module.exports = otpVerifyLimiter;
