const express = require("express");
const authMiddleware = require("../../Middleware/jwtMiddleware");
const AddressModel = require("../../Model/AddressModel");
const mongoose = require("mongoose")
const Router = express.Router();

Router.post("/address/add", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { street, city, state, pincode, country, isDefault } = req.body;
    if (!street || !city || !state || !pincode) {
      return res.status(400).json({ err: "All fields are required" });
    }

    const newAddress = {
      street,
      city,
      state,
      pincode,
      country: country || "india",
      isDefault: false,
    };

    let addressDoc = await AddressModel.findOne({ userID: userId });
    if (!addressDoc) {
      addressDoc = await AddressModel.create({
        userID: userId,
        addresses: [{ ...newAddress, isDefault: true }],
      });

      return res.status(201).json({
        success: true,
        message: "Address added successfully",
        address: addressDoc,
      });
    }

    if (isDefault) {
      addressDoc.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
      newAddress.isDefault = true;
    }

    const hasDefault = addressDoc.addresses.some((a) => a.isDefault);
    if (!hasDefault) {
      newAddress.isDefault = true;
    }

    addressDoc.addresses.push(newAddress);
    await addressDoc.save();
    res.status(200).json({
      message: "Address added successfully",
      address: addressDoc,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
Router.get("/address/all", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const addressDoc = await AddressModel.findOne({ userID: userId });

    if (!addressDoc || addressDoc.addresses.length === 0) {
      return res.status(404).json({
        message: "No addresses found",
        addresses: [],
      });
    }

    res.status(200).json({
      success: true,
      addresses: addressDoc.addresses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

Router.get("/address/default", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const addressDoc = await AddressModel.findOne(
      { userID: userId, "addresses.isDefault": true },
      { "addresses.$": 1 },
    );

    if (!addressDoc) {
      return res.status(404).json({ message: "Default address not found" });
    }

    res.status(200).json({
      success: true,
      address: addressDoc.addresses[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

Router.patch("/address/update/:id", authMiddleware, async (req, res) => {
  try {
    const userID = req.user.id;
    const addressId = req.params.id;

    const { street, city, state, pincode, country, isDefault } = req.body;

  
    if (isDefault) {
      await AddressModel.updateMany({ userID }, { $set: {"addresses.$[].isDefault": false} });
    }

    const updatedAddress = await AddressModel.findOneAndUpdate(
      { userID, "addresses._id": addressId },
      {
        $set: {
          "addresses.$.street": street,
          "addresses.$.city": city,
          "addresses.$.state": state,
          "addresses.$.pincode": pincode,
          "addresses.$.country": country || "India",
          "addresses.$.isDefault": !!isDefault,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    console.error("Update Address Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Router.get("/address/:id", authMiddleware, async (req, res) => {
//   try {
//     const userID = req.user.id;
//     const addressId = req.params.id;

//     const addressDoc = await AddressModel.findOne(
//       { userID, "addresses._id": addressId },
//       { "addresses.$": 1 }
//     );

//     if (!addressDoc || !addressDoc.addresses.length) {
//       return res.status(404).json({
//         success: false,
//         message: "Address not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       address: addressDoc.addresses[0],
//     });
//   } catch (error) {
//     console.error("Get Address By ID Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// });


Router.get("/address/user", authMiddleware, async (req, res) => {
  try {
    const userID = new mongoose.Types.ObjectId(req.user.id);

    const addressDoc = await AddressModel.findOne({ userID });

    if (!addressDoc || addressDoc.addresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No addresses found",
        addresses: [],
      });
    }

    res.status(200).json({
      success: true,
      addresses: addressDoc.addresses,
    });
  } catch (error) {
    console.error("Get Address By User Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

Router.delete("/address/delete/:id", authMiddleware, async (req, res) => {
  try {
    const userID = req.user.id;
    const addressId = req.params.id;

    // Remove the address
    const result = await AddressModel.findOneAndUpdate(
      { userID },
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // 🔥 Ensure one default address always exists
    if (
      result.addresses.length > 0 &&
      !result.addresses.some((a) => a.isDefault)
    ) {
      result.addresses[0].isDefault = true;
      await result.save();
    }

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      addresses: result.addresses,
    });
  } catch (error) {
    console.error("Delete Address Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});



module.exports = Router;
