// middlewares/rateLimiter.js
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10, // limit each IP to 5 login requests
  message: { error: "Too many login attempts. Try again later." },
});



module.exports = loginLimiter;
