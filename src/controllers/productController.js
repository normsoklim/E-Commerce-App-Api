import Product from "../models/Product.js";

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
