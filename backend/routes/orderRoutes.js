const express = require("express");
const { body } = require("express-validator");

const {
  createCheckoutSession,
  retryPayment,
  handleWebhook,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const { protect, authorize } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// Webhook: public, signature-verified in the controller. Raw body is set up in app.js.
router.post("/webhook", handleWebhook);

// Everything below needs a logged-in user
router.use(protect);

router.post(
  "/checkout",
  [
    body("idType").optional().isIn(["nin", "bvn"]).withMessage("idType must be either 'nin' or 'bvn'"),
    body("idNumber").optional().isLength({ min: 5 }).withMessage("idNumber must be at least 5 characters"),
  ],
  validateRequest,
  createCheckoutSession
);

router.get("/my-orders", getMyOrders);

// Admin
router.get("/", authorize("admin"), getAllOrders);
router.patch(
  "/:id/status",
  authorize("admin"),
  [body("status").isIn(["shipped", "delivered"]).withMessage("status must be 'shipped' or 'delivered'")],
  validateRequest,
  updateOrderStatus
);

router.post("/:id/retry", retryPayment);
router.get("/:id", getOrderById);

module.exports = router;