const mongoose = require('mongoose');

const AcademicYearSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide academic year name (e.g. 2026-27)'],
    trim: true,
    maxlength: [50, 'Academic year name cannot exceed 50 characters']
  },
  code: {
    type: String,
    required: [true, 'Please provide academic year code (e.g. AY2627)'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [30, 'Academic year code cannot exceed 30 characters']
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  isCurrent: {
    type: Boolean,
    default: false
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

AcademicYearSchema.index({ isCurrent: 1 });
AcademicYearSchema.index({ status: 1 });

module.exports = mongoose.model('AcademicYear', AcademicYearSchema);
