const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide batch name (e.g. 2023-2027)'],
    unique: true,
    trim: true,
    maxlength: [50, 'Batch name cannot exceed 50 characters']
  },
  startYear: {
    type: Number,
    min: [2000, 'Start year must be at least 2000'],
    max: [2100, 'Start year cannot exceed 2100'],
    default: null
  },
  endYear: {
    type: Number,
    min: [2000, 'End year must be at least 2000'],
    max: [2100, 'End year cannot exceed 2100'],
    default: null
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

BatchSchema.index({ status: 1 });

module.exports = mongoose.model('Batch', BatchSchema);
