import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { examService } from '../../services/examService';
import { resultService } from '../../services/resultService';
import { formatAudienceTarget } from '../../utils/targetFormatter';
import {
  Clock,
  BookOpen,
  Play,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Lock,
  KeyRound,
  X,
  Calendar,
  Search,
  CheckCircle2,
  Eye,
  Award
} from 'lucide-react';

const AvailableExams = () => {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'AVAILABLE' | 'UPCOMING' | 'COMPLETED'

  // Passcode unlock modal states
  const [passcodeModalExam, setPasscodeModalExam] = useState(null);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [examsRes, resultsRes] = await Promise.all([
        examService.getAllExams(),
        resultService.getMyResults()
      ]);
      setExams(examsRes.data || []);
      setResults(resultsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load assessment catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const completedMap = useMemo(() => {
    const map = new Map();
    results.forEach((r) => {
      const eId = r.examId?._id || r.examId;
      if (eId) map.set(eId.toString(), r);
    });
    return map;
  }, [results]);

  const handleStartExam = (exam, isAttemptInProgress) => {
    if (!isAttemptInProgress && exam.hasAccessCode) {
      setPasscodeModalExam(exam);
      setEnteredPasscode('');
      setPasscodeError('');
    } else {
      navigate(`/student/take-exam/${exam._id}`);
    }
  };

  const handleUnlockAndStart = (e) => {
    e.preventDefault();
    if (!enteredPasscode.trim()) {
      setPasscodeError('Please enter the access code');
      return;
    }
    const code = enteredPasscode.trim();
    const examId = passcodeModalExam._id;
    setPasscodeModalExam(null);
    navigate(`/student/take-exam/${examId}?accessCode=${encodeURIComponent(code)}`, {
      state: { accessCode: code }
    });
  };

  const now = new Date();

  // Filter exams based on active tab and search query
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const isCompleted = completedMap.has(exam._id.toString());
      const isScheduled = Boolean(exam.isScheduled && exam.startTime && exam.endTime);
      const start = isScheduled ? new Date(exam.startTime) : null;
      const end = isScheduled ? new Date(exam.endTime) : null;

      const isUpcoming = isScheduled && now < start;
      const isExpired = isScheduled && now > end;
      const isAvailable = !isUpcoming && !isExpired && !isCompleted;

      // Tab filter
      if (activeTab === 'AVAILABLE' && !isAvailable) return false;
      if (activeTab === 'UPCOMING' && !isUpcoming) return false;
      if (activeTab === 'COMPLETED' && !isCompleted) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (exam.title || '').toLowerCase().includes(q);
        const descMatch = (exam.description || '').toLowerCase().includes(q);
        const subCodeMatch = (exam.subjectCode || exam.subjectId?.subjectCode || '').toLowerCase().includes(q);
        const subNameMatch = (exam.subjectId?.name || '').toLowerCase().includes(q);
        return titleMatch || descMatch || subCodeMatch || subNameMatch;
      }

      return true;
    });
  }, [exams, completedMap, activeTab, searchQuery, now]);

  const tabCounts = useMemo(() => {
    let availableCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    exams.forEach((exam) => {
      const isCompleted = completedMap.has(exam._id.toString());
      const isScheduled = Boolean(exam.isScheduled && exam.startTime && exam.endTime);
      const start = isScheduled ? new Date(exam.startTime) : null;
      const end = isScheduled ? new Date(exam.endTime) : null;

      const isUpcoming = isScheduled && now < start;
      const isExpired = isScheduled && now > end;

      if (isCompleted) completedCount++;
      else if (isUpcoming) upcomingCount++;
      else if (!isExpired) availableCount++;
    });

    return {
      all: exams.length,
      available: availableCount,
      upcoming: upcomingCount,
      completed: completedCount
    };
  }, [exams, completedMap, now]);

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              color: '#0284c7',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '0.5rem'
            }}
          >
            <Sparkles size={12} />
            EXAM CATALOG
          </div>
          <h1 style={{ fontSize: '1.9rem', color: '#0F172A', marginBottom: '0.35rem' }}>Assessment Catalog</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Browse examinations scheduled for your academic department and section
          </p>
        </div>

        <div
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '10px',
            background: '#FFFFFF',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            color: '#475569'
          }}
        >
          Total Assessments: <strong style={{ color: '#0F172A' }}>{exams.length}</strong>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FECDD3',
            color: '#B91C1C',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Controls Bar: Search & Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`btn btn-sm ${activeTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px' }}
          >
            All ({tabCounts.all})
          </button>
          <button
            onClick={() => setActiveTab('AVAILABLE')}
            className={`btn btn-sm ${activeTab === 'AVAILABLE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px' }}
          >
            Available Now ({tabCounts.available})
          </button>
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`btn btn-sm ${activeTab === 'UPCOMING' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px' }}
          >
            Upcoming ({tabCounts.upcoming})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`btn btn-sm ${activeTab === 'COMPLETED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px' }}
          >
            Completed ({tabCounts.completed})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8'
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search by title or subject code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Loading assessment catalog...</p>
      ) : filteredExams.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.35, color: '#0EA5E9' }} />
          <h3 style={{ color: '#0F172A', marginBottom: '0.4rem', fontSize: '1.25rem' }}>
            {searchQuery
              ? 'No matching assessments found'
              : activeTab === 'UPCOMING'
              ? 'No upcoming exams'
              : activeTab === 'COMPLETED'
              ? 'No completed exams yet'
              : 'No exams currently available'}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-subtle)' }}>
            {searchQuery
              ? 'Try changing your search query or reset filters.'
              : 'Assessments targeted for your academic group will appear here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.5rem' }}>
          {filteredExams.map((exam) => {
            const isAttemptInProgress = exam.activeAttempt && exam.activeAttempt.remainingSeconds > 0;
            const remainingMins = isAttemptInProgress
              ? Math.max(1, Math.ceil(exam.activeAttempt.remainingSeconds / 60))
              : 0;

            const isScheduled = Boolean(exam.isScheduled && exam.startTime && exam.endTime);
            const windowStart = isScheduled ? new Date(exam.startTime) : null;
            const windowEnd = isScheduled ? new Date(exam.endTime) : null;
            const isUpcoming = isScheduled && now < windowStart;
            const isExpired = isScheduled && now > windowEnd;
            const isLive = isScheduled && !isUpcoming && !isExpired;

            const resultDoc = completedMap.get(exam._id.toString());
            const isCompleted = Boolean(resultDoc);

            const subjectLabel = exam.subjectId?.name
              ? `${exam.subjectId.name} (${exam.subjectCode || exam.subjectId.subjectCode})`
              : (exam.subjectCode || null);

            const audienceLabel = formatAudienceTarget(exam);

            return (
              <div
                key={exam._id}
                className="glass-card"
                style={{
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isAttemptInProgress
                    ? '1.5px solid rgba(245, 158, 11, 0.55)'
                    : isCompleted
                    ? '1px solid #86EFAC'
                    : undefined,
                  background: isAttemptInProgress
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)'
                    : isCompleted
                    ? 'linear-gradient(135deg, rgba(220, 252, 231, 0.25) 0%, rgba(255, 255, 255, 0.95) 100%)'
                    : undefined,
                  boxShadow: isAttemptInProgress ? '0 0 25px rgba(245, 158, 11, 0.15)' : undefined
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {isCompleted ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#DCFCE7',
                          border: '1px solid #86EFAC',
                          color: '#15803D',
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em'
                        }}
                      >
                        <CheckCircle2 size={12} />
                        COMPLETED • Score: {resultDoc.score}/{resultDoc.totalMarks}
                      </div>
                    ) : isAttemptInProgress ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.45)',
                          color: '#b45309',
                          padding: '0.3rem 0.75rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em'
                        }}
                      >
                        <Clock size={13} className="animate-spin" />
                        IN PROGRESS • {remainingMins} min{remainingMins === 1 ? '' : 's'} left
                      </div>
                    ) : isUpcoming ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#FEF3C7',
                          border: '1px solid #FCD34D',
                          color: '#B45309',
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em'
                        }}
                      >
                        <Calendar size={12} />
                        OPENS {windowStart.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : isExpired ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#FEE2E2',
                          border: '1px solid #FECDD3',
                          color: '#B91C1C',
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em'
                        }}
                      >
                        <Clock size={12} />
                        WINDOW CLOSED
                      </div>
                    ) : isLive ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#DCFCE7',
                          border: '1px solid #86EFAC',
                          color: '#15803D',
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em'
                        }}
                      >
                        <Clock size={12} />
                        CLOSES {windowEnd.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#059669',
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em'
                        }}
                      >
                        <ShieldCheck size={12} />
                        ALWAYS OPEN
                      </div>
                    )}

                    {subjectLabel && (
                      <span
                        title={subjectLabel}
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: '#E0F2FE',
                          border: '1px solid #BAE6FD',
                          color: '#0369A1',
                          fontWeight: 700,
                          maxWidth: '160px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {exam.subjectCode || exam.subjectId?.subjectCode}
                      </span>
                    )}

                    {exam.hasAccessCode && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(99, 102, 241, 0.12)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#4f46e5',
                          padding: '0.25rem 0.55rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em'
                        }}
                      >
                        <Lock size={11} />
                        PASSCODE
                      </div>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.45rem', lineHeight: 1.3 }}>
                    {exam.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      marginBottom: '1rem',
                      lineHeight: 1.5,
                      minHeight: '42px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {exam.description || 'Comprehensive evaluation covering scheduled topics and modules.'}
                  </p>

                  <div style={{ marginBottom: '1.15rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Target: <strong style={{ color: '#334155' }}>{audienceLabel}</strong>
                    </span>
                  </div>

                  {/* 3 Metric Tiles */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      marginBottom: '1.25rem',
                      textAlign: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase' }}>
                        Duration
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{exam.duration}m</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase' }}>
                        Questions
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{exam.questionCount || 0}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase' }}>
                        Pass Mark
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#0EA5E9' }}>{exam.passMarks || 0} pts</strong>
                    </div>
                  </div>

                  {exam.hasNegativeMarking && exam.negativeMarks > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.78rem',
                        color: '#fb7185',
                        background: 'rgba(244, 63, 94, 0.12)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        marginBottom: '1.25rem'
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>
                        Negative penalty: <strong>-{exam.negativeMarks} marks</strong> for incorrect answers
                      </span>
                    </div>
                  )}
                </div>

                {isCompleted ? (
                  <Link
                    to={`/student/result/${resultDoc._id}`}
                    className="btn btn-secondary btn-lg"
                    style={{
                      width: '100%',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      border: '1px solid #86EFAC',
                      color: '#15803D'
                    }}
                  >
                    <Eye size={18} />
                    View Result ({resultDoc.percentage}%)
                  </Link>
                ) : isAttemptInProgress ? (
                  <button
                    onClick={() => navigate(`/student/take-exam/${exam._id}`)}
                    className="btn btn-lg"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 18px rgba(245, 158, 11, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <Play size={18} />
                    Resume Exam ({remainingMins}m left)
                  </button>
                ) : isUpcoming ? (
                  <button
                    disabled
                    className="btn btn-lg"
                    style={{
                      width: '100%',
                      background: '#F1F5F9',
                      color: '#64748B',
                      cursor: 'not-allowed',
                      border: '1px solid #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    <Calendar size={16} />
                    Opens on {windowStart.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </button>
                ) : isExpired ? (
                  <button
                    disabled
                    className="btn btn-lg"
                    style={{
                      width: '100%',
                      background: '#F8FAFC',
                      color: '#94A3B8',
                      cursor: 'not-allowed',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    <Clock size={16} />
                    Assessment Window Closed
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartExam(exam, isAttemptInProgress)}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', fontWeight: 700 }}
                  >
                    <Play size={18} />
                    Start Assessment
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Passcode Unlock Modal */}
      {passcodeModalExam && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    padding: '0.5rem',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Lock size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Passcode Required</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    {passcodeModalExam.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasscodeModalExam(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.4rem' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUnlockAndStart}>
              <div className="modal-body" style={{ padding: '1.25rem 0' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  This assessment is protected by an instructor access code. Please enter the passcode to unlock and begin.
                </p>

                {passcodeError && (
                  <div
                    style={{
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#fb7185',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem'
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{passcodeError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <KeyRound size={15} color="var(--accent-indigo)" />
                    Enter Access Passcode / PIN *
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter exam passcode"
                    value={enteredPasscode}
                    onChange={(e) => {
                      setEnteredPasscode(e.target.value);
                      if (passcodeError) setPasscodeError('');
                    }}
                    autoFocus
                    required
                    style={{ fontSize: '1rem', letterSpacing: '0.1em' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPasscodeModalExam(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Play size={16} />
                  Unlock & Start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableExams;
