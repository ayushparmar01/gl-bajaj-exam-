const User = require('../models/User');
const generateOTP = require('../utils/generateOTP');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');
const { isValidEmail } = require('../middleware/validator');

const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown between OTP sends
const MAX_OTP_ATTEMPTS = 5; // Max invalid OTP attempts before invalidation

// @desc    Google OAuth Login for Students (Pre-registered college accounts only)
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Google ID token'
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : '';

    let payload;

    // Support offline test / mock demo tokens during automated test suite or local dev
    if (idToken.includes('.') && (process.env.NODE_ENV === 'test' || !clientId)) {
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (decoded && decoded.email) {
            payload = {
              email: decoded.email,
              name: decoded.name || decoded.email.split('@')[0],
              sub: decoded.sub || `mock_google_${Date.now()}`,
              picture: decoded.picture || null,
              iss: 'accounts.google.com'
            };
          }
        }
      } catch (mockErr) {
        // Fallback to real verification
      }
    }

    if (!payload) {
      if (!clientId) {
        return res.status(500).json({
          success: false,
          message: 'Google authentication is not configured on the server (missing GOOGLE_CLIENT_ID)'
        });
      }

      try {
        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({
          idToken,
          audience: clientId
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        return res.status(401).json({
          success: false,
          message: 'Google authentication failed: Invalid, expired, or untrusted Google token'
        });
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: 'Could not retrieve verified email from Google ID token'
      });
    }

    // Validate token issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (payload.iss && !validIssuers.includes(payload.iss)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token issuer'
      });
    }

    const { email, name, sub: googleId, picture: avatar } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Configurable College Email Domain Restriction
    const collegeDomainConfig = (process.env.COLLEGE_EMAIL_DOMAIN || '').trim();
    if (collegeDomainConfig) {
      const allowedDomains = collegeDomainConfig
        .split(',')
        .map(d => d.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean);

      if (allowedDomains.length > 0) {
        const emailParts = normalizedEmail.split('@');
        const emailDomain = emailParts[1] ? emailParts[1].toLowerCase() : '';
        const isDomainAllowed = allowedDomains.includes(emailDomain);

        if (!isDomainAllowed) {
          return res.status(403).json({
            success: false,
            message: `Invalid email domain. Only official college email accounts (@${allowedDomains.join(', @')}) are permitted.`
          });
        }
      }
    }

    // 2. Search MongoDB for existing student user by verified email or googleId
    const user = await User.findOne({
      $or: [{ email: normalizedEmail }, { googleId }]
    });

    // 3. REJECT UNKNOWN GOOGLE ACCOUNT: Public self-registration is disabled
    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Your college account is not registered for GLB ExamSphere. Please contact the administrator.'
      });
    }

    // 4. ROLE RESTRICTION: Student Google Login is restricted to STUDENT accounts
    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Google authentication is restricted to student accounts. Faculty and administrators must sign in via institutional credentials.'
      });
    }

    // 5. STATUS CHECK: Reject if student account is deactivated/inactive
    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Student account is inactive. Please contact the administrator.'
      });
    }

    // 6. Update student Google profile metadata if needed
    let needsSave = false;
    if (!user.googleId) {
      user.googleId = googleId;
      needsSave = true;
    }
    if (!user.avatar && avatar) {
      user.avatar = avatar;
      needsSave = true;
    }
    if (!user.isVerified) {
      user.isVerified = true;
      user.otp = null;
      user.otpExpiry = null;
      user.otpAttempts = 0;
      needsSave = true;
    }
    if (needsSave) {
      await user.save();
    }

    const token = generateToken(user._id, user.role);

    // 7. Return authenticated student's permitted academic profile
    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        rollNumber: user.rollNumber || null,
        enrollmentNumber: user.enrollmentNumber || null,
        branch: user.branch || '',
        semester: user.semester || '',
        section: user.section || '',
        batch: user.batch || '',
        status: user.status,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register new user (Disabled for public self-registration; managed via Admin preloaded students)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  return res.status(403).json({
    success: false,
    message: 'Public registration is disabled. Student accounts are preloaded and managed by college administration.'
  });
};

