const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Server Error";

  if (err.name === "CastError") {
    statusCode = 400;
    message = `Resource not found. Invalid: ${err.path}`;
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value entered for field: ${field}`;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(", ");
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your session has expired. Please log in again.";
  }

  if (err.name === "MulterError") {
    statusCode = 400;
    message =
      err.code === "LIMIT_FILE_SIZE" ? "Each image must be 5MB or smaller" : err.message;
  }

  // Paystack (axios) failures
  if (err.isAxiosError) {
    statusCode = 502;
    message = (err.response && err.response.data && err.response.data.message) || err.message;
  }

  // Cloudinary failures arrive as plain objects with http_code
  if (err.http_code && !err.statusCode) {
    statusCode = 502;
    message = `Image upload failed: ${err.message}`;
  }

  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Server Error";
  }

  console.error(`❌ ${statusCode} - ${message}`);
  if (process.env.NODE_ENV === "development" && err.stack) console.error(err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && err.stack && { stack: err.stack }),
  });
};

module.exports = errorHandler;