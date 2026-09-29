const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const Result = require('../models/Result');
const ProctoringSession = require('../models/ProctoringSession');
const ProctoringEvent = require('../models/ProctoringEvent');
const { generatePdfReport } = require('../utils/pdfReportGenerator');
const { isStudentEligibleForExam } = require('../utils/examEligibility');
const mongoose = require('mongoose');
const crypto = require('crypto');

// @desc    Start an exam attempt (STUDENT)
// @route   GET /api/exams/:id/start
// @access  Private/Student
exports.startExam = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const studentId = req.user.id;

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

    if (!exam.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'This exam is not currently available'
      });
    }

    // Phase 3D: Server-side Student Eligibility Validation
    const { eligible, reason, statusCode } = await isStudentEligibleForExam(req.user, exam);
    if (!eligible) {
      return res.status(statusCode || 403).json({
        success: false,
        reason,
        message: 'You are not eligible to attempt this assessment'
      });
    }

    // Check multiple attempts restriction
    if (!exam.allowMultipleAttempts) {
      const existingResult = await Result.findOne({ studentId, examId });
      if (existingResult) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted this exam. Multiple attempts are not allowed.'
        });
      }
    }

    // Check for existing active in-progress attempt
    let attempt = await ExamAttempt.findOne({ studentId, examId, status: 'IN_PROGRESS' });

    // Check scheduled time window
    const now = new Date();
    if (exam.isScheduled) {
      if (exam.startTime && now < new Date(exam.startTime)) {
        return res.status(403).json({
          success: false,
          isUpcoming: true,
          scheduledStartTime: exam.startTime,
          message: `This assessment has not started yet. The scheduled window opens on ${new Date(exam.startTime).toLocaleString()}.`
        });
      }

      if (exam.endTime && now > new Date(exam.endTime)) {
        if (!attempt) {
          return res.status(403).json({
            success: false,
            isExpired: true,
            scheduledEndTime: exam.endTime,
            message: `The scheduled access window for this exam closed on ${new Date(exam.endTime).toLocaleString()}.`
          });
        }
      }
    }

    // If starting a new session and exam is passcode protected, verify access code
    if (!attempt && exam.hasAccessCode) {
      const providedCode = (req.query.accessCode || req.headers['x-access-code'] || '').trim();
      if (!providedCode || providedCode.toLowerCase() !== (exam.accessCode || '').trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          requiresAccessCode: true,
          message: providedCode ? 'Incorrect exam access passcode. Please try again.' : 'This exam is passcode protected. Please enter the access code provided by your instructor.'
        });
      }
    }

    if (!attempt) {
      attempt = await ExamAttempt.create({
        studentId,
        examId,
        startTime: new Date(),
        status: 'IN_PROGRESS'
      });
    }

    // Fetch questions and STRIP correct answers and explanations
    const questions = await Question.find({ examId }).sort({ createdAt: 1 }).select('-correctAnswer -correctAnswers -explanation');

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This exam has no questions available'
      });
    }

    const savedAnswersObj = attempt.savedAnswers ? (attempt.savedAnswers instanceof Map ? Object.fromEntries(attempt.savedAnswers) : attempt.savedAnswers) : {};

    res.status(200).json({
      success: true,
      message: Object.keys(savedAnswersObj).length > 0 ? 'Exam session resumed' : 'Exam started',
      data: {
        exam: {
          id: exam._id,
          title: exam.title,
          description: exam.description,
          duration: exam.duration,
          totalMarks: exam.totalMarks,
          passMarks: exam.passMarks,
          isScheduled: exam.isScheduled || false,
          startTime: exam.startTime || null,
          endTime: exam.endTime || null,
          hasNegativeMarking: exam.hasNegativeMarking || false,
          negativeMarks: exam.negativeMarks || 0,
          requireCamera: exam.requireCamera !== undefined ? exam.requireCamera : true
        },
        attemptId: attempt._id,
        startTime: attempt.startTime,
        durationMinutes: exam.duration,
        savedAnswers: savedAnswersObj,
        markedForReview: attempt.markedForReview || [],
        warningCount: attempt.warningCount || 0,
        questions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save in-progress exam answers (STUDENT)
// @route   PATCH /api/results/attempts/:examId/save
// @access  Private/Student
exports.saveExamProgress = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { answers, markedForReview, warningCount, currentQuestionIndex, proctorEvent, cameraStatus, cameraSnapshot, attemptId } = req.body;
    const studentId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID format'
      });
    }

    const query = {
      studentId,
      examId,
      status: 'IN_PROGRESS'
    };
    if (attemptId && mongoose.Types.ObjectId.isValid(attemptId)) {
      query._id = attemptId;
    }

    const attempt = await ExamAttempt.findOne(query);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No active in-progress exam attempt found to save'
      });
    }

    // Always update heartbeat timestamp
    attempt.lastActiveAt = new Date();

    if (answers && typeof answers === 'object') {
      attempt.savedAnswers = answers;
    }
    if (Array.isArray(markedForReview)) {
      attempt.markedForReview = markedForReview.slice(0, 1000); // bounded array
    }
    if (typeof warningCount === 'number' && warningCount >= 0) {
      attempt.warningCount = Math.max(attempt.warningCount || 0, warningCount);
    }
    if (typeof currentQuestionIndex === 'number' && currentQuestionIndex >= 0) {
      attempt.currentQuestionIndex = currentQuestionIndex;
    }
    if (cameraStatus && typeof cameraStatus === 'string') {
      attempt.cameraStatus = cameraStatus.slice(0, 50);
    }
    if (cameraSnapshot && typeof cameraSnapshot === 'string' && cameraSnapshot.length < 200000) { // Limit snapshot string size
      attempt.latestCameraSnapshot = cameraSnapshot;
    }
    if (proctorEvent && proctorEvent.eventType) {
      if (!attempt.proctorLogs) attempt.proctorLogs = [];
      if (attempt.proctorLogs.length < 200) { // Limit stored logs to prevent document bloat
        attempt.proctorLogs.push({
          timestamp: proctorEvent.timestamp ? new Date(proctorEvent.timestamp) : new Date(),
          eventType: String(proctorEvent.eventType).slice(0, 50),
          reason: String(proctorEvent.reason || '').slice(0, 200)
        });
      }
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Exam progress saved successfully',
      data: {
        forceSubmit: Boolean(attempt.disqualified),
        disqualificationReason: attempt.disqualificationReason || '',
        extraTimeMinutes: attempt.extraTimeMinutes || 0,
        adminBroadcastMessage: attempt.adminBroadcastMessage || '',
        warningCount: attempt.warningCount || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit exam & calculate result (STUDENT ONLY - HARDENED AGAINST DUPLICATE / ARBITRARY SUBMISSION)
// @route   POST /api/results/submit
// @access  Private/Student
exports.submitExam = async (req, res, next) => {
  try {
    const { examId, attemptId, answers, warningCount, submissionReason } = req.body;
    const studentId = req.user.id;

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid examId'
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Phase 3D: Server-side Student Eligibility Validation on Submission
    const { eligible, reason, statusCode } = await isStudentEligibleForExam(req.user, exam);
    if (!eligible) {
      return res.status(statusCode || 403).json({
        success: false,
        reason,
        message: 'You are not eligible to submit this assessment'
      });
    }

    // Query for active IN_PROGRESS attempt owned by student
    const attemptQuery = {
      studentId,
      examId,
      status: 'IN_PROGRESS'
    };
    if (attemptId && mongoose.Types.ObjectId.isValid(attemptId)) {
      attemptQuery._id = attemptId;
    }

    // SECURITY CHECK 1: Ensure a legitimate active attempt exists for this student
    const existingAttempt = await ExamAttempt.findOne(attemptQuery).sort({ startTime: -1 });
    if (!existingAttempt) {
      return res.status(400).json({
        success: false,
        message: 'No active in-progress exam attempt found. You cannot submit an exam without an active attempt session.'
      });
    }

    // Check if duplicate submission check applies when multiple attempts are disabled
    if (!exam.allowMultipleAttempts) {
      const existingResult = await Result.findOne({ studentId, examId });
      if (existingResult) {
        return res.status(400).json({
          success: false,
          message: 'Exam already submitted previously. Multiple submissions are not permitted.'
        });
      }
    }

    // SECURITY CHECK 2: Atomic update to prevent race conditions from concurrent/double clicks
    const attempt = await ExamAttempt.findOneAndUpdate(
      { _id: existingAttempt._id, status: 'IN_PROGRESS', studentId },
      { status: 'SUBMITTED', endTime: new Date() },
      { new: true }
    );

    if (!attempt) {
      return res.status(400).json({
        success: false,
        message: 'This attempt has already been processed or submitted.'
      });
    }

    // Gracefully transition active ProctoringSession to ENDED
    try {
      const proctorSession = await ProctoringSession.findOne({ attemptId: attempt._id });
      if (proctorSession && (proctorSession.status === 'ACTIVE' || proctorSession.status === 'DISCONNECTED')) {
        proctorSession.status = 'ENDED';
        proctorSession.endedAt = new Date();
        await proctorSession.save();

        await ProctoringEvent.create({
          sessionId: proctorSession._id,
          attemptId: attempt._id,
          examId: attempt.examId,
          studentId: attempt.studentId,
          eventType: 'SESSION_ENDED',
          severity: 'INFO',
          metadata: {
            endedBy: req.user._id,
            submissionReason: submissionReason || 'NORMAL'
          },
          serverTimestamp: new Date()
        });
      }
    } catch (sessionErr) {
      console.warn('Proctoring session cleanup warning on submit:', sessionErr.message);
    }

    const submittedAt = new Date();
    const startTime = attempt.startTime || submittedAt;

    // Server-side timing check (duration in ms + extra time + 30 second grace period)
    const extraMins = Number(attempt.extraTimeMinutes) || 0;
    const allowedDurationMs = ((exam.duration + extraMins) * 60 * 1000) + 30000;
    const actualElapsedMs = submittedAt.getTime() - startTime.getTime();
    
    let isLateSubmission = false;
    if (actualElapsedMs > allowedDurationMs) {
      isLateSubmission = true;
      attempt.status = 'EXPIRED';
    }

    // Calculate time taken
    const elapsedSeconds = Math.floor(actualElapsedMs / 1000);
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const timeTakenStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Retrieve all original questions with correct answers from DB
    const questions = await Question.find({ examId });
    const questionMap = new Map();
    questions.forEach(q => questionMap.set(q._id.toString(), q));

    const submittedAnswersMap = new Map();
    if (Array.isArray(answers)) {
      answers.forEach(a => {
        if (a && a.questionId) {
          submittedAnswersMap.set(a.questionId.toString(), a.answer);
        }
      });
    }

    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unattempted = 0;
    let negativeMarksDeducted = 0;
    const penaltyPerWrong = (exam.hasNegativeMarking && exam.negativeMarks > 0) ? Number(exam.negativeMarks) : 0;
    const evaluatedAnswers = [];

    questions.forEach(q => {
      const qIdStr = q._id.toString();
      const rawStudentAns = submittedAnswersMap.get(qIdStr);
      const isMulti = q.type === 'MULTIPLE';

      let studentAnsList = [];
      if (Array.isArray(rawStudentAns)) {
        studentAnsList = rawStudentAns.map(a => String(a).trim()).filter(Boolean);
      } else if (typeof rawStudentAns === 'string' && rawStudentAns.trim() !== '') {
        studentAnsList = [rawStudentAns.trim()];
      }

      let expectedAnsList = [];
      if (isMulti) {
        expectedAnsList = (q.correctAnswers && q.correctAnswers.length > 0)
          ? q.correctAnswers.map(a => a.trim())
          : (q.correctAnswer ? [q.correctAnswer.trim()] : []);
      } else {
        expectedAnsList = q.correctAnswer ? [q.correctAnswer.trim()] : (q.correctAnswers && q.correctAnswers[0] ? [q.correctAnswers[0].trim()] : []);
      }

      const isUnattempted = studentAnsList.length === 0;
      let isAnswerCorrect = false;

      if (!isUnattempted) {
        if (isMulti) {
          const studentSet = new Set(studentAnsList);
          const expectedSet = new Set(expectedAnsList);
          isAnswerCorrect = studentSet.size === expectedSet.size && [...studentSet].every(item => expectedSet.has(item));
        } else {
          isAnswerCorrect = studentAnsList[0] === (q.correctAnswer || expectedAnsList[0]);
        }
      }

      const primaryCorrectAnswer = q.correctAnswer || (expectedAnsList[0] || '');

      if (isUnattempted) {
        unattempted++;
        evaluatedAnswers.push({
          questionId: q._id,
          questionType: isMulti ? 'MULTIPLE' : 'SINGLE',
          selectedAnswer: '',
          selectedAnswers: [],
          correctAnswer: primaryCorrectAnswer,
          correctAnswers: expectedAnsList,
          isCorrect: false,
          marksObtained: 0
        });
      } else if (isAnswerCorrect) {
        correctAnswers++;
        score += q.marks;
        evaluatedAnswers.push({
          questionId: q._id,
          questionType: isMulti ? 'MULTIPLE' : 'SINGLE',
          selectedAnswer: studentAnsList.join(', '),
          selectedAnswers: studentAnsList,
          correctAnswer: primaryCorrectAnswer,
          correctAnswers: expectedAnsList,
          isCorrect: true,
          marksObtained: q.marks
        });
      } else {
        wrongAnswers++;
        const deduction = penaltyPerWrong;
        negativeMarksDeducted += deduction;
        score -= deduction;
        evaluatedAnswers.push({
          questionId: q._id,
          questionType: isMulti ? 'MULTIPLE' : 'SINGLE',
          selectedAnswer: studentAnsList.join(', '),
          selectedAnswers: studentAnsList,
          correctAnswer: primaryCorrectAnswer,
          correctAnswers: expectedAnsList,
          isCorrect: false,
          marksObtained: deduction > 0 ? -deduction : 0
        });
      }
    });

    score = Math.max(0, parseFloat(score.toFixed(2)));
    negativeMarksDeducted = parseFloat(negativeMarksDeducted.toFixed(2));
    const totalMarks = exam.totalMarks || questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = totalMarks > 0 ? parseFloat(((score / totalMarks) * 100).toFixed(2)) : 0;

    const finalWarningCount = typeof warningCount === 'number' ? warningCount : (attempt.warningCount || 0);
    const finalReason = submissionReason || (isLateSubmission ? 'TIMEOUT' : 'NORMAL');

    const verificationId = 'GLB-VRF-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Create Result document with attemptId linkage
    let result;
    try {
      result = await Result.create({
        studentId,
        examId,
        attemptId: attempt._id,
        verificationId,
        answers: evaluatedAnswers,
        score,
        totalMarks,
        percentage,
        correctAnswers,
        wrongAnswers,
        unattempted,
        negativeMarksDeducted,
        timeTaken: timeTakenStr,
        warningCount: finalWarningCount,
        submissionReason: finalReason,
        proctorLogs: attempt.proctorLogs || [],
        submittedAt
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A result for this exam session already exists.'
        });
      }
      throw createErr;
    }

    if (typeof warningCount === 'number') {
      attempt.warningCount = warningCount;
    }
    if (finalReason === 'TAB_SWITCH_LIMIT') {
      attempt.disqualified = true;
      attempt.disqualificationReason = 'Exceeded maximum allowed tab switches (5 warnings)';
    } else if (finalReason === 'ADMIN_DISQUALIFIED') {
      attempt.disqualified = true;
    }
    await attempt.save();

    let resultMsg = 'Exam submitted successfully';
    if (finalReason === 'TAB_SWITCH_LIMIT') {
      resultMsg = 'Exam auto-submitted: Exceeded maximum allowed tab switches (5 warnings).';
    } else if (finalReason === 'ADMIN_DISQUALIFIED') {
      resultMsg = `Exam auto-submitted: Disqualified by proctor (${attempt.disqualificationReason || 'Violation'}).`;
    } else if (isLateSubmission) {
      resultMsg = 'Exam time expired, auto-submitted result recorded.';
    }

    res.status(201).json({
      success: true,
      message: resultMsg,
      data: {
        resultId: result._id,
        verificationId: result.verificationId,
        examTitle: exam.title,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        passMarks: exam.passMarks,
        isPassed: result.score >= (exam.passMarks || 0),
        correctAnswers: result.correctAnswers,
        wrongAnswers: result.wrongAnswers,
        unattempted: result.unattempted,
        negativeMarksDeducted: result.negativeMarksDeducted,
        hasNegativeMarking: exam.hasNegativeMarking || false,
        negativeMarks: exam.negativeMarks || 0,
        timeTaken: result.timeTaken,
        submittedAt: result.submittedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current student's results (STUDENT ONLY)
// @route   GET /api/results/my-results
// @access  Private/Student
exports.getMyResults = async (req, res, next) => {
  try {
    const results = await Result.find({ studentId: req.user.id })
      .populate('examId', 'title description totalMarks passMarks duration')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get result by ID with full question details & explanations
// @route   GET /api/results/:id
// @access  Private
exports.getResultById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result ID format'
      });
    }

    const result = await Result.findById(req.params.id)
      .populate('examId', 'title description totalMarks passMarks duration')
      .populate('studentId', 'name email');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // SECURITY: Student can only view their own result, Admin can view any
    if (req.user.role === 'STUDENT' && result.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view another student\'s result'
      });
    }

    const questions = await Question.find({ examId: result.examId._id });
    const questionMap = new Map();
    questions.forEach(q => questionMap.set(q._id.toString(), q));

    const detailedAnswers = result.answers.map(ans => {
      const q = questionMap.get(ans.questionId.toString());
      return {
        questionId: ans.questionId,
        questionText: q ? q.questionText : 'Question deleted',
        imageUrl: q ? (q.imageUrl || null) : null,
        options: q ? q.options : [],
        questionType: ans.questionType || (q ? q.type : 'SINGLE'),
        selectedAnswer: ans.selectedAnswer,
        selectedAnswers: (ans.selectedAnswers && ans.selectedAnswers.length > 0) 
          ? ans.selectedAnswers 
          : (ans.selectedAnswer ? [ans.selectedAnswer] : []),
        correctAnswer: ans.correctAnswer,
        correctAnswers: (ans.correctAnswers && ans.correctAnswers.length > 0)
          ? ans.correctAnswers
          : (q && q.correctAnswers && q.correctAnswers.length > 0)
          ? q.correctAnswers
          : (ans.correctAnswer ? [ans.correctAnswer] : []),
        isCorrect: ans.isCorrect,
        marksObtained: ans.marksObtained,
        totalQuestionMarks: q ? q.marks : 1,
        explanation: q ? q.explanation : ''
      };
    });

    res.status(200).json({
      success: true,
      data: {
        ...result.toObject(),
        answers: detailedAnswers
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all results across all students (Admin only)
// @route   GET /api/results/admin/all
// @access  Private/Admin
exports.getAllResultsAdmin = async (req, res, next) => {
  try {
    const results = await Result.find()
      .populate('examId', 'title totalMarks passMarks')
      .populate('studentId', 'name email')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download Result Report as PDF (Student own result, Admin any result)
// @route   GET /api/results/:id/pdf
// @access  Private
exports.downloadResultPdf = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result ID format'
      });
    }

    const result = await Result.findById(req.params.id)
      .populate('examId', 'title description totalMarks passMarks duration')
      .populate('studentId', 'name email');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // SECURITY: Student can only download their own result, Admin can download any
    if (req.user.role === 'STUDENT' && result.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this report'
      });
    }

    const questions = await Question.find({ examId: result.examId._id });

    const safeTitle = (result.examId?.title || 'Exam').replace(/[^a-zA-Z0-9-_]/g, '_');
    const safeStudent = (result.studentId?.name || 'Student').replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `GLB-EXAMSPHERE-Report-${safeStudent}-${safeTitle}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    try {
      generatePdfReport(result, questions, res);
    } catch (pdfErr) {
      console.error('PDF Generation Error:', pdfErr);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: 'Failed to generate PDF report document' });
      }
      res.end();
    }
  } catch (error) {
    next(error);
  }
};
