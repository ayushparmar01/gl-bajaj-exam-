const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Result = require('../models/Result');
const ExamAttempt = require('../models/ExamAttempt');
const { validateExamTargeting, isStudentEligibleForExam } = require('../utils/examEligibility');
const mongoose = require('mongoose');

// Helper to populate all targeting and creator metadata on an Exam query
function populateExamDetails(query) {
  return query
    .populate('createdBy', 'name email department employeeId')
    .populate('subjectId', 'name subjectCode branch semester')
    .populate('target.academicYears', 'name code isCurrent')
    .populate('target.branches', 'name code department')
    .populate('target.semesters', 'name number')
    .populate({
      path: 'target.sections',
      select: 'name branch',
      populate: { path: 'branch', select: 'name code' }
    })
    .populate('target.batches', 'name startYear endYear');
}

// @desc    Create new exam
// @route   POST /api/exams
// @access  Private (ADMIN, TEACHER)
exports.createExam = async (req, res, next) => {
  try {
    if (req.user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently inactive'
      });
    }

    const {
      title,
      description,
      duration,
      passMarks,
      isScheduled,
      startTime,
      endTime,
      allowMultipleAttempts,
      hasNegativeMarking,
      negativeMarks,
      hasAccessCode,
      accessCode,
      requireCamera
    } = req.body;

    const cleanTitle = title ? String(title).trim() : '';
    const numDuration = Number(duration);

    if (!cleanTitle || isNaN(numDuration) || numDuration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid exam title and positive duration (in minutes)'
      });
    }

    const scheduled = Boolean(isScheduled);
    let parsedStart = null;
    let parsedEnd = null;
    if (scheduled) {
      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'Please provide both start time and end time for a scheduled exam'
        });
      }
      parsedStart = new Date(startTime);
      parsedEnd = new Date(endTime);
      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start or end date/time format'
        });
      }
      if (parsedEnd <= parsedStart) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled end time must be after the start time'
        });
      }
    }

    // Phase 3D: Validate Subject & Audience Targeting Rules
    const { cleanSubjectId, cleanSubjectCode, cleanAudienceType, cleanTarget } =
      await validateExamTargeting(req.user, req.body, false);

    const exam = await Exam.create({
      title: cleanTitle,
      description: description ? String(description).trim() : '',
      duration: numDuration,
      passMarks: Math.max(0, Number(passMarks) || 0),
      isScheduled: scheduled,
      startTime: scheduled ? parsedStart : null,
      endTime: scheduled ? parsedEnd : null,
      allowMultipleAttempts: Boolean(allowMultipleAttempts),
      hasNegativeMarking: Boolean(hasNegativeMarking),
      negativeMarks: hasNegativeMarking ? Math.max(0, Number(negativeMarks) || 0) : 0,
      hasAccessCode: Boolean(hasAccessCode),
      accessCode: hasAccessCode && accessCode ? String(accessCode).trim() : '',
      requireCamera: requireCamera !== undefined ? Boolean(requireCamera) : true,
      subjectId: cleanSubjectId,
      subjectCode: cleanSubjectCode,
      audienceType: cleanAudienceType,
      target: cleanTarget,
      createdBy: req.user.id
    });

    const populatedExam = await populateExamDetails(Exam.findById(exam._id));

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: populatedExam
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// @desc    Get all exams (Admin sees all, Teacher sees own, Students see published & eligible only)
// @route   GET /api/exams
// @access  Private
exports.getAllExams = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'STUDENT') {
      query.isPublished = true;
    } else if (req.user.role === 'TEACHER') {
      query.createdBy = req.user.id;
    }

    const exams = await populateExamDetails(Exam.find(query).sort({ createdAt: -1 }));

    // If STUDENT, filter server-side using the Eligibility Engine
    let filteredExams = exams;
    if (req.user.role === 'STUDENT') {
      const eligibilityResults = await Promise.all(
        exams.map(async (exam) => {
          const { eligible } = await isStudentEligibleForExam(req.user, exam);
          return { exam, eligible };
        })
      );
      filteredExams = eligibilityResults.filter((r) => r.eligible).map((r) => r.exam);
    }

    // Attach question count and any active in-progress attempt
    const examsWithMeta = await Promise.all(
      filteredExams.map(async (exam) => {
        const questionCount = await Question.countDocuments({ examId: exam._id });

        let activeAttempt = null;
        if (req.user.role === 'STUDENT') {
          const attempt = await ExamAttempt.findOne({
            studentId: req.user.id,
            examId: exam._id,
            status: 'IN_PROGRESS'
          }).sort({ startTime: -1 });

          if (attempt) {
            const extraMins = Number(attempt.extraTimeMinutes) || 0;
            const durationMs = (exam.duration + extraMins) * 60 * 1000;
            const elapsedMs = Date.now() - new Date(attempt.startTime).getTime();
            let remainingSeconds = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));

            // If exam has a scheduled window end time, clamp remaining seconds
            if (exam.isScheduled && exam.endTime) {
              const windowRemainingMs = new Date(exam.endTime).getTime() - Date.now();
              const windowRemainingSeconds = Math.max(0, Math.floor(windowRemainingMs / 1000));
              remainingSeconds = Math.min(remainingSeconds, windowRemainingSeconds);
            }

            if (remainingSeconds > 0) {
              activeAttempt = {
                id: attempt._id,
                remainingSeconds,
                startTime: attempt.startTime
              };
            } else {
              attempt.status = 'EXPIRED';
              await attempt.save();
            }
          }
        }

        const examObj = exam.toObject();
        if (req.user.role === 'STUDENT') {
          delete examObj.accessCode; // SECURITY: Never leak accessCode to students in list
        }

        return {
          ...examObj,
          questionCount,
          activeAttempt
        };
      })
    );

    res.status(200).json({
      success: true,
      count: examsWithMeta.length,
      data: examsWithMeta
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single exam by ID
// @route   GET /api/exams/:id
// @access  Private
exports.getExamById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID format'
      });
    }

    const exam = await populateExamDetails(Exam.findById(req.params.id));

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Role-specific access rules
    if (req.user.role === 'STUDENT') {
      const { eligible, reason, statusCode } = await isStudentEligibleForExam(req.user, exam);
      if (!eligible) {
        return res.status(statusCode || 403).json({
          success: false,
          reason,
          message: 'You are not eligible to access this exam'
        });
      }
    } else if (req.user.role === 'TEACHER') {
      const creatorId = exam.createdBy ? (typeof exam.createdBy === 'object' ? exam.createdBy._id.toString() : exam.createdBy.toString()) : '';
      if (creatorId !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view details of an assessment created by another instructor'
        });
      }
    }

    const questionCount = await Question.countDocuments({ examId: exam._id });
    const examObj = exam.toObject();
    if (req.user.role === 'STUDENT') {
      delete examObj.accessCode; // SECURITY: Never leak accessCode to student client
    }

    res.status(200).json({
      success: true,
      data: {
        ...examObj,
        questionCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private (ADMIN, TEACHER)
exports.updateExam = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID format'
      });
    }

    let exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // TEACHER ownership verification
    if (req.user.role === 'TEACHER') {
      const creatorId = exam.createdBy ? exam.createdBy.toString() : '';
      if (creatorId !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to modify an assessment created by another instructor'
        });
      }
    }

    const {
      title,
      description,
      duration,
      passMarks,
      isScheduled,
      startTime,
      endTime,
      allowMultipleAttempts,
      isPublished,
      hasNegativeMarking,
      negativeMarks,
      hasAccessCode,
      accessCode,
      requireCamera,
      subjectId,
      audienceType,
      target
    } = req.body;

    if (title !== undefined) {
      const cleanTitle = String(title).trim();
      if (!cleanTitle) {
        return res.status(400).json({ success: false, message: 'Exam title cannot be empty' });
      }
      exam.title = cleanTitle;
    }

    if (description !== undefined) exam.description = String(description).trim();

    if (duration !== undefined) {
      const numDur = Number(duration);
      if (isNaN(numDur) || numDur <= 0) {
        return res.status(400).json({ success: false, message: 'Duration must be a positive number' });
      }
      exam.duration = numDur;
    }

    if (passMarks !== undefined) {
      exam.passMarks = Math.max(0, Number(passMarks) || 0);
    }

    if (requireCamera !== undefined) exam.requireCamera = Boolean(requireCamera);

    if (isScheduled !== undefined) {
      exam.isScheduled = Boolean(isScheduled);
      if (!exam.isScheduled) {
        exam.startTime = null;
        exam.endTime = null;
      }
    }

    if (exam.isScheduled) {
      const finalStart = startTime !== undefined ? (startTime ? new Date(startTime) : null) : exam.startTime;
      const finalEnd = endTime !== undefined ? (endTime ? new Date(endTime) : null) : exam.endTime;

      if (!finalStart || !finalEnd) {
        return res.status(400).json({
          success: false,
          message: 'Please provide both start time and end time for a scheduled exam'
        });
      }
      if (isNaN(finalStart.getTime()) || isNaN(finalEnd.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start or end date/time format'
        });
      }
      if (finalEnd <= finalStart) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled end time must be after the start time'
        });
      }
      exam.startTime = finalStart;
      exam.endTime = finalEnd;
    }

    if (allowMultipleAttempts !== undefined) exam.allowMultipleAttempts = Boolean(allowMultipleAttempts);
    if (isPublished !== undefined) exam.isPublished = Boolean(isPublished);

    if (hasNegativeMarking !== undefined) {
      exam.hasNegativeMarking = Boolean(hasNegativeMarking);
      if (!exam.hasNegativeMarking) {
        exam.negativeMarks = 0;
      }
    }
    if (negativeMarks !== undefined && exam.hasNegativeMarking) {
      exam.negativeMarks = Math.max(0, Number(negativeMarks) || 0);
    }

    if (hasAccessCode !== undefined) {
      exam.hasAccessCode = Boolean(hasAccessCode);
      if (!exam.hasAccessCode) {
        exam.accessCode = '';
      }
    }
    if (accessCode !== undefined && exam.hasAccessCode) {
      exam.accessCode = String(accessCode).trim();
    }

    // Phase 3D: Validate Updated Subject & Audience Targeting if Provided
    if (subjectId !== undefined || audienceType !== undefined || target !== undefined) {
      const { cleanSubjectId, cleanSubjectCode, cleanAudienceType, cleanTarget } =
        await validateExamTargeting(req.user, req.body, true, exam);

      if (subjectId !== undefined) {
        exam.subjectId = cleanSubjectId;
        exam.subjectCode = cleanSubjectCode;
      }
      if (audienceType !== undefined) {
        exam.audienceType = cleanAudienceType;
      }
      if (target !== undefined || audienceType !== undefined) {
        exam.target = cleanTarget;
      }
    }

    await exam.save();

    const populatedExam = await populateExamDetails(Exam.findById(exam._id));

    res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      data: populatedExam
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private (ADMIN, TEACHER)
exports.deleteExam = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID format'
      });
    }

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // TEACHER ownership verification
    if (req.user.role === 'TEACHER') {
      const creatorId = exam.createdBy ? exam.createdBy.toString() : '';
      if (creatorId !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to delete an assessment created by another instructor'
        });
      }
    }

    // Cascade delete questions, attempts, and results
    await Question.deleteMany({ examId: exam._id });
    await ExamAttempt.deleteMany({ examId: exam._id });
    await Result.deleteMany({ examId: exam._id });
    await exam.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Exam and associated data deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Publish / Unpublish exam
// @route   PATCH /api/exams/:id/publish
// @access  Private (ADMIN, TEACHER)
exports.togglePublishExam = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID format'
      });
    }

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // TEACHER ownership verification
    if (req.user.role === 'TEACHER') {
      const creatorId = exam.createdBy ? exam.createdBy.toString() : '';
      if (creatorId !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to publish an assessment created by another instructor'
        });
      }
    }

    // Check if exam has questions before publishing
    if (!exam.isPublished) {
      const questionCount = await Question.countDocuments({ examId: exam._id });
      if (questionCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish an exam with 0 questions. Please add questions first.'
        });
      }
    }

    exam.isPublished = !exam.isPublished;
    await exam.save();

    res.status(200).json({
      success: true,
      message: `Exam ${exam.isPublished ? 'published' : 'unpublished'} successfully`,
      data: exam
    });
  } catch (error) {
    next(error);
  }
};
