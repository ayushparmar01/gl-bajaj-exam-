const mongoose = require('mongoose');

const ProctoringWarningSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProctoringSession',
    required: [true, 'Session ID is required for proctoring warning']
  },
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamAttempt',
    required: [true, 'Attempt ID is required for proctoring warning']
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam ID is required for proctoring warning']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required for proctoring warning']
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProctoringEvent',
    default: null
  },
  warningType: {
    type: String,
    required: [true, 'Warning type is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Warning message is required'],
    trim: true
  },
  severity: {
    type: String,
    enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'],
    default: 'ACTIVE'
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Non-duplicate targeted indexes for warning engine queries and live monitoring
ProctoringWarningSchema.index({ attemptId: 1, status: 1 });
ProctoringWarningSchema.index({ sessionId: 1, status: 1 });
ProctoringWarningSchema.index({ examId: 1, status: 1 });
ProctoringWarningSchema.index({ studentId: 1, status: 1 });
ProctoringWarningSchema.index({ issuedAt: -1 });

module.exports = mongoose.model('ProctoringWarning', ProctoringWarningSchema);
