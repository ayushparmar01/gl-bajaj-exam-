import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { resultService } from '../../services/resultService';
import { CheckCircle2, XCircle, MinusCircle, ArrowLeft, X, Download, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getFullImageUrl } from '../../services/api';

const ResultPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const isAutoSubmitted = location.state?.isAutoSubmitted;
  const isViolationAutoSubmitted = location.state?.isViolationAutoSubmitted || result?.submissionReason === 'TAB_SWITCH_LIMIT';

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await resultService.getResultById(id);
        setResult(res.data);
      } catch (err) {
        console.error('Failed to load result:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!result) return;
    try {
      setDownloadingPdf(true);
      const safeTitle = (result.examId?.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeTitle}_Report_${result._id.slice(-6)}.pdf`;
      await resultService.downloadResultPdf(result._id, fileName);
    } catch (err) {
      alert(err.message || 'Failed to download test report PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: '3rem 0', textAlign: 'center' }}>Calculating Exam Scorecard...</div>;
  }

  if (!result) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0' }}>
        <h2>Result Not Found</h2>
        <button onClick={() => navigate('/student/dashboard')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const exam = result.examId;
  const passMarks = exam?.passMarks || 0;
  const isPassed = result.score >= passMarks;

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate('/student/results')}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} />
          Back to My Results
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {downloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}
        </button>
      </div>

      {isViolationAutoSubmitted ? (
        <div style={{
          background: '#FEE2E2',
          border: '1.5px solid #F87171',
          color: '#991B1B',
          padding: '1rem 1.4rem',
          borderRadius: '12px',
          fontSize: '0.925rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)'
        }}>
          <AlertTriangle size={24} color="#DC2626" style={{ flexShrink: 0 }} />
          <div>
            <strong>Automated Proctoring Submission:</strong> This exam was automatically submitted because you reached the maximum allowed limit of <strong>5 tab-switching / window focus-loss warnings</strong>.
          </div>
        </div>
      ) : isAutoSubmitted ? (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#fbbf24',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          ⏱️ Exam time expired! Your answers were automatically saved and submitted.
        </div>
      ) : null}

      {/* Main Scorecard Header */}
      <div className="glass-panel" style={{
        padding: '2.5rem 2rem',
        textAlign: 'center',
        marginBottom: '2rem',
        background: isPassed
          ? 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15) 0%, rgba(18, 24, 41, 0.95) 70%)'
          : 'radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.15) 0%, rgba(18, 24, 41, 0.95) 70%)',
        border: isPassed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)'
      }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          Exam Result Breakdown
        </div>
        <h1 style={{ fontSize: '2.2rem', color: '#0F172A', marginBottom: '0.4rem' }}>{exam?.title}</h1>

        {exam?.subjectCode && (
          <div style={{ marginBottom: '0.6rem' }}>
            <span
              style={{
                fontSize: '0.78rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                background: '#E0F2FE',
                border: '1px solid #BAE6FD',
                color: '#0369A1',
                fontWeight: 700
              }}
            >
              Subject: {exam.subjectCode}
            </span>
          </div>
        )}

        <div style={{ display: 'inline-block', margin: '0.75rem 0' }}>
          <span className={`badge ${isPassed ? 'badge-passed' : 'badge-failed'}`} style={{ fontSize: '1rem', padding: '0.5rem 1.25rem' }}>
            {isPassed ? 'PASSED' : 'FAILED'}
          </span>
        </div>

        {/* Score Circles Grid */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '2.5rem',
          margin: '1.5rem 0',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
              {result.score}
              <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/{result.totalMarks}</span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Total Score</span>
          </div>

          <div style={{ width: '1px', height: '50px', background: 'var(--border-color)' }} className="hide-mobile" />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: isPassed ? '#10B981' : '#E11D48', lineHeight: 1 }}>
              {result.percentage}%
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Percentage</span>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.75rem',
          marginTop: '2rem',
          padding: '1.25rem',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 'var(--radius-md)'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Correct</span>
            <h3 style={{ fontSize: '1.35rem', color: '#10B981', marginTop: '0.2rem' }}>{result.correctAnswers}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Wrong</span>
            <h3 style={{ fontSize: '1.35rem', color: '#E11D48', marginTop: '0.2rem' }}>{result.wrongAnswers}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Unattempted</span>
            <h3 style={{ fontSize: '1.35rem', color: '#D97706', marginTop: '0.2rem' }}>{result.unattempted}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Time Taken</span>
            <h3 style={{ fontSize: '1.35rem', color: '#0EA5E9', marginTop: '0.2rem' }}>{result.timeTaken}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Strikes</span>
            <h3 style={{
              fontSize: '1.35rem',
              color: (result.warningCount || 0) >= 5 ? '#DC2626' : (result.warningCount || 0) > 0 ? '#D97706' : '#10B981',
              marginTop: '0.2rem'
            }}>
              {result.warningCount || 0} / 5
            </h3>
          </div>
        </div>

        {result.negativeMarksDeducted > 0 && (
          <div style={{
            marginTop: '1.25rem',
            padding: '0.65rem 1rem',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            borderRadius: 'var(--radius-sm)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#fb7185',
            fontSize: '0.875rem'
          }}>
            <span>⚠️ Negative marking penalty applied: <strong>-{result.negativeMarksDeducted} marks</strong> deducted for wrong answers</span>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 2rem',
              fontSize: '0.95rem',
              boxShadow: '0 4px 16px rgba(2, 132, 199, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {downloadingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {downloadingPdf ? 'Generating PDF Test Report...' : 'Download Official PDF Test Report'}
          </button>
        </div>
      </div>

      {/* Question by Question Detailed Review */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>Detailed Answer Review</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {result.answers?.map((ans, idx) => {
            const isMulti = ans.questionType === 'MULTIPLE';
            const userSelectedList = ans.selectedAnswers?.length 
              ? ans.selectedAnswers 
              : (ans.selectedAnswer ? [ans.selectedAnswer] : []);
            const correctList = ans.correctAnswers?.length 
              ? ans.correctAnswers 
              : (ans.correctAnswer ? [ans.correctAnswer] : []);
            const hasAttempted = userSelectedList.length > 0;

            return (
              <div key={idx} className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    {ans.isCorrect ? (
                      <CheckCircle2 size={22} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    ) : hasAttempted ? (
                      <XCircle size={22} color="#E11D48" style={{ flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <MinusCircle size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <h3 style={{ fontSize: '1.1rem', color: '#0F172A', lineHeight: 1.4, margin: 0 }}>
                          Q{idx + 1}. {ans.questionText}
                        </h3>
                        {isMulti ? (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#7C3AED',
                            background: '#F3E8FF',
                            border: '1px solid #DDD6FE',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            MULTI-SELECT (MSQ)
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#0284C7',
                            background: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            SINGLE CHOICE
                          </span>
                        )}
                      </div>

                      {ans.imageUrl && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <img
                            src={getFullImageUrl(ans.imageUrl)}
                            alt={`Diagram for Q${idx + 1}`}
                            onClick={() => setZoomedImage(getFullImageUrl(ans.imageUrl))}
                            style={{
                              maxHeight: '180px',
                              maxWidth: '100%',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              cursor: 'zoom-in',
                              objectFit: 'contain',
                              background: '#F8FAFC',
                              padding: '0.35rem'
                            }}
                            title="Click to zoom diagram"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.8rem',
                    color: ans.marksObtained < 0 ? '#BE123C' : '#475569',
                    background: ans.marksObtained < 0 ? '#FFE4E6' : '#F1F5F9',
                    border: ans.marksObtained < 0 ? '1px solid #FECDD3' : '1px solid #E2E8F0',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontWeight: 600,
                    flexShrink: 0
                  }}>
                    {ans.marksObtained} / {ans.totalQuestionMarks} pts
                  </span>
                </div>

                {/* Options Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem', marginTop: '1rem' }}>
                  {ans.options?.map((opt, oIdx) => {
                    const isUserSelected = userSelectedList.includes(opt);
                    const isCorrectOpt = correctList.includes(opt);

                    let border = '1px solid #E2E8F0';
                    let bg = '#F8FAFC';
                    let color = '#334155';

                    if (isCorrectOpt && isUserSelected) {
                      border = '1.5px solid #86EFAC';
                      bg = '#DCFCE7';
                      color = '#166534';
                    } else if (isCorrectOpt) {
                      border = '1.5px dashed #86EFAC';
                      bg = '#F0FDF4';
                      color = '#166534';
                    } else if (isUserSelected) {
                      border = '1.5px solid #FECDD3';
                      bg = '#FFE4E6';
                      color = '#BE123C';
                    }

                    return (
                      <div
                        key={oIdx}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.875rem',
                          border,
                          background: bg,
                          color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontWeight: (isCorrectOpt || isUserSelected) ? 600 : 400,
                          gap: '0.5rem'
                        }}
                      >
                        <span>{opt}</span>
                        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                          {isUserSelected && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              background: isCorrectOpt ? 'rgba(22, 101, 52, 0.15)' : 'rgba(190, 18, 60, 0.15)',
                              color: isCorrectOpt ? '#166534' : '#BE123C'
                            }}>
                              Your Choice
                            </span>
                          )}
                          {!isUserSelected && isCorrectOpt && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              background: 'rgba(22, 101, 52, 0.12)',
                              color: '#166534'
                            }}>
                              Correct Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              {ans.explanation && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(79, 70, 229, 0.1)',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)'
                }}>
                  <strong style={{ color: '#818cf8' }}>Explanation:</strong> {ans.explanation}
                </div>
              )}
              </div>
            );
          })}
        </div>
      </div>

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
    </div>
  );
};

export default ResultPage;
