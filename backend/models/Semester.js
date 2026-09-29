const mongoose = require('mongoose');

const SemesterSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: [true, 'Please provide semester number (1-12)'],
    unique: true,
    min: [1, 'Semester number must be at least 1'],
    max: [12, 'Semester number cannot exceed 12']
  },
  name: {
    type: String,
    required: [true, 'Please provide semester label (e.g. Semester 5)'],
    trim: true,
    maxlength: [50, 'Semester name cannot exceed 50 characters']
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

SemesterSchema.index({ status: 1 });

module.exports = mongoose.model('Semester', SemesterSchema);
