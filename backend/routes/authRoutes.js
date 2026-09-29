const express = require('express');
const router = express.Router();
const {
  register,
  verifyOTP,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  getMe,
  getStudents,
  createAdminUser
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { authLimiter, otpLimiter } = require('../middleware/rateLimitMiddleware');

// Public Auth Endpoints with Rate Limiting
router.post('/register', otpLimiter, register);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', otpLimiter, resetPassword);

// Protected User Profile
router.get('/me', protect, getMe);

// Admin Only User Management
router.get('/students', protect, authorizeRoles('ADMIN'), getStudents);
router.post('/admin/create-admin', protect, authorizeRoles('ADMIN'), createAdminUser);

module.exports = router;
