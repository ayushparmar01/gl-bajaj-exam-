const mongoose = require('mongoose');

const ProctoringEventSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProctoringSession',
    required: [true, 'Session ID is required for proctoring event']
  },
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamAttempt',
    required: [true, 'Attempt ID is required for proctoring event']
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam ID is required for proctoring event']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required for proctoring event']
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: [
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
    ]
  },
  severity: {
    type: String,
    enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'WARNING', 'CRITICAL'],
    default: 'INFO'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  serverTimestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Database indexes for audit logs and real-time monitoring queries
ProctoringEventSchema.index({ sessionId: 1, serverTimestamp: -1 });
ProctoringEventSchema.index({ attemptId: 1, eventType: 1 });
ProctoringEventSchema.index({ studentId: 1, serverTimestamp: -1 });

module.exports = mongoose.model('ProctoringEvent', ProctoringEventSchema);
