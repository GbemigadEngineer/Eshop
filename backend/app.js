const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
// const swaggerUi = require("swagger-ui-express");
// const swaggerSpec = require("./config/swagger");

const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/authRoutes");

const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

// Route imports

const app = express();

app.set("trust proxy", 1);

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use("/api", limiter);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Logging (dev only) ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "E-commerce API is running 🚀" });
});

// ─── API Documentation (dev only) ───────────────────────────────────────────
// if (process.env.NODE_ENV === "development") {
//   app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
//   console.log("📚 Swagger docs available at http://localhost:5000/api-docs");
// }

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
