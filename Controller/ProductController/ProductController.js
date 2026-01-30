const expres = require("express");
const productModel = require("../../Model/productModel");
const { upload, saveAsWebP } = require("../../Utils/Multer");
const router = expres.Router();

router.post(
  "/product/add",
  upload.array("productImage", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const {
        productName,
        productPrice,
        productOfferPrice,
        productCategory,
        productStock,
        productDescription,
        productdiscount,
        productQuantity,
        productUnit,
        productStatus,
      } = req.body;

      // ✅ Convert all images to WebP
      const productImage = await Promise.all(
        req.files.map(async (file) => {
          const webpFileName = await saveAsWebP(file.buffer, file.originalname);

          return `${req.protocol}://${req.get("host")}/uploads/${webpFileName}`;
        }),
      );

      // ✅ Auto product order
      const last = await productModel
        .findOne()
        .sort({ productOrderNumber: -1 });
      const lastOrder = last ? last.productOrderNumber : 0;

      const product = new productModel({
        productName,
        productPrice,
        productOfferPrice,
        productCategory,
        productStock,
        productImage, 
        productDescription,
        productdiscount,
        productQuantity,
        productUnit,
        productOrderNumber: lastOrder + 1,
        productStatus,
      });

      await product.save();

      res.status(201).json({
        success: true,
        message: "Product added successfully",
        product,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
);

router.post("/product/ordering", async (req, res) => {
  try {
    const updates = req.body.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { productOrder: item.productOrder } },
      },
    }));

    await productModel.bulkWrite(updates);

    res.status(200).json({
      message: "Product order updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error updating product order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/product/get", async (req, res) => {
  try {
    const products = await productModel.find();
    res.status(200).json({ products, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.get("/product/get/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    // const relatedProducts = await productModel
    //   .find({
    //     productCategory: product.productCategory,
    //     _id: { $ne: productId },
    //   })
    //   .limit(8);
    const relatedProducts = await productModel.aggregate([{
      $match:{
        productCategory: product.productCategory,
        _id: { $ne: productId },
      },

    },
  {$sample:{size:12}}
  ])

    res.status(200).json({
      success: true,
      product,
      relatedProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.get("/product/filter", async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      minDiscount,
      maxDiscount,
      search,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const pipeline = [];
    const match = {};

    if (category) {
      const categories = category
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      if (categories.length > 0) {
        match.productCategory = { $in: categories };
      }
    }

    if (search && search.length <= 50) {
      match.$text = { $search: search };
    }

    if (minPrice || maxPrice) {
      match.productPrice = {};
      if (minPrice) match.productPrice.$gte = Number(minPrice);
      if (maxPrice) match.productPrice.$lte = Number(maxPrice);
    }

    pipeline.push({ $match: match });

    if (minDiscount || maxDiscount) {
      const discountMatch = {};
      if (minDiscount) discountMatch.$gte = Number(minDiscount);
      if (maxDiscount) discountMatch.$lte = Number(maxDiscount);

      pipeline.push({ $match: { productdiscount: discountMatch } });
    }

    const allowedSortFields = [
      "createdAt",
      "productPrice",
      "productName",
      "productdiscount",
    ];

    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";

    pipeline.push({
      $sort: { [sortField]: order === "asc" ? 1 : -1 },
    });

    const safeLimit = Math.min(Number(limit), 50);
    const safePage = Math.max(Number(page), 1);

    pipeline.push({ $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit });

    const products = await productModel.aggregate(pipeline);

    const countPipeline = pipeline.filter(
      (stage) => !stage.$skip && !stage.$limit,
    );
    countPipeline.push({ $count: "total" });

    const totalResult = await productModel.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / safeLimit),
      page: safePage,
      limit: safeLimit,
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.delete("/product/delete/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const deletedProduct = await productModel.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.status(404).json({ msg: "Product not found" });
    }
    res
      .status(200)
      .json({ msg: "Product deleted successfully", success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

module.exports = router;
