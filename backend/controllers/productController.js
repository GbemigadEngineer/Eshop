const Product = require("../models/Product");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// ─── @desc    Get all active products (with filtering + pagination) ───────
// ─── @route   GET /api/products ────────────────────────────────────────────
// ─── @access  Public ────────────────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get single product by ID ─────────────────────────────────────
// ─── @route   GET /api/products/:id ─────────────────────────────────────────
// ─── @access  Public ────────────────────────────────────────────────────────
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Create new product ────────────────────────────────────────────
// ─── @route   POST /api/products ────────────────────────────────────────────
// ─── @access  Private/Admin ──────────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      const error = new Error("At least one product image is required");
      error.statusCode = 400;
      throw error;
    }

    const uploadResults = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer))
    );
    const images = uploadResults.map((result) => result.secure_url);

    const { name, description, price, category, stock } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      category,
      stock,
      images,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Update product (details and/or stock and/or images) ─────────
// ─── @route   PUT /api/products/:id ─────────────────────────────────────────
// ─── @access  Private/Admin ──────────────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    const { name, description, price, category, stock } = req.body;

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = stock;

    // If new images were uploaded, replace the existing set entirely
    if (req.files && req.files.length > 0) {
      const uploadResults = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer))
      );
      product.images = uploadResults.map((result) => result.secure_url);
    }

    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Soft-delete product (sets isActive to false) ─────────────────
// ─── @route   DELETE /api/products/:id ──────────────────────────────────────
// ─── @access  Private/Admin ──────────────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};