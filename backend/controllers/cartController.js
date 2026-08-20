const Cart = require("../models/Cart");
const Product = require("../models/Product");

// ─── Helper: find or create the current user's cart ────────────────────────
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// ─── @desc    Get the current user's cart ──────────────────────────────────
// ─── @route   GET /api/cart ─────────────────────────────────────────────────
// ─── @access  Private ────────────────────────────────────────────────────────
const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await cart.populate("items.product", "name images stock isActive");

    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Add an item to the cart (or increase quantity if present) ───
// ─── @route   POST /api/cart/items ───────────────────────────────────────────
// ─── @access  Private ────────────────────────────────────────────────────────
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findOne({ _id: productId, isActive: true });

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    const cart = await getOrCreateCart(req.user.id);

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    const requestedQuantity = existingItem
      ? existingItem.quantity + Number(quantity)
      : Number(quantity);

    if (requestedQuantity > product.stock) {
      const error = new Error(
        `Only ${product.stock} unit(s) of "${product.name}" available`
      );
      error.statusCode = 400;
      throw error;
    }

    if (existingItem) {
      existingItem.quantity = requestedQuantity;
      existingItem.priceAtAdd = product.price; // refresh snapshot to current price
    } else {
      cart.items.push({
        product: product._id,
        quantity: requestedQuantity,
        priceAtAdd: product.price,
      });
    }

    await cart.save();
    await cart.populate("items.product", "name images stock isActive");

    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Update quantity of an existing cart item ─────────────────────
// ─── @route   PUT /api/cart/items/:productId ─────────────────────────────────
// ─── @access  Private ────────────────────────────────────────────────────────
const updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      const error = new Error("Quantity must be at least 1");
      error.statusCode = 400;
      throw error;
    }

    const product = await Product.findOne({ _id: productId, isActive: true });

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    if (quantity > product.stock) {
      const error = new Error(
        `Only ${product.stock} unit(s) of "${product.name}" available`
      );
      error.statusCode = 400;
      throw error;
    }

    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!item) {
      const error = new Error("Item not found in cart");
      error.statusCode = 404;
      throw error;
    }

    item.quantity = quantity;
    item.priceAtAdd = product.price;

    await cart.save();
    await cart.populate("items.product", "name images stock isActive");

    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Remove a single item from the cart ────────────────────────────
// ─── @route   DELETE /api/cart/items/:productId ─────────────────────────────
// ─── @access  Private ────────────────────────────────────────────────────────
const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await getOrCreateCart(req.user.id);

    const itemExists = cart.items.some(
      (item) => item.product.toString() === productId
    );

    if (!itemExists) {
      const error = new Error("Item not found in cart");
      error.statusCode = 404;
      throw error;
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    await cart.populate("items.product", "name images stock isActive");

    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Clear the entire cart ─────────────────────────────────────────
// ─── @route   DELETE /api/cart ───────────────────────────────────────────────
// ─── @access  Private ────────────────────────────────────────────────────────
const clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};