const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const { verifyTransaction } = require("./paystack");

// Outcomes: unknown_order | already_processed | not_paid | amount_mismatch | stock_issue | fulfilled
const fulfillOrderByReference = async (reference) => {
  const order = await Order.findOne({
    $or: [{ paystackReferences: reference }, { paystackReference: reference }],
  });
  if (!order) return { outcome: "unknown_order" };
  if (order.status === "paid") return { outcome: "already_processed", order };

  // Never trust the caller (webhook or cron): confirm with Paystack directly
  const verified = await verifyTransaction(reference);

  if (verified.status !== "success") return { outcome: "not_paid", order };

  if (verified.amount !== Math.round(order.totalAmount * 100)) {
    await Order.updateOne({ _id: order._id }, { $set: { status: "failed" } });
    return { outcome: "amount_mismatch", order };
  }

  // Atomically claim the order so concurrent webhooks/cron runs can't double-process
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: ["pending", "cancelled"] } },
    { $set: { status: "paid" } },
    { new: true }
  );
  if (!claimed) return { outcome: "already_processed", order };

  // Conditional decrement: only succeeds if enough stock remains
  const decremented = [];
  let shortItem = null;

  for (const item of claimed.items) {
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (result.modifiedCount === 0) {
      shortItem = item;
      break;
    }
    decremented.push(item);
  }

  if (shortItem) {
    // All-or-nothing: put back whatever was already taken
    for (const item of decremented) {
      await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
    }
    claimed.fulfillmentIssue = `insufficient_stock: ${shortItem.name}`;
    await claimed.save();
    return { outcome: "stock_issue", order: claimed };
  }

  // Remove only the purchased products from the cart
  await Cart.updateOne(
    { user: claimed.user },
    { $pull: { items: { product: { $in: claimed.items.map((i) => i.product) } } } }
  );

  return { outcome: "fulfilled", order: claimed };
};

module.exports = fulfillOrderByReference;