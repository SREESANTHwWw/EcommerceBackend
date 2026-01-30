const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`✅ Mongo Database Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ Database connection failed", err);
    process.exit(1);
  }
};

module.exports =  connectDB;

