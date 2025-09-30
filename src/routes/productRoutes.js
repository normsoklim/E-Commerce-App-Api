import express from "express";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Cart from "../models/Cart.js"; // ✅ missing import
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

/**
 * @desc   Create new product
 * @route  POST /api/products
 * @access Private (admin only)
 */
router.post("/", protect,admin, async (req, res) => {
  try {
    const { name, description, price, stock, category, image, discountPercentage, isNew } = req.body;

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

/**
 * @desc   Update product
 * @route  PUT /api/products/:id
 * @access Private (admin only)
 */
router.put("/:id", protect, async (req, res) => {
  try {
    const { name, description, price, stock, category, image, discountPercentage, isNew } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (category !== undefined) product.category = category;
    if (image !== undefined) product.image = image;
    if (discountPercentage !== undefined) product.discountPercentage = discountPercentage;
    if (isNew !== undefined) product.isNew = isNew;

    const updatedProduct = await product.save();

    // ✅ Update cart prices if needed
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
 * @desc   Get a single product by ID (with category + reviewCount + reviews sorted)
 * @route  GET /api/products/:id
 * @access Public
 */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "category",
      "name description"
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    product.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      ...product.toObject(),
      reviewCount: product.numReviews,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
