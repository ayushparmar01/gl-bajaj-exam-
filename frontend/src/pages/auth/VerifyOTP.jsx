import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const emailFromState = location.state?.email || '';
  const fallbackOtp = location.state?.fallbackOtp || '';
  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !otp) {
      setError('Please provide email and 6-digit OTP code.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.verifyOtp({ email, otp });
      setMessage(res.message);
      loginUser(res.token, res.data);
      setTimeout(() => {
        if (res.data.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (res.data.role === 'TEACHER') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'OTP verification failed');
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
        padding: '2.75rem 2.5rem',
        borderRadius: '24px',
        border: '1px solid rgba(148, 163, 184, 0.14)',
        boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.7), 0 0 40px rgba(2, 132, 199, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(6, 182, 212, 0.4)',
            marginBottom: '1rem'
          }}>
            <KeyRound size={30} />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Verify OTP Code</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            We've sent a 6-digit verification code to your email
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {fallbackOtp && (
          <div style={{
            background: 'rgba(14, 165, 233, 0.12)',
            border: '1px solid rgba(14, 165, 233, 0.35)',
            borderRadius: '12px',
            padding: '0.9rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#7dd3fc'
          }}>
            <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '0.35rem' }}>
              🔑 Verification Code (Render Cloud Fallback)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '0.3em', color: '#fff' }}>
                {fallbackOtp}
              </span>
              <button
                type="button"
                onClick={() => setOtp(fallbackOtp)}
                style={{
                  background: 'rgba(56, 189, 248, 0.25)',
                  border: '1px solid rgba(56, 189, 248, 0.5)',
                  color: '#38bdf8',
                  borderRadius: '7px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Auto-Fill Code
              </button>
            </div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.4rem' }}>
              Render Free Tier blocks outbound SMTP (port 587). This code is generated for your account so you can verify immediately.
            </div>
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            marginBottom: '1.25rem'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">6-Digit OTP Code</label>
            <input
              type="text"
              className="form-input"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{
                letterSpacing: '0.5em',
                fontSize: '1.4rem',
                textAlign: 'center',
                fontWeight: 700,
                fontFamily: 'monospace'
              }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', height: '46px' }}
            disabled={loading}
          >
            {loading ? 'Verifying...' : (
              <>
                <ShieldCheck size={18} />
                Verify & Continue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;
