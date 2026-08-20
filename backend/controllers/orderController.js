const crypto = require("crypto");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const {
  initializeTransaction,
  verifyTransaction,
} = require("../utils/paystack");

// ─── @desc    Create an order + Paystack checkout session from the cart ───
// ─── @route   POST /api/orders/checkout ─────────────────────────────────────
// ─── @access  Private ────────────────────────────────────────────────────────
const createCheckoutSession = async (req, res, next) => {
  try {
    const { idType, idNumber } = req.body;

    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    if (!cart || cart.items.length === 0) {
      const error = new Error("Cart is empty");
      error.statusCode = 400;
      throw error;
    }

    // ─── idType/idNumber requirement (from earlier discussion) ────────────
    const user = await User.findById(req.user.id);
    let finalIdType = user.idType;
    let finalIdNumber = user.idNumber;

    if (!finalIdType || !finalIdNumber) {
      if (!idType || !idNumber) {
        const error = new Error(
          "idType and idNumber are required to complete a purchase"
        );
        error.statusCode = 400;
        throw error;
      }
      finalIdType = idType;
      finalIdNumber = idNumber;

      // Save to user for future purchases
      user.idType = idType;
      user.idNumber = idNumber;
      await user.save();
    }

    // ─── Validate stock is still available for every item ─────────────────
    for (const item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        const error = new Error(
          `A product in your cart is no longer available`
        );
        error.statusCode = 400;
        throw error;
      }
      if (item.quantity > product.stock) {
        const error = new Error(
          `Only ${product.stock} unit(s) of "${product.name}" available`
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // ─── Build order items (snapshot) + total ──────────────────────────────
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.priceAtAdd,
      quantity: item.quantity,
    }));

    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const reference = `eshop_${Date.now()}_${crypto
      .randomBytes(4)
      .toString("hex")}`;

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount,
      status: "pending",
      paystackReference: reference,
      shippingIdType: finalIdType,
      shippingIdNumber: finalIdNumber,
    });

    const paystackSession = await initializeTransaction({
      email: user.email,
      amount: totalAmount,
      reference,
      callback_url: `${process.env.CLIENT_URL}/order/confirm`,
      metadata: { orderId: order._id.toString() },
    });

    res.status(200).json({
      success: true,
      data: {
        authorizationUrl: paystackSession.authorization_url,
        reference: paystackSession.reference,
        orderId: order._id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Handle Paystack webhook — the source of truth for payment ───
// ─── @route   POST /api/orders/webhook ──────────────────────────────────────
// ─── @access  Public (but signature-verified) ───────────────────────────────
const handleWebhook = async (req, res, next) => {
  try {
    // req.body is a raw Buffer here — see app.js note on route setup
    const signature = req.headers["x-paystack-signature"];

    const expectedSignature = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid Paystack webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());

    // Acknowledge immediately — Paystack expects a fast 200
    res.status(200).send("Webhook received");

    if (event.event !== "charge.success") {
      return; // ignore other event types for now
    }

    const reference = event.data.reference;

    const order = await Order.findOne({ paystackReference: reference });

    if (!order) {
      console.error(`⚠️ Webhook for unknown order reference: ${reference}`);
      return;
    }

    // Idempotency check — don't double-process if webhook fires more than once
    if (order.status === "paid") {
      console.log(`ℹ️ Order ${order._id} already marked paid, skipping`);
      return;
    }

    // Defense in depth — confirm directly with Paystack, don't trust the webhook payload alone
    const verified = await verifyTransaction(reference);

    if (verified.status !== "success") {
      order.status = "failed";
      await order.save();
      console.error(`❌ Verification failed for order ${order._id}`);
      return;
    }

    if (verified.amount !== Math.round(order.totalAmount * 100)) {
      console.error(
        `⚠️ Amount mismatch for order ${order._id} — possible tampering`
      );
      order.status = "failed";
      await order.save();
      return;
    }

    // ─── Payment confirmed — decrement stock and mark order paid ──────────
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    order.status = "paid";
    await order.save();

    // Clear the user's cart now that checkout is complete
    await Cart.findOneAndUpdate({ user: order.user }, { items: [] });

    console.log(`✅ Order ${order._id} marked paid, stock updated`);
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    // Note: response already sent above, so we just log — don't call next(err) here
  }
};

// ─── @desc    Get logged-in user's own orders ───────────────────────────────
// ─── @route   GET /api/orders/my-orders ──────────────────────────────────────
// ─── @access  Private ────────────────────────────────────────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get a single order (owner or admin only) ─────────────────────
// ─── @route   GET /api/orders/:id ────────────────────────────────────────────
// ─── @access  Private ────────────────────────────────────────────────────────
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const isOwner = order.user.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      const error = new Error("Not authorized to view this order");
      error.statusCode = 403;
      throw error;
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get all orders (admin dashboard) ──────────────────────────────
// ─── @route   GET /api/orders ────────────────────────────────────────────────
// ─── @access  Private/Admin ──────────────────────────────────────────────────
const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email eshopId")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: orders,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getMyOrders,
  getOrderById,
  getAllOrders,
};
