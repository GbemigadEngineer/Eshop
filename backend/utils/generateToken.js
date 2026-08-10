const jwt = require("jsonwebtoken");

/**
 * Generate a signed JWT for a given user.
 * @param {string} id - MongoDB user _id
 * @param {string} role - user role ("user" | "admin")
 * @returns {string} signed JWT
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

module.exports = generateToken;