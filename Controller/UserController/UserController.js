const express = require("express");
const userLoginModel = require("../../Model/userLoginModel");
const authMiddleware = require("../../Middleware/jwtMiddleware");
const mongoose = require("mongoose")
const Router = express.Router();


Router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await userLoginModel.find().select("-password");

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
});


Router.get("/users/me", authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const result = await userLoginModel.aggregate([
      { $match: { _id: userId } },

      {
        $lookup: {
          from: "addresses",
          localField: "_id",
          foreignField: "userID",
          as: "addresses",
        },
      },
     
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "userId",
          as: "orders",
        },
      },
      {
        $project: {
          password: 0,
        },
      },
    ]);

    if (!result.length) {
      return res.status(404).json({ success: false });
    }

    res.status(200).json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});


Router.get("/users/:id", authMiddleware, async (req, res) => {
  try {
    const user = await userLoginModel
      .findById(req.params.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching user",
    });
  }
});

Router.patch("/users/edit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { firstname, lastname, username,phonenumber } = req.body;

    const updateData = {};

    if (firstname) updateData.firstname = firstname;
    if (lastname) updateData.lastname = lastname;
    if (username) updateData.username = username;
      if (phonenumber) updateData.phonenumber = phonenumber;
  
    if (req.body.email || req.body.password) {
      return res.status(400).json({
        success: false,
        message: "Email and password cannot be updated here",
      });
    }

    const updatedUser = await userLoginModel
      .findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update User Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


module.exports = Router;
