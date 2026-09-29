const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Question must belong to an exam']
  },
  questionText: {
    type: String,
    required: [true, 'Please provide question text'],
    trim: true
  },
  options: {
    type: [String],
    required: [true, 'Please provide options'],
    validate: [
      opts => Array.isArray(opts) && opts.length >= 2,
      'Question must have at least 2 options'
    ]
  },
  type: {
    type: String,
    enum: ['SINGLE', 'MULTIPLE'],
    default: 'SINGLE'
  },
  correctAnswer: {
    type: String,
    default: ''
  },
  correctAnswers: {
    type: [String],
    default: []
  },
  marks: {
    type: Number,
    default: 1,
    min: [1, 'Marks must be at least 1']
  },
  explanation: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Question', QuestionSchema);
