const mongoose = require('mongoose');
const ProctoringEvent = require('../models/ProctoringEvent');
const ProctoringSession = require('../models/ProctoringSession');
const ExamAttempt = require('../models/ExamAttempt');
const { evaluateEvent } = require('./warningEngine');

// List of allowed client-reported proctoring event types
const ALLOWED_EVENT_TYPES = new Set([
  // Session Lifecycle
  'SESSION_STARTED',
  'SESSION_RESUMED',
  'HEARTBEAT',
  'SOCKET_CONNECTED',
  'SOCKET_DISCONNECTED',
  'SESSION_ENDED',
  // Browser & Window State
  'TAB_HIDDEN',
  'TAB_VISIBLE',
  'WINDOW_BLUR',
  'WINDOW_FOCUS',
  'FULLSCREEN_ENTERED',
  'FULLSCREEN_EXITED',
  'PAGE_RELOADED',
  // Camera Lifecycle
  'CAMERA_PERMISSION_GRANTED',
  'CAMERA_PERMISSION_DENIED',
  'CAMERA_UNAVAILABLE',
  'CAMERA_TRACK_ENDED',
  // Face Detection
  'FACE_DETECTED',
  'FACE_LOST',
  'MULTIPLE_FACES_DETECTED',
  'MULTIPLE_FACES_CLEARED',
  // Eye & Gaze Estimation
  'GAZE_CENTER',
  'GAZE_LEFT',
  'GAZE_RIGHT',
  'GAZE_UP',
  'GAZE_DOWN',
  'GAZE_AWAY',
  // Head Pose Estimation
  'HEAD_FORWARD',
  'HEAD_LEFT',
  'HEAD_RIGHT',
  'HEAD_UP',
  'HEAD_DOWN',
  'HEAD_AWAY',
  // Microphone Lifecycle
  'MIC_PERMISSION_GRANTED',
  'MIC_PERMISSION_DENIED',
  'MIC_UNAVAILABLE',
  'MIC_TRACK_ENDED',
  // Voice Activity Detection
  'VOICE_ACTIVITY_STARTED',
  'VOICE_ACTIVITY_STOPPED'
]);

// Map default severity for events
const EVENT_SEVERITY_MAP = {
  FACE_LOST: 'MEDIUM',
  MULTIPLE_FACES_DETECTED: 'HIGH',
  MULTIPLE_FACES_CLEARED: 'INFO',
  FACE_DETECTED: 'INFO',
  GAZE_AWAY: 'LOW',
  GAZE_CENTER: 'INFO',
  HEAD_AWAY: 'LOW',
  HEAD_FORWARD: 'INFO',
  TAB_HIDDEN: 'MEDIUM',
  TAB_VISIBLE: 'INFO',
  WINDOW_BLUR: 'LOW',
  WINDOW_FOCUS: 'INFO',
  FULLSCREEN_EXITED: 'HIGH',
  FULLSCREEN_ENTERED: 'INFO',
  VOICE_ACTIVITY_STARTED: 'LOW',
  VOICE_ACTIVITY_STOPPED: 'INFO',
  CAMERA_UNAVAILABLE: 'HIGH',
  CAMERA_PERMISSION_DENIED: 'HIGH',
  MIC_UNAVAILABLE: 'MEDIUM',
  MIC_PERMISSION_DENIED: 'MEDIUM'
};

/**
 * Ingest, validate, persist, and process a proctoring event
 *
 * @param {Object} params
 * @param {string} params.attemptId
 * @param {string} params.studentId
 * @param {string} params.eventType
 * @param {Object} [params.metadata]
 * @param {Object} [io] Socket.IO instance for real-time broadcast
 * @returns {Promise<{ event: Object, warning: Object|null }>}
 */
async function processProctoringEvent({ attemptId, studentId, eventType, metadata = {} }, io = null) {
  if (!attemptId || !mongoose.Types.ObjectId.isValid(attemptId)) {
    const err = new Error('Invalid attempt ID format');
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    const err = new Error(`Unknown or unauthorized proctoring event type: '${eventType}'`);
    err.statusCode = 400;
    throw err;
  }

  // Metadata safety: ensure metadata is an object and under 10KB
  const safeMetadata = typeof metadata === 'object' && metadata !== null ? metadata : {};
  const metadataString = JSON.stringify(safeMetadata);
  if (metadataString.length > 10240) {
    const err = new Error('Event metadata payload exceeds maximum allowed size (10KB)');
    err.statusCode = 400;
    throw err;
  }

  // Fetch verified active attempt
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) {
    const err = new Error('Exam attempt not found');
    err.statusCode = 404;
    throw err;
  }

  // Verify ownership
  if (attempt.studentId.toString() !== studentId.toString()) {
    const err = new Error('Ownership verification failed: Attempt does not belong to student');
    err.statusCode = 403;
    throw err;
  }

  // Fetch or find active ProctoringSession
  let session = await ProctoringSession.findOne({ attemptId });
  if (!session) {
    session = await ProctoringSession.create({
      attemptId: attempt._id,
      examId: attempt.examId,
      studentId: attempt.studentId,
      status: 'ACTIVE',
      startedAt: new Date(),
      connectedAt: new Date(),
      lastHeartbeatAt: new Date()
    });
  }

  const severity = EVENT_SEVERITY_MAP[eventType] || 'INFO';
  const serverTimestamp = new Date();

  // Create immutable event document
  const eventDoc = await ProctoringEvent.create({
    sessionId: session._id,
    attemptId: attempt._id,
    examId: attempt.examId,
    studentId: attempt.studentId,
    eventType,
    severity,
    metadata: safeMetadata,
    serverTimestamp
  });

  // Evaluate warning rules
  const warning = await evaluateEvent(eventDoc);

  // Real-time broadcast via Socket.IO if available
  if (io) {
    try {
      const proctorNs = io.of('/proctor');
      const examRoom = `exam_${attempt.examId}`;
      const studentRoom = `attempt_${attempt._id}`;

      const eventPayload = {
        eventId: eventDoc._id,
        attemptId: attempt._id,
        examId: attempt.examId,
        studentId: attempt.studentId,
        eventType,
        severity,
        metadata: safeMetadata,
        timestamp: serverTimestamp.toISOString()
      };

      // Broadcast event to proctors/teachers watching this exam and global admin monitor
      proctorNs.to(examRoom).to('exam_ALL').emit('proctor:event', eventPayload);

      // If a warning was generated, emit live warning to student and proctors
      if (warning) {
        const warningPayload = {
          warningId: warning._id,
          attemptId: attempt._id,
          examId: attempt.examId,
          studentId: attempt.studentId,
          warningType: warning.warningType,
          message: warning.message,
          severity: warning.severity,
          status: warning.status,
          issuedAt: warning.issuedAt.toISOString()
        };

        // Notify student screen immediately
        proctorNs.to(studentRoom).emit('proctor:warning', warningPayload);
        // Notify proctors/teachers
        proctorNs.to(examRoom).to('exam_ALL').emit('proctor:warning-alert', warningPayload);
      }
    } catch (sockErr) {
      console.warn('Socket proctor event broadcast error:', sockErr.message);
    }
  }

  return { event: eventDoc, warning };
}

module.exports = {
  ALLOWED_EVENT_TYPES,
  processProctoringEvent
};
