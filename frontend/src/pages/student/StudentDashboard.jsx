import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { examService } from '../../services/examService';
import { resultService } from '../../services/resultService';
import { formatAudienceTarget } from '../../utils/targetFormatter';
import {
  BookOpen,
  Award,
  Clock,
  ArrowRight,
  Play,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Eye,
  Calendar,
  Lock,
  KeyRound,
  X,
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Passcode unlock modal states
  const [passcodeModalExam, setPasscodeModalExam] = useState(null);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

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
      console.error('Failed to load student dashboard:', err);
      setError(err.message || 'Failed to load assessments and results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const completedExamIds = new Set((results || []).map((r) => (r.examId?._id || r.examId)).filter(Boolean));

  // Partition exams according to schedule and attempt status
  const now = new Date();

  const categorizedExams = (exams || []).reduce(
    (acc, exam) => {
      if (!exam) return acc;
      const isCompleted = completedExamIds.has(exam._id);
      const isScheduled = Boolean(exam.isScheduled && exam.startTime && exam.endTime);
      const start = isScheduled ? new Date(exam.startTime) : null;
      const end = isScheduled ? new Date(exam.endTime) : null;

      const isUpcoming = isScheduled && start && !isNaN(start.getTime()) && now < start;
      const isExpired = isScheduled && end && !isNaN(end.getTime()) && now > end;
      const isLiveOrOpen = !isUpcoming && !isExpired;

      if (isCompleted) {
        acc.completed.push(exam);
      } else if (isUpcoming) {
        acc.upcoming.push(exam);
      } else if (isLiveOrOpen) {
        acc.available.push(exam);
      } else {
        acc.expired.push(exam);
      }
      return acc;
    },
    { available: [], upcoming: [], completed: [], expired: [] }
  );

  const avgPercentage =
    results.length > 0
      ? (results.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) / results.length).toFixed(1)
      : null;

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

  return (
    <div className="animate-fade-in">
      {/* Candidate Hero Welcome Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2.25rem 2.5rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.18) 0%, rgba(14, 165, 233, 0.12) 50%, rgba(13, 148, 136, 0.1) 100%)',
          border: '1px solid rgba(2, 132, 199, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              color: '#0284c7',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '0.75rem'
            }}
          >
            <Sparkles size={12} color="#0284c7" />
            CANDIDATE DASHBOARD
          </div>

          <h1 style={{ fontSize: '2.1rem', marginBottom: '0.4rem', color: '#0F172A' }}>
            Welcome back, {user?.name || 'Student'}! 👋
          </h1>

          <p style={{ color: '#475569', fontSize: '0.975rem', maxWidth: '650px', lineHeight: 1.5, marginBottom: '0.85rem' }}>
            You have <strong style={{ color: '#0284C7' }}>{categorizedExams.available.length} active assessment(s)</strong> available for your academic group.
          </p>

          {/* Student Academic Profile Context Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '0.78rem',
                color: '#334155',
                fontWeight: 600
              }}
            >
              <GraduationCap size={13} color="#0284C7" />
              <span>{user?.branch || 'General'}</span>
            </div>

            {user?.semester && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  color: '#334155',
                  fontWeight: 600
                }}
              >
                <span>Semester {user.semester}</span>
              </div>
            )}

            {user?.section && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  color: '#334155',
                  fontWeight: 600
                }}
              >
                <span>Section {user.section}</span>
              </div>
            )}

            {user?.batch && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  color: '#334155',
                  fontWeight: 600
                }}
              >
                <span>Batch {user.batch}</span>
              </div>
            )}

            {user?.rollNumber && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  color: '#64748B',
                  fontWeight: 600
                }}
              >
                <span>Roll: {user.rollNumber}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <Link to="/student/exams" className="btn btn-primary btn-lg" style={{ boxShadow: '0 4px 20px rgba(2, 132, 199, 0.35)' }}>
            <span>Assessment Catalog</span>
            <ArrowRight size={18} />
          </Link>
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

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="glass-card" style={{ padding: '1.4rem', display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284C7'
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Available Now
            </span>
            <h2 style={{ fontSize: '1.75rem', color: '#0F172A', marginTop: '0.1rem', lineHeight: 1.1 }}>
              {categorizedExams.available.length}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 600 }}>Ready to take</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.4rem', display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706'
            }}
          >
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Upcoming Exams
            </span>
            <h2 style={{ fontSize: '1.75rem', color: '#0F172A', marginTop: '0.1rem', lineHeight: 1.1 }}>
              {categorizedExams.upcoming.length}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 600 }}>Scheduled tests</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.4rem', display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981'
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Completed Tests
            </span>
            <h2 style={{ fontSize: '1.75rem', color: '#0F172A', marginTop: '0.1rem', lineHeight: 1.1 }}>
              {results.length}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>Verified submissions</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.4rem', display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0EA5E9'
            }}
          >
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Avg Performance
            </span>
            <h2 style={{ fontSize: '1.75rem', color: '#0F172A', marginTop: '0.1rem', lineHeight: 1.1 }}>
              {avgPercentage !== null ? `${avgPercentage}%` : 'N/A'}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#0EA5E9', fontWeight: 600 }}>Aggregate accuracy</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: AVAILABLE NOW / LIVE EXAMS */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A' }}>Available Assessments</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Exams currently open and ready for your academic group</p>
          </div>
          <Link to="/student/exams" className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
            <span>Full Catalog</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Loading available assessments...</p>
        ) : categorizedExams.available.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1rem', marginBottom: '0.4rem', color: '#334155', fontWeight: 600 }}>No exams are currently available for you.</p>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Check the upcoming assessments below or visit the full catalog.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.35rem' }}>
            {categorizedExams.available.slice(0, 3).map((exam) => {
              const isAttemptInProgress = exam.activeAttempt && exam.activeAttempt.remainingSeconds > 0;
              const remainingMins = isAttemptInProgress
                ? Math.max(1, Math.ceil(exam.activeAttempt.remainingSeconds / 60))
                : 0;

              const subjectLabel = exam.subjectId?.name
                ? `${exam.subjectId.name} (${exam.subjectCode || exam.subjectId.subjectCode})`
                : (exam.subjectCode || null);

              const audienceLabel = formatAudienceTarget(exam);

              return (
                <div
                  key={exam._id}
                  className="glass-card"
                  style={{
                    padding: '1.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isAttemptInProgress ? '1.5px solid rgba(245, 158, 11, 0.6)' : undefined,
                    background: isAttemptInProgress
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)'
                      : undefined,
                    boxShadow: isAttemptInProgress ? '0 0 25px rgba(245, 158, 11, 0.15)' : undefined
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                      {isAttemptInProgress ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#b45309',
                            padding: '0.25rem 0.65rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em'
                          }}
                        >
                          <Clock size={12} className="animate-spin" />
                          IN PROGRESS • {remainingMins} min{remainingMins === 1 ? '' : 's'} left
                        </div>
                      ) : (
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
                          <Sparkles size={11} />
                          READY TO ATTEMPT
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
                        <span
                          title="Passcode Protected"
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '4px',
                            background: '#FEF3C7',
                            border: '1px solid #FCD34D',
                            color: '#92400E',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Lock size={10} /> PIN
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.2rem', color: '#0F172A', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                      {exam.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        marginBottom: '1rem',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {exam.description || 'Comprehensive evaluation covering all core topics.'}
                    </p>

                    {/* Audience targeting badge */}
                    <div style={{ marginBottom: '1.15rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Target: <strong style={{ color: '#334155' }}>{audienceLabel}</strong>
                      </span>
                    </div>

                    {/* Meta Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.4rem' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.76rem',
                          color: '#475569',
                          fontWeight: 600
                        }}
                      >
                        <Clock size={12} color="#0284C7" />
                        <span>{exam.duration} Mins</span>
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.76rem',
                          color: '#475569',
                          fontWeight: 600
                        }}
                      >
                        <BookOpen size={12} color="#0EA5E9" />
                        <span>{exam.questionCount || 0} Questions</span>
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.76rem',
                          color: '#475569',
                          fontWeight: 600
                        }}
                      >
                        <Award size={12} color="#10B981" />
                        <span>{exam.totalMarks} Marks</span>
                      </div>
                    </div>
                  </div>

                  {isAttemptInProgress ? (
                    <button
                      onClick={() => handleStartExam(exam, true)}
                      className="btn"
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
                      <Play size={16} />
                      Resume Exam ({remainingMins}m left)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartExam(exam, false)}
                      className="btn btn-primary"
                      style={{ width: '100%', fontWeight: 700 }}
                    >
                      <Play size={16} />
                      Start Exam
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: UPCOMING SCHEDULED EXAMS */}
      {categorizedExams.upcoming.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A' }}>Upcoming Assessments</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Scheduled exams opening soon for your academic section</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.35rem' }}>
            {categorizedExams.upcoming.map((exam) => {
              const start = new Date(exam.startTime);
              const subjectLabel = exam.subjectId?.name
                ? `${exam.subjectId.name} (${exam.subjectCode || exam.subjectId.subjectCode})`
                : (exam.subjectCode || null);

              return (
                <div
                  key={exam._id}
                  className="glass-card"
                  style={{
                    padding: '1.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid #FCD34D',
                    background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.3) 0%, rgba(255, 255, 255, 0.95) 100%)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
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
                        OPENS {start.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {subjectLabel && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: '#E0F2FE',
                            border: '1px solid #BAE6FD',
                            color: '#0369A1',
                            fontWeight: 700
                          }}
                        >
                          {exam.subjectCode || exam.subjectId?.subjectCode}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.2rem', color: '#0F172A', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                      {exam.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        marginBottom: '1rem',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {exam.description || 'Scheduled assessment opening on the date indicated above.'}
                    </p>

                    <div style={{ marginBottom: '1.15rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Target: <strong style={{ color: '#334155' }}>{formatAudienceTarget(exam)}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.4rem' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.76rem',
                          color: '#475569',
                          fontWeight: 600
                        }}
                      >
                        <Clock size={12} color="#0284C7" />
                        <span>{exam.duration} Mins</span>
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.76rem',
                          color: '#475569',
                          fontWeight: 600
                        }}
                      >
                        <Award size={12} color="#10B981" />
                        <span>{exam.totalMarks} Marks</span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled
                    className="btn btn-secondary"
                    style={{ width: '100%', cursor: 'not-allowed', color: '#64748B', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    Opens on {start.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: RECENT PERFORMANCE HISTORY */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A' }}>Recent Performance</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Your most recent exam submissions and scorecards</p>
          </div>
          <Link to="/student/results" className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
            <span>Full History</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {results.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1rem', marginBottom: '0.4rem', color: '#334155', fontWeight: 600 }}>No completed exams yet.</p>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Start an available exam above to see your verified scorecard here!</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam Title</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Result Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 5).map((res) => {
                  const passMarks = res.examId?.passMarks || 0;
                  const isPassed = res.score >= passMarks;
                  return (
                    <tr key={res._id}>
                      <td style={{ fontWeight: 600, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{res.examId?.title || 'Deleted Exam'}</span>
                          {res.examId?.subjectCode && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                background: '#E0F2FE',
                                border: '1px solid #BAE6FD',
                                color: '#0369A1',
                                fontWeight: 700
                              }}
                            >
                              {res.examId.subjectCode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-purple)', whiteSpace: 'nowrap' }}>
                        {res.score} / {res.totalMarks}
                      </td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{res.percentage}%</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`badge ${isPassed ? 'badge-passed' : 'badge-failed'}`}>
                          {isPassed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {new Date(res.submittedAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link to={`/student/result/${res._id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.75rem' }}>
                          <Eye size={14} />
                          View Result
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{passcodeModalExam.title}</p>
                </div>
              </div>
              <button onClick={() => setPasscodeModalExam(null)} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem' }}>
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
                <button type="button" onClick={() => setPasscodeModalExam(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

export default StudentDashboard;
