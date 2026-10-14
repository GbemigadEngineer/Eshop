const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config(); // must run before ./app is required
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const app = require("./app");
const startOrderExpiryJob = require("./utils/expireOrders");

const PORT = process.env.PORT || 3001;

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URI_DEV);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  startOrderExpiryJob();
};

start();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err && err.message ? err.message : err);
  process.exit(1);
});