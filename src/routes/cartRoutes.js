import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @desc   Get current user's cart
 * @route  GET /api/cart
 * @access Private
 */
router.get("/", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product",
      "name price image stock"
    );
    res.json(cart || { items: [], subtotal: 0 });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc   Add item to cart
 * @route  POST /api/cart
 * @access Private
 */
router.post("/", protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity)
      return res.status(400).json({ message: "Product ID and quantity are required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [], subtotal: 0 });

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      // Product exists → update quantity
      cart.items[itemIndex].quantity += quantity;
      cart.items[itemIndex].price = product.price; // update price
    } else {
      // Add new product with price
      cart.items.push({ product: productId, quantity, price: product.price });
    }

    // Recalculate subtotal
    cart.subtotal = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);

    await cart.save();
    const populatedCart = await cart.populate("items.product", "name price image stock");
    res.status(201).json(populatedCart);
    
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
/**
 * @desc   Update item quantity
 * @route  PUT /api/cart/:productId
 * @access Private
 */
router.put("/:productId", protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) return res.status(404).json({ message: "Product not in cart" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = product.price; // always store current product price

    // Recalculate subtotal
    cart.subtotal = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);

    await cart.save();
    const populatedCart = await cart.populate("items.product", "name price image stock");
    res.json(populatedCart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc   Remove item from cart
 * @route  DELETE /api/cart/:productId
 * @access Private
 */
// DELETE /api/cart/:productId → remove item
router.delete("/:productId", protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) return res.status(404).json({ message: "Product not in cart" });

    // Remove the item
    cart.items.splice(itemIndex, 1);

    // Recalculate subtotal
    cart.subtotal = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);

    await cart.save();
    const populatedCart = await cart.populate("items.product", "name price image stock");
    res.json(populatedCart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
