const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// ─── @desc    Register a new user ─────────────────────────────────────────
// ─── @route   POST /api/auth/register ─────────────────────────────────────
// ─── @access  Public ───────────────────────────────────────────────────────
const registerUser = async (req, res, next) => {
  try {
    // Only ever pull these specific fields — never spread req.body directly,
    // otherwise someone could pass "role": "admin" and self-promote.
    const { name, email, password, passwordConfirm, idType, idNumber } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      const error = new Error("User already exists with this email");
      error.statusCode = 400;
      throw error;
    }

    const user = await User.create({
      name,
      email,
      password,
      passwordConfirm,
      idType,
      idNumber,
      // role intentionally omitted — always defaults to "user" from the schema
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      data: {
        id: user._id,
        eshopId: user.eshopId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Login user ───────────────────────────────────────────────────
// ─── @route   POST /api/auth/login ─────────────────────────────────────────
// ─── @access  Public ────────────────────────────────────────────────────────
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password since it's excluded by default in the schema
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      data: {
        id: user._id,
        eshopId: user.eshopId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── @desc    Get currently logged-in user's profile ──────────────────────
// ─── @route   GET /api/auth/me ──────────────────────────────────────────────
// ─── @access  Private (requires valid token) ────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    // req.user is attached by the "protect" middleware — not built yet
    const user = await User.findById(req.user.id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        eshopId: user.eshopId,
        name: user.name,
        email: user.email,
        role: user.role,
        idType: user.idType,
        idNumber: user.idNumber,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerUser, loginUser, getMe };