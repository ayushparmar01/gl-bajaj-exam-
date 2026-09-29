/**
 * Centralized Error Handling Middleware
 * Protects against internal implementation detail leaks, stack traces, and database connection strings
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with specified identifier`;
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token signature';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
  }

  // Log internal errors on server (masking sensitive tokens/passwords)
  if (statusCode >= 500) {
    console.error('Server Internal Error:', {
      message: err.message,
      path: req.originalUrl,
      method: req.method,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }

  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode === 500 ? 'An unexpected server error occurred. Please try again later.' : message,
    stack: isProd ? null : err.stack
  });
};

module.exports = { errorHandler };
