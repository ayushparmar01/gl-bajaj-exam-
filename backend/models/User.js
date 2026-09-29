const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  rollNumber: {
    type: String,
    trim: true
  },
  enrollmentNumber: {
    type: String,
    trim: true
  },
  // Teacher Specific Profile Fields
  employeeId: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // Teacher Subject Assignments
  assignedSubjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    }
  ],
  // Teacher Academic Group Assignments
  assignedAcademicGroups: {
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
  // Teacher Exam Permission Overrides
  permissions: {
    canTargetEntireCollege: {
      type: Boolean,
      default: false
    },
    canManageAllSubjects: {
      type: Boolean,
      default: false
    }
  },
  branch: {
    type: String,
    trim: true,
    default: ''
  },
  semester: {
    type: String,
    trim: true,
    default: ''
  },
  section: {
    type: String,
    trim: true,
    default: ''
  },
  batch: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  password: {
    type: String,
    required: function () {
      return this.role !== 'STUDENT' && !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  googleId: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['ADMIN', 'TEACHER', 'STUDENT'],
    default: 'STUDENT'
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  otp: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  otpLastSentAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Partial unique indexes for student credentials and teacher employeeId
UserSchema.index(
  { enrollmentNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { enrollmentNumber: { $type: 'string' } }
  }
);
UserSchema.index(
  { rollNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { rollNumber: { $type: 'string' } }
  }
);
UserSchema.index(
  { employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { employeeId: { $type: 'string' } }
  }
);

// Compound search index for efficient user & faculty queries
UserSchema.index({ name: 'text', email: 'text', rollNumber: 'text', enrollmentNumber: 'text', employeeId: 'text', department: 'text' });

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
