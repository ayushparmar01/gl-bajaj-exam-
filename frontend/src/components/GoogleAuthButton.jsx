import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { AlertCircle, HelpCircle, X, CheckCircle } from 'lucide-react';

const GoogleAuthButton = ({ role = 'STUDENT', label = 'Continue with Google' }) => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '381921037896-snjsmisokijf18gbd3lmsgemhe7ei9ue.apps.googleusercontent.com')?.trim();
  const isConfigured = Boolean(clientId && !clientId.includes('your_google_client_id'));

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');
      const res = await authService.googleLogin({
        idToken: credentialResponse.credential,
        role
      });
      loginUser(res.token, res.data);
      if (res.data.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (res.data.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      console.error('Google auth error:', err);
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo sign-in for testing before real Google Cloud Client ID is configured
  const handleDemoGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      setShowConfigModal(false);

      // Create a test Google JWT token payload
      const mockPayload = {
        sub: `google_demo_${Date.now()}`,
        email: role === 'ADMIN' ? 'demo.admin@gmail.com' : (role === 'TEACHER' ? 'demo.teacher@gmail.com' : 'demo.student@gmail.com'),
        name: role === 'ADMIN' ? 'Demo Administrator' : (role === 'TEACHER' ? 'Demo Teacher' : 'Demo Student'),
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        email_verified: true
      };

      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify(mockPayload));
      const mockToken = `${header}.${payload}.mockSignature`;

      const res = await authService.googleLogin({
        idToken: mockToken,
        role
      });

      loginUser(res.token, res.data);
      if (res.data.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (res.data.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Demo sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {error && (
        <div style={{
          width: '100%',
          padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fb7185',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {isConfigured ? (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <GoogleOAuthProvider clientId={clientId}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed.')}
              theme="filled_black"
              shape="pill"
              text="continue_with"
              size="large"
              width="100%"
            />
          </GoogleOAuthProvider>
        </div>
      ) : (
        /* Fallback button when Google Client ID is not yet provided */
        <button
          type="button"
          onClick={() => setShowConfigModal(true)}
          className="btn"
          disabled={loading}
          style={{
            width: '100%',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'var(--transition)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{loading ? 'Signing in...' : label}</span>
        </button>
      )}

      {/* Setup Guide & Demo Modal */}
      {showConfigModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(79, 70, 229, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-purple)'
                }}>
                  <HelpCircle size={20} />
                </div>
                <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#fff' }}>Google OAuth Setup</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="btn-icon"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              To enable real Google Sign-In, add your <strong>Google Client ID</strong> to your environment files:
            </p>

            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              fontSize: '0.85rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
              fontFamily: 'monospace'
            }}>
              <div>1. In <strong>frontend/.env</strong>:</div>
              <div style={{ color: '#38bdf8', marginBottom: '0.5rem' }}>VITE_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com</div>
              <div>2. In <strong>backend/.env</strong>:</div>
              <div style={{ color: '#38bdf8' }}>GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleDemoGoogleSignIn}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
              >
                <CheckCircle size={18} />
                <span>Test with Demo Google Account ({role})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;
