import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { resultService } from '../../services/resultService';
import { proctorService } from '../../services/proctorService';
import { AIProctorService } from '../../services/aiProctorService';
import { Clock, ChevronLeft, ChevronRight, Bookmark, Send, AlertTriangle, CheckCircle2, X, Check, ShieldAlert, Maximize, AlertOctagon, Lock, KeyRound, CheckSquare, Square, Calendar, Camera, CameraOff, Mic, MicOff, Eye, EyeOff, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { getFullImageUrl } from '../../services/api';
import { getProctorSocket, disconnectProctorSocket } from '../../services/socketService';

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialAccessCode = location.state?.accessCode || searchParams.get('accessCode') || '';

  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: 'selectedOption' or ['opt1', 'opt2'] }
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [zoomedImage, setZoomedImage] = useState(null);

  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isResumed, setIsResumed] = useState(false);

  // Passcode states
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState(initialAccessCode);
  const [passcodeError, setPasscodeError] = useState('');
  const [validatingPasscode, setValidatingPasscode] = useState(false);

  // Schedule Notice State (UPCOMING or EXPIRED)
  const [scheduleNotice, setScheduleNotice] = useState(null);

  // Proctoring & Anti-Cheat States
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningModalReason, setWarningModalReason] = useState('');
  const [isDisqualified, setIsDisqualified] = useState(false);

  // Camera & AI Proctoring States
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('UNKNOWN');
  const [micStatus, setMicStatus] = useState('UNKNOWN');
  const [faceStatus, setFaceStatus] = useState('UNKNOWN');
  const [gazeStatus, setGazeStatus] = useState('GAZE_CENTER');
  const [headStatus, setHeadStatus] = useState('HEAD_FORWARD');
  const [voiceActive, setVoiceActive] = useState(false);
  const [factualWarningBanner, setFactualWarningBanner] = useState('');
  const [isCameraWidgetCollapsed, setIsCameraWidgetCollapsed] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraPermissionGuide, setCameraPermissionGuide] = useState(false);
  const cameraStreamRef = useRef(null);
  const cameraStatusRef = useRef('UNKNOWN');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const aiProctorRef = useRef(null);

  // Live Proctoring States
  const [attemptId, setAttemptId] = useState(null);
  const attemptIdRef = useRef(null);
  const [adminAlert, setAdminAlert] = useState('');
  const [extraTimeNotice, setExtraTimeNotice] = useState('');
  const currentExtraTimeRef = useRef(0);
  const lastBroadcastRef = useRef('');
  const currentIndexRef = useRef(currentIndex);

  const timerRef = useRef(null);
  const userAnswersRef = useRef(userAnswers);
  const markedForReviewRef = useRef(markedForReview);
  const warningCountRef = useRef(0);
  const submittingRef = useRef(false);
  const hasEnteredFullscreenRef = useRef(false);
  const lastViolationTimeRef = useRef(0);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Keep refs in sync to prevent stale closures in event listeners
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  useEffect(() => {
    markedForReviewRef.current = markedForReview;
  }, [markedForReview]);

  useEffect(() => {
    warningCountRef.current = warningCount;
  }, [warningCount]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    hasEnteredFullscreenRef.current = hasEnteredFullscreen;
  }, [hasEnteredFullscreen]);

  // Stop all camera tracks
  const stopCamera = () => {
    if (cameraStreamRef.current) {
      try {
        if (cameraStreamRef.current._simInterval) {
          clearInterval(cameraStreamRef.current._simInterval);
        }
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      cameraStreamRef.current = null;
    }
  };

  // Start webcam video capture stream with multi-tier fallback
  const startCamera = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCameraLoading(true);
    setCameraError('');
    setCameraPermissionGuide(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus('BLOCKED');
        cameraStatusRef.current = 'BLOCKED';
        setCameraError('Webcam API is not supported in this browser. Please use Chrome, Edge, or Firefox.');
        setCameraLoading(false);
        return false;
      }

      let stream = null;

      // Tier 1: Try ideal video resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch (tier1Err) {
        console.warn('Tier 1 camera constraints failed, attempting fallback to basic video:true:', tier1Err);
        // Tier 2: Fallback to completely permissive constraints { video: true }
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (!stream) {
        throw new Error('Could not acquire video stream from camera.');
      }

      // Stop any previously running stream
      stopCamera();

      setCameraStream(stream);
      cameraStreamRef.current = stream;
      setCameraStatus('ACTIVE');
      cameraStatusRef.current = 'ACTIVE';
      setCameraError('');
      setCameraPermissionGuide(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch((e) => console.warn('Autoplay prevented:', e));
      }

      // Initialize AI Proctoring Engine
      try {
        if (!aiProctorRef.current) {
          const aiService = new AIProctorService();
          aiProctorRef.current = aiService;

          aiService.onStateChange((st) => {
            if (st.cameraStatus) setCameraStatus(st.cameraStatus);
            if (st.micStatus) setMicStatus(st.micStatus);
            if (st.faceStatus) setFaceStatus(st.faceStatus);
            if (st.gazeStatus) setGazeStatus(st.gazeStatus);
            if (st.headStatus) setHeadStatus(st.headStatus);
            if (st.voiceActive !== undefined) setVoiceActive(st.voiceActive);
          });

          aiService.onEvent((evt) => {
            const sock = getProctorSocket();
            if (sock && sock.connected) {
              sock.emit('proctor:event', evt);
            }
            if (attemptIdRef.current) {
              proctorService.recordEvent(attemptIdRef.current, evt.eventType, evt.metadata).catch(() => {});
            }
          });
        }

        if (aiProctorRef.current) {
          aiProctorRef.current.videoElement = videoRef.current;
          aiProctorRef.current.cameraStream = stream;
          aiProctorRef.current.currentState.cameraStatus = 'ACTIVE';
          aiProctorRef.current.startMonitoring();
          aiProctorRef.current.initMicrophone().catch(() => {});
        }
      } catch (aiInitErr) {
        console.warn('AI proctoring setup notice:', aiInitErr.message);
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setCameraStatus('DISCONNECTED');
          cameraStatusRef.current = 'DISCONNECTED';
          triggerWarning('Camera stream disconnected! Camera is required for proctoring.');
        };
      }
      setCameraLoading(false);
      return true;
    } catch (err) {
      console.warn('Camera access denied or failed:', err);
      setCameraStatus('BLOCKED');
      cameraStatusRef.current = 'BLOCKED';
      setCameraLoading(false);

      const errName = err.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Camera access is blocked by your browser.');
        setCameraPermissionGuide(true);
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No webcam hardware found on this computer.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('Webcam is currently in use by another application or browser tab.');
      } else {
        setCameraError(err.message || 'Failed to initialize webcam.');
      }
      return false;
    }
  };


  // Capture lightweight canvas snapshot frame for proctor sync (200x150 JPEG @ 0.4 quality, ~4-6 KB)
  const captureSnapshot = () => {
    if (!videoRef.current || cameraStatusRef.current !== 'ACTIVE') return null;
    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) return null;
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }
      canvas.width = 200;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.4);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.muted = true;
      videoRef.current.play().catch((e) => console.log('Video play error:', e));
    }
  }, [cameraStream, isCameraWidgetCollapsed, cameraStatus, hasEnteredFullscreen]);

  useEffect(() => {
    return () => {
      if (aiProctorRef.current) {
        aiProctorRef.current.stopAll();
      }
      stopCamera();
      disconnectProctorSocket();
    };
  }, []);

  // Submit exam with reason
  const handleFinalSubmit = async (autoSubmit = false, submissionReason = 'NORMAL', finalWarnings = null) => {
    if (submittingRef.current) return;

    try {
      submittingRef.current = true;
      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiProctorRef.current) {
        aiProctorRef.current.stopAll();
      }
      stopCamera();
      disconnectProctorSocket();

      // Exit fullscreen mode if active
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (e) {
          // ignore
        }
      }

      const warningsToSend = typeof finalWarnings === 'number' ? finalWarnings : warningCountRef.current;
      const formattedAnswers = questions.map((q) => {
        const rawAns = userAnswersRef.current[q._id];
        return {
          questionId: q._id,
          answer: rawAns !== undefined ? rawAns : (q.type === 'MULTIPLE' ? [] : '')
        };
      });

      const res = await resultService.submitExam({
        examId,
        answers: formattedAnswers,
        warningCount: warningsToSend,
        submissionReason
      });

      // Clear local storage cache
      try {
        localStorage.removeItem(`exampro_answers_${examId}`);
        localStorage.removeItem(`exampro_marked_${examId}`);
        localStorage.removeItem(`exampro_warnings_${examId}`);
      } catch (e) {
        // ignore
      }

      navigate(`/student/result/${res.data.resultId}`, {
        state: {
          isAutoSubmitted: autoSubmit || submissionReason === 'TIMEOUT',
          isViolationAutoSubmitted: submissionReason === 'TAB_SWITCH_LIMIT',
          warningCount: warningsToSend
        }
      });
    } catch (err) {
      alert(err.message || 'Failed to submit exam');
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Trigger anti-cheat strike
  const triggerWarning = (reason) => {
    if (submittingRef.current || !hasEnteredFullscreenRef.current || isTimeUp) return;

    const now = Date.now();
    // 2-second cooldown to prevent double-counting simultaneous events (e.g. blur + visibilitychange)
    if (now - lastViolationTimeRef.current < 2000) return;
    lastViolationTimeRef.current = now;

    const currentCount = warningCountRef.current;
    const nextCount = currentCount + 1;
    warningCountRef.current = nextCount;
    setWarningCount(nextCount);

    try {
      localStorage.setItem(`exampro_warnings_${examId}`, String(nextCount));
    } catch (e) {}

    let eventType = 'SUSPICIOUS_ACTIVITY';
    if (reason.includes('Tab switch')) eventType = 'TAB_SWITCH';
    else if (reason.includes('focus lost')) eventType = 'WINDOW_BLUR';
    else if (reason.includes('Fullscreen mode exited')) eventType = 'FULLSCREEN_EXIT';
    else if (reason.includes('Developer tools')) eventType = 'DEVTOOLS';
    else if (reason.includes('View-source')) eventType = 'VIEW_SOURCE';

    const proctorEvent = {
      eventType,
      reason,
      timestamp: new Date().toISOString()
    };

    // Immediate sync to server with proctor violation event
    resultService.saveExamProgress(examId, {
      answers: userAnswersRef.current,
      markedForReview: [...markedForReviewRef.current],
      warningCount: nextCount,
      currentQuestionIndex: currentIndexRef.current,
      proctorEvent
    }).then(handleSyncResponse).catch(() => {});

    // Real-time instant strike notification to proctor dashboard via WebSocket
    try {
      const socket = getProctorSocket();
      if (socket && socket.connected) {
        socket.emit('student:violation', {
          examId,
          attemptId: attemptIdRef.current,
          reason,
          warningCount: nextCount,
          eventType
        });
      }
    } catch (sockErr) {
      console.warn('Socket violation emit failed:', sockErr);
    }

    setWarningModalReason(reason);
    setShowWarningModal(true);

    if (nextCount >= 5) {
      setIsDisqualified(true);
      // Auto-submit after displaying the final strike alert
      setTimeout(() => {
        handleFinalSubmit(false, 'TAB_SWITCH_LIMIT', nextCount);
      }, 1600);
    }
  };

  const handleSyncResponse = (res) => {
    const pData = res?.data?.data;
    if (!pData) return;

    // 1. Check disqualification by proctor
    if (pData.forceSubmit && !submittingRef.current) {
      setIsDisqualified(true);
      setShowWarningModal(true);
      setWarningModalReason(pData.disqualificationReason || 'You have been disqualified by the proctor.');
      setTimeout(() => {
        handleFinalSubmit(false, 'ADMIN_DISQUALIFIED');
      }, 1600);
      return;
    }

    // 2. Check extra time grant
    if (typeof pData.extraTimeMinutes === 'number' && pData.extraTimeMinutes > currentExtraTimeRef.current) {
      const addedMins = pData.extraTimeMinutes - currentExtraTimeRef.current;
      currentExtraTimeRef.current = pData.extraTimeMinutes;
      setTimeLeft(prev => prev + (addedMins * 60));
      setExtraTimeNotice(`Instructor granted you +${addedMins} extra minutes!`);
      setTimeout(() => setExtraTimeNotice(''), 9000);
    }

    // 3. Check admin broadcast alert
    if (pData.adminBroadcastMessage && pData.adminBroadcastMessage !== lastBroadcastRef.current) {
      lastBroadcastRef.current = pData.adminBroadcastMessage;
      setAdminAlert(pData.adminBroadcastMessage);
    }

    // 4. Check warning reset by proctor
    if (typeof pData.warningCount === 'number' && pData.warningCount < warningCountRef.current) {
      warningCountRef.current = pData.warningCount;
      setWarningCount(pData.warningCount);
    }
  };

  // Proctoring Heartbeat: syncs current question index, camera status & snapshots every 8 seconds
  useEffect(() => {
    if (!examData || loading || submitting || !hasEnteredFullscreen) return;

    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      // Capture camera snapshot every 16 seconds (every 2nd heartbeat tick)
      let snap = null;
      if (examData.requireCamera && (tick % 2 === 0)) {
        snap = captureSnapshot();
      }

      const payload = {
        answers: userAnswersRef.current,
        markedForReview: [...markedForReviewRef.current],
        warningCount: warningCountRef.current,
        currentQuestionIndex: currentIndexRef.current,
        cameraStatus: cameraStatusRef.current
      };
      if (snap) {
        payload.cameraSnapshot = snap;
      }

      resultService.saveExamProgress(examId, payload).then(handleSyncResponse).catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, [examData, loading, submitting, hasEnteredFullscreen, examId]);

  // Real-time Proctoring Socket Connection & Instant Action Handler
  useEffect(() => {
    if (!examId || !attemptId || !hasEnteredFullscreen || submitting) return;

    const socket = getProctorSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const user = JSON.parse(localStorage.getItem('exampro_user') || '{}');

    socket.emit('join:room', {
      examId,
      attemptId,
      role: 'STUDENT',
      studentName: user.name || 'Student'
    });

    // Handle real-time administrative interventions
    const handleAction = (data) => {
      const { targetAttemptId, actionType, payload } = data || {};
      if (targetAttemptId && String(targetAttemptId) !== String(attemptId)) return;

      if (actionType === 'DISQUALIFY') {
        setIsDisqualified(true);
        setShowWarningModal(true);
        setWarningModalReason(payload?.reason || 'You have been disqualified by the proctor.');
        setTimeout(() => {
          handleFinalSubmit(false, 'ADMIN_DISQUALIFIED');
        }, 1600);
      } else if (actionType === 'GRANT_TIME') {
        const addedMins = Number(payload?.minutes) || 0;
        if (addedMins > 0) {
          currentExtraTimeRef.current += addedMins;
          setTimeLeft((prev) => prev + addedMins * 60);
          setExtraTimeNotice(`Instructor granted you +${addedMins} extra minutes!`);
          setTimeout(() => setExtraTimeNotice(''), 9000);
        }
      } else if (actionType === 'RESET_WARNINGS') {
        warningCountRef.current = 0;
        setWarningCount(0);
        try {
          localStorage.setItem(`exampro_warnings_${examId}`, '0');
        } catch (e) {}
      } else if (actionType === 'BROADCAST_MESSAGE') {
        if (payload?.message) {
          lastBroadcastRef.current = payload.message;
          setAdminAlert(payload.message);
        }
      }
    };

    socket.on('student:action-received', handleAction);

    return () => {
      socket.off('student:action-received', handleAction);
    };
  }, [examId, attemptId, hasEnteredFullscreen, submitting]);

  // Real-time Socket Camera Frame Streaming (~1 FPS, <300ms latency directly to Proctor)
  useEffect(() => {
    if (!examData?.requireCamera || !cameraStream || !attemptId || !hasEnteredFullscreen || submitting) return;

    const socket = getProctorSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const frameInterval = setInterval(() => {
      if (socket.connected && cameraStatusRef.current === 'ACTIVE') {
        const frame = captureSnapshot();
        if (frame) {
          socket.emit('camera:frame', {
            examId,
            attemptId,
            frame,
            cameraStatus: cameraStatusRef.current
          });
        }
      }
    }, 1000); // 1 frame per second smooth streaming

    return () => clearInterval(frameInterval);
  }, [examData?.requireCamera, cameraStream, attemptId, hasEnteredFullscreen, submitting, examId]);

  const initExam = async (codeToTry = initialAccessCode) => {
    try {
      setLoading(true);
      setError('');
      setPasscodeError('');
      const res = await examService.startExam(examId, codeToTry);
      const data = res.data;

      setNeedsPasscode(false);
      setExamData(data.exam);
      setQuestions(data.questions);
      if (data.attemptId) {
        setAttemptId(data.attemptId);
        attemptIdRef.current = data.attemptId;
        proctorService.initSession(data.attemptId).catch((initErr) => {
          console.warn('Proctoring session initialization notice:', initErr?.message || initErr);
        });
      }

      // Check for saved answers from server or localStorage
      const localKeyAnswers = `exampro_answers_${examId}`;
      const localKeyMarked = `exampro_marked_${examId}`;
      const localKeyWarnings = `exampro_warnings_${examId}`;

      let restoredAnswers = data.savedAnswers || {};
      let restoredMarked = new Set(data.markedForReview || []);
      let restoredWarnings = Number(data.warningCount) || 0;

      try {
        const cachedAnswers = localStorage.getItem(localKeyAnswers);
        if (cachedAnswers) {
          const parsed = JSON.parse(cachedAnswers);
          restoredAnswers = { ...restoredAnswers, ...parsed };
        }
        const cachedMarked = localStorage.getItem(localKeyMarked);
        if (cachedMarked) {
          const parsedM = JSON.parse(cachedMarked);
          restoredMarked = new Set([...restoredMarked, ...parsedM]);
        }
        const cachedWarnings = localStorage.getItem(localKeyWarnings);
        if (cachedWarnings !== null) {
          restoredWarnings = Math.max(restoredWarnings, Number(cachedWarnings) || 0);
        }
      } catch (e) {
        console.warn('Failed to read local cache:', e);
      }

      setUserAnswers(restoredAnswers);
      setMarkedForReview(restoredMarked);
      setWarningCount(restoredWarnings);
      warningCountRef.current = restoredWarnings;

      if (Object.keys(restoredAnswers).length > 0 || data.message?.includes('resumed')) {
        setIsResumed(true);
      }

      // If student already has 5 or more warnings from a previous session, auto-submit immediately
      if (restoredWarnings >= 5) {
        setIsDisqualified(true);
        setShowWarningModal(true);
        setWarningModalReason('Exceeded maximum allowed 5 tab-switch warnings.');
        setTimeout(() => {
          handleFinalSubmit(false, 'TAB_SWITCH_LIMIT', restoredWarnings);
        }, 1500);
        return;
      }

      // Calculate timer from server startTime and duration
      const startTime = new Date(data.startTime).getTime();
      const durationMs = data.durationMinutes * 60 * 1000;
      const now = Date.now();
      const elapsedMs = now - startTime;
      let remainingSeconds = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));

      // Clamp remaining duration if exam has a scheduled end time window
      if (data.exam?.isScheduled && data.exam?.endTime) {
        const windowEndMs = new Date(data.exam.endTime).getTime();
        const windowRemainingSec = Math.max(0, Math.floor((windowEndMs - now) / 1000));
        remainingSeconds = Math.min(remainingSeconds, windowRemainingSec);
      }

      setTimeLeft(remainingSeconds);
    } catch (err) {
      const status = err.status || err.response?.status;
      const data = err.data || err.response?.data || {};

      if (status === 403) {
        if (data.isUpcoming) {
          setScheduleNotice({
            type: 'UPCOMING',
            message: data.message || err.message || 'This assessment is not yet open.',
            date: data.scheduledStartTime
          });
          return;
        }
        if (data.isExpired) {
          setScheduleNotice({
            type: 'EXPIRED',
            message: data.message || err.message || 'This assessment window has closed.',
            date: data.scheduledEndTime
          });
          return;
        }
        if (data.requiresAccessCode) {
          setNeedsPasscode(true);
          setPasscodeError(data.message || err.message || 'Valid access passcode required');
          return;
        }
      }
      setError(data.message || err.message || 'Failed to start exam session');
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeSubmit = async (e) => {
    e.preventDefault();
    if (!enteredPasscode.trim()) {
      setPasscodeError('Please enter the access passcode');
      return;
    }
    setValidatingPasscode(true);
    await initExam(enteredPasscode.trim());
    setValidatingPasscode(false);
  };

  useEffect(() => {
    initExam();
  }, [examId]);

  const enterFullscreenAndStart = async () => {
    if (examData?.requireCamera) {
      await startCamera();
    }
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request denied or not supported:', err);
    }
    setHasEnteredFullscreen(true);
    hasEnteredFullscreenRef.current = true;
    setIsFullscreen(true);
  };

  const handleAcknowledgeWarning = async () => {
    setShowWarningModal(false);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (e) {}
  };

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }

      try {
        localStorage.setItem(`exampro_marked_${examId}`, JSON.stringify([...next]));
      } catch (e) {}

      resultService.saveExamProgress(examId, {
        answers: userAnswersRef.current,
        markedForReview: [...next],
        warningCount: warningCountRef.current
      }).catch(() => {});

      return next;
    });
  };

  const handleSelectOption = (questionId, option) => {
    if (isTimeUp || submitting) return;

    const currentQuestion = questions.find((q) => q._id === questionId);
    const isMultiple = currentQuestion?.type === 'MULTIPLE';

    setUserAnswers((prev) => {
      let updated;
      if (isMultiple) {
        const existing = Array.isArray(prev[questionId])
          ? prev[questionId]
          : (prev[questionId] ? [prev[questionId]] : []);
        const newSelection = existing.includes(option)
          ? existing.filter((o) => o !== option)
          : [...existing, option];
        updated = { ...prev, [questionId]: newSelection };
      } else {
        updated = { ...prev, [questionId]: option };
      }

      try {
        localStorage.setItem(`exampro_answers_${examId}`, JSON.stringify(updated));
      } catch (e) {}

      resultService.saveExamProgress(examId, {
        answers: updated,
        markedForReview: [...markedForReviewRef.current],
        warningCount: warningCountRef.current,
        currentQuestionIndex: currentIndexRef.current
      }).then(handleSyncResponse).catch(() => {});

      return updated;
    });
  };

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isTimeUp && !submitting) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimeUp(true);
            handleFinalSubmit(true, 'TIMEOUT'); // Auto-submit when time reaches zero
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isTimeUp, submitting]);

  // Anti-cheating event listeners (Visibility, Blur, Fullscreen, Keyboard Shortcuts)
  useEffect(() => {
    if (!hasEnteredFullscreen || loading || submitting) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerWarning('Tab switch detected! You navigated away from the exam tab.');
      }
    };

    const handleWindowBlur = () => {
      triggerWarning('Window focus lost! You clicked outside or switched to another application.');
    };

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && hasEnteredFullscreenRef.current && !submittingRef.current) {
        triggerWarning('Fullscreen mode exited! Fullscreen is strictly required throughout the exam.');
      }
    };

    const handleKeyDown = (e) => {
      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Developer tools shortcut (F12) detected!');
        return false;
      }
      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Developer tools shortcut detected!');
        return false;
      }
      // Block Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('View-source shortcut detected!');
        return false;
      }
      // Block Copy, Paste, Cut shortcuts
      if (e.ctrlKey && ['c', 'C', 'v', 'V', 'x', 'X', 'a', 'A'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasEnteredFullscreen, loading, submitting]);

  if (loading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2 style={{ color: '#0F172A' }}>Initializing Secure Exam Environment...</h2>
      </div>
    );
  }

  if (scheduleNotice) {
    const isUpcoming = scheduleNotice.type === 'UPCOMING';
    const formattedDate = scheduleNotice.date 
      ? new Date(scheduleNotice.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      : null;

    return (
      <div style={{ maxWidth: '520px', margin: '4rem auto', padding: '0 1rem' }} className="animate-fade-in">
        <div className="glass-panel" style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '18px',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isUpcoming ? '#FEF3C7' : '#FEE2E2',
            border: `1.5px solid ${isUpcoming ? '#FCD34D' : '#FECDD3'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: isUpcoming ? '#D97706' : '#DC2626'
          }}>
            {isUpcoming ? <Calendar size={30} /> : <Clock size={30} />}
          </div>

          <h2 style={{ fontSize: '1.4rem', color: '#0F172A', marginBottom: '0.5rem', fontWeight: 800 }}>
            {isUpcoming ? 'Assessment Not Yet Open' : 'Assessment Window Closed'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {scheduleNotice.message}
          </p>

          {formattedDate && (
            <div style={{
              padding: '0.85rem 1rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '0.85rem',
              color: '#334155',
              marginBottom: '1.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Clock size={16} color={isUpcoming ? '#D97706' : '#DC2626'} />
              <span>
                {isUpcoming ? 'Opens at:' : 'Closed at:'} <strong>{formattedDate}</strong>
              </span>
            </div>
          )}

          <div>
            <button
              onClick={() => navigate('/student/exams')}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontWeight: 700
              }}
            >
              Return to Available Assessments
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (needsPasscode) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1rem' }} className="animate-fade-in">
        <div className="glass-panel" style={{ padding: '2.5rem 2rem', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1.5px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#6366F1'
          }}>
            <Lock size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', color: '#0F172A', marginBottom: '0.4rem', fontWeight: 800 }}>
            Passcode Protected Assessment
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            This exam requires an access code. Please enter the code provided by your instructor to unlock this session.
          </p>

          {passcodeError && (
            <div style={{
              background: '#FEE2E2',
              border: '1px solid #FECDD3',
              color: '#B91C1C',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
              textAlign: 'left'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{passcodeError}</span>
            </div>
          )}

          <form onSubmit={handlePasscodeSubmit} style={{ textAlign: 'left' }}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155' }}>
                <KeyRound size={15} color="#6366F1" />
                Access Passcode / PIN *
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter passcode"
                value={enteredPasscode}
                onChange={(e) => {
                  setEnteredPasscode(e.target.value);
                  if (passcodeError) setPasscodeError('');
                }}
                autoFocus
                required
                style={{ fontSize: '1rem', letterSpacing: '0.08em', padding: '0.75rem 1rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => navigate('/student/exams')}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.75rem' }}
              >
                Back to Exams
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={validatingPasscode}
                style={{
                  flex: 1.4,
                  padding: '0.75rem',
                  background: '#6366F1',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {validatingPasscode ? 'Unlocking...' : 'Unlock Exam'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '540px', margin: '4rem auto', padding: '0 1rem' }} className="animate-fade-in">
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem 2rem',
            textAlign: 'center',
            background: '#FFFFFF',
            border: '1px solid #FECDD3',
            borderRadius: '18px',
            boxShadow: '0 20px 45px rgba(244, 63, 94, 0.08)'
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#FEE2E2',
              border: '1.5px solid #FECDD3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#DC2626'
            }}
          >
            <AlertTriangle size={28} />
          </div>

          <h2 style={{ fontSize: '1.35rem', color: '#0F172A', marginBottom: '0.5rem', fontWeight: 800 }}>
            Unable to Start Assessment
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            {error}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '0.7rem' }}
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/student/exams')}
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.7rem' }}
            >
              Browse Assessments
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isQuestionAnswered = (qId) => {
    const ans = userAnswers[qId];
    if (Array.isArray(ans)) return ans.length > 0;
    return typeof ans === 'string' && ans.trim() !== '';
  };

  const answeredCount = questions.filter(q => isQuestionAnswered(q._id)).length;
  const unattemptedCount = questions.length - answeredCount;
  const reviewCount = markedForReview.size;

  return (
    <div 
      style={{ minHeight: 'calc(100vh - 100px)', userSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      {/* Resumed Session Alert Banner */}
      {isResumed && (
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          color: '#92400E',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={20} color="#D97706" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.925rem' }}>
              <strong>Exam Session Resumed!</strong> Your previously saved answers and time remaining have been restored.
            </span>
          </div>
          <button
            onClick={() => setIsResumed(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#92400E',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Proctor Broadcast Alert Banner */}
      {adminAlert && (
        <div style={{
          background: '#FEF2F2',
          border: '1.5px solid #EF4444',
          color: '#991B1B',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldAlert size={22} color="#DC2626" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.925rem' }}>
              <strong style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>Proctor Notice:</strong> {adminAlert}
            </span>
          </div>
          <button
            onClick={() => setAdminAlert('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#991B1B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Extra Time Granted Banner */}
      {extraTimeNotice && (
        <div style={{
          background: '#ECFDF5',
          border: '1.5px solid #10B981',
          color: '#065F46',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Clock size={20} color="#059669" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.925rem' }}>
              <strong>Time Extended:</strong> {extraTimeNotice}
            </span>
          </div>
          <button
            onClick={() => setExtraTimeNotice('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#065F46',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Exam Header */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
        padding: '1.2rem 1.75rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        position: 'sticky',
        top: '68px',
        zIndex: 90
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{ fontSize: '1.35rem', color: '#0F172A', lineHeight: 1.2, fontWeight: 700 }}>{examData?.title}</h2>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              background: '#E0F2FE',
              color: '#0369A1',
              border: '1px solid #BAE6FD'
            }}>
              LIVE ASSESSMENT
            </span>
            {examData?.isScheduled && examData?.endTime && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                color: '#0369A1',
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 600
              }}>
                <Clock size={12} />
                Window Closes: {new Date(examData.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>
              Question <strong style={{ color: '#0F172A' }}>{currentIndex + 1}</strong> of <strong style={{ color: '#0F172A' }}>{questions.length}</strong>
            </span>
            {examData?.hasNegativeMarking && examData?.negativeMarks > 0 && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                color: '#BE123C',
                background: '#FFE4E6',
                border: '1px solid #FECDD3',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 600
              }}>
                <AlertTriangle size={12} />
                Penalty: -{examData.negativeMarks} pts per incorrect answer
              </span>
            )}
          </div>
        </div>

        {/* Right Status Controls: Anti-Cheat Strike Pill + Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Proctoring Warning Strikes Pill */}
          <div 
            title="Tab-switching & focus-loss violations (Max 5 allowed before auto-submit)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: warningCount === 0 
                ? '#F0FDF4' 
                : warningCount < 3 
                ? '#FEF3C7' 
                : '#FEE2E2',
              border: warningCount === 0 
                ? '1.5px solid #86EFAC' 
                : warningCount < 3 
                ? '1.5px solid #FCD34D' 
                : '1.5px solid #F87171',
              color: warningCount === 0 ? '#166534' : warningCount < 3 ? '#92400E' : '#B91C1C',
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: warningCount >= 3 ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none'
            }}
          >
            <ShieldAlert size={16} />
            <span>Strikes: {warningCount} / 5</span>
          </div>

          {/* Re-enter Fullscreen Button if student accidentally lost fullscreen without strike */}
          {!isFullscreen && hasEnteredFullscreen && (
            <button
              onClick={async () => {
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  }
                } catch (e) {}
              }}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                borderColor: '#F59E0B',
                color: '#B45309',
                background: '#FEF3C7'
              }}
            >
              <Maximize size={14} />
              Re-enter Fullscreen
            </button>
          )}

          {/* Live Timer Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.55rem 1.35rem',
            borderRadius: 'var(--radius-full)',
            background: timeLeft < 60 
              ? '#FEE2E2' 
              : timeLeft < 300 
              ? '#FEF3C7' 
              : '#E0F2FE',
            border: timeLeft < 60 
              ? '1.5px solid #F87171' 
              : timeLeft < 300 
              ? '1.5px solid #FCD34D' 
              : '1.5px solid #7DD3FC',
            color: timeLeft < 60 ? '#B91C1C' : timeLeft < 300 ? '#92400E' : '#0369A1',
            fontWeight: 800,
            fontSize: '1.25rem',
            letterSpacing: '0.05em',
            boxShadow: timeLeft < 60 
              ? '0 0 15px rgba(239, 68, 68, 0.2)' 
              : timeLeft < 300 
              ? '0 0 15px rgba(245, 158, 11, 0.2)' 
              : '0 0 15px rgba(14, 165, 233, 0.15)'
          }}>
            <Clock size={20} className={timeLeft < 60 ? 'animate-spin' : ''} />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left-hand Question Navigator (30% framing), Right Question Box */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Left Question Navigator Panel (Sidebar & Navigation 30%: Deep Slate Blue #0F172A) */}
        <div style={{
          background: '#0F172A',
          borderRadius: '16px',
          padding: '1.6rem',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'sticky',
          top: '160px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', color: '#FFFFFF', fontWeight: 700, margin: 0 }}>Question Navigator</h4>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.15rem' }}>Question Overview Grid</div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                color: '#38BDF8',
                background: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 700
              }}>
                {answeredCount}/{questions.length} Done
              </span>
            </div>

            {/* Grid showing question numbers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.6rem',
              marginBottom: '1.4rem',
              maxHeight: '340px',
              overflowY: 'auto',
              paddingRight: '3px'
            }}>
              {questions.map((q, idx) => {
                const isAnswered = isQuestionAnswered(q._id);
                const isMarked = markedForReview.has(q._id);
                const isCurrent = idx === currentIndex;

                // Laptop-Specific UI Color Guidelines:
                // Active Question State: Bright Blue border (#2563EB) and a white background (#FFFFFF)
                // Answered: Soft Sage Green background (#DCFCE7) and dark text (#166534)
                // Skipped / Flagged: Soft Amber background (#FEF3C7) and dark text (#92400E)
                // Unattempted: Deep Slate neutral background rgba(255, 255, 255, 0.08) and text #CBD5E1

                let btnBg = 'rgba(255, 255, 255, 0.08)';
                let btnBorder = '1px solid rgba(255, 255, 255, 0.16)';
                let btnColor = '#CBD5E1';
                let btnShadow = 'none';
                let btnFontWeight = 600;

                if (isCurrent) {
                  btnBg = '#FFFFFF';
                  btnBorder = '2.5px solid #2563EB';
                  btnColor = '#2563EB';
                  btnFontWeight = 800;
                  btnShadow = '0 0 0 2px rgba(37, 99, 235, 0.35), 0 4px 12px rgba(37, 99, 235, 0.3)';
                } else if (isMarked) {
                  btnBg = '#FEF3C7';
                  btnBorder = '1.5px solid #FCD34D';
                  btnColor = '#92400E';
                  btnFontWeight = 700;
                } else if (isAnswered) {
                  btnBg = '#DCFCE7';
                  btnBorder = '1.5px solid #86EFAC';
                  btnColor = '#166534';
                  btnFontWeight = 700;
                }

                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      background: btnBg,
                      border: btnBorder,
                      color: btnColor,
                      fontWeight: btnFontWeight,
                      fontSize: '0.9rem',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      boxShadow: btnShadow,
                      cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                    {isMarked && isCurrent && (
                      <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#F59E0B',
                        boxShadow: '0 0 6px #F59E0B'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend inside Deep Slate Blue Navigator */}
            <div style={{
              fontSize: '0.8rem',
              color: '#CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
              padding: '0.9rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '4px',
                    background: '#FFFFFF',
                    border: '2px solid #2563EB'
                  }} />
                  <span>Active Viewing</span>
                </div>
                <strong style={{ color: '#60A5FA' }}>Q{currentIndex + 1}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '4px',
                    background: '#DCFCE7',
                    border: '1px solid #86EFAC'
                  }} />
                  <span>Answered</span>
                </div>
                <strong style={{ color: '#4ADE80' }}>{answeredCount}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '4px',
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D'
                  }} />
                  <span>Skipped / Marked</span>
                </div>
                <strong style={{ color: '#FCD34D' }}>{reviewCount}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.16)'
                  }} />
                  <span>Unattempted</span>
                </div>
                <strong style={{ color: '#94A3B8' }}>{unattemptedCount}</strong>
              </div>
            </div>
          </div>

          {/* Submit action in sidebar (Primary Action 10%: Classic Teal #0EA5E9) */}
          <button
            onClick={() => setShowSubmitModal(true)}
            style={{
              width: '100%',
              marginTop: '1.5rem',
              fontWeight: 700,
              background: '#0EA5E9',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#0284C7'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#0EA5E9'; }}
          >
            <Send size={16} />
            <span>Finish & Submit Exam</span>
          </button>
        </div>

        {/* Right Question Card (Card on Soft Pearl White #F8FAFC canvas) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
          padding: '2.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '540px',
          position: 'relative'
        }}>
          {/* Subtle Progress Bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: '#F1F5F9',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0}%`,
              height: '100%',
              background: '#0EA5E9',
              transition: 'width 0.3s ease'
            }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#0369A1',
                  background: '#E0F2FE',
                  border: '1px solid #BAE6FD',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  letterSpacing: '0.05em'
                }}>
                  QUESTION {currentIndex + 1}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748B',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '6px',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0'
                }}>
                  {currentQ?.marks || 1} Point{currentQ?.marks === 1 ? '' : 's'}
                </span>
                {currentQ?.type === 'MULTIPLE' ? (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#7C3AED',
                    background: '#F3E8FF',
                    border: '1px solid #DDD6FE',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    Multi-Select (MSQ) • Select all correct choices
                  </span>
                ) : (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#0284C7',
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px'
                  }}>
                    Single Choice (MCQ)
                  </span>
                )}
              </div>

              <button
                onClick={() => toggleMarkForReview(currentQ._id)}
                className="btn btn-sm"
                style={{
                  gap: '0.45rem',
                  background: markedForReview.has(currentQ._id) ? '#FEF3C7' : '#F1F5F9',
                  color: markedForReview.has(currentQ._id) ? '#92400E' : '#475569',
                  border: markedForReview.has(currentQ._id) ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                  fontWeight: 600
                }}
              >
                <Bookmark size={15} fill={markedForReview.has(currentQ._id) ? '#92400E' : 'none'} />
                <span>{markedForReview.has(currentQ._id) ? 'Skipped / Marked' : 'Mark to Skip / Review'}</span>
              </button>
            </div>

            {/* Question Text */}
            <h3 style={{
              fontSize: '1.25rem',
              color: '#0F172A',
              marginBottom: currentQ?.imageUrl ? '1.25rem' : '1.75rem',
              lineHeight: 1.6,
              fontWeight: 700
            }}>
              {currentQ?.questionText}
            </h3>

            {/* Question Attached Diagram/Image */}
            {currentQ?.imageUrl && (
              <div style={{
                marginBottom: '1.75rem',
                textAlign: 'center',
                background: '#F8FAFC',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #E2E8F0'
              }}>
                <img
                  src={getFullImageUrl(currentQ.imageUrl)}
                  alt={`Diagram for Question ${currentIndex + 1}`}
                  onClick={() => setZoomedImage(getFullImageUrl(currentQ.imageUrl))}
                  style={{
                    maxHeight: '260px',
                    maxWidth: '100%',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    cursor: 'zoom-in',
                    boxShadow: '0 4px 15px rgba(15, 23, 42, 0.08)'
                  }}
                  title="Click to zoom image"
                />
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.5rem' }}>
                  Click diagram to view in high-resolution preview
                </div>
              </div>
            )}

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {currentQ?.options?.map((opt, oIdx) => {
                const isMulti = currentQ?.type === 'MULTIPLE';
                const selectedList = Array.isArray(userAnswers[currentQ._id])
                  ? userAnswers[currentQ._id]
                  : (userAnswers[currentQ._id] ? [userAnswers[currentQ._id]] : []);
                const isSelected = isMulti 
                  ? selectedList.includes(opt) 
                  : userAnswers[currentQ._id] === opt;

                const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
                const letter = optionLetters[oIdx] || (oIdx + 1);

                return (
                  <div
                    key={oIdx}
                    onClick={() => handleSelectOption(currentQ._id, opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      borderRadius: '12px',
                      background: isSelected 
                        ? (isMulti ? 'rgba(168, 85, 247, 0.08)' : 'rgba(14, 165, 233, 0.08)')
                        : '#F8FAFC',
                      border: isSelected 
                        ? (isMulti ? '2px solid #A855F7' : '2px solid #0EA5E9') 
                        : '1.5px solid #E2E8F0',
                      boxShadow: isSelected 
                        ? (isMulti ? '0 2px 10px rgba(168, 85, 247, 0.18)' : '0 2px 10px rgba(14, 165, 233, 0.18)') 
                        : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      fontSize: '0.95rem'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: isMulti ? '6px' : '8px',
                      background: isSelected 
                        ? (isMulti ? '#9333EA' : '#0EA5E9') 
                        : '#E2E8F0',
                      border: isSelected ? 'none' : '1px solid #CBD5E1',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {letter}
                    </div>

                    <span style={{
                      color: isSelected ? '#0F172A' : '#334155',
                      fontWeight: isSelected ? 600 : 500,
                      flex: 1,
                      lineHeight: 1.45
                    }}>
                      {opt}
                    </span>

                    {/* Indicator */}
                    {isMulti ? (
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        background: isSelected ? '#9333EA' : 'transparent',
                        border: isSelected ? 'none' : '2px solid #CBD5E1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        flexShrink: 0
                      }}>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    ) : (
                      isSelected && (
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#0EA5E9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          flexShrink: 0
                        }}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation & Primary Action Controls (Classic Teal #0EA5E9) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '2.5rem',
            paddingTop: '1.35rem',
            borderTop: '1px solid #E2E8F0'
          }}>
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="btn btn-secondary"
              disabled={currentIndex === 0}
              style={{ opacity: currentIndex === 0 ? 0.45 : 1 }}
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="btn btn-primary"
                style={{
                  background: '#0EA5E9',
                  color: '#FFFFFF',
                  padding: '0.7rem 1.6rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
                }}
              >
                <span>Next Question</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="btn btn-primary btn-lg"
                style={{
                  background: '#0EA5E9',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
                }}
              >
                <Send size={18} />
                <span>Submit Exam</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#0F172A' }}>Confirm Exam Submission</h3>
            </div>

            <div className="modal-body" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 1rem' }} />
              <h4 style={{ fontSize: '1.15rem', color: '#0F172A', marginBottom: '0.5rem', fontWeight: 700 }}>Ready to submit your exam?</h4>
              <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.5rem' }}>
                Once submitted, your answers will be evaluated immediately and you cannot modify them.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', padding: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.5rem', background: '#DCFCE7', borderRadius: '8px', border: '1px solid #86EFAC' }}>
                  <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>Answered</span>
                  <h4 style={{ color: '#166534', fontSize: '1.25rem', margin: '0.2rem 0 0' }}>{answeredCount}</h4>
                </div>
                <div style={{ padding: '0.5rem', background: '#F1F5F9', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                  <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Unattempted</span>
                  <h4 style={{ color: '#0F172A', fontSize: '1.25rem', margin: '0.2rem 0 0' }}>{unattemptedCount}</h4>
                </div>
                <div style={{ padding: '0.5rem', background: '#FEF3C7', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                  <span style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>For Review</span>
                  <h4 style={{ color: '#92400E', fontSize: '1.25rem', margin: '0.2rem 0 0' }}>{reviewCount}</h4>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setShowSubmitModal(false)} className="btn btn-secondary">
                Continue Test
              </button>
              <button
                onClick={() => handleFinalSubmit(false, 'NORMAL')}
                className="btn btn-primary"
                disabled={submitting}
                style={{ background: '#0EA5E9', color: '#FFFFFF', fontWeight: 700 }}
              >
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Zoom Lightbox Modal */}
      {zoomedImage && (
        <div
          className="modal-overlay"
          onClick={() => setZoomedImage(null)}
          style={{ zIndex: 10000, cursor: 'zoom-out' }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
            <img
              src={zoomedImage}
              alt="Question Diagram Full Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                border: '1px solid var(--border-color)',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      )}

      {/* Initial Fullscreen & Proctoring Gateway Modal */}
      {!hasEnteredFullscreen && (
        <div className="modal-overlay" style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.94)', backdropFilter: 'blur(8px)', overflowY: 'auto', padding: '1.5rem 1rem' }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '580px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #CBD5E1',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
              margin: 'auto'
            }}
          >
            {/* Pinned Header */}
            <div style={{ background: '#0F172A', color: '#FFFFFF', padding: '1.4rem 2rem', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.2)', border: '1.5px solid #38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', color: '#38BDF8' }}>
                <ShieldAlert size={28} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.35rem', color: '#FFFFFF' }}>Secure Proctored Assessment Room</h3>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
                {examData?.title} • Duration: {examData?.duration} Minutes
              </p>
            </div>

            {/* Scrollable Instructions Body */}
            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: '1 1 auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.85rem', color: '#92400E', lineHeight: 1.45 }}>
                  <strong>Anti-Cheating Policy Active:</strong> Navigating away from this exam or switching tabs is tracked in real-time.
                </div>
              </div>

              {examData?.description && (
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  color: '#334155',
                  lineHeight: 1.5
                }}>
                  <strong style={{ display: 'block', color: '#0F172A', marginBottom: '0.25rem' }}>Exam Instructions:</strong>
                  {examData.description}
                </div>
              )}

              <h5 style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Security Regulations & Rules:
              </h5>

              <ul style={{ margin: '0 0 1.5rem', paddingLeft: '1.2rem', fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                <li><strong>Fullscreen Enforcement:</strong> You must enter and stay in fullscreen mode throughout the test.</li>
                <li><strong>Tab-Switch Tracking:</strong> Switching browser tabs or minimizing the window registers a security warning.</li>
                <li><strong>5-Warning Limit:</strong> You are allowed a maximum of <strong>5 warnings</strong>. On the 5th warning, your exam will be <strong>automatically submitted immediately</strong>.</li>
                <li><strong>Shortcuts Disabled:</strong> Copying, pasting, right-click, and developer tools keys are restricted.</li>
                {examData?.requireCamera && (
                  <li><strong>Webcam Proctoring:</strong> An active camera video stream is required and monitored for proctoring compliance.</li>
                )}
              </ul>

              {examData?.requireCamera && (
                <div style={{
                  background: cameraStatus === 'ACTIVE' ? '#ECFDF5' : '#F8FAFC',
                  border: `1.5px solid ${cameraStatus === 'ACTIVE' ? '#86EFAC' : '#CBD5E1'}`,
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: cameraStatus === 'ACTIVE' ? '#DCFCE7' : '#E2E8F0',
                        color: cameraStatus === 'ACTIVE' ? '#16A34A' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Camera size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                          {cameraStatus === 'ACTIVE' ? 'Webcam Stream Active' : 'Webcam Permission Required'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {cameraStatus === 'ACTIVE'
                            ? 'Camera verified. Ready to enter proctored assessment.'
                            : cameraError || 'Allow camera access now so proctoring runs smoothly.'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {cameraStatus !== 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={startCamera}
                          disabled={cameraLoading}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
                        >
                          {cameraLoading ? <RefreshCw size={13} className="animate-spin" /> : <Camera size={13} />}
                          {cameraLoading ? 'Connecting...' : 'Allow & Test Cam'}
                        </button>
                      ) : (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#16A34A',
                          background: '#DCFCE7',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-full)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <CheckCircle2 size={13} /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {cameraPermissionGuide && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      background: '#FEF2F2',
                      border: '1px solid #FECDD3',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      color: '#991B1B',
                      lineHeight: 1.4
                    }}>
                      🔒 <strong>Camera blocked in browser:</strong> Click the lock icon in your browser's address bar (next to the URL), change Camera to <strong>Allow</strong>, then click <strong>Allow & Test Cam</strong>.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pinned Action Footer */}
            <div style={{ padding: '1.1rem 2rem', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
              <button
                onClick={enterFullscreenAndStart}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  background: '#0EA5E9',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)',
                  cursor: 'pointer'
                }}
              >
                <Maximize size={20} />
                <span>Agree & Enter Fullscreen to Start Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Live Camera Proctoring Preview Widget */}
      {examData?.requireCamera && hasEnteredFullscreen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99,
          fontFamily: 'inherit'
        }}>
          {isCameraWidgetCollapsed ? (
            <button
              onClick={() => setIsCameraWidgetCollapsed(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                background: '#0F172A',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Expand Camera Proctoring Window"
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: cameraStatus === 'ACTIVE' ? '#10B981' : '#EF4444'
              }} className={cameraStatus === 'ACTIVE' ? 'animate-pulse' : ''} />
              <span>Camera Feed ({cameraStatus === 'ACTIVE' ? 'LIVE' : 'OFF'})</span>
              <ChevronUp size={14} />
            </button>
          ) : (
            <div style={{
              width: '230px',
              background: '#0F172A',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '14px',
              padding: '0.65rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              color: '#FFFFFF'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.45rem',
                padding: '0 0.2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: cameraStatus === 'ACTIVE' ? '#10B981' : '#EF4444'
                  }} className={cameraStatus === 'ACTIVE' ? 'animate-pulse' : ''} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', color: cameraStatus === 'ACTIVE' ? '#34D399' : '#F87171' }}>
                    {cameraStatus === 'ACTIVE' ? 'CAM LIVE' : 'CAM DISCONNECTED'}
                  </span>
                </div>
                <button
                  onClick={() => setIsCameraWidgetCollapsed(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                  title="Minimize preview"
                >
                  <ChevronDown size={15} />
                </button>
              </div>

              {/* Video Preview Box */}
              <div style={{
                position: 'relative',
                width: '100%',
                minHeight: '145px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#0B1120',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '145px',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: cameraStatus === 'ACTIVE' ? 'block' : 'none'
                  }}
                />

                {cameraStatus !== 'ACTIVE' && (
                  <div style={{ textAlign: 'center', padding: '0.65rem 0.5rem', width: '100%', background: '#0F172A' }}>
                    <CameraOff size={24} color="#EF4444" style={{ margin: '0 auto 0.25rem' }} />
                    <div style={{ fontSize: '0.75rem', color: '#F87171', fontWeight: 700 }}>Webcam Inactive</div>
                    {cameraError && (
                      <div style={{ fontSize: '0.65rem', color: '#FCA5A5', marginTop: '0.2rem', lineHeight: 1.3 }}>
                        {cameraError}
                      </div>
                    )}
                    {cameraPermissionGuide && (
                      <div style={{
                        margin: '0.35rem 0',
                        padding: '0.35rem 0.45rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        fontSize: '0.62rem',
                        color: '#FECDD3',
                        textAlign: 'left',
                        lineHeight: 1.3
                      }}>
                        🔒 Click the <strong>lock icon</strong> in your browser URL bar & set <strong>Camera: Allow</strong>.
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginTop: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={cameraLoading}
                        style={{
                          fontSize: '0.65rem',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '5px',
                          background: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {cameraLoading ? <RefreshCw size={12} className="animate-spin" /> : null}
                        {cameraLoading ? 'Connecting...' : 'Enable Cam'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Floating REC badge */}
                {cameraStatus === 'ACTIVE' && (
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: 'rgba(0, 0, 0, 0.65)',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    color: '#FFFFFF'
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#EF4444' }} className="animate-pulse" />
                    REC
                  </div>
                )}
              </div>

              {/* Real-time AI Proctoring Telemetry Badges */}
              <div style={{
                marginTop: '0.45rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.3rem',
                fontSize: '0.62rem',
                color: '#94A3B8'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.35rem', borderRadius: '4px' }}>
                  <Camera size={10} color={cameraStatus === 'ACTIVE' ? '#10B981' : '#EF4444'} />
                  <span>Cam: {cameraStatus === 'ACTIVE' ? 'Active' : 'Offline'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.35rem', borderRadius: '4px' }}>
                  <Mic size={10} color={micStatus === 'ACTIVE' ? (voiceActive ? '#F59E0B' : '#10B981') : '#94A3B8'} />
                  <span>Mic: {micStatus === 'ACTIVE' ? (voiceActive ? 'Voice' : 'Active') : 'Idle'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.35rem', borderRadius: '4px' }}>
                  <Eye size={10} color={faceStatus === 'FACE_DETECTED' ? '#10B981' : (faceStatus === 'NO_FACE' ? '#EF4444' : '#F59E0B')} />
                  <span>Face: {faceStatus === 'FACE_DETECTED' ? 'Detected' : (faceStatus === 'NO_FACE' ? 'Absent' : (faceStatus === 'MULTIPLE_FACES' ? 'Multiple' : 'Scanning'))}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.35rem', borderRadius: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: gazeStatus === 'GAZE_CENTER' ? '#10B981' : '#F59E0B' }} />
                  <span>Gaze: {gazeStatus === 'GAZE_CENTER' ? 'Focused' : 'Away'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-time Factual Proctoring Notice Banner */}
      {factualWarningBanner && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: '#FFFBEB',
          border: '1.5px solid #F59E0B',
          color: '#92400E',
          padding: '0.65rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <AlertTriangle size={18} color="#D97706" />
          <span>{factualWarningBanner}</span>
        </div>
      )}

      {/* Security Violation Warning Modal */}
      {showWarningModal && (
        <div className="modal-overlay" style={{ zIndex: 10001, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', overflowY: 'auto', padding: '1.5rem 1rem' }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
              borderRadius: '18px',
              border: warningCount >= 5 ? '2.5px solid #EF4444' : '2.5px solid #F59E0B',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
              margin: 'auto'
            }}
          >
            <div style={{ background: warningCount >= 5 ? '#FEF2F2' : '#FFFBEB', padding: '1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: warningCount >= 5 ? '#FEE2E2' : '#FEF3C7',
                border: warningCount >= 5 ? '2px solid #F87171' : '2px solid #FCD34D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: warningCount >= 5 ? '#DC2626' : '#D97706'
              }}>
                {warningCount >= 5 ? <AlertOctagon size={36} /> : <ShieldAlert size={36} />}
              </div>

              <div style={{
                display: 'inline-block',
                padding: '0.3rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                background: warningCount >= 5 ? '#DC2626' : '#D97706',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                marginBottom: '0.6rem'
              }}>
                {warningCount >= 5 ? 'LIMIT EXCEEDED (5 OF 5)' : `WARNING STRIKE ${warningCount} OF 5`}
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem' }}>
                {warningCount >= 5 ? 'Exam Automatically Submitting!' : 'Proctoring Violation Detected!'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                {warningModalReason || 'Tab switch or window focus loss detected.'}
              </p>
            </div>

            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: '1 1 auto' }}>
              {warningCount < 5 ? (
                <>
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Remaining Allowed Warnings Before Auto-Submit:</span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 5 - warningCount === 1 ? '#DC2626' : '#D97706', marginTop: '0.2rem' }}>
                      {5 - warningCount} {5 - warningCount === 1 ? 'warning left' : 'warnings left'}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.5rem', textAlign: 'center' }}>
                    Do not switch browser tabs, open other applications, or exit fullscreen mode. If you reach <strong>5 warnings</strong>, your exam will be <strong>terminated and submitted immediately</strong>.
                  </p>

                  <button
                    onClick={handleAcknowledgeWarning}
                    className="btn btn-primary btn-lg"
                    style={{
                      width: '100%',
                      background: '#0EA5E9',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '1rem',
                      padding: '0.85rem',
                      borderRadius: '12px'
                    }}
                  >
                    I Understand & Return to Fullscreen
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.95rem', color: '#DC2626', fontWeight: 600, marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    You have received 5 security warnings for navigating away from the test window. Your exam session has been automatically submitted.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', color: '#64748B', fontSize: '0.875rem' }}>
                    <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2.5px solid #CBD5E1', borderTopColor: '#0EA5E9', borderRadius: '50%' }} />
                    Submitting answers to server...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeExam;
