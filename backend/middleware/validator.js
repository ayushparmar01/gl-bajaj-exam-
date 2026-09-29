const mongoose = require('mongoose');

/**
 * Validate that one or more route params are valid MongoDB ObjectIds
 */
const validateObjectId = (...paramNames) => {
  return (req, res, next) => {
    for (const param of paramNames) {
      const val = req.params[param];
      if (val && !mongoose.Types.ObjectId.isValid(val)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ID format for parameter '${param}'`
        });
      }
    }
    next();
  };
};

/**
 * Email validation regex helper
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Clean and normalize string input
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim();
};

module.exports = {
  validateObjectId,
  isValidEmail,
  sanitizeString
};
