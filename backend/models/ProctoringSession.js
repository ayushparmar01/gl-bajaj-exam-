const mongoose = require('mongoose');

const ProctoringSessionSchema = new mongoose.Schema({
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamAttempt',
    required: [true, 'Attempt ID is required for proctoring session'],
    unique: true
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam ID is required for proctoring session']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required for proctoring session']
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'DISCONNECTED', 'ENDED', 'TERMINATED'],
    default: 'ACTIVE'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  lastHeartbeatAt: {
    type: Date,
    default: Date.now
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  disconnectedAt: {
    type: Date,
    default: null
  },
  reconnectCount: {
    type: Number,
    default: 0,
    min: 0
  },
  warningCount: {
    type: Number,
    default: 0,
    min: 0
  },
  violationCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Database indexes for fast querying and live monitor filtering
// Note: attemptId is already unique via field definition above
ProctoringSessionSchema.index({ examId: 1, status: 1 });
ProctoringSessionSchema.index({ studentId: 1, status: 1 });
ProctoringSessionSchema.index({ lastHeartbeatAt: -1 });

module.exports = mongoose.model('ProctoringSession', ProctoringSessionSchema);
