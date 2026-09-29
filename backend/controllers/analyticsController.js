const User = require('../models/User');
const Exam = require('../models/Exam');
const Result = require('../models/Result');

// @desc    Get dashboard analytics (Admin)
// @route   GET /api/analytics/overview
// @access  Private/Admin
exports.getAnalyticsOverview = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'STUDENT' });
    const totalExams = await Exam.countDocuments();
    const results = await Result.find().populate('examId', 'title passMarks totalMarks');
    const totalAttempts = results.length;

    let totalScoreSum = 0;
    let highestScore = 0;
    let passedCount = 0;

    results.forEach(r => {
      totalScoreSum += r.score;
      if (r.score > highestScore) {
        highestScore = r.score;
      }
      const passMarks = (r.examId && r.examId.passMarks) ? r.examId.passMarks : 0;
      if (r.score >= passMarks) {
        passedCount++;
      }
    });

    const averageScore = totalAttempts > 0 ? parseFloat((totalScoreSum / totalAttempts).toFixed(2)) : 0;
    const passPercentage = totalAttempts > 0 ? parseFloat(((passedCount / totalAttempts) * 100).toFixed(2)) : 0;

    // Per-exam analytics
    const exams = await Exam.find().sort({ createdAt: -1 });
    const examStats = await Promise.all(
      exams.map(async (exam) => {
        const examResults = await Result.find({ examId: exam._id });
        const attempts = examResults.length;
        if (attempts === 0) {
          return {
            examId: exam._id,
            title: exam.title,
            isPublished: exam.isPublished,
            attempts: 0,
            avgScore: 0,
            highestScore: 0,
            passRate: 0
          };
        }

        let sum = 0;
        let max = 0;
        let passes = 0;

        examResults.forEach(r => {
          sum += r.score;
          if (r.score > max) max = r.score;
          if (r.score >= (exam.passMarks || 0)) passes++;
        });

        return {
          examId: exam._id,
          title: exam.title,
          isPublished: exam.isPublished,
          attempts,
          avgScore: parseFloat((sum / attempts).toFixed(2)),
          highestScore: max,
          passRate: parseFloat(((passes / attempts) * 100).toFixed(2))
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalExams,
        totalAttempts,
        averageScore,
        highestScore,
        passPercentage,
        examStats
      }
    });
  } catch (error) {
    next(error);
  }
};
