const express = require("express");
const { body } = require("express-validator");

const {
  createCheckoutSession,
  handleWebhook,
  getMyOrders,
  getOrderById,
  getAllOrders,
} = require("../controllers/orderController");

const { protect, authorize } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// ─── Webhook — public, but signature-verified inside the controller ───────
// NOTE: raw body parsing for this route is handled in app.js, not here
router.post("/webhook", handleWebhook);

// ─── Everything below requires a logged-in user ────────────────────────────
router.use(protect);

router.post(
  "/checkout",
  [
    body("idType")
      .optional()
      .isIn(["nin", "bvn"])
      .withMessage("idType must be either 'nin' or 'bvn'"),
    body("idNumber")
      .optional()
      .isLength({ min: 5 })
      .withMessage("idNumber must be at least 5 characters"),
  ],
  validateRequest,
  createCheckoutSession
);

router.get("/my-orders", getMyOrders);
router.get("/:id", getOrderById);

// ─── Admin only ─────────────────────────────────────────────────────────────
router.get("/", authorize("admin"), getAllOrders);

module.exports = router;
