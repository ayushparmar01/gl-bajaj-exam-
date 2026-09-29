const mongoose = require('mongoose');

const ExamAttemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'],
    default: 'IN_PROGRESS'
  },
  savedAnswers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  markedForReview: {
    type: [String],
    default: []
  },
  warningCount: {
    type: Number,
    default: 0,
    min: 0
  },
  disqualified: {
    type: Boolean,
    default: false
  },
  disqualificationReason: {
    type: String,
    default: ''
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  extraTimeMinutes: {
    type: Number,
    default: 0
  },
  adminBroadcastMessage: {
    type: String,
    default: ''
  },
  cameraStatus: {
    type: String,
    enum: ['ACTIVE', 'DISCONNECTED', 'BLOCKED', 'NOT_REQUIRED', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  latestCameraSnapshot: {
    type: String,
    default: ''
  },
  proctorLogs: [
    {
      timestamp: {
        type: Date,
        default: Date.now
      },
      eventType: {
        type: String,
        required: true
      },
      reason: {
        type: String,
        default: ''
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ExamAttempt', ExamAttemptSchema);
