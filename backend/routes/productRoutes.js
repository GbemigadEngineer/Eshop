const express = require("express");
const { body } = require("express-validator");

const {
  getProducts,
  getAdminProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// Public
router.get("/", getProducts);

// Admin list (must be defined BEFORE "/:id")
router.get("/admin/all", protect, authorize("admin"), getAdminProducts);

router.get("/:id", getProductById);

// Admin
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.array("images", 5),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("category").trim().notEmpty().withMessage("Category is required"),
    body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  ],
  validateRequest,
  createProduct
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  upload.array("images", 5),
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("description").optional().trim().notEmpty().withMessage("Description cannot be empty"),
    body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("category").optional().trim().notEmpty().withMessage("Category cannot be empty"),
    body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
    body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
  ],
  validateRequest,
  updateProduct
);

router.delete("/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;