import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { examService } from '../../services/examService';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, HelpCircle, FileText, Lock, PlusCircle, Edit3, Calendar, Clock } from 'lucide-react';

const getScheduleStatus = (exam) => {
  if (!exam.isScheduled || !exam.startTime || !exam.endTime) {
    return { status: 'ALWAYS_OPEN', label: 'Always Open', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' };
  }
  const now = new Date();
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);

  if (now < start) {
    return {
      status: 'UPCOMING',
      label: `Upcoming (Opens ${start.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`,
      color: '#B45309',
      bg: '#FEF3C7',
      border: '#FCD34D'
    };
  }
  if (now > end) {
    return {
      status: 'EXPIRED',
      label: `Closed (${end.toLocaleDateString([], { month: 'short', day: 'numeric' })})`,
      color: '#BE123C',
      bg: '#FFE4E6',
      border: '#FECDD3'
    };
  }
  return {
    status: 'LIVE',
    label: `Live (Closes ${end.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`,
    color: '#166534',
    bg: '#DCFCE7',
    border: '#86EFAC'
  };
};

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await examService.getAllExams();
      setExams(res.data);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleTogglePublish = async (id) => {
    try {
      await examService.togglePublish(id);
      fetchExams();
    } catch (err) {
      alert(err.message || 'Failed to toggle publish state');
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? All associated questions and student results will be permanently removed.`)) {
      try {
        await examService.deleteExam(id);
        fetchExams();
      } catch (err) {
        alert(err.message || 'Failed to delete exam');
      }
    }
  };

  const filteredExams = exams.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
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
            EXAM DIRECTORY
          </div>
          <h1 style={{ fontSize: '1.9rem', color: '#0F172A', marginBottom: '0.35rem' }}>Exam Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>Create, configure, publish, and manage all examinations</p>
        </div>

        <Link to="/admin/create-exam" className="btn btn-primary" style={{ boxShadow: '0 4px 20px rgba(2, 132, 199, 0.4)' }}>
          <PlusCircle size={18} />
          <span>Create New Exam</span>
        </Link>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search exams by title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '2.5rem' }}
        />
        <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading exams...</p>
        ) : filteredExams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No exams found</p>
            <p style={{ fontSize: '0.875rem' }}>Create an exam to begin testing students.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '220px' }}>Exam Title</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Total Marks</th>
                  <th>Pass Marks</th>
                  <th>Negative Marking</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam._id}>
                    <td style={{ minWidth: '220px', maxWidth: '320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exam.title}>
                          {exam.title}
                        </span>
                        {(exam.subjectCode || exam.subjectId?.subjectCode) && (
                          <span 
                            title={exam.subjectId?.name ? `${exam.subjectId.name} (${exam.subjectCode || exam.subjectId.subjectCode})` : (exam.subjectCode || exam.subjectId?.subjectCode)}
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
                            {exam.subjectCode || exam.subjectId?.subjectCode}
                          </span>
                        )}
                        {exam.hasAccessCode && (
                          <span 
                            title={`Passcode Protected: ${exam.accessCode || 'Required'}`}
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
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
                            <Lock size={10} />
                            {exam.accessCode ? exam.accessCode : 'PIN'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exam.description}>
                        {exam.description || 'No description provided'}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Target: <strong style={{ color: '#334155' }}>{exam.audienceType ? exam.audienceType.replace('_', ' ') : 'ENTIRE COLLEGE'}</strong>
                        </span>
                        {exam.createdBy?.name && (
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                            • By {exam.createdBy.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {exam.questionCount || 0} Questions
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{exam.duration} mins</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{exam.totalMarks} pts</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{exam.passMarks || 0} pts</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {exam.hasNegativeMarking && exam.negativeMarks > 0 ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(244, 63, 94, 0.15)',
                            color: '#fb7185',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            fontSize: '0.8rem',
                            textTransform: 'none'
                          }}
                        >
                          -{exam.negativeMarks} / wrong
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const sched = getScheduleStatus(exam);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                            <span className={`badge ${exam.isPublished ? 'badge-published' : 'badge-draft'}`}>
                              {exam.isPublished ? 'Published' : 'Draft'}
                            </span>
                            {exam.isScheduled && (
                              <span
                                title={`Window: ${new Date(exam.startTime).toLocaleString()} - ${new Date(exam.endTime).toLocaleString()}`}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: sched.bg,
                                  border: `1px solid ${sched.border}`,
                                  color: sched.color,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <Calendar size={10} />
                                {sched.label}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleTogglePublish(exam._id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.4rem 0.6rem' }}
                          title={exam.isPublished ? 'Unpublish Exam' : 'Publish Exam'}
                        >
                          {exam.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>

                        <Link
                          to={`/admin/exams/${exam._id}/questions`}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', gap: '0.35rem' }}
                          title="Manage Questions"
                        >
                          <HelpCircle size={15} />
                          <span>Qs ({exam.questionCount || 0})</span>
                        </Link>

                        <Link
                          to={`/admin/edit-exam/${exam._id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.4rem 0.6rem' }}
                          title="Edit Exam Settings"
                        >
                          <Edit3 size={15} />
                        </Link>

                        <button
                          onClick={() => handleDelete(exam._id, exam.title)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--accent-rose)', padding: '0.4rem 0.6rem' }}
                          title="Delete Exam"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamList;
