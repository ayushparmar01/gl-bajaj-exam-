const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide section name (e.g. A, B, C)'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Section name cannot exceed 20 characters']
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
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

// Branch-specific section uniqueness
SectionSchema.index({ name: 1, branch: 1 }, { unique: true });
SectionSchema.index({ status: 1 });

module.exports = mongoose.model('Section', SectionSchema);
