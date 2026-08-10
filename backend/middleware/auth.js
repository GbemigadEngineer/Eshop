const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── Protect routes — verifies JWT and attaches user to req ────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    // Expect header format: "Authorization: Bearer <token>"
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      const error = new Error("Not authorized, no token");
      error.statusCode = 401;
      throw error;
    }

    // Verify token — throws JsonWebTokenError / TokenExpiredError on failure,
    // both of which are already handled in errorHandler.js
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm the user still exists (e.g. wasn't deleted after token issued)
    const user = await User.findById(decoded.id);

    if (!user) {
      const error = new Error("Not authorized, user no longer exists");
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Restrict access to specific roles ──────────────────────────────────────
// Usage: authorize("admin")  or  authorize("admin", "user")
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error(
        `Role "${
          req.user ? req.user.role : "unknown"
        }" is not authorized to access this route`
      );
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};

module.exports = { protect, authorize };
