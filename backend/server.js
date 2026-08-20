const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load env vars before anything else
dotenv.config();

const app = require("./app");

const PORT = process.env.PORT || 3001;

// Connect to MongoDB then start server
mongoose
  .connect(process.env.MONGO_URI_DEV)
  .then(async () => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(
        `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });



// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  process.exit(1);
});
