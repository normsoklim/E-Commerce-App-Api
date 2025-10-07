import express from "express";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Cart from "../models/Cart.js";
import Deal from "../models/Deal.js"; // Import Deal model
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @desc   Get all products (with category details)
 * @route  GET /api/products
 * @access Public
 */
router.get("/", async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name description")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc   Get products by category ID
 * @route  GET /api/products/category/:id
 * @access Public
 */
router.get("/category/:id", async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.id })
      .populate("category", "name description")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/", protect, admin, async (req, res) => {
  try {
    let { name, description, price, stock, category, image, discountPercentage, isNew } = req.body;

    // Ensure image is always an array
    if (typeof image === "string") image = [image];
    if (!Array.isArray(image)) image = [];

    const product = new Product({
      name,
      description,
      price,
      stock,
      category,
      image,
      discountPercentage: discountPercentage || 0,
      isNew: isNew || false,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.put("/:id", protect, admin, async (req, res) => {
  try {
    let { name, description, price, stock, category, image, discountPercentage, isNew } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (category !== undefined) product.category = category;

    // Ensure image is array
    if (image !== undefined) {
      if (typeof image === "string") image = [image];
      if (!Array.isArray(image)) image = [];
      product.image = image;
    }

    if (discountPercentage !== undefined) product.discountPercentage = discountPercentage;
    if (isNew !== undefined) product.isNew = isNew;

    const updatedProduct = await product.save();

    // Update cart prices
    const carts = await Cart.find({ "items.product": product._id });
    for (const cart of carts) {
      cart.items.forEach(item => {
        if (item.product.toString() === product._id.toString()) {
          item.price = product.price;
        }
      });
      cart.subtotal = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
      await cart.save();
    }

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc   Delete product
 * @route  DELETE /api/products/:id
 * @access Private (admin only)
 */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await product.deleteOne();
    res.json({ message: "Product removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc   Add a review to a product
 * @route  POST /api/products/:id/review
 * @access Private (logged-in users)
 */
router.post("/:id/review", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!Array.isArray(product.reviews)) product.reviews = [];

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).json({ message: "Product already reviewed by you" });
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
      createdAt: new Date(),
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => acc + item.rating, 0) / product.numReviews;

    await product.save();

    res.status(201).json({
      message: "Review added successfully",
      review,
      rating: product.rating,
      numReviews: product.numReviews,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc   Search products by keyword (name, description, brand)
 * @route  GET /api/products/search?keyword=...
 * @access Public
 */
router.get("/search", async (req, res) => {
  try {
    const keyword = req.query.keyword
      ? {
          $or: [
            { name: { $regex: req.query.keyword, $options: "i" } },
            { description: { $regex: req.query.keyword, $options: "i" } },
            { brand: { $regex: req.query.keyword, $options: "i" } },
          ],
        }
      : {};

    const products = await Product.find(keyword)
      .populate("category", "name description")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc   Get a single product by ID (with category + promotion + reviewCount + reviews sorted)
 * @route  GET /api/products/:id
 * @access Public
 */
router.get("/:id", async (req, res) => {
  try {
    // Find the product, populate category and review users
    const product = await Product.findById(req.params.id)
      .populate("category", "name description")
      .populate({
        path: "reviews.user",
        select: "name",
      });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check for active promotion/deal
    let deal = null;
    try {
      deal = await Deal.findOne({
        products: product._id,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });
    } catch (dealError) {
      // If Deal model doesn't exist or there's an error, continue without deal
      console.log("Deal lookup skipped:", dealError.message);
    }

    // Create a response object to avoid modifying the original product
    const productResponse = product.toObject();
    
    if (deal && product.price > 0) {
      productResponse.originalPrice = product.price;
      productResponse.discountPercentage =
        deal.discountType === "percentage"
          ? deal.discountValue
          : Math.round((deal.discountValue / product.price) * 100);

      productResponse.discountPrice = Math.round(
        product.price * (1 - productResponse.discountPercentage / 100)
      );
      productResponse.hasDeal = true;
      productResponse.dealName = deal.name;
    } else {
      // Use product's own discount percentage if no active deal
      productResponse.discountPrice = product.discountPercentage > 0 
        ? Math.round(product.price * (1 - product.discountPercentage / 100))
        : product.price;
      productResponse.discountPercentage = product.discountPercentage || 0;
      productResponse.hasDeal = false;
    }

    // Add review count and ensure reviews array exists
    productResponse.reviewCount = product.reviews ? product.reviews.length : 0;
    
    // Sort reviews by creation date (newest first)
    if (productResponse.reviews) {
      productResponse.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json(productResponse);
  } catch (error) {
    console.error("Product detail error:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;