// @desc    Verify OTP for registration or verification
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanOtp = otp ? String(otp).trim() : '';

    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP'
      });
    }

    // Check maximum failed OTP attempts
    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      user.otp = null;
      user.otpExpiry = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect OTP attempts. The OTP has been invalidated. Please request a new one.'
      });
    }

    if (user.otpExpiry && user.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (!user.otp || user.otp !== cleanOtp) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - user.otpAttempts);
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. You have ${remainingAttempts} attempts remaining.`
      });
    }

    // OTP is valid
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    User Login (Normal student login: Email + Password, No OTP)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is deactivated
    if (user.status === 'INACTIVE') {
      const roleLabel = user.role === 'TEACHER' ? 'Teacher' : (user.role === 'ADMIN' ? 'Admin' : 'Student');
      return res.status(403).json({
        success: false,
        message: `Your ${roleLabel} account is inactive. Please contact your college administrator.`
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // For legacy unverified accounts, resend OTP if required
    if (!user.isVerified) {
      let otp = user.otp;
      const now = Date.now();
      const shouldGenerateNew = !otp || !user.otpLastSentAt || (now - new Date(user.otpLastSentAt).getTime() >= OTP_COOLDOWN_MS);

      if (shouldGenerateNew) {
        otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(now + 10 * 60 * 1000);
        user.otpAttempts = 0;
        user.otpLastSentAt = new Date();
        await user.save();

        sendEmail({
          email: user.email,
          subject: 'GLB EXAMSPHERE - Verify Your Email',
          message: `Your verification code is: ${otp}. Valid for 10 minutes.`
        }).catch((mailErr) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Login verification email delivery notice:', mailErr.message);
          }
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Account not verified. A verification OTP has been sent to your email.',
        requiresVerification: true,
        email: user.email,
        fallbackOtp: process.env.NODE_ENV === 'development' ? otp : null
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        employeeId: user.employeeId || null,
        department: user.department || '',
        phone: user.phone || '',
        rollNumber: user.rollNumber || null,
        enrollmentNumber: user.enrollmentNumber || null,
        branch: user.branch || '',
        semester: user.semester || '',
        section: user.section || '',
        batch: user.batch || '',
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password - Send OTP (Protected against user enumeration)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    // SECURITY: Return generic success message even if user not found to prevent user enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset OTP has been sent.'
      });
    }

    // Check cooldown
    if (user.otpLastSentAt && (Date.now() - new Date(user.otpLastSentAt).getTime()) < OTP_COOLDOWN_MS) {
      const remainingSecs = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - new Date(user.otpLastSentAt).getTime())) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSecs} seconds before requesting another OTP.`
      });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    await user.save();

    sendEmail({
      email: user.email,
      subject: 'GLB EXAMSPHERE - Password Reset OTP',
      message: `Your password reset code is: ${otp}. Valid for 10 minutes.`
    }).catch((mailErr) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Password reset email delivery notice:', mailErr.message);
      }
    });

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset OTP has been sent.',
      data: {
        email: user.email,
        fallbackOtp: process.env.NODE_ENV === 'development' ? otp : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanOtp = otp ? String(otp).trim() : '';

    if (!cleanEmail || !cleanOtp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP, and new password'
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP'
      });
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      user.otp = null;
      user.otpExpiry = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect OTP attempts. Please request a new password reset OTP.'
      });
    }

    if (user.otpExpiry && user.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new password reset.'
      });
    }

    if (!user.otp || user.otp !== cleanOtp) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - user.otpAttempts);
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. You have ${remainingAttempts} attempts remaining.`
      });
    }

    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    user.isVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        employeeId: user.employeeId || null,
        department: user.department || '',
        phone: user.phone || '',
        rollNumber: user.rollNumber,
        enrollmentNumber: user.enrollmentNumber,
        branch: user.branch,
        semester: user.semester,
        section: user.section,
        batch: user.batch,
        avatar: user.avatar,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered students (Admin legacy endpoint)
// @route   GET /api/auth/students
// @access  Private/Admin
exports.getStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'STUDENT' })
      .select('-password -otp -otpExpiry -otpAttempts -otpLastSentAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Admin account (Admin only)
// @route   POST /api/auth/admin/create-admin
// @access  Private/Admin
exports.createAdminUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanName = name ? name.trim() : '';

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password for the new admin'
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Admin password must be at least 8 characters'
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user already exists with this email address'
      });
    }

    const newAdmin = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true
    });

    res.status(201).json({
      success: true,
      message: 'New Admin account created successfully',
      data: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });
  } catch (error) {
    next(error);
  }
};
