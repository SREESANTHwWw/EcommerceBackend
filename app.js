
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./DB/ConnectDB");
const loginRoute  = require("./Controller/Login/loginController");
const productRoute = require("./Controller/ProductController/ProductController");
const category = require("./Controller/CategoryControllter/CategoryController")
const cartRoute =require("./Controller/CartController/CartController")
const AddressAPI = require("./Controller/AddressController/AddressController")
const CheckOutRoute = require("./Controller/OrderController/OrderController")
const UsersRoute = require("./Controller/UserController/UserController")
const Health =require("./Controller/HealthController/Health")
//  const messageRoute = require("./Controller/ChatMessageController/MessageController");
const cookieParser = require("cookie-parser");
const path = require("path");
// const SqlDbconnect = require("./DB/SqlDb");

dotenv.config();
const express = require("express");
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(cors());


// routes
app.use((req, res, next) => {
  res.setHeader("X-Server-Port", process.env.PORT);
  next();
});
app.use("/check", (req, res) => {
  res.send("Server is running");
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/v1",Health)
app.use("/api/v1/", loginRoute);
app.use("/api/v1/", productRoute);
app.use("/api/v1/",category);
app.use("/api/v1/",cartRoute );
app.use("/api/v1/",AddressAPI)
app.use("/api/v1/",CheckOutRoute)
app.use("/api/v1/",UsersRoute)





// start server
const start = async () => {
 
  try {
    await connectDB();
  
    app.listen(process.env.PORT ,() => {
      console.log(`🚀 Server running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};

start();
