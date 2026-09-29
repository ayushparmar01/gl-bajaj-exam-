const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide branch/department name (e.g. Computer Science & Engineering)'],
    trim: true,
    maxlength: [100, 'Branch name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Please provide branch code (e.g. CSE)'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Branch code cannot exceed 20 characters']
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

BranchSchema.index({ status: 1 });

module.exports = mongoose.model('Branch', BranchSchema);
