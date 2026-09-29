import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { GraduationCap, Mail, Lock, LogIn, AlertCircle, ArrowLeft, Info } from 'lucide-react';
import GoogleAuthButton from '../../components/GoogleAuthButton';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.login(formData);
      loginUser(res.token, res.data);
      if (res.data.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (res.data.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      if (err.data?.requiresVerification) {
        navigate('/verify-otp', { state: { email: err.data.email } });
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 50% 20%, rgba(2, 132, 199, 0.16) 0%, rgba(8, 16, 30, 0.98) 75%)'
    }}>
      <div className="glass-panel animate-fade-in-up" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem 2.25rem',
        borderRadius: '24px',
        border: '1px solid rgba(148, 163, 184, 0.14)',
        boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.7), 0 0 40px rgba(2, 132, 199, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}>
        {/* Top Back to Home Link */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#94a3b8',
              fontSize: '0.825rem',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#38bdf8';
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
          <span style={{ fontSize: '0.72rem', color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
            GLB EXAMSPHERE
          </span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '58px',
            height: '58px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #0d9488 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 25px rgba(2, 132, 199, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            marginBottom: '1rem'
          }}>
            <GraduationCap size={32} />
          </div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.35rem', color: '#0f172a' }}>College Portal Sign In</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Access examinations and academic assessments
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* PRIMARY OPTION: STUDENT COLLEGE GOOGLE SIGN IN */}
        <div style={{
          background: 'rgba(2, 132, 199, 0.05)',
          border: '1.5px solid rgba(2, 132, 199, 0.25)',
          borderRadius: '16px',
          padding: '1.5rem 1.25rem',
          marginBottom: '1.75rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            color: '#0284c7',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.35rem'
          }}>
            Candidate & Student Login
          </div>
          <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
            Sign in with your verified institutional Google account.
          </p>

          <GoogleAuthButton role="STUDENT" label="Continue with College Google Account" />

          <div style={{
            fontSize: '0.75rem',
            color: '#64748b',
            marginTop: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem'
          }}>
            <span>🔒 Only pre-registered college accounts can access the platform</span>
          </div>
        </div>

        {/* DIVIDER FOR FACULTY & ADMIN */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          margin: '1.75rem 0 1.25rem',
          color: 'var(--text-subtle)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.06em'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span>FACULTY & ADMINISTRATOR ACCESS</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Staff / Department Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="faculty@college.edu"
                value={formData.email}
                onChange={handleChange}
                style={{ paddingLeft: '2.6rem' }}
                required
              />
              <Mail size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                style={{ paddingLeft: '2.6rem' }}
                required
              />
              <Lock size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '1rem',
              height: '46px',
              fontSize: '0.925rem',
              fontWeight: 700
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating Staff...' : (
              <>
                <LogIn size={18} />
                Sign In to Staff Console
              </>
            )}
          </button>
        </form>

        {/* Administration Preloaded Notice */}
        <div style={{
          marginTop: '1.75rem',
          padding: '0.85rem 1rem',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.78rem',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.55rem',
          lineHeight: 1.5
        }}>
          <Info size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            Candidate student accounts are managed by your college examination administration. Self-registration is disabled.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
