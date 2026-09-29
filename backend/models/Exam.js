const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide an exam title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  duration: {
    type: Number,
    required: [true, 'Please provide exam duration in minutes'],
    min: [1, 'Duration must be at least 1 minute']
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  passMarks: {
    type: Number,
    default: 0
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  allowMultipleAttempts: {
    type: Boolean,
    default: false
  },
  hasNegativeMarking: {
    type: Boolean,
    default: false
  },
  negativeMarks: {
    type: Number,
    default: 0,
    min: [0, 'Negative marks cannot be less than 0']
  },
  hasAccessCode: {
    type: Boolean,
    default: false
  },
  accessCode: {
    type: String,
    trim: true,
    default: ''
  },
  requireCamera: {
    type: Boolean,
    default: true
  },
  // Phase 4B: AI Proctoring Configuration
  proctoringConfig: {
    proctoringEnabled: { type: Boolean, default: true },
    cameraRequired: { type: Boolean, default: true },
    microphoneRequired: { type: Boolean, default: true },
    faceDetectionEnabled: { type: Boolean, default: true },
    gazeDetectionEnabled: { type: Boolean, default: true },
    headPoseDetectionEnabled: { type: Boolean, default: true },
    voiceActivityEnabled: { type: Boolean, default: true }
  },
  // Phase 3D: Academic Subject Association
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null
  },
  subjectCode: {
    type: String,
    trim: true,
    default: ''
  },
  // Phase 3D: Audience Targeting Configuration
  audienceType: {
    type: String,
    enum: [
      'ENTIRE_COLLEGE',
      'ACADEMIC_YEAR',
      'BRANCH',
      'SEMESTER',
      'SECTION',
      'BATCH',
      'COMBINATION_TARGET'
    ],
    default: 'ENTIRE_COLLEGE'
  },
  target: {
    academicYears: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear'
      }
    ],
    branches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
      }
    ],
    semesters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Semester'
      }
    ],
    sections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section'
      }
    ],
    batches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch'
      }
    ]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Database Indexes for Efficient Queries
ExamSchema.index({ createdBy: 1 });
ExamSchema.index({ subjectId: 1 });
ExamSchema.index({ audienceType: 1 });
ExamSchema.index({ isPublished: 1, createdAt: -1 });

module.exports = mongoose.model('Exam', ExamSchema);
