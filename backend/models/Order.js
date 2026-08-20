const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // Snapshot fields — copied at order time, not live references.
    // If the product is later edited or deleted, this order still shows
    // exactly what the customer actually bought.
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: "Order must contain at least one item",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paystackReference: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs with no reference yet (before payment attempt)
    },
    shippingIdType: {
      type: String,
      enum: ["nin", "bvn"],
    },
    shippingIdNumber: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;