const { registerUser, loginUser, getMe, createAdmin } = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");


router.post(
  "/create-admin",
  protect,
  authorize("admin"),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("passwordConfirm").notEmpty().withMessage("Please confirm your password"),
  ],
  validateRequest,
  createAdmin
);