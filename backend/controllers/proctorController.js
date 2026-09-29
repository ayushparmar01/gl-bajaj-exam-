const mongoose = require('mongoose');
const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ProctoringSession = require('../models/ProctoringSession');
const ProctoringEvent = require('../models/ProctoringEvent');
const ProctoringWarning = require('../models/ProctoringWarning');
const { processProctoringEvent } = require('../utils/proctorEventEngine');
const { isStudentEligibleForExam } = require('../utils/examEligibility');

// @desc    Initialize or Resume Proctoring Session (Student/Admin/Teacher)
// @route   POST /api/proctor/sessions/:attemptId/init
// @access  Private
exports.initProctoringSession = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attempt ID format'
      });
    }

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found'
      });
    }

    // Role ownership validation
    if (req.user.role === 'STUDENT') {
      if (attempt.studentId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to initialize proctoring for another student\'s attempt'
        });
      }
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: `Cannot initialize proctoring for an attempt with status '${attempt.status}'`
      });
    }

    const exam = await Exam.findById(attempt.examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Referenced exam not found'
      });
    }

    // Server-side student eligibility verification
    if (req.user.role === 'STUDENT') {
      const { eligible, reason, statusCode } = await isStudentEligibleForExam(req.user, exam);
      if (!eligible) {
        return res.status(statusCode || 403).json({
          success: false,
          reason,
          message: 'Student is not eligible for this assessment proctoring session'
        });
      }
    }

    // Check if session already exists (Idempotent handling)
    let session = await ProctoringSession.findOne({ attemptId });

    if (!session) {
      session = await ProctoringSession.create({
        attemptId: attempt._id,
        examId: attempt.examId,
        studentId: attempt.studentId,
        status: 'ACTIVE',
        startedAt: new Date(),
        connectedAt: new Date(),
        lastHeartbeatAt: new Date(),
        reconnectCount: 0,
        warningCount: attempt.warningCount || 0
      });

      await ProctoringEvent.create({
        sessionId: session._id,
        attemptId: attempt._id,
        examId: attempt.examId,
        studentId: attempt.studentId,
        eventType: 'SESSION_STARTED',
        severity: 'INFO',
        metadata: {
          initiatedBy: req.user._id,
          userRole: req.user.role,
          userAgent: req.headers['user-agent']
        },
        serverTimestamp: new Date()
      });

      return res.status(201).json({
        success: true,
        message: 'Proctoring session initialized successfully',
        data: session
      });
    } else {
      // Idempotent resume
      const wasDisconnected = session.status !== 'ACTIVE';
      if (wasDisconnected) {
        session.reconnectCount = (session.reconnectCount || 0) + 1;
      }
      session.status = 'ACTIVE';
      session.connectedAt = new Date();
      session.lastHeartbeatAt = new Date();
      session.disconnectedAt = null;
      if (attempt.warningCount !== undefined) {
        session.warningCount = attempt.warningCount;
      }
      await session.save();

      await ProctoringEvent.create({
        sessionId: session._id,
        attemptId: attempt._id,
        examId: attempt.examId,
        studentId: attempt.studentId,
        eventType: 'SESSION_RESUMED',
        severity: 'INFO',
        metadata: {
          reconnectCount: session.reconnectCount,
          resumedBy: req.user._id,
          userRole: req.user.role
        },
        serverTimestamp: new Date()
      });

      return res.status(200).json({
        success: true,
        message: 'Proctoring session resumed successfully',
        data: session
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get Proctoring Session Details & Audit Events
// @route   GET /api/proctor/sessions/:attemptId
// @access  Private (Student owner, Authorized Teacher, Admin)
exports.getProctoringSession = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attempt ID format'
      });
    }

    const session = await ProctoringSession.findOne({ attemptId })
      .populate('studentId', 'name email department rollNumber')
      .populate('examId', 'title duration passMarks isScheduled requireCamera');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Proctoring session not found for this attempt'
      });
    }

    // Role authorization check
    if (req.user.role === 'STUDENT') {
      const studentOwnerId = session.studentId._id ? session.studentId._id.toString() : session.studentId.toString();
      if (studentOwnerId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view another student\'s proctoring session'
        });
      }
    } else if (req.user.role === 'TEACHER') {
      const exam = await Exam.findById(session.examId);
      const isCreator = exam && exam.createdBy && exam.createdBy.toString() === req.user._id.toString();
      const canManageAll = Boolean(req.user.permissions && req.user.permissions.canManageAllSubjects);
      if (!isCreator && !canManageAll) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to monitor this exam assessment'
        });
      }
    }

    // Retrieve recent proctoring lifecycle events
    const events = await ProctoringEvent.find({ sessionId: session._id })
      .sort({ serverTimestamp: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        session,
        events
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send proctoring heartbeat ping
// @route   POST /api/proctor/sessions/:attemptId/heartbeat
// @access  Private (Student owner, Admin)
exports.sendHeartbeat = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { warningCount, violationCount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attempt ID format'
      });
    }

    const session = await ProctoringSession.findOne({ attemptId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Proctoring session not found'
      });
    }

    if (req.user.role === 'STUDENT') {
      if (session.studentId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot send heartbeat for another student session'
        });
      }
    }

    if (session.status === 'ENDED' || session.status === 'TERMINATED') {
      return res.status(400).json({
        success: false,
        message: `Cannot send heartbeat for a ${session.status.toLowerCase()} proctoring session`
      });
    }

    const now = new Date();
    session.lastHeartbeatAt = now;
    if (session.status === 'DISCONNECTED') {
      session.status = 'ACTIVE';
      session.connectedAt = now;
    }
    if (typeof warningCount === 'number') {
      session.warningCount = warningCount;
    }
    if (typeof violationCount === 'number') {
      session.violationCount = violationCount;
    }
    await session.save();

    await ExamAttempt.findByIdAndUpdate(attemptId, { lastActiveAt: now });

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        lastHeartbeatAt: session.lastHeartbeatAt,
        status: session.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End/Terminate Proctoring Session
// @route   POST /api/proctor/sessions/:attemptId/end
// @access  Private (Student owner, Admin, Authorized Teacher)
exports.endProctoringSession = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { reason, terminated } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attempt ID format'
      });
    }

    const session = await ProctoringSession.findOne({ attemptId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Proctoring session not found'
      });
    }

    if (req.user.role === 'STUDENT') {
      if (session.studentId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot end another student session'
        });
      }
    }

    const finalStatus = terminated && req.user.role !== 'STUDENT' ? 'TERMINATED' : 'ENDED';
    const now = new Date();
    session.status = finalStatus;
    session.endedAt = now;
    await session.save();

    await ProctoringEvent.create({
      sessionId: session._id,
      attemptId: session.attemptId,
      examId: session.examId,
      studentId: session.studentId,
      eventType: 'SESSION_ENDED',
      severity: finalStatus === 'TERMINATED' ? 'CRITICAL' : 'INFO',
      metadata: {
        endedBy: req.user._id,
        userRole: req.user.role,
        reason: reason || 'Normal completion'
      },
      serverTimestamp: now
    });

    res.status(200).json({
      success: true,
      message: `Proctoring session ${finalStatus.toLowerCase()}`,
      data: session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record client-side proctoring telemetry event (Student)
// @route   POST /api/proctor/sessions/:attemptId/events
// @access  Private (Student owner)
exports.recordProctoringEvent = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { eventType, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an eventType'
      });
    }

    const io = req.app.get('io');
    const result = await processProctoringEvent({
      attemptId,
      studentId: req.user._id,
      eventType,
      metadata
    }, io);

    res.status(200).json({
      success: true,
      message: 'Proctoring event processed',
      data: result
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

// @desc    Get all warnings issued for an attempt
// @route   GET /api/proctor/sessions/:attemptId/warnings
// @access  Private (Student owner, Teacher, Admin)
exports.getAttemptWarnings = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attempt ID format'
      });
    }

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found'
      });
    }

    if (req.user.role === 'STUDENT') {
      if (attempt.studentId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view another student\'s warnings'
        });
      }
    } else if (req.user.role === 'TEACHER') {
      const exam = await Exam.findById(attempt.examId);
      const isCreator = exam && exam.createdBy && exam.createdBy.toString() === req.user._id.toString();
      const canManageAll = Boolean(req.user.permissions && req.user.permissions.canManageAllSubjects);
      if (!isCreator && !canManageAll) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to inspect this exam assessment'
        });
      }
    }

    const warnings = await ProctoringWarning.find({ attemptId })
      .sort({ issuedAt: -1 })
      .populate('issuedBy', 'name email')
      .populate('resolvedBy', 'name email');

    res.status(200).json({
      success: true,
      count: warnings.length,
      data: warnings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Action on warning (Acknowledge, Dismiss, Resolve)
// @route   POST /api/proctor/warnings/:warningId/action
// @access  Private (Teacher, Admin)
exports.updateWarningStatus = async (req, res, next) => {
  try {
    const { warningId } = req.params;
    const { action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(warningId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warning ID format'
      });
    }

    const validActions = ['ACKNOWLEDGE', 'DISMISS', 'RESOLVE'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    const warning = await ProctoringWarning.findById(warningId);
    if (!warning) {
      return res.status(404).json({
        success: false,
        message: 'Warning record not found'
      });
    }

    // Role check for Teacher
    if (req.user.role === 'TEACHER') {
      const exam = await Exam.findById(warning.examId);
      const isCreator = exam && exam.createdBy && exam.createdBy.toString() === req.user._id.toString();
      const canManageAll = Boolean(req.user.permissions && req.user.permissions.canManageAllSubjects);
      if (!isCreator && !canManageAll) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to manage warnings for this exam'
        });
      }
    }

    const now = new Date();
    if (action === 'ACKNOWLEDGE') {
      warning.status = 'ACKNOWLEDGED';
      warning.acknowledgedAt = now;
    } else if (action === 'DISMISS') {
      warning.status = 'DISMISSED';
      warning.resolvedAt = now;
      warning.resolvedBy = req.user._id;
    } else if (action === 'RESOLVE') {
      warning.status = 'RESOLVED';
      warning.resolvedAt = now;
      warning.resolvedBy = req.user._id;
    }

    await warning.save();

    // Recompute total active warnings for this attempt
    const activeCount = await ProctoringWarning.countDocuments({
      attemptId: warning.attemptId,
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] }
    });

    await ProctoringSession.findByIdAndUpdate(warning.sessionId, { warningCount: activeCount });
    await ExamAttempt.findByIdAndUpdate(warning.attemptId, { warningCount: activeCount });

    // Emit socket update
    try {
      const io = req.app.get('io');
      if (io) {
        io.of('/proctor').to(`exam_${warning.examId}`).to('exam_ALL').emit('proctor:warning-updated', {
          warningId: warning._id,
          attemptId: warning.attemptId,
          status: warning.status,
          activeCount,
          actionBy: req.user._id,
          timestamp: now.toISOString()
        });
      }
    } catch (sockErr) {
      console.warn('Socket warning update emit failed:', sockErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Warning ${warning.status.toLowerCase()} successfully`,
      data: warning
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active live exam sessions (Admin & Teacher)
// @route   GET /api/proctor/live-sessions
// @access  Private (Teacher, Admin)
exports.getLiveSessions = async (req, res, next) => {
  try {
    const { examId, search, status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    } else {
      query.status = 'IN_PROGRESS';
    }

    if (req.user.role === 'TEACHER') {
      const canManageAll = Boolean(req.user.permissions && req.user.permissions.canManageAllSubjects);
      if (!canManageAll) {
        const teacherExams = await Exam.find({ createdBy: req.user._id }).select('_id');
        const teacherExamIds = teacherExams.map((e) => e._id.toString());
        if (examId && examId !== 'ALL') {
          if (!teacherExamIds.includes(examId.toString())) {
            return res.status(403).json({
              success: false,
              message: 'You are not authorized to monitor this exam assessment'
            });
          }
          query.examId = examId;
        } else {
          query.examId = { $in: teacherExamIds };
        }
      } else {
        if (examId && examId !== 'ALL') {
          query.examId = examId;
        }
      }
    } else {
      // ADMIN
      if (examId && examId !== 'ALL') {
        query.examId = examId;
      }
    }

    const attempts = await ExamAttempt.find(query)
      .populate('studentId', 'name email rollNumber department')
      .populate('examId', 'title duration passMarks totalMarks isScheduled endTime requireCamera proctoringConfig')
      .sort({ warningCount: -1, lastActiveAt: -1 });

    // Cache question counts per exam to avoid redundant DB counts
    const examQuestionCounts = {};

    const now = Date.now();
    const liveSessions = await Promise.all(
      attempts.map(async (attempt) => {
        if (!attempt.examId || !attempt.studentId) return null;

        if (search) {
          const sLower = String(search).toLowerCase();
          const sName = (attempt.studentId.name || '').toLowerCase();
          const sEmail = (attempt.studentId.email || '').toLowerCase();
          const sRoll = (attempt.studentId.rollNumber || '').toLowerCase();
          if (!sName.includes(sLower) && !sEmail.includes(sLower) && !sRoll.includes(sLower)) {
            return null;
          }
        }

        const currentExamId = attempt.examId._id.toString();
        if (examQuestionCounts[currentExamId] === undefined) {
          examQuestionCounts[currentExamId] = await Question.countDocuments({ examId: currentExamId });
        }
        const totalQuestions = examQuestionCounts[currentExamId] || 0;

        // Calculate answered count from savedAnswers
        let answeredCount = 0;
        if (attempt.savedAnswers) {
          if (attempt.savedAnswers instanceof Map) {
            answeredCount = attempt.savedAnswers.size;
          } else if (typeof attempt.savedAnswers === 'object') {
            answeredCount = Object.keys(attempt.savedAnswers).length;
          }
        }

        // Calculate remaining seconds
        const extraMins = Number(attempt.extraTimeMinutes) || 0;
        const totalDurationMs = (attempt.examId.duration + extraMins) * 60 * 1000;
        const startTimeMs = new Date(attempt.startTime).getTime();
        const elapsedMs = now - startTimeMs;
        let remainingSeconds = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));

        // Clamp to scheduled window if applicable
        if (attempt.examId.isScheduled && attempt.examId.endTime) {
          const windowRemainingMs = new Date(attempt.examId.endTime).getTime() - now;
          const windowRemainingSec = Math.max(0, Math.floor(windowRemainingMs / 1000));
          remainingSeconds = Math.min(remainingSeconds, windowRemainingSec);
        }

        // Calculate online/heartbeat status (active within last 25 seconds)
        const lastActiveMs = attempt.lastActiveAt ? new Date(attempt.lastActiveAt).getTime() : startTimeMs;
        const secondsSinceLastActive = Math.max(0, Math.floor((now - lastActiveMs) / 1000));
        const isOnline = secondsSinceLastActive < 25;

        // Determine risk level
        const warnings = Number(attempt.warningCount) || 0;
        let riskLevel = 'NORMAL';
        if (attempt.disqualified || warnings >= 5) {
          riskLevel = 'DISQUALIFIED';
        } else if (warnings >= 3) {
          riskLevel = 'CRITICAL';
        } else if (warnings >= 1) {
          riskLevel = 'CAUTION';
        }

        // Fetch proctoring session and recent warnings
        const session = await ProctoringSession.findOne({ attemptId: attempt._id });
        const activeWarnings = await ProctoringWarning.find({
          attemptId: attempt._id,
          status: 'ACTIVE'
        }).sort({ issuedAt: -1 }).limit(5);

        const recentEvents = await ProctoringEvent.find({ attemptId: attempt._id })
          .sort({ serverTimestamp: -1 })
          .limit(10);

        return {
          attemptId: attempt._id,
          sessionId: session ? session._id : null,
          sessionStatus: session ? session.status : 'UNKNOWN',
          student: {
            id: attempt.studentId._id,
            name: attempt.studentId.name,
            email: attempt.studentId.email,
            rollNumber: attempt.studentId.rollNumber || '',
            department: attempt.studentId.department || ''
          },
          exam: {
            id: attempt.examId._id,
            title: attempt.examId.title,
            duration: attempt.examId.duration,
            isScheduled: attempt.examId.isScheduled,
            endTime: attempt.examId.endTime,
            requireCamera: attempt.examId.requireCamera !== undefined ? attempt.examId.requireCamera : true,
            proctoringConfig: attempt.examId.proctoringConfig || {}
          },
          startTime: attempt.startTime,
          lastActiveAt: attempt.lastActiveAt || attempt.startTime,
          secondsSinceLastActive,
          isOnline,
          remainingSeconds,
          extraTimeMinutes: extraMins,
          answeredCount,
          totalQuestions,
          currentQuestionIndex: attempt.currentQuestionIndex || 0,
          currentQuestionNumber: (attempt.currentQuestionIndex || 0) + 1,
          warningCount: warnings,
          reconnectCount: session ? session.reconnectCount : 0,
          cameraStatus: attempt.cameraStatus || (attempt.examId.requireCamera ? 'UNKNOWN' : 'NOT_REQUIRED'),
          latestCameraSnapshot: attempt.latestCameraSnapshot || '',
          riskLevel,
          disqualified: Boolean(attempt.disqualified),
          disqualificationReason: attempt.disqualificationReason || '',
          adminBroadcastMessage: attempt.adminBroadcastMessage || '',
          activeWarnings,
          recentEvents,
          proctorLogs: (attempt.proctorLogs || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        };
      })
    );

    const validSessions = liveSessions.filter(Boolean);

    res.status(200).json({
      success: true,
      count: validSessions.length,
      data: validSessions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disqualify / Force Submit an active exam session (Admin)
// @route   POST /api/proctor/sessions/:id/disqualify
// @access  Private/Admin
exports.disqualifySession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const attempt = await ExamAttempt.findById(id);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found'
      });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: `Cannot disqualify an attempt with status '${attempt.status}'`
      });
    }

    const disqualificationReason = (reason && String(reason).trim()) || 'Disqualified by proctor for violation';
    attempt.disqualified = true;
    attempt.disqualificationReason = disqualificationReason;

    if (!attempt.proctorLogs) attempt.proctorLogs = [];
    attempt.proctorLogs.push({
      timestamp: new Date(),
      eventType: 'DISQUALIFIED_BY_PROCTOR',
      reason: disqualificationReason
    });

    await attempt.save();

    // Broadcast instant socket action to student client
    try {
      const io = req.app.get('io');
      if (io) {
        io.of('/proctor').to(`exam_${attempt.examId}`).emit('student:action-received', {
          targetAttemptId: attempt._id.toString(),
          actionType: 'DISQUALIFY',
          payload: { reason: disqualificationReason }
        });
      }
    } catch (sockErr) {
      console.warn('Socket broadcast error (disqualify):', sockErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Session disqualified. Student client will be forcefully submitted.',
      data: {
        attemptId: attempt._id,
        disqualified: attempt.disqualified,
        disqualificationReason: attempt.disqualificationReason
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Grant extra time (minutes) to an active session (Admin)
// @route   POST /api/proctor/sessions/:id/grant-time
// @access  Private/Admin
exports.grantExtraTime = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { minutes } = req.body;

    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins <= 0 || mins > 120) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid time grant between 1 and 120 minutes'
      });
    }

    const attempt = await ExamAttempt.findById(id);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found'
      });
    }

    attempt.extraTimeMinutes = (attempt.extraTimeMinutes || 0) + mins;

    if (!attempt.proctorLogs) attempt.proctorLogs = [];
    attempt.proctorLogs.push({
      timestamp: new Date(),
      eventType: 'EXTRA_TIME_GRANTED',
      reason: `Proctor granted +${mins} minutes extra time`
    });

    await attempt.save();

    // Broadcast instant socket action to student client
    try {
      const io = req.app.get('io');
      if (io) {
        io.of('/proctor').to(`exam_${attempt.examId}`).emit('student:action-received', {
          targetAttemptId: attempt._id.toString(),
          actionType: 'GRANT_TIME',
          payload: { minutes: mins, extraTimeMinutes: attempt.extraTimeMinutes }
        });
      }
    } catch (sockErr) {
      console.warn('Socket broadcast error (grant-time):', sockErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Granted +${mins} minutes extra time to student.`,
      data: {
        attemptId: attempt._id,
        extraTimeMinutes: attempt.extraTimeMinutes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset / Pardon warning strikes for an active session (Admin)
// @route   POST /api/proctor/sessions/:id/reset-warnings
// @access  Private/Admin
exports.resetWarnings = async (req, res, next) => {
  try {
    const { id } = req.params;

    const attempt = await ExamAttempt.findById(id);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found'
      });
    }

    const previousCount = attempt.warningCount || 0;
    attempt.warningCount = 0;
    attempt.disqualified = false;
    attempt.disqualificationReason = '';

    if (!attempt.proctorLogs) attempt.proctorLogs = [];
    attempt.proctorLogs.push({
      timestamp: new Date(),
      eventType: 'WARNINGS_PARDONED',
      reason: `Proctor reset strike count from ${previousCount} to 0`
    });

    await attempt.save();

    // Broadcast instant socket action to student client
    try {
      const io = req.app.get('io');
      if (io) {
        io.of('/proctor').to(`exam_${attempt.examId}`).emit('student:action-received', {
          targetAttemptId: attempt._id.toString(),
          actionType: 'RESET_WARNINGS',
          payload: { warningCount: 0 }
        });
      }
    } catch (sockErr) {
      console.warn('Socket broadcast error (reset-warnings):', sockErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Strikes reset to 0 for student.`,
      data: {
        attemptId: attempt._id,
        warningCount: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a direct proctor message/warning to student screen (Admin)
// @route   POST /api/proctor/sessions/:id/send-message
// @access  Private/Admin
exports.sendProctorMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message text'
      });
    }

    const attempt = await ExamAttempt.findById(id);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found'
      });
    }

    const trimmedMsg = String(message).trim();
    attempt.adminBroadcastMessage = trimmedMsg;

    if (!attempt.proctorLogs) attempt.proctorLogs = [];
    attempt.proctorLogs.push({
      timestamp: new Date(),
      eventType: 'PROCTOR_MESSAGE_SENT',
      reason: trimmedMsg
    });

    await attempt.save();

    // Broadcast instant socket action to student client
    try {
      const io = req.app.get('io');
      if (io) {
        io.of('/proctor').to(`exam_${attempt.examId}`).emit('student:action-received', {
          targetAttemptId: attempt._id.toString(),
          actionType: 'BROADCAST_MESSAGE',
          payload: { message: trimmedMsg }
        });
      }
    } catch (sockErr) {
      console.warn('Socket broadcast error (send-message):', sockErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Proctor message transmitted to student screen.',
      data: {
        attemptId: attempt._id,
        adminBroadcastMessage: attempt.adminBroadcastMessage
      }
    });
  } catch (error) {
    next(error);
  }
};
