const mongoose = require('mongoose');
const crypto = require('crypto');

const AnswerDetailSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  questionType: {
    type: String,
    enum: ['SINGLE', 'MULTIPLE'],
    default: 'SINGLE'
  },
  selectedAnswer: {
    type: String,
    default: ''
  },
  selectedAnswers: {
    type: [String],
    default: []
  },
  correctAnswer: {
    type: String
  },
  correctAnswers: {
    type: [String],
    default: []
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  marksObtained: {
    type: Number,
    default: 0
  }
}, { _id: false });

const ResultSchema = new mongoose.Schema({
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
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamAttempt',
    default: null
  },
  verificationId: {
    type: String,
    unique: true,
    sparse: true,
    default: () => 'GLB-VRF-' + crypto.randomBytes(6).toString('hex').toUpperCase()
  },
  answers: [AnswerDetailSchema],
  score: {
    type: Number,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  wrongAnswers: {
    type: Number,
    required: true
  },
  unattempted: {
    type: Number,
    required: true
  },
  negativeMarksDeducted: {
    type: Number,
    default: 0
  },
  timeTaken: {
    type: String,
    default: '00:00'
  },
  warningCount: {
    type: Number,
    default: 0
  },
  submissionReason: {
    type: String,
    enum: ['NORMAL', 'TIMEOUT', 'TAB_SWITCH_LIMIT', 'ADMIN_DISQUALIFIED'],
    default: 'NORMAL'
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
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure attemptId is unique when present (ObjectId) while safely permitting multiple null/missing legacy results
ResultSchema.index(
  { attemptId: 1 },
  {
    unique: true,
    partialFilterExpression: { attemptId: { $type: 'objectId' } }
  }
);

// Composite index to facilitate fast queries and ensure indexing on student and exam
ResultSchema.index({ studentId: 1, examId: 1 });

module.exports = mongoose.model('Result', ResultSchema);
