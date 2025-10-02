import Deal from "../models/Deal.js";
import Product from "../models/Product.js";

// Get all active deals
export const getDeals = async (req, res) => {
  try {
    const deals = await Deal.find({ isActive: true })
      .populate("products", "name price discountPercentage image"); // ✅ populate product details

    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single deal by ID
export const getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate("products", "name price discountPercentage image");

    if (!deal) return res.status(404).json({ message: "Deal not found" });

    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new deal
export const createDeal = async (req, res) => {
  try {
    const { title, description, discountType, discountValue, startDate, endDate, products } = req.body;

    const deal = new Deal({
      title,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      products,
      isActive: true
    });

    const createdDeal = await deal.save();

    // ✅ Apply discount to products
    await Promise.all(products.map(async (productId) => {
      const product = await Product.findById(productId);
      if (!product) return;

      let newDiscount = 0;
      if (discountType === "percentage") {
        newDiscount = discountValue;
      } else if (discountType === "fixed") {
        newDiscount = Math.round((discountValue / product.price) * 100);
      }

      product.discountPercentage = newDiscount;
      await product.save();
    }));

    // ✅ Return deal with populated products
    const populatedDeal = await Deal.findById(createdDeal._id)
      .populate("products", "name price discountPercentage image");

    res.status(201).json(populatedDeal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a deal
export const updateDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const { title, description, discountType, discountValue, startDate, endDate, products } = req.body;

    if (title) deal.title = title;
    if (description) deal.description = description;
    if (discountType) deal.discountType = discountType;
    if (discountValue !== undefined) deal.discountValue = discountValue;
    if (startDate) deal.startDate = startDate;
    if (endDate) deal.endDate = endDate;
    if (products) deal.products = products;

    await deal.save();

    // ✅ Re-apply discount to products
    await Promise.all(deal.products.map(async (productId) => {
      const product = await Product.findById(productId);
      if (!product) return;

      let newDiscount = 0;
      if (deal.discountType === "percentage") {
        newDiscount = deal.discountValue;
      } else if (deal.discountType === "fixed") {
        newDiscount = Math.round((deal.discountValue / product.price) * 100);
      }

      product.discountPercentage = newDiscount;
      await product.save();
    }));

    // ✅ Return updated deal with populated products
    const populatedDeal = await Deal.findById(deal._id)
      .populate("products", "name price discountPercentage image");

    res.json(populatedDeal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
