import React, { useState, useEffect } from 'react';
import { resultService } from '../../services/resultService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await resultService.getAnalyticsOverview();
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading analytics charts...</div>;
  }

  const examStats = data?.examStats || [];

  const pieData = [
    { name: 'Passing Attempts', value: data?.passPercentage || 0, color: '#10b981' },
    { name: 'Failing Attempts', value: parseFloat((100 - (data?.passPercentage || 0)).toFixed(2)), color: '#f43f5e' }
  ];

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
          DATA INTELLIGENCE
        </div>
        <h1 style={{ fontSize: '1.9rem', color: '#0F172A', marginBottom: '0.35rem' }}>Visual Analytics Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>Graphical insights into overall exam activity, score distributions, and pass rates</p>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.25rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid rgba(14, 165, 233, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0EA5E9',
            flexShrink: 0
          }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Score</span>
            <h2 style={{ fontSize: '1.75rem', color: '#0F172A', marginTop: '0.15rem', lineHeight: 1.1 }}>{data?.averageScore || 0} pts</h2>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F59E0B',
            flexShrink: 0
          }}>
            <Award size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highest Score</span>
            <h2 style={{ fontSize: '1.75rem', color: '#0F172A', marginTop: '0.15rem', lineHeight: 1.1 }}>{data?.highestScore || 0} pts</h2>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
            flexShrink: 0
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Pass Rate</span>
            <h2 style={{ fontSize: '1.75rem', color: '#0F172A', marginTop: '0.15rem', lineHeight: 1.1 }}>{data?.passPercentage || 0}%</h2>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid rgba(14, 165, 233, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284C7',
            flexShrink: 0
          }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Attempts</span>
            <h2 style={{ fontSize: '1.75rem', color: '#0F172A', marginTop: '0.15rem', lineHeight: 1.1 }}>{data?.totalAttempts || 0}</h2>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Exam Attempt & Avg Score Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#0F172A', marginBottom: '1.25rem' }}>Average Scores per Exam</h3>
          {examStats.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No exam data available for charts.</p>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examStats} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="title" stroke="var(--text-subtle)" fontSize={12} />
                  <YAxis stroke="var(--text-subtle)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="avgScore" name="Average Score" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attempts" name="Attempts" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pass / Fail Pie Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Overall Pass vs Fail Distribution</h3>
          {data?.totalAttempts === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No submission attempts recorded yet.</p>
          ) : (
            <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
