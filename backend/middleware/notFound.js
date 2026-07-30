// Catches any request that doesn't match a defined route
const notFound = (req, res, next) => {
    const error = new Error(`Route not found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
  };
  
  module.exports = notFound;