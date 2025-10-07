import express from "express";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ---------------------------------------------------
 * ✅ 1️⃣ Get all categories (with products & count)
 *     GET /api/categories/with-products
 *     Public
 * --------------------------------------------------- */
router.get("/with-products", async (req, res) => {
  try {
    const categories = await Category.aggregate([
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
          count: { $size: "$products" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories with products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ---------------------------------------------------
 * ✅ 2️⃣ Get single category with products and count
 *     GET /api/categories/:id/with-products
 *     Public
 * --------------------------------------------------- */
router.get("/:id/with-products", async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await Category.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(categoryId) } },
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
          count: { $size: "$products" },
        },
      },
    ]);

    if (!category || category.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category[0]);
  } catch (error) {
    console.error("Error fetching category with products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ---------------------------------------------------
 * ✅ 3️⃣ Get all categories (basic, no products)
 *     GET /api/categories
 *     Public
 * --------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ---------------------------------------------------
 * ✅ 4️⃣ Get single category by ID (no products)
 *     GET /api/categories/:id
 *     Public
 * --------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await Category.findById(categoryId);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ---------------------------------------------------
 * ✅ 5️⃣ Create a new category (admin only)
 * --------------------------------------------------- */
router.post("/", protect, admin, async (req, res) => {
  const { name, description, image } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  try {
    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = new Category({ name, description, image });
    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ---------------------------------------------------
 * ✅ 6️⃣ Update category (admin only)
 * --------------------------------------------------- */
router.put("/:id", protect, admin, async (req, res) => {
  const { name, description , image} = req.body;

  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    if (name) category.name = name;
    if (description) category.description = description;
    if (image) category.image = image;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ---------------------------------------------------
 * ✅ 7️⃣ Delete category (admin only)
 * --------------------------------------------------- */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    await category.deleteOne();
    res.json({ message: "Category removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
