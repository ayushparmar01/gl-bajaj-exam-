const express = require('express');
const router = express.Router();
const {
  initProctoringSession,
  getProctoringSession,
  sendHeartbeat,
  endProctoringSession,
  recordProctoringEvent,
  getAttemptWarnings,
  updateWarningStatus,
  getLiveSessions,
  disqualifySession,
  grantExtraTime,
  resetWarnings,
  sendProctorMessage
} = require('../controllers/proctorController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validator');
const { sensitiveAdminLimiter } = require('../middleware/rateLimitMiddleware');

// All proctoring routes require authentication
router.use(protect);

// ==========================================
// 1. Session Lifecycle & Event Ingestion Endpoints
// ==========================================
router.post('/sessions/:attemptId/init', validateObjectId('attemptId'), initProctoringSession);
router.post('/sessions/:attemptId/heartbeat', validateObjectId('attemptId'), sendHeartbeat);
router.post('/sessions/:attemptId/events', validateObjectId('attemptId'), recordProctoringEvent);
router.post('/sessions/:attemptId/end', validateObjectId('attemptId'), endProctoringSession);
router.get('/sessions/:attemptId', validateObjectId('attemptId'), getProctoringSession);
router.get('/sessions/:attemptId/warnings', validateObjectId('attemptId'), getAttemptWarnings);

// ==========================================
// 2. Teacher & Admin Warning Management
// ==========================================
router.post('/warnings/:warningId/action', authorizeRoles('ADMIN', 'TEACHER'), validateObjectId('warningId'), updateWarningStatus);

// ==========================================
// 3. Live Proctoring Monitor & Intervention Endpoints (Admin & Teacher)
// ==========================================
router.get('/live-sessions', authorizeRoles('ADMIN', 'TEACHER'), getLiveSessions);
router.post('/sessions/:id/disqualify', authorizeRoles('ADMIN', 'TEACHER'), sensitiveAdminLimiter, validateObjectId('id'), disqualifySession);
router.post('/sessions/:id/grant-time', authorizeRoles('ADMIN', 'TEACHER'), sensitiveAdminLimiter, validateObjectId('id'), grantExtraTime);
router.post('/sessions/:id/reset-warnings', authorizeRoles('ADMIN', 'TEACHER'), sensitiveAdminLimiter, validateObjectId('id'), resetWarnings);
router.post('/sessions/:id/send-message', authorizeRoles('ADMIN', 'TEACHER'), sensitiveAdminLimiter, validateObjectId('id'), sendProctorMessage);

module.exports = router;

