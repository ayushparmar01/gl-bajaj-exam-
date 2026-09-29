import React, { useState, useEffect } from 'react';
import { resultService } from '../../services/resultService';
import { Eye, X, CheckCircle2, XCircle, MinusCircle, Download, Loader2 } from 'lucide-react';

const ResultsList = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await resultService.getAllResultsAdmin();
        setResults(res.data);
      } catch (err) {
        console.error('Failed to fetch results:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleDownloadPdf = async (resItem) => {
    try {
      setDownloadingId(resItem._id);
      const studentName = (resItem.studentId?.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      const examTitle = (resItem.examId?.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${studentName}_${examTitle}_Report_${resItem._id.slice(-6)}.pdf`;
      await resultService.downloadResultPdf(resItem._id, fileName);
    } catch (err) {
      alert(err.message || 'Failed to download report PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const openResultDetail = async (id) => {
    try {
      setModalLoading(true);
      const res = await resultService.getResultById(id);
      setSelectedResult(res.data);
    } catch (err) {
      alert(err.message || 'Failed to load result details');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.2rem 0.6rem',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          color: '#34d399',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          marginBottom: '0.5rem'
        }}>
          SUBMISSIONS & AUDIT
        </div>
        <h1 style={{ fontSize: '1.9rem', color: '#0F172A', marginBottom: '0.35rem' }}>Student Exam Results</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>Comprehensive performance records and official test reports across all conducted exams</p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading exam results...</p>
        ) : results.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No student results submitted yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Time Taken</th>
                  <th>Submitted At</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res) => {
                  const passMarks = res.examId?.passMarks || 0;
                  const isPassed = res.score >= passMarks;

                  return (
                    <tr key={res._id}>
                      <td style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {res.studentId?.name || 'Unknown Student'}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{res.studentId?.email}</div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', minWidth: '160px' }}>
                        {res.examId?.title || 'Exam deleted'}
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
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{res.timeTaken}</td>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(res.submittedAt).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleDownloadPdf(res)}
                            disabled={downloadingId === res._id}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.65rem' }}
                            title="Download PDF Test Report"
                          >
                            {downloadingId === res._id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                            PDF
                          </button>
                          <button
                            onClick={() => openResultDetail(res._id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.65rem' }}
                          >
                            <Eye size={14} />
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result Detail Modal */}
      {(selectedResult || modalLoading) && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Detailed Answer Breakdown</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {selectedResult && (
                  <button
                    onClick={() => handleDownloadPdf(selectedResult)}
                    disabled={downloadingId === selectedResult._id}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {downloadingId === selectedResult._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Download PDF
                  </button>
                )}
                <button onClick={() => setSelectedResult(null)} className="btn btn-secondary btn-sm">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {modalLoading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading result breakdown...</p>
              ) : selectedResult ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Score</span>
                      <h4 style={{ fontSize: '1.2rem', color: 'var(--accent-purple)' }}>{selectedResult.score} / {selectedResult.totalMarks}</h4>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Percentage</span>
                      <h4 style={{ fontSize: '1.2rem' }}>{selectedResult.percentage}%</h4>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Correct / Wrong</span>
                      <h4 style={{ fontSize: '1.2rem', color: '#34d399' }}>{selectedResult.correctAnswers} / {selectedResult.wrongAnswers}</h4>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Unattempted</span>
                      <h4 style={{ fontSize: '1.2rem', color: 'var(--accent-amber)' }}>{selectedResult.unattempted}</h4>
                    </div>
                  </div>

                  {selectedResult.negativeMarksDeducted > 0 && (
                    <div style={{
                      marginTop: '-0.75rem',
                      marginBottom: '1.25rem',
                      padding: '0.5rem 0.85rem',
                      background: 'rgba(244, 63, 94, 0.12)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#fb7185',
                      fontSize: '0.825rem'
                    }}>
                      ⚠️ Negative marking deduction applied: <strong>-{selectedResult.negativeMarksDeducted} marks</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedResult.answers?.map((ans, idx) => (
                      <div key={idx} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                          {ans.isCorrect ? (
                            <CheckCircle2 size={18} color="#34d399" />
                          ) : ans.selectedAnswer ? (
                            <XCircle size={18} color="#fb7185" />
                          ) : (
                            <MinusCircle size={18} color="#f59e0b" />
                          )}
                          <strong style={{ fontSize: '0.95rem' }}>Q{idx + 1}. {ans.questionText}</strong>
                        </div>

                        <div style={{ fontSize: '0.85rem', marginLeft: '1.6rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>Student Answer:</span> <strong style={{ color: ans.isCorrect ? '#34d399' : '#fb7185' }}>{ans.selectedAnswer || 'Not Answered'}</strong></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Correct Answer:</span> <strong style={{ color: '#34d399' }}>{ans.correctAnswer}</strong></div>
                          {ans.explanation && (
                            <div style={{ marginTop: '0.35rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                              Explanation: {ans.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsList;
