import express from "express";
import Category from "../models/Category.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
const router = express.Router();

// ------------------------------
// @desc    Get all categories (with optional products and count)
// @route   GET /api/categories
// @access  Public
// ------------------------------
router.get("/", async (req, res) => {
  try {
    // If you want products included, use /with-products instead
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ------------------------------
// @desc    Get categories with products and count
// @route   GET /api/categories/with-products
// @access  Public
// ------------------------------
router.get("/with-products", async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "products",      // collection name
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
      {
        $addFields: {
          count: { $size: "$products" }  // count of products
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ------------------------------
// @desc    Create a new category
// @route   POST /api/categories
// @access  Private (admin)
// ------------------------------
router.post("/", protect, admin, async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  try {
    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = new Category({ name, description });
    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ------------------------------
// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
// ------------------------------
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ------------------------------
// @desc    Get single category with products and count
// @route   GET /api/categories/:id/with-products
// @access  Public
// ------------------------------
router.get("/:id/with-products", async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.aggregate([
      { $match: { _id: require('mongoose').Types.ObjectId(categoryId) } },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
      {
        $addFields: {
          count: { $size: "$products" } // product count
        }
      }
    ]);

    if (!category || category.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category[0]);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ------------------------------
// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (admin)
// ------------------------------
router.put("/:id", protect, admin, async (req, res) => {
  const { name, description } = req.body;

  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (name) category.name = name;
    if (description) category.description = description;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ------------------------------
// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (admin)
// ------------------------------
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    await category.deleteOne();
    res.json({ message: "Category removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


export default router;
