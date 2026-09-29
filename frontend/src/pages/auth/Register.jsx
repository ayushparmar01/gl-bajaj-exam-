import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, ShieldAlert, LogIn } from 'lucide-react';

const Register = () => {
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
        boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.7), 0 0 40px rgba(2, 132, 199, 0.14)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link
            to="/login"
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
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <ArrowLeft size={14} />
            Back to Sign In
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
            marginBottom: '1rem'
          }}>
            <GraduationCap size={32} />
          </div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '0.35rem', color: '#0f172a' }}>Candidate Registration</h1>
        </div>

        <div style={{
          background: 'rgba(2, 132, 199, 0.08)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          borderRadius: '16px',
          padding: '1.5rem',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <ShieldAlert size={36} color="#0284C7" style={{ marginBottom: '0.75rem', display: 'inline-block' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#0F172A', marginBottom: '0.5rem' }}>
            Managed Institutional Access
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Public self-registration is disabled. All candidate and student accounts are preloaded and authorized by the college examination department.
          </p>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
            If you have been assigned an examination, please use your official credentials to sign in.
          </p>
        </div>

        <Link
          to="/login"
          className="btn btn-primary"
          style={{
            width: '100%',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.975rem',
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          <LogIn size={18} />
          Proceed to Portal Login
        </Link>
      </div>
    </div>
  );
};

export default Register;
