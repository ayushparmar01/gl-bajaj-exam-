const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide subject title'],
    trim: true,
    maxlength: [120, 'Subject name cannot exceed 120 characters']
  },
  subjectCode: {
    type: String,
    required: [true, 'Please provide unique subject code (e.g. CS501)'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [30, 'Subject code cannot exceed 30 characters']
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  semester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Semester',
    default: null
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

SubjectSchema.index({ branch: 1, semester: 1 });
SubjectSchema.index({ status: 1 });

module.exports = mongoose.model('Subject', SubjectSchema);
