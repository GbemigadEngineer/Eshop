const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    priceAtAdd: {
      type: Number,
      required: true,
    },
  },
  { _id: false } // sub-items don't need their own separate _id
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one active cart per user
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

// ─── Virtual: total price of everything in the cart ────────────────────────
cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce(
    (sum, item) => sum + item.priceAtAdd * item.quantity,
    0
  );
});

// ─── Virtual: total item count (useful for a cart icon badge, etc.) ───────
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;