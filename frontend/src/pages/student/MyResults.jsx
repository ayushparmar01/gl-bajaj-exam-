import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { resultService } from '../../services/resultService';
import { Eye, Award, Download, Loader2 } from 'lucide-react';

const MyResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await resultService.getMyResults();
        setResults(res.data);
      } catch (err) {
        console.error('Failed to fetch student results:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleDownloadPdf = async (resItem) => {
    try {
      setDownloadingId(resItem._id);
      const safeTitle = (resItem.examId?.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeTitle}_Report_${resItem._id.slice(-6)}.pdf`;
      await resultService.downloadResultPdf(resItem._id, fileName);
    } catch (err) {
      alert(err.message || 'Failed to download report PDF');
    } finally {
      setDownloadingId(null);
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
          background: 'rgba(2, 132, 199, 0.12)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          color: '#38bdf8',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          marginBottom: '0.5rem'
        }}>
          ASSESSMENT RECORDS
        </div>
        <h1 style={{ fontSize: '1.9rem', color: '#0F172A', marginBottom: '0.35rem' }}>My Performance History</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>Review all your past online exam attempts, score breakdowns, and PDF reports</p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading exam results history...</p>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Award size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ color: '#0F172A', marginBottom: '0.5rem' }}>No exam attempts recorded</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>You haven't completed any online tests yet.</p>
            <Link to="/student/exams" className="btn btn-primary btn-sm">
              Take an Available Exam
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Result Status</th>
                  <th>Time Taken</th>
                  <th>Submitted Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res) => {
                  const passMarks = res.examId?.passMarks || 0;
                  const isPassed = res.score >= passMarks;

                  return (
                    <tr key={res._id}>
                      <td style={{ fontWeight: 600, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
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
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{res.timeTaken}</td>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(res.submittedAt).toLocaleDateString()}
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
                            <span>PDF</span>
                          </button>
                          <Link to={`/student/result/${res._id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.65rem' }}>
                            <Eye size={14} />
                            View Scorecard
                          </Link>
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
    </div>
  );
};

export default MyResults;
