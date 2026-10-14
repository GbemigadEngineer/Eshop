const cron = require("node-cron");
const Order = require("../models/Order");
const settleOrder = require("./settleOrder");

const EXPIRY_MINUTES = Number(process.env.ORDER_EXPIRY_MINUTES) || 60;
const SCHEDULE = process.env.ORDER_EXPIRY_CRON || "*/15 * * * *";

const expireStaleOrders = async () => {
  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);
  const staleOrders = await Order.find({ status: "pending", createdAt: { $lt: cutoff } });

  let cancelled = 0;
  let recovered = 0;

  for (const order of staleOrders) {
    const { settled, uncertain } = await settleOrder(order);

    if (settled) {
      recovered++; // a payment existed: the webhook was missed
    } else if (uncertain) {
      console.error(`⚠️ Could not verify order ${order._id}; leaving it pending`);
    } else {
      await Order.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: "cancelled" } }
      );
      cancelled++;
    }
  }

  if (cancelled || recovered) {
    console.log(`🧹 Expiry run: ${cancelled} cancelled, ${recovered} recovered as paid`);
  }
};

// A failed run (e.g. network down) logs one line instead of a stack trace
const runExpiryJob = async () => {
  try {
    await expireStaleOrders();
  } catch (err) {
    console.error(`⚠️ Expiry job skipped: ${err.message}`);
  }
};

const startOrderExpiryJob = () => {
  cron.schedule(SCHEDULE, runExpiryJob);
  console.log(`⏰ Order expiry job scheduled (${SCHEDULE}, expires after ${EXPIRY_MINUTES} min)`);
};

module.exports = startOrderExpiryJob;