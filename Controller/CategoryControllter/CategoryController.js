const express = require("express");
const CategoryModel = require("../../Model/CategoryModel");
const { upload, saveAsWebP } = require("../../Utils/Multer");
const { AsyncHandler } = require("../../Middleware/AsynHandler");

const Router = express.Router();

Router.post(
  "/category/add",
  upload.single("categoryImage"),
  async (req, res) => {
    try {
      const { categoryName, parentCategory, description, isActive } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      if (!categoryName) {
        return res.status(400).json({ err: "Category name is required" });
      }

      if (parentCategory) {
        const existCategory = await CategoryModel.findById(parentCategory);

        if (!existCategory) {
          return res.status(400).json({ err: "Parent category not found" });
        }
      }
      const webpFileName = await saveAsWebP(
        req.file.buffer,
        req.file.originalname,
      );

      const categoryImage = `${req.protocol}://${req.get(
        "host",
      )}/uploads/${webpFileName}`;

      const categories = await CategoryModel.create({
        categoryName,
        parentCategory,
        description,
        isActive,
        categoryImage,
      });

      res.status(201).json({
        msg: "category Created successfull",
        data: categories,
        success: true,
      });
    } catch (error) {
      console.log(error);

      return res.status(500).json({ err: "Something went wrong" });
    }
  },
);

Router.get("/category/getAll", async (req, res) => {
  try {
    const categories = await CategoryModel.find({}).populate(
      "parentCategory",
      "categoryName",
    );

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
});

Router.delete(
  "/category/delete/:id",
  AsyncHandler(async (req, res) => {
    const CategoryId = req.params.id;

    const DeleteCatgory = await CategoryModel.findByIdAndDelete(CategoryId);
    if (!DeleteCatgory) {
      return res.status(400).json({ err: "Category Not Found" });
    }
    res
      .status(200)
      .json({ msg: "Category deleted successfully", success: true });
  }),
);

module.exports = Router;
