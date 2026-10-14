const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    // Snapshot fields: orders stay accurate even if the product is edited or deleted later
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: [1, "Quantity must be at least 1"] },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Order must contain at least one item",
      },
    },
    totalAmount: { type: Number, required: true, min: [0, "Total amount cannot be negative"] },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    // Latest reference (what the customer was last sent to pay with)
    paystackReference: { type: String, unique: true, sparse: true },
    // Every reference this order has ever used, so a payment made through an older link is still matched
    paystackReferences: { type: [String], default: [], index: true },
    shippingIdType: { type: String, enum: ["nin", "bvn"] },
    shippingIdNumber: { type: String, trim: true },
    // Set when payment succeeded but fulfillment couldn't complete (e.g. sold out). Needs a manual refund/review.
    fulfillmentIssue: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);