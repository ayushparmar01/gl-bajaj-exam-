import React, { useState, useEffect, useRef, useCallback } from 'react';
import { proctorService } from '../../services/proctorService';
import { examService } from '../../services/examService';
import { getProctorSocket, disconnectProctorSocket } from '../../services/socketService';
import {
  ShieldAlert,
  Radio,
  Clock,
  RefreshCw,
  AlertTriangle,
  UserX,
  PlusCircle,
  RotateCcw,
  MessageSquare,
  FileText,
  Filter,
  CheckCircle2,
  X,
  Send,
  AlertOctagon,
  Eye,
  Check,
  Pause,
  Play,
  Camera,
  CameraOff,
  Maximize2
} from 'lucide-react';

const LiveProctorDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'DISQUALIFY' | 'EXTRA_TIME' | 'MESSAGE' | 'LOGS'
  const [targetSession, setTargetSession] = useState(null);
  const [modalInput, setModalInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Camera snapshot audit inspection modal
  const [inspectingSnapshot, setInspectingSnapshot] = useState(null);

  // Fetch exams for filter dropdown
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await examService.getAllExams();
        setExams(res.data || []);
      } catch (e) {
        console.error('Failed to load exams list:', e);
      }
    };
    fetchExams();
  }, []);

  // Fetch live sessions
  const fetchLiveSessions = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsRefreshing(true);
      const res = await proctorService.getLiveSessions(selectedExamId);
      setSessions(res.data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch live proctoring sessions:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [selectedExamId]);

  // Initial load on exam change
  useEffect(() => {
    fetchLiveSessions();
  }, [fetchLiveSessions]);

  // Real-time Socket.io listener for Live Camera Streaming and Anti-cheat Events (<300ms latency)
  useEffect(() => {
    const socket = getProctorSocket();
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join:room', {
      examId: selectedExamId,
      role: 'ADMIN'
    });

    // 1. Instant Camera Frame Update directly into active card state
    const handleFrameUpdate = (data) => {
      const { attemptId, frame, cameraStatus } = data || {};
      if (!attemptId || !frame) return;

      setSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (String(s.attemptId) === String(attemptId)) {
            return {
              ...s,
              latestCameraSnapshot: frame,
              cameraStatus: cameraStatus || s.cameraStatus || 'ACTIVE',
              isOnline: true,
              secondsSinceLastActive: 0,
              lastActiveAt: new Date().toISOString()
            };
          }
          return s;
        })
      );
    };

    // 2. Instant Anti-cheat Strike / Violation Alert
    const handleViolationAlert = (data) => {
      const { attemptId, reason, warningCount, eventType, timestamp } = data || {};
      if (!attemptId) return;

      setSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (String(s.attemptId) === String(attemptId)) {
            const count = typeof warningCount === 'number' ? warningCount : (s.warningCount || 0) + 1;
            const newRisk = count >= 5 ? 'DISQUALIFIED' : (count >= 3 ? 'CRITICAL' : 'CAUTION');
            const newLog = {
              timestamp: timestamp || new Date().toISOString(),
              eventType: eventType || 'SUSPICIOUS_ACTIVITY',
              reason: reason || 'Anti-cheat violation'
            };
            return {
              ...s,
              warningCount: count,
              riskLevel: newRisk,
              proctorLogs: [newLog, ...(s.proctorLogs || [])]
            };
          }
          return s;
        })
      );
    };

    // 3. Camera Status Update
    const handleCameraStatusUpdate = (data) => {
      const { attemptId, cameraStatus } = data || {};
      if (!attemptId) return;

      setSessions((prevSessions) =>
        prevSessions.map((s) =>
          String(s.attemptId) === String(attemptId)
            ? { ...s, cameraStatus }
            : s
        )
      );
    };

    // 4. Camera Stream Disconnected
    const handleStreamDisconnected = (data) => {
      const { attemptId } = data || {};
      if (!attemptId) return;

      setSessions((prevSessions) =>
        prevSessions.map((s) =>
          String(s.attemptId) === String(attemptId)
            ? { ...s, cameraStatus: 'DISCONNECTED' }
            : s
        )
      );
    };

    // 5. New Student Connected
    const handleStudentConnected = () => {
      fetchLiveSessions(true);
    };

    socket.on('camera:frame-update', handleFrameUpdate);
    socket.on('student:violation-alert', handleViolationAlert);
    socket.on('student:camera-status-update', handleCameraStatusUpdate);
    socket.on('student:stream-disconnected', handleStreamDisconnected);
    socket.on('student:connected', handleStudentConnected);

    return () => {
      socket.off('camera:frame-update', handleFrameUpdate);
      socket.off('student:violation-alert', handleViolationAlert);
      socket.off('student:camera-status-update', handleCameraStatusUpdate);
      socket.off('student:stream-disconnected', handleStreamDisconnected);
      socket.off('student:connected', handleStudentConnected);
    };
  }, [selectedExamId, fetchLiveSessions]);

  useEffect(() => {
    return () => {
      disconnectProctorSocket();
    };
  }, []);

  // Background HTTP synchronization fallback (every 8 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLiveSessions(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLiveSessions]);

  // Actions
  const handleDisqualify = async (e) => {
    e.preventDefault();
    if (!targetSession) return;
    try {
      setActionLoading(true);
      setActionError('');
      await proctorService.disqualifySession(targetSession.attemptId, modalInput);
      setActionSuccess(`Candidate ${targetSession.student.name} disqualified. Session will terminate.`);
      setTimeout(() => {
        closeModal();
        fetchLiveSessions(true);
      }, 1400);
    } catch (err) {
      setActionError(err.message || 'Failed to disqualify session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGrantExtraTime = async (minutesToAdd) => {
    if (!targetSession) return;
    try {
      setActionLoading(true);
      setActionError('');
      await proctorService.grantExtraTime(targetSession.attemptId, minutesToAdd);
      setActionSuccess(`+${minutesToAdd} minutes granted to ${targetSession.student.name}!`);
      setTimeout(() => {
        closeModal();
        fetchLiveSessions(true);
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Failed to grant extra time');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetWarnings = async () => {
    if (!targetSession) return;
    try {
      setActionLoading(true);
      setActionError('');
      await proctorService.resetWarnings(targetSession.attemptId);
      setActionSuccess(`Warnings pardoned for ${targetSession.student.name}. Strike count reset to 0.`);
      setTimeout(() => {
        closeModal();
        fetchLiveSessions(true);
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Failed to reset warnings');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!targetSession || !modalInput.trim()) return;
    try {
      setActionLoading(true);
      setActionError('');
      await proctorService.sendProctorMessage(targetSession.attemptId, modalInput.trim());
      setActionSuccess(`Warning notification sent to ${targetSession.student.name}'s screen.`);
      setTimeout(() => {
        closeModal();
        fetchLiveSessions(true);
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Failed to send message');
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (type, session) => {
    setActiveModal(type);
    setTargetSession(session);
    setModalInput('');
    setActionSuccess('');
    setActionError('');
  };

  const closeModal = () => {
    setActiveModal(null);
    setTargetSession(null);
    setModalInput('');
    setActionSuccess('');
    setActionError('');
  };

  // Metrics calculation
  const totalActive = sessions.length;
  const cleanSessions = sessions.filter(s => s.warningCount === 0 && !s.disqualified).length;
  const cautionSessions = sessions.filter(s => s.warningCount >= 1 && s.warningCount <= 2 && !s.disqualified).length;
  const highRiskSessions = sessions.filter(s => s.warningCount >= 3 || s.disqualified).length;

  const formatSeconds = (sec) => {
    if (sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Top Banner Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.25rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            marginBottom: '0.5rem'
          }}>
            <Radio size={14} className={autoRefresh ? 'animate-pulse' : ''} />
            LIVE PROCTORING CONSOLE
          </div>
          <h1 style={{ fontSize: '1.9rem', color: '#0F172A', marginBottom: '0.35rem' }}>
            Real-Time Candidate Monitoring
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Live status, anti-cheating strike feeds, and remote proctoring controls for active test takers
          </p>
        </div>

        {/* Live Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          {/* Exam Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="#64748B" />
            <select
              className="form-input"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', minWidth: '190px' }}
            >
              <option value="ALL">All Active Assessments</option>
              {exams.map(e => (
                <option key={e._id} value={e._id}>{e.title}</option>
              ))}
            </select>
          </div>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(prev => !prev)}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: autoRefresh ? '#ECFDF5' : '#F8FAFC',
              borderColor: autoRefresh ? '#A7F3D0' : 'var(--border-color)',
              color: autoRefresh ? '#065F46' : 'var(--text-muted)'
            }}
            title={autoRefresh ? 'Click to pause live sync' : 'Click to resume live sync'}
          >
            {autoRefresh ? <Pause size={14} /> : <Play size={14} />}
            <span>{autoRefresh ? 'Auto (4s)' : 'Paused'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchLiveSessions(false)}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 4 Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="metric-card" style={{ borderLeft: '4px solid #0EA5E9' }}>
          <div className="metric-title">Active Candidates</div>
          <div className="metric-value" style={{ color: '#0EA5E9' }}>{totalActive}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Currently taking assessment
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #10B981' }}>
          <div className="metric-title">Clean Sessions</div>
          <div className="metric-value" style={{ color: '#10B981' }}>{cleanSessions}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Zero violation strikes
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="metric-title">Caution (1–2 Strikes)</div>
          <div className="metric-value" style={{ color: '#F59E0B' }}>{cautionSessions}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Low to moderate flags
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #EF4444' }}>
          <div className="metric-title">High Risk (3+ Strikes)</div>
          <div className="metric-value" style={{ color: '#EF4444' }}>{highRiskSessions}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
            Flagged for intervention
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: '3.5rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#0EA5E9' }} />
          <p>Connecting to live proctoring stream...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
          <CheckCircle2 size={52} color="#10B981" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.35rem', color: '#0F172A', marginBottom: '0.4rem' }}>No Live Exam Sessions</h3>
          <p style={{ color: '#64748B', fontSize: '0.925rem', maxWidth: '460px', margin: '0 auto 1.5rem' }}>
            There are currently no candidates actively taking exams. As soon as a student starts or resumes a test, their live feed will appear here.
          </p>
          <button onClick={() => fetchLiveSessions(false)} className="btn btn-secondary">
            <RefreshCw size={14} />
            Check Again
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {sessions.map((session) => {
            const warnings = session.warningCount || 0;
            const isDisqualified = session.disqualified || warnings >= 5;
            const progressPercent = session.totalQuestions > 0
              ? Math.round((session.answeredCount / session.totalQuestions) * 100)
              : 0;

            // Border color by risk
            const borderColor = isDisqualified
              ? '#EF4444'
              : warnings >= 3
              ? '#F97316'
              : warnings >= 1
              ? '#F59E0B'
              : '#E2E8F0';

            return (
              <div
                key={session.attemptId}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  border: `1.5px solid ${borderColor}`,
                  borderRadius: '16px',
                  background: isDisqualified ? '#FEF2F2' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isDisqualified
                    ? '0 0 25px rgba(239, 68, 68, 0.12)'
                    : '0 4px 20px rgba(15, 23, 42, 0.04)',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Card Header: Student Info + Online Status */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {session.student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', color: '#0F172A', lineHeight: 1.2, fontWeight: 700 }}>
                          {session.student.name}
                        </h4>
                        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {session.student.email}
                        </span>
                      </div>
                    </div>

                    {/* Online status indicator */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      background: session.isOnline ? '#DCFCE7' : '#F1F5F9',
                      color: session.isOnline ? '#15803D' : '#64748B',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.03em'
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: session.isOnline ? '#16A34A' : '#94A3B8'
                      }} className={session.isOnline ? 'animate-pulse' : ''} />
                      {session.isOnline ? 'ONLINE' : 'INACTIVE'}
                    </div>
                  </div>

                  {/* Exam Title Pill */}
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#0369A1',
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.exam.title}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700, flexShrink: 0 }}>
                      Q{session.currentQuestionNumber} of {session.totalQuestions}
                    </span>
                  </div>

                  {/* Camera Proctoring Feed Thumbnail */}
                  {session.exam.requireCamera !== false && (
                    <div style={{
                      marginBottom: '1rem',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #CBD5E1',
                      background: '#0F172A',
                      position: 'relative'
                    }}>
                      {/* Top Header of Feed */}
                      <div style={{
                        padding: '0.4rem 0.65rem',
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94A3B8' }}>
                          <Camera size={13} color="#38BDF8" />
                          <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>CAM STREAM</span>
                        </div>
                        {/* Status badge */}
                        {session.cameraStatus === 'ACTIVE' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: '#34D399',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} className="animate-pulse" />
                            LIVE FEED
                          </span>
                        ) : session.cameraStatus === 'BLOCKED' ? (
                          <span style={{
                            color: '#F59E0B',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            background: 'rgba(245, 158, 11, 0.15)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px'
                          }}>
                            BLOCKED
                          </span>
                        ) : session.cameraStatus === 'DISCONNECTED' ? (
                          <span style={{
                            color: '#F87171',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px'
                          }}>
                            DISCONNECTED
                          </span>
                        ) : (
                          <span style={{
                            color: '#94A3B8',
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.45rem'
                          }}>
                            INITIALIZING
                          </span>
                        )}
                      </div>

                      {/* Snapshot Image Container */}
                      <div
                        onClick={() => session.latestCameraSnapshot && setInspectingSnapshot(session)}
                        style={{
                          height: '140px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          cursor: session.latestCameraSnapshot ? 'pointer' : 'default',
                          background: '#0B1120'
                        }}
                      >
                        {session.latestCameraSnapshot ? (
                          <>
                            <img
                              src={session.latestCameraSnapshot}
                              alt={`Webcam feed for ${session.student.name}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                transform: 'scaleX(-1)'
                              }}
                            />
                            {/* Hover overlay hint */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(15, 23, 42, 0.45)',
                                opacity: 0,
                                transition: 'opacity 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                                color: '#FFFFFF',
                                fontSize: '0.78rem',
                                fontWeight: 600
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                            >
                              <Maximize2 size={15} />
                              Click to Inspect Frame
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '1rem', color: '#64748B' }}>
                            {session.cameraStatus === 'DISCONNECTED' || session.cameraStatus === 'BLOCKED' ? (
                              <>
                                <CameraOff size={28} color="#F87171" style={{ margin: '0 auto 0.35rem' }} />
                                <div style={{ fontSize: '0.75rem', color: '#FCA5A5' }}>Camera Not Transmitting</div>
                              </>
                            ) : (
                              <>
                                <Camera size={28} color="#38BDF8" style={{ margin: '0 auto 0.35rem', opacity: 0.6 }} className="animate-pulse" />
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Awaiting first snapshot...</div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 5-Strike Warning Visual Meter */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <ShieldAlert size={14} color={isDisqualified ? '#EF4444' : warnings >= 3 ? '#F97316' : '#64748B'} />
                        Violation Strikes
                      </span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: isDisqualified ? '#DC2626' : warnings >= 3 ? '#EA580C' : warnings >= 1 ? '#D97706' : '#16A34A'
                      }}>
                        {isDisqualified ? 'DISQUALIFIED (5/5)' : `${warnings} of 5 Strikes`}
                      </span>
                    </div>

                    {/* 5 Pips */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                      {[1, 2, 3, 4, 5].map((strikeIndex) => {
                        const isHit = warnings >= strikeIndex || isDisqualified;
                        return (
                          <div
                            key={strikeIndex}
                            style={{
                              height: '8px',
                              borderRadius: '4px',
                              background: isHit
                                ? (strikeIndex >= 4 ? '#EF4444' : strikeIndex >= 2 ? '#F59E0B' : '#FCD34D')
                                : '#E2E8F0',
                              transition: 'all 0.3s ease'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Progress & Time Details */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    {/* Time Left Tile */}
                    <div style={{
                      padding: '0.65rem 0.85rem',
                      background: session.remainingSeconds < 300 ? '#FEF2F2' : '#F8FAFC',
                      border: `1px solid ${session.remainingSeconds < 300 ? '#FECDD3' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                        Time Remaining
                      </span>
                      <strong style={{
                        fontSize: '0.95rem',
                        color: session.remainingSeconds < 300 ? '#DC2626' : '#0F172A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        marginTop: '0.15rem'
                      }}>
                        <Clock size={14} />
                        {formatSeconds(session.remainingSeconds)}
                      </strong>
                      {session.extraTimeMinutes > 0 && (
                        <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                          (+{session.extraTimeMinutes}m granted)
                        </span>
                      )}
                    </div>

                    {/* Completion Tile */}
                    <div style={{
                      padding: '0.65rem 0.85rem',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                        Progress
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#0F172A', display: 'block', marginTop: '0.15rem' }}>
                        {session.answeredCount} / {session.totalQuestions} ({progressPercent}%)
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                        Active on Q{session.currentQuestionNumber}
                      </span>
                    </div>
                  </div>

                  {/* Latest Incident Snippet */}
                  {session.proctorLogs && session.proctorLogs.length > 0 && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#64748B',
                      background: '#F1F5F9',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      <AlertTriangle size={13} color="#D97706" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Latest: <strong>{session.proctorLogs[0].reason || session.proctorLogs[0].eventType}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.4rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #E2E8F0'
                }}>
                  {/* +5 Min Extra Time */}
                  <button
                    onClick={() => openModal('EXTRA_TIME', session)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.45rem', fontSize: '0.75rem', fontWeight: 600 }}
                    title="Add extra time to student timer"
                  >
                    <PlusCircle size={14} color="#0EA5E9" />
                    +Time
                  </button>

                  {/* Pardon Strikes */}
                  <button
                    onClick={() => {
                      setTargetSession(session);
                      handleResetWarnings();
                    }}
                    disabled={warnings === 0 && !session.disqualified}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.45rem', fontSize: '0.75rem', fontWeight: 600 }}
                    title="Reset strike warnings back to 0"
                  >
                    <RotateCcw size={14} color="#10B981" />
                    Reset
                  </button>

                  {/* Send Direct Message */}
                  <button
                    onClick={() => openModal('MESSAGE', session)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.45rem', fontSize: '0.75rem', fontWeight: 600 }}
                    title="Broadcast a warning alert to student screen"
                  >
                    <MessageSquare size={14} color="#6366F1" />
                    Msg
                  </button>

                  {/* Audit Logs */}
                  <button
                    onClick={() => openModal('LOGS', session)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.45rem', fontSize: '0.75rem', fontWeight: 600 }}
                    title="View chronological incident log"
                  >
                    <FileText size={14} color="#64748B" />
                    Logs
                  </button>
                </div>

                {/* Disqualify Button */}
                {!isDisqualified && (
                  <button
                    onClick={() => openModal('DISQUALIFY', session)}
                    className="btn btn-sm"
                    style={{
                      width: '100%',
                      marginTop: '0.65rem',
                      background: '#FEF2F2',
                      border: '1px solid #FECDD3',
                      color: '#DC2626',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <UserX size={14} />
                    Disqualify Candidate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Disqualify Candidate */}
      {activeModal === 'DISQUALIFY' && targetSession && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="modal-content" style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <AlertOctagon size={28} />
              </div>
              <h3 style={{ fontSize: '1.3rem', color: '#0F172A', marginBottom: '0.4rem' }}>
                Disqualify Candidate
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B' }}>
                Are you sure you want to disqualify <strong>{targetSession.student.name}</strong>? Their exam will be terminated and submitted immediately.
              </p>
            </div>

            {actionError && (
              <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div style={{ background: '#DCFCE7', color: '#15803D', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {actionSuccess}
              </div>
            )}

            <form onSubmit={handleDisqualify}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Disqualification Reason *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Unauthorized materials or repeated window blur"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn"
                  style={{ flex: 1, background: '#DC2626', color: '#fff', fontWeight: 700 }}
                >
                  {actionLoading ? 'Disqualifying...' : 'Confirm Disqualify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Extra Time */}
      {activeModal === 'EXTRA_TIME' && targetSession && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="modal-content" style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#E0F2FE',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Clock size={28} />
              </div>
              <h3 style={{ fontSize: '1.3rem', color: '#0F172A', marginBottom: '0.4rem' }}>
                Grant Extra Time
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B' }}>
                Extend the countdown timer for <strong>{targetSession.student.name}</strong>.
              </p>
            </div>

            {actionError && (
              <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div style={{ background: '#DCFCE7', color: '#15803D', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {actionSuccess}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleGrantExtraTime(mins)}
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}
                >
                  +{mins} Mins
                </button>
              ))}
            </div>

            <button type="button" onClick={closeModal} className="btn btn-secondary" style={{ width: '100%' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Send Direct Proctor Message */}
      {activeModal === 'MESSAGE' && targetSession && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="modal-content" style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={20} color="#6366F1" />
                Message to Candidate
              </h3>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748B" />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem' }}>
              Transmits an urgent alert banner directly onto <strong>{targetSession.student.name}</strong>'s exam screen.
            </p>

            {actionError && (
              <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div style={{ background: '#DCFCE7', color: '#15803D', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {actionSuccess}
              </div>
            )}

            {/* Quick Templates */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {[
                'Please remain in fullscreen mode.',
                'Refrain from switching tabs or windows.',
                'Please keep your eyes focused on the screen.',
                'You have 5 minutes remaining.'
              ].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setModalInput(template)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.6rem',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {template}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendMessage}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Type a custom warning or message..."
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ flex: 1.2, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Send size={15} />
                  {actionLoading ? 'Sending...' : 'Transmit Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Incident Timeline Logs */}
      {activeModal === 'LOGS' && targetSession && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="modal-content" style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} color="#0EA5E9" />
                  Incident Audit Log
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Candidate: <strong>{targetSession.student.name}</strong> • Total Strikes: <strong>{targetSession.warningCount}</strong>
                </span>
              </div>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748B" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.25rem' }}>
              {(!targetSession.proctorLogs || targetSession.proctorLogs.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
                  <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 0.5rem' }} />
                  <p>Clean session — No anti-cheat violations recorded.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {targetSession.proctorLogs.map((log, idx) => {
                    const isDisqualify = log.eventType?.includes('DISQUALIF');
                    const isPardon = log.eventType?.includes('PARDON') || log.eventType?.includes('RESET');
                    const isTime = log.eventType?.includes('EXTRA_TIME');

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: `1px solid ${isDisqualify ? '#FECDD3' : isPardon ? '#A7F3D0' : isTime ? '#BAE6FD' : '#FED7AA'}`,
                          background: isDisqualify ? '#FEF2F2' : isPardon ? '#ECFDF5' : isTime ? '#F0F9FF' : '#FFFBEB'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: isDisqualify ? '#DC2626' : isPardon ? '#059669' : isTime ? '#0284C7' : '#D97706'
                          }}>
                            {log.eventType}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#1E293B', margin: 0 }}>
                          {log.reason || log.eventType}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button type="button" onClick={closeModal} className="btn btn-primary" style={{ width: '100%' }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: Inspect Candidate Full Snapshot */}
      {inspectingSnapshot && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="modal-content" style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '580px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera size={18} color="#0EA5E9" />
                  <h3 style={{ fontSize: '1.15rem', color: '#0F172A', fontWeight: 700, margin: 0 }}>
                    Camera Snapshot Audit
                  </h3>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: inspectingSnapshot.cameraStatus === 'ACTIVE' ? '#DCFCE7' : '#FEF2F2',
                    color: inspectingSnapshot.cameraStatus === 'ACTIVE' ? '#15803D' : '#DC2626'
                  }}>
                    {inspectingSnapshot.cameraStatus}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.2rem' }}>
                  Candidate: <strong>{inspectingSnapshot.student.name}</strong> ({inspectingSnapshot.student.email})
                </div>
              </div>
              <button
                onClick={() => setInspectingSnapshot(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} color="#64748B" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', background: '#0F172A' }}>
              <div style={{
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: '#000000',
                position: 'relative'
              }}>
                {inspectingSnapshot.latestCameraSnapshot ? (
                  <img
                    src={inspectingSnapshot.latestCameraSnapshot}
                    alt="Webcam capture inspection"
                    style={{
                      width: '100%',
                      maxHeight: '380px',
                      objectFit: 'contain',
                      display: 'block',
                      transform: 'scaleX(-1)'
                    }}
                  />
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                    <CameraOff size={40} color="#F87171" style={{ margin: '0 auto 0.75rem' }} />
                    <p>No snapshot available for this session.</p>
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#94A3B8',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.7rem'
                }}>
                  Last sync: {new Date(inspectingSnapshot.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Footer with context & quick action */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              background: '#FFFFFF'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Assessment: <strong>{inspectingSnapshot.exam.title}</strong> • Strikes: <strong>{inspectingSnapshot.warningCount}/5</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const session = inspectingSnapshot;
                    setInspectingSnapshot(null);
                    openModal('MESSAGE', session);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                >
                  <MessageSquare size={14} color="#6366F1" />
                  Warn Student
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingSnapshot(null)}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveProctorDashboard;
