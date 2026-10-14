const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const checks = [
  ["config/cloudinary", "object"],
  ["middleware/auth", ["protect", "authorize"]],
  ["middleware/errorHandler", "function"],
  ["middleware/notFound", "function"],
  ["middleware/validateRequest", "function"],
  ["middleware/upload", "multer"],
  ["models/User", "function"],
  ["models/Product", "function"],
  ["models/Cart", "function"],
  ["models/Order", "function"],
  ["utils/generateToken", "function"],
  ["utils/uploadToCloudinary", "function"],
  ["utils/fulfillOrder", "function"],
  ["utils/settleOrder", "function"],
  ["utils/expireOrders", "function"],
  ["utils/paystack", ["initializeTransaction", "verifyTransaction"]],
  ["controllers/authController", ["registerUser", "loginUser", "getMe", "createAdmin"]],
  ["controllers/productController", ["getProducts", "getAdminProducts", "getProductById", "createProduct", "updateProduct", "deleteProduct"]],
  ["controllers/cartController", ["getCart", "addToCart", "updateCartItem", "removeFromCart", "clearCart"]],
  ["controllers/orderController", ["createCheckoutSession", "retryPayment", "handleWebhook", "getMyOrders", "getOrderById", "getAllOrders", "updateOrderStatus"]],
  ["routes/authRoutes", "function"],
  ["routes/productRoutes", "function"],
  ["routes/cartRoutes", "function"],
  ["routes/orderRoutes", "function"],
  ["app", "function"],
];

const describe = (mod) =>
  typeof mod === "object" && mod !== null
    ? `object with keys [${Object.keys(mod).join(", ") || "none"}]`
    : typeof mod;

let failed = 0;

for (const [file, expected] of checks) {
  try {
    const mod = require(path.join(__dirname, "..", file));
    let ok;
    let problem = "";

    if (expected === "function") {
      ok = typeof mod === "function";
      problem = `expected a function, got ${describe(mod)}`;
    } else if (expected === "object") {
      ok = typeof mod === "object" && mod !== null;
      problem = `expected an object, got ${describe(mod)}`;
    } else if (expected === "multer") {
      ok = mod && typeof mod.array === "function";
      problem = `expected a multer instance, got ${describe(mod)}`;
    } else {
      const missing = expected.filter((key) => !mod || typeof mod[key] !== "function");
      ok = missing.length === 0;
      problem = `missing exports: ${missing.join(", ")} (found ${describe(mod)})`;
    }

    if (ok) {
      console.log(`✅ ${file}`);
    } else {
      failed++;
      console.log(`❌ ${file}: ${problem}`);
    }
  } catch (err) {
    failed++;
    console.log(`❌ ${file}: failed to load: ${err.message.split("\n")[0]}`);
  }
}

console.log(failed ? `\n${failed} problem(s) found` : "\nAll modules export what they should");
process.exit(failed ? 1 : 0);