const Question = require('../models/Question');
const Exam = require('../models/Exam');
const mongoose = require('mongoose');
const { extractTextFromPdf, parseQuestionsFromText, extractQuestionsWithGemini } = require('../utils/pdfParser');

// Recalculate exam total marks
const updateExamTotalMarks = async (examId) => {
  const questions = await Question.find({ examId });
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  await Exam.findByIdAndUpdate(examId, { totalMarks });
};

// Helper to check if a user is allowed to modify questions for an exam
const checkExamOwnership = (user, exam) => {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'TEACHER') {
    const creatorId = exam.createdBy ? exam.createdBy.toString() : '';
    return creatorId === user.id.toString();
  }
  return false;
};

// @desc    Add question to exam
// @route   POST /api/exams/:examId/questions
// @access  Private (ADMIN, TEACHER)
exports.addQuestion = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { questionText, options, correctAnswer, correctAnswers, type, marks, explanation, imageUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID format'
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    if (!checkExamOwnership(req.user, exam)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to add questions to another instructor\'s exam'
      });
    }

    const cleanText = questionText ? String(questionText).trim() : '';
    if (!cleanText || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide questionText and an options array with at least 2 options'
      });
    }

    const cleanOptions = options.map((opt) => String(opt).trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Question must have at least 2 non-empty options'
      });
    }

    const qType = type === 'MULTIPLE' ? 'MULTIPLE' : 'SINGLE';

    if (qType === 'SINGLE') {
      const cleanCorrect = correctAnswer ? String(correctAnswer).trim() : '';
      if (!cleanCorrect || !cleanOptions.includes(cleanCorrect)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid correct answer matching one of the options'
        });
      }
    } else {
      const rawAnswers = Array.isArray(correctAnswers) ? correctAnswers.map((a) => String(a).trim()) : [];
      const validAnswers = rawAnswers.filter((a) => cleanOptions.includes(a));
      if (validAnswers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please select at least one valid correct option for multi-select question'
        });
      }
    }

    const finalCorrectAnswer =
      qType === 'SINGLE'
        ? String(correctAnswer).trim()
        : correctAnswers && correctAnswers[0]
        ? String(correctAnswers[0]).trim()
        : '';

    const finalCorrectAnswers =
      qType === 'MULTIPLE'
        ? correctAnswers.map((a) => String(a).trim()).filter((a) => cleanOptions.includes(a))
        : [String(correctAnswer).trim()];

    const question = await Question.create({
      examId,
      questionText: cleanText,
      options: cleanOptions,
      type: qType,
      correctAnswer: finalCorrectAnswer,
      correctAnswers: finalCorrectAnswers,
      marks: Math.max(1, Number(marks) || 1),
      explanation: explanation ? String(explanation).trim() : '',
      imageUrl: imageUrl ? String(imageUrl).trim() : null
    });

    await updateExamTotalMarks(examId);

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: question
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all questions for an exam (Admin/Teacher mode - includes correctAnswer)
// @route   GET /api/exams/:examId/questions
// @access  Private (ADMIN, TEACHER)
exports.getQuestionsForExamAdmin = async (req, res, next) => {
  try {
    const { examId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID format'
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    if (!checkExamOwnership(req.user, exam)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view questions for another instructor\'s exam'
      });
    }

    const questions = await Question.find({ examId }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single question
// @route   PUT /api/questions/:id
// @access  Private (ADMIN, TEACHER)
exports.updateQuestion = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format'
      });
    }

    let question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const exam = await Exam.findById(question.examId);
    if (exam && !checkExamOwnership(req.user, exam)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to modify questions for another instructor\'s exam'
      });
    }

    const { questionText, options, correctAnswer, correctAnswers, type, marks, explanation, imageUrl } = req.body;

    if (type !== undefined) question.type = type === 'MULTIPLE' ? 'MULTIPLE' : 'SINGLE';
    if (questionText !== undefined) {
      const cleanText = String(questionText).trim();
      if (!cleanText) return res.status(400).json({ success: false, message: 'Question text cannot be empty' });
      question.questionText = cleanText;
    }

    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Question must have at least 2 options'
        });
      }
      question.options = options.map((opt) => String(opt).trim()).filter(Boolean);
    }

    if (question.type === 'SINGLE') {
      if (correctAnswer !== undefined) {
        const cleanCorrect = String(correctAnswer).trim();
        if (!question.options.includes(cleanCorrect)) {
          return res.status(400).json({
            success: false,
            message: 'Correct answer must match one of the options'
          });
        }
        question.correctAnswer = cleanCorrect;
        question.correctAnswers = [cleanCorrect];
      }
    } else {
      if (correctAnswers !== undefined) {
        const cleanCorrects = Array.isArray(correctAnswers) ? correctAnswers.map((a) => String(a).trim()) : [];
        const validAnswers = cleanCorrects.filter((a) => question.options.includes(a));
        if (validAnswers.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Please select at least one valid correct option for multi-select question'
          });
        }
        question.correctAnswers = validAnswers;
        question.correctAnswer = validAnswers[0] || '';
      }
    }

    if (marks !== undefined) question.marks = Math.max(1, Number(marks) || 1);
    if (explanation !== undefined) question.explanation = String(explanation).trim();
    if (imageUrl !== undefined) question.imageUrl = imageUrl ? String(imageUrl).trim() : null;

    await question.save();
    await updateExamTotalMarks(question.examId);

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: question
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete single question
// @route   DELETE /api/questions/:id
// @access  Private (ADMIN, TEACHER)
exports.deleteQuestion = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format'
      });
    }

    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const exam = await Exam.findById(question.examId);
    if (exam && !checkExamOwnership(req.user, exam)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete questions from another instructor\'s exam'
      });
    }

    const examId = question.examId;
    await question.deleteOne();
    await updateExamTotalMarks(examId);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Extract questions from uploaded PDF
// @route   POST /api/exams/:examId/questions/extract-pdf
// @access  Private (ADMIN, TEACHER)
exports.extractQuestionsFromPdf = async (req, res, next) => {
  try {
    const { examId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID format'
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    if (!checkExamOwnership(req.user, exam)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to import questions into another instructor\'s exam'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file'
      });
    }

    const { useAi, geminiApiKey } = req.body;
    let questions = [];
    let methodUsed = 'local';
    let rawText = '';

    try {
      rawText = await extractTextFromPdf(req.file.buffer);
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        message: `Could not read PDF text: ${parseErr.message}`
      });
    }

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No readable text could be extracted from this PDF. It might be scanned as images.'
      });
    }

    const shouldTryAi = (useAi === 'true' || useAi === true) && (geminiApiKey || process.env.GEMINI_API_KEY);

    if (shouldTryAi) {
      try {
        questions = await extractQuestionsWithGemini(rawText, geminiApiKey);
        methodUsed = 'gemini-ai';
      } catch (aiErr) {
        console.warn('Gemini extraction notice, falling back to regex parser:', aiErr.message);
        questions = parseQuestionsFromText(rawText);
        methodUsed = 'local-fallback';
      }
    } else {
      questions = parseQuestionsFromText(rawText);
    }

    res.status(200).json({
      success: true,
      count: questions.length,
      methodUsed,
      data: questions,
      previewText: rawText.slice(0, 400)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch add multiple questions to an exam
// @route   POST /api/exams/:examId/questions/batch
// @access  Private (ADMIN, TEACHER)
exports.batchAddQuestions = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { questions } = req.body;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID format'
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    if (!checkExamOwnership(req.user, exam)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to batch add questions to another instructor\'s exam'
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of questions'
      });
    }

    const formattedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !String(q.questionText).trim()) {
        return res.status(400).json({
          success: false,
          message: `Question #${i + 1} is missing question text`
        });
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({
          success: false,
          message: `Question #${i + 1} must have at least 2 options`
        });
      }
      const cleanOptions = q.options.map((opt) => String(opt).trim()).filter(Boolean);
      if (cleanOptions.length < 2) {
        return res.status(400).json({
          success: false,
          message: `Question #${i + 1} must have at least 2 valid options`
        });
      }

      const cleanCorrect = String(q.correctAnswer || '').trim();
      if (!cleanCorrect || !cleanOptions.includes(cleanCorrect)) {
        return res.status(400).json({
          success: false,
          message: `Question #${i + 1} ("${String(q.questionText).slice(0, 30)}...") does not have a valid correct answer matching one of its options`
        });
      }

      formattedQuestions.push({
        examId,
        questionText: String(q.questionText).trim(),
        options: cleanOptions,
        type: 'SINGLE',
        correctAnswer: cleanCorrect,
        correctAnswers: [cleanCorrect],
        marks: Math.max(1, Number(q.marks) || 1),
        explanation: q.explanation ? String(q.explanation).trim() : '',
        imageUrl: q.imageUrl ? String(q.imageUrl).trim() : null
      });
    }

    const inserted = await Question.insertMany(formattedQuestions);
    await updateExamTotalMarks(examId);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} questions into exam!`,
      count: inserted.length,
      data: inserted
    });
  } catch (error) {
    next(error);
  }
};
