import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { resultService } from '../../services/resultService';
import { examService } from '../../services/examService';
import { Users, FileText, Award, TrendingUp, PlusCircle, BarChart2, ShieldCheck, ChevronRight, Settings } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, examsRes] = await Promise.all([
          resultService.getAnalyticsOverview(),
          examService.getAllExams()
        ]);
        setStats(analyticsRes.data);
        setRecentExams(examsRes.data.slice(0, 6));
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: '3rem 0', textAlign: 'center' }}>Loading Platform Metrics...</div>;
  }

  const statCards = [
    { title: 'Registered Students', value: stats?.totalStudents || 0, icon: Users, color: '#38bdf8', sub: 'Active candidates' },
    { title: 'Scheduled Exams', value: stats?.totalExams || 0, icon: FileText, color: '#2dd4bf', sub: 'Assessment catalog' },
    { title: 'Completed Attempts', value: stats?.totalAttempts || 0, icon: Award, color: '#facc15', sub: 'Graded submissions' },
    { title: 'Overall Pass Rate', value: `${stats?.passPercentage || 0}%`, icon: TrendingUp, color: '#34d399', sub: 'Passing benchmark' }
  ];

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2.25rem',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(2, 132, 199, 0.15)',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            color: '#38bdf8',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            marginBottom: '0.5rem'
          }}>
            <ShieldCheck size={12} />
            INSTRUCTOR CONSOLE
          </div>
          <h1 style={{ fontSize: '2rem', color: '#0F172A', marginBottom: '0.35rem' }}>Management Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Comprehensive overview of exam schedules, candidate attempts, and system analytics
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          <Link to="/admin/create-exam" className="btn btn-primary" style={{ boxShadow: '0 4px 20px rgba(2, 132, 199, 0.4)' }}>
            <PlusCircle size={18} />
            <span>Create New Exam</span>
          </Link>
          <Link to="/admin/analytics" className="btn btn-secondary">
            <BarChart2 size={18} />
            <span>Platform Analytics</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.35rem', marginBottom: '2.5rem' }}>
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="glass-card" style={{ padding: '1.6rem', display: 'flex', alignItems: 'center', gap: '1.35rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: `${card.color}15`,
                border: `1px solid ${card.color}35`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color,
                boxShadow: `0 0 20px ${card.color}20`,
                flexShrink: 0
              }}>
                <Icon size={26} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {card.title}
                </span>
                <h2 style={{ fontSize: '1.85rem', color: '#0F172A', marginTop: '0.15rem', lineHeight: 1.1 }}>
                  {card.value}
                </h2>
                <span style={{ fontSize: '0.75rem', color: card.color, marginTop: '2px', display: 'block' }}>
                  {card.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Exams Table */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.35rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#0F172A' }}>Scheduled Assessments</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Recently added and published examinations</p>
          </div>
          <Link to="/admin/exams" className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
            <span>View All Exams</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {recentExams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            No exams created yet. Click "Create New Exam" above to publish your first assessment.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam Title</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Total Marks</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map((exam) => (
                  <tr key={exam._id}>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{exam.title}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{exam.questionCount || 0} Questions</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{exam.duration} mins</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--accent-purple)' }}>{exam.totalMarks} pts</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`badge ${exam.isPublished ? 'badge-published' : 'badge-draft'}`}>
                        {exam.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link to={`/admin/exams/${exam._id}/questions`} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.75rem', gap: '0.4rem' }}>
                        <Settings size={13} />
                        <span>Manage Qs</span>
                      </Link>
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

export default AdminDashboard;
