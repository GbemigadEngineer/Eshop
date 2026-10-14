const Product = require("../models/Product");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

const MAX_IMAGES = 5;

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
};

// Images can arrive as uploaded files (Cloudinary) and/or https URLs in the body
const collectImages = async (req) => {
  const uploaded =
    req.files && req.files.length
      ? (await Promise.all(req.files.map((f) => uploadToCloudinary(f.buffer)))).map(
          (r) => r.secure_url
        )
      : [];

  const urls = [].concat(req.body.imageUrls || []).map(String).filter(Boolean);
  const invalid = urls.find((u) => !/^https:\/\//i.test(u));
  if (invalid) throw httpError("imageUrls must be https URLs", 400);

  const images = [...uploaded, ...urls];
  if (images.length > MAX_IMAGES) throw httpError(`A product can have at most ${MAX_IMAGES} images`, 400);
  return images;
};

const buildFilter = (query, base) => {
  const { category, minPrice, maxPrice, search } = query;
  const filter = { ...base };
  if (category) filter.category = category;
  if (search) filter.name = { $regex: escapeRegex(String(search)), $options: "i" };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  return filter;
};

const paginate = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

// ─── GET /api/products (public) ─────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const filter = buildFilter(req.query, { isActive: true });
    const { page, limit, skip } = paginate(req.query);

    const [products, total] = await Promise.all([
      Product.find(filter).sort(SORTS[req.query.sort] || SORTS.newest).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/products/admin/all (admin: includes inactive) ─────────────────
const getAdminProducts = async (req, res, next) => {
  try {
    const base = {};
    if (req.query.isActive === "true") base.isActive = true;
    if (req.query.isActive === "false") base.isActive = false;

    const filter = buildFilter(req.query, base);
    const { page, limit, skip } = paginate(req.query);

    const [products, total] = await Promise.all([
      Product.find(filter).sort(SORTS[req.query.sort] || SORTS.newest).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/products/:id (public) ─────────────────────────────────────────
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true });
    if (!product) throw httpError("Product not found", 404);
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/products (admin) ─────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const images = await collectImages(req);
    if (images.length === 0) throw httpError("At least one product image is required", 400);

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

// ─── PUT /api/products/:id (admin: details, stock, images, restore) ─────────
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw httpError("Product not found", 404);

    const { name, description, price, category, stock, isActive } = req.body;

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = stock;
    if (isActive !== undefined) product.isActive = isActive === true || isActive === "true";

    // New images replace the existing set; no new images keeps the old ones
    const images = await collectImages(req);
    if (images.length > 0) product.images = images;

    await product.save();
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/products/:id (admin: soft delete) ──────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw httpError("Product not found", 404);

    product.isActive = false;
    await product.save();

    res.status(200).json({ success: true, message: "Product deactivated successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getAdminProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};