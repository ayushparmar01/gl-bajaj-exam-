/**
 * Real-time Proctoring Socket Handler (GLB ExamSphere)
 * Hardened with JWT Authentication & Role-Based Authorization
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const ProctoringSession = require('../models/ProctoringSession');
const ProctoringEvent = require('../models/ProctoringEvent');
const { processProctoringEvent } = require('../utils/proctorEventEngine');
const { getJwtSecret } = require('../utils/generateToken');

module.exports = function initProctorSocket(io) {
  const proctorNamespace = io.of('/proctor');

  // Socket.IO JWT Authentication Middleware
  proctorNamespace.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication failed: No token provided'));
      }

      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret);

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication failed: User no longer exists'));
      }

      if (user.status !== 'ACTIVE') {
        return next(new Error('Authentication failed: User account is inactive'));
      }

      // Attach verified user directly to socket session
      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  proctorNamespace.on('connection', (socket) => {
    // 1. Client joins a proctoring room (Server verifies role & ownership)
    socket.on('join:room', async ({ examId, attemptId }) => {
      try {
        const userRole = socket.user.role;

        if (userRole === 'ADMIN') {
          socket.role = 'ADMIN';
          socket.examId = examId;

          // Admin can join specific exam room or global 'exam_ALL'
          const roomToJoin = examId && examId !== 'ALL' ? `exam_${examId}` : 'exam_ALL';
          socket.join(roomToJoin);
          socket.currentRoom = roomToJoin;
        } else if (userRole === 'TEACHER') {
          socket.role = 'TEACHER';
          socket.examId = examId;

          if (!examId || examId === 'ALL') {
            socket.emit('error:unauthorized', { message: 'Instructors must specify a valid examId' });
            return;
          }

          // Verify teacher authorization for this exam
          const exam = await Exam.findById(examId);
          const isCreator = exam && exam.createdBy && exam.createdBy.toString() === socket.user._id.toString();
          const canManageAll = Boolean(socket.user.permissions && socket.user.permissions.canManageAllSubjects);

          if (!isCreator && !canManageAll) {
            socket.emit('error:unauthorized', { message: 'You are not authorized to proctor this exam' });
            return;
          }

          const teacherRoom = `exam_${examId}`;
          socket.join(teacherRoom);
          socket.currentRoom = teacherRoom;
        } else {
          // User is a STUDENT - NEVER allow declaring ADMIN or TEACHER
          socket.role = 'STUDENT';

          if (!examId) return;

          // Server-side validation: verify student owns this attempt and exam
          let query = {
            studentId: socket.user._id,
            examId
          };
          if (attemptId) {
            query._id = attemptId;
          }

          const attempt = await ExamAttempt.findOne(query).sort({ startTime: -1 });
          if (!attempt) {
            socket.emit('error:unauthorized', { message: 'No valid exam attempt found for this student' });
            return;
          }

          socket.attemptId = attempt._id.toString();
          socket.examId = examId.toString();
          socket.studentName = socket.user.name;

          // Student joins their specific exam room and private attempt room
          const studentRoom = `exam_${socket.examId}`;
          const privateAttemptRoom = `attempt_${socket.attemptId}`;
          socket.join(studentRoom);
          socket.join(privateAttemptRoom);
          socket.currentRoom = studentRoom;

          // Update ProctoringSession status and log lifecycle event
          try {
            const session = await ProctoringSession.findOne({ attemptId: socket.attemptId });
            if (session) {
              session.status = 'ACTIVE';
              session.connectedAt = new Date();
              session.disconnectedAt = null;
              await session.save();

              await ProctoringEvent.create({
                sessionId: session._id,
                attemptId: socket.attemptId,
                examId: socket.examId,
                studentId: socket.user._id,
                eventType: 'SOCKET_CONNECTED',
                severity: 'INFO',
                metadata: { socketId: socket.id },
                serverTimestamp: new Date()
              });
            }
          } catch (sessionErr) {
            console.warn('Error updating session on socket connect:', sessionErr.message);
          }

          // Notify admins/teachers watching this exam that student connected
          proctorNamespace.to(studentRoom).to('exam_ALL').emit('student:connected', {
            attemptId: socket.attemptId,
            examId: socket.examId,
            studentName: socket.studentName,
            timestamp: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('Proctor socket join room error:', e.message);
      }
    });

    // 2. Student streams camera snapshot frame in-memory (Only from verified student socket)
    socket.on('camera:frame', (data) => {
      if (socket.role !== 'STUDENT' || !socket.attemptId) return;

      const { frame, cameraStatus } = data || {};
      if (!frame) return;

      const payload = {
        attemptId: socket.attemptId,
        examId: socket.examId,
        frame,
        cameraStatus: cameraStatus || 'ACTIVE',
        timestamp: Date.now()
      };

      // Broadcast frame directly to admins watching this specific exam and exam_ALL
      if (socket.examId) {
        socket.to(`exam_${socket.examId}`).to('exam_ALL').emit('camera:frame-update', payload);
      } else {
        socket.to('exam_ALL').emit('camera:frame-update', payload);
      }
    });

    // 3. Student anti-cheat strike/warning event -> notify Admin
    socket.on('student:violation', (data) => {
      if (socket.role !== 'STUDENT' || !socket.attemptId) return;

      const { reason, warningCount, eventType } = data || {};

      const payload = {
        attemptId: socket.attemptId,
        examId: socket.examId,
        reason: reason || 'Anti-cheat violation detected',
        warningCount: Number(warningCount) || 1,
        eventType: eventType || 'SUSPICIOUS_ACTIVITY',
        timestamp: new Date().toISOString()
      };

      if (socket.examId) {
        socket.to(`exam_${socket.examId}`).to('exam_ALL').emit('student:violation-alert', payload);
      } else {
        socket.to('exam_ALL').emit('student:violation-alert', payload);
      }
    });

    // 4. Student camera status change (ACTIVE, BLOCKED, DISCONNECTED)
    socket.on('student:camera-status', (data) => {
      if (socket.role !== 'STUDENT' || !socket.attemptId) return;

      const { cameraStatus } = data || {};

      const payload = {
        attemptId: socket.attemptId,
        examId: socket.examId,
        cameraStatus: cameraStatus || 'UNKNOWN',
        timestamp: new Date().toISOString()
      };

      if (socket.examId) {
        socket.to(`exam_${socket.examId}`).to('exam_ALL').emit('student:camera-status-update', payload);
      } else {
        socket.to('exam_ALL').emit('student:camera-status-update', payload);
      }
    });

    // 5. Ingest and process structured proctoring events from student (with flood throttling)
    let eventCount = 0;
    let lastReset = Date.now();

    socket.on('proctor:event', async (data) => {
      if (socket.role !== 'STUDENT' || !socket.attemptId) return;

      const now = Date.now();
      if (now - lastReset > 5000) {
        eventCount = 0;
        lastReset = now;
      }
      eventCount++;
      if (eventCount > 25) {
        // Flood threshold reached within 5 seconds -> drop excess events to protect CPU/network
        return;
      }

      const { eventType, metadata } = data || {};
      if (!eventType) return;

      try {
        await processProctoringEvent({
          attemptId: socket.attemptId,
          studentId: socket.user._id,
          eventType,
          metadata
        }, io);
      } catch (err) {
        console.warn('Socket proctor event processing notice:', err.message);
      }
    });

    // 6. Admin sends direct real-time command to student (STRICT ADMIN AUTHORIZATION REQUIRED)
    socket.on('proctor:action', (data) => {
      // SECURITY: Verify socket belongs to an authenticated ADMIN
      if (socket.user?.role !== 'ADMIN' || socket.role !== 'ADMIN') {
        console.warn(`⚠️ Blocked unauthorized proctor:action from non-admin user ${socket.user?._id}`);
        return;
      }

      const { examId, targetAttemptId, actionType, payload } = data || {};
      if (!targetAttemptId || !actionType) return;

      const eventData = {
        targetAttemptId,
        actionType, // 'DISQUALIFY' | 'GRANT_TIME' | 'RESET_WARNINGS' | 'BROADCAST_MESSAGE'
        payload: payload || {},
        timestamp: new Date().toISOString()
      };

      if (examId && examId !== 'ALL') {
        proctorNamespace.to(`exam_${examId}`).emit('student:action-received', eventData);
      } else {
        proctorNamespace.emit('student:action-received', eventData);
      }
    });

    // 6. Handle disconnection
    socket.on('disconnect', async () => {
      if (socket.role === 'STUDENT' && socket.attemptId) {
        const payload = {
          attemptId: socket.attemptId,
          examId: socket.examId,
          timestamp: new Date().toISOString()
        };

        try {
          const session = await ProctoringSession.findOne({ attemptId: socket.attemptId });
          if (session && session.status === 'ACTIVE') {
            session.status = 'DISCONNECTED';
            session.disconnectedAt = new Date();
            await session.save();

            await ProctoringEvent.create({
              sessionId: session._id,
              attemptId: socket.attemptId,
              examId: socket.examId,
              studentId: socket.user._id,
              eventType: 'SOCKET_DISCONNECTED',
              severity: 'WARNING',
              metadata: { socketId: socket.id },
              serverTimestamp: new Date()
            });
          }
        } catch (sessionErr) {
          console.warn('Error updating session on socket disconnect:', sessionErr.message);
        }

        if (socket.examId) {
          proctorNamespace.to(`exam_${socket.examId}`).to('exam_ALL').emit('student:stream-disconnected', payload);
        } else {
          proctorNamespace.to('exam_ALL').emit('student:stream-disconnected', payload);
        }
      }
    });
  });

  return proctorNamespace;
};
