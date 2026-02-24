// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const userLoginModel = require("../Model/userLoginModel");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

 
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ failed:true, err: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded; 
      userLoginModel.findByIdAndUpdate(decoded.id, {
      lastActive: new Date(),
    }).exec();
    next();
  } catch (err) {
    return res.status(401).json({ failed:true, err: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
