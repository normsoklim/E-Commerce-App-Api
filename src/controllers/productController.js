import Product from "../models/Product.js";
import Deal from "../models/Deal.js";
// Create Product
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category, imageUrl } = req.body;

    // If image uploaded via Multer
    let imagePath = imageUrl; // fallback if client provides a URL
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    if (!name || !price || !imagePath) {
      return res.status(400).json({ message: "Name, price, and image are required" });
    }

    const product = new Product({
      name,
      description,
      price,
      stock: stock || 0,
      category,
      image: imagePath,
    });

    const createdProduct = await product.save();
    res.status(201).json({ success: true, product: createdProduct });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getProductDetail = async (req, res) => {
  try {
    // 1️⃣ Find the product, populate category and reviews
    const product = await Product.findById(req.params.id)
      .populate("category", "name description")
      .populate({
        path: "reviews",
        options: { sort: { createdAt: -1 } }, // newest first
      });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2️⃣ Check for active promotion/deal
    const deal = await Deal.findOne({
      products: product._id,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    if (deal && product.price > 0) {
      product.originalPrice = product.price;
      product.discountPercentage =
        deal.discountType === "percentage"
          ? deal.discountValue
          : Math.round((deal.discountValue / product.price) * 100);

      product.discountPrice = Math.round(
        product.price * (1 - product.discountPercentage / 100)
      );
    } else {
      product.discountPrice = product.price;
      product.discountPercentage = 0;
    }

    // 3️⃣ Return product with review count
    res.json({
      ...product.toObject(),
      reviewCount: product.reviews ? product.reviews.length : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
