const express = require("express");
const { body } = require("express-validator");

const {
  registerUser,
  loginUser,
  getMe,
} = require("../controllers/authController");

const { protect } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// ─── @route   POST /api/auth/register ───────────────────────────────────────
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("passwordConfirm")
      .notEmpty()
      .withMessage("Please confirm your password"),
    body("idType")
      .optional()
      .isIn(["nin", "bvn"])
      .withMessage("idType must be either 'nin' or 'bvn'"),
  ],
  validateRequest,
  registerUser
);

// ─── @route   POST /api/auth/login ───────────────────────────────────────────
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  loginUser
);

// ─── @route   GET /api/auth/me ────────────────────────────────────────────────
router.get("/me", protect, getMe);

module.exports = router;