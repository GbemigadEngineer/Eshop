const express = require("express");
const { body } = require("express-validator");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

const { protect } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// All cart routes require a logged-in user
router.use(protect);

router.get("/", getCart);

router.post(
  "/items",
  [
    body("productId").notEmpty().withMessage("productId is required"),
    body("quantity")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Quantity must be a positive integer"),
  ],
  validateRequest,
  addToCart
);

router.put(
  "/items/:productId",
  [
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be a positive integer"),
  ],
  validateRequest,
  updateCartItem
);

router.delete("/items/:productId", removeFromCart);

router.delete("/", clearCart);

module.exports = router;