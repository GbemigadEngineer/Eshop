const crypto = require("crypto");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { initializeTransaction } = require("../utils/paystack");
const fulfillOrderByReference = require("../utils/fulfillOrder");
const settleOrder = require("../utils/settleOrder");

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const generateReference = () =>
  `eshop_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

// ─── POST /api/orders/checkout (private) ────────────────────────────────────
const createCheckoutSession = async (req, res, next) => {
  try {
    const { idType, idNumber } = req.body;

    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
    if (!cart || cart.items.length === 0) throw httpError("Cart is empty", 400);

    const user = await User.findById(req.user.id);
    let finalIdType = user.idType;
    let finalIdNumber = user.idNumber;

    if (!finalIdType || !finalIdNumber) {
      if (!idType || !idNumber) {
        throw httpError("idType and idNumber are required to complete a purchase", 400);
      }
      finalIdType = idType;
      finalIdNumber = idNumber;
    }

    for (const item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        throw httpError("A product in your cart is no longer available", 400);
      }
      if (item.quantity > product.stock) {
        throw httpError(`Only ${product.stock} unit(s) of "${product.name}" available`, 400);
      }
    }

    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.priceAtAdd,
      quantity: item.quantity,
    }));

    const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const reference = generateReference();

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount,
      status: "pending",
      paystackReference: reference,
      paystackReferences: [reference],
      shippingIdType: finalIdType,
      shippingIdNumber: finalIdNumber,
    });

    // Remember the ID details for future purchases
    if (user.idType !== finalIdType || user.idNumber !== finalIdNumber) {
      user.idType = finalIdType;
      user.idNumber = finalIdNumber;
      await user.save();
    }

    let session;
    try {
      session = await initializeTransaction({
        email: user.email,
        amount: totalAmount,
        reference,
        callback_url: `${process.env.CLIENT_URL}/order/confirm`,
        metadata: { orderId: order._id.toString() },
      });
    } catch (err) {
      await Order.updateOne({ _id: order._id }, { $set: { status: "cancelled" } });
      throw err;
    }

    res.status(200).json({
      success: true,
      data: {
        authorizationUrl: session.authorization_url,
        accessCode: session.access_code,
        reference: session.reference,
        orderId: order._id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/orders/:id/retry (private) ───────────────────────────────────
const retryPayment = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw httpError("Order not found", 404);
    if (order.user.toString() !== req.user.id) throw httpError("Not authorized to access this order", 403);
    if (order.status !== "pending") {
      throw httpError(`This order is already "${order.status}" and cannot be retried`, 400);
    }

    // If an earlier link was already paid, don't let them pay twice
    const { settled, uncertain } = await settleOrder(order);
    if (settled) throw httpError("This order has already been paid", 409);
    if (uncertain) throw httpError("Could not confirm payment status. Please try again shortly.", 503);

    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive || item.quantity > product.stock) {
        throw httpError(`"${item.name}" is no longer available in the requested quantity`, 400);
      }
    }

    const user = await User.findById(req.user.id);
    const newReference = generateReference();

    // Record the new reference BEFORE sending the customer to pay, keeping all old ones
    await Order.updateOne(
      { _id: order._id, status: "pending" },
      {
        $set: { paystackReference: newReference },
        $addToSet: {
          paystackReferences: { $each: [order.paystackReference, newReference].filter(Boolean) },
        },
      }
    );

    const session = await initializeTransaction({
      email: user.email,
      amount: order.totalAmount,
      reference: newReference,
      callback_url: `${process.env.CLIENT_URL}/order/confirm`,
      metadata: { orderId: order._id.toString() },
    });

    res.status(200).json({
      success: true,
      data: {
        authorizationUrl: session.authorization_url,
        accessCode: session.access_code,
        reference: session.reference,
        orderId: order._id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/orders/webhook (public, signature-verified) ──────────────────
const handleWebhook = async (req, res) => {
  try {
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

    // Acknowledge immediately: Paystack expects a fast 200
    res.status(200).send("Webhook received");

    if (event.event !== "charge.success") return;

    const { outcome, order } = await fulfillOrderByReference(event.data.reference);
    console.log(
      `📬 Webhook ${event.data.reference}: ${outcome}${order ? ` (order ${order._id})` : ""}`
    );

    if (outcome === "stock_issue") {
      console.error(`⚠️ Order ${order._id} paid but out of stock: needs refund/review`);
    }
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
  }
};

// ─── GET /api/orders/my-orders (private) ────────────────────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/orders/:id (owner or admin) ───────────────────────────────────
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw httpError("Order not found", 404);

    const isOwner = order.user.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) throw httpError("Not authorized to view this order", 403);

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/orders (admin) ────────────────────────────────────────────────
const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (req.query.needsReview === "true") filter.fulfillmentIssue = { $exists: true };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
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

// ─── PATCH /api/orders/:id/status (admin): paid → shipped → delivered ───────
const ALLOWED_TRANSITIONS = { paid: ["shipped"], shipped: ["delivered"] };

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw httpError("Order not found", 404);

    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      throw httpError(`Cannot move an order from "${order.status}" to "${status}"`, 400);
    }

    order.status = status;
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCheckoutSession,
  retryPayment,
  handleWebhook,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};