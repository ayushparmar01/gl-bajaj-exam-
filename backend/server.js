// Polyfill browser globals (DOMMatrix, Path2D, ImageData) for Node.js / Vercel Serverless
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
      this.is2D = true;
      this.isIdentity = true;
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    transformPoint(p) { return p; }
  };
}
if (typeof globalThis.Path2D === 'undefined') globalThis.Path2D = class Path2D {};
if (typeof globalThis.ImageData === 'undefined') globalThis.ImageData = class ImageData {};

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const securityHeaders = require('./middleware/securityHeaders');
const { generalApiLimiter } = require('./middleware/rateLimitMiddleware');
const initProctorSocket = require('./sockets/proctorSocket');

// Ensure .env is loaded from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

// SECURITY: Verify JWT_SECRET environment variable is configured
if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET environment variable is not defined in production. Exiting for security.');
    process.exit(1);
  } else {
    console.warn('⚠️  WARNING: JWT_SECRET is not set in your .env file. Please define JWT_SECRET in backend/.env.');
    process.env.JWT_SECRET = 'glb_examsphere_dev_jwt_secret_change_in_production_key_2026';
  }
}

// Ensure uploads directory exists (gracefully handle read-only environments like Vercel)
try {
  const uploadsDir = path.join(__dirname, 'uploads', 'questions');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem on serverless; uploads will fallback to /tmp
}

const mongoose = require('mongoose');

// Connect Database
connectDB().catch((err) => {
  console.warn('Initial DB connection attempt:', err.message);
});

const app = express();

// SECURITY: Apply Security HTTP Headers
app.use(securityHeaders);

// CORS Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

// Body Parsers with safe payload limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'ignore',
  maxAge: '1d'
}));
if (process.env.VERCEL) {
  app.use('/uploads', express.static('/tmp/uploads', {
    dotfiles: 'ignore'
  }));
}

// Root Route (instant 200 OK so visiting backend root URL never fails)
app.get('/', async (req, res) => {
  let dbError = null;
  try {
    await connectDB();
  } catch (err) {
    dbError = err.message;
  }
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    message: 'GLB EXAMSPHERE API Server is running',
    database: isDbConnected ? 'connected' : (mongoose.connection.readyState === 2 ? 'connecting' : 'disconnected'),
    readyState: mongoose.connection.readyState,
    error: process.env.NODE_ENV === 'production' ? null : dbError,
    environment: (process.env.NODE_ENV || 'development').trim(),
    serverless: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString()
  });
});

// Healthcheck Route
app.get('/api/health', async (req, res) => {
  let dbError = null;
  try {
    await connectDB();
  } catch (err) {
    dbError = err.message;
  }
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    message: 'GLB EXAMSPHERE API is running',
    database: isDbConnected ? 'connected' : (mongoose.connection.readyState === 2 ? 'connecting' : 'disconnected'),
    readyState: mongoose.connection.readyState,
    error: process.env.NODE_ENV === 'production' ? null : dbError,
    environment: (process.env.NODE_ENV || 'development').trim(),
    serverless: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString()
  });
});

// Apply general API rate limiting to all /api routes
app.use('/api', generalApiLimiter);

// Ensure DB is connected before processing operational API routes
app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({
      success: false,
      message: 'Database service unavailable'
    });
  }
});

// Operational API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin/students', require('./routes/studentRoutes'));
app.use('/api/admin/teachers', require('./routes/teacherRoutes'));
app.use('/api/admin/academic', require('./routes/academicRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/proctor', require('./routes/proctorRoutes'));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found - ${req.originalUrl}`
  });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize Socket.io with CORS & payload buffer
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  },
  maxHttpBufferSize: 2e6 // 2MB buffer
});

// Attach io to express app so REST controllers can broadcast events
app.set('io', io);

// Initialize Real-time Proctoring Socket Handler (with JWT verification)
initProctorSocket(io);

// Only listen on port in non-test and non-serverless environments
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;
module.exports.server = server;
