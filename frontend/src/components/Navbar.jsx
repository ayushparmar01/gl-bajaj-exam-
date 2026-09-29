import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ShieldCheck, GraduationCap, Menu } from 'lucide-react';

const Navbar = ({ onToggleSidebar }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header style={{
      height: '68px',
      background: '#0F172A',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.75rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(15, 23, 42, 0.15)'
    }}>
      {/* Left: Brand Logo & Mobile Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="mobile-menu-btn"
            title="Toggle Sidebar Menu"
            aria-label="Toggle Sidebar Menu"
          >
            <Menu size={20} />
          </button>
        )}
        
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} title="GLB EXAMSPHERE Home">
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: '#0EA5E9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 10px rgba(14, 165, 233, 0.4)',
            flexShrink: 0
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '-0.02em', color: '#fff', lineHeight: 1 }}>
                GLB <span style={{ color: '#0EA5E9' }}>ExamSphere</span>
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', letterSpacing: '0.01em', marginTop: '2px' }}>
              GL Bajaj Group of Institutions, Mathura
            </div>
          </div>
        </Link>
      </div>

      {/* Right: Candidate / Admin Pill & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* User Pill Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.35rem 0.85rem 0.35rem 0.45rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ position: 'relative' }}>
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                referrerPolicy="no-referrer"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(2, 132, 199, 0.5)'
                }}
              />
            ) : (
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(13, 148, 136, 0.25) 100%)',
                border: '1px solid rgba(2, 132, 199, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7dd3fc'
              }}>
                <User size={18} />
              </div>
            )}
            {/* Active Online Dot */}
            <span style={{
              position: 'absolute',
              bottom: '0px',
              right: '0px',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid var(--bg-dark)',
              boxShadow: '0 0 6px #10b981'
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }}>
              {user?.name || 'User'}
            </span>
            <span className={`badge ${role === 'ADMIN' ? 'badge-role-admin' : 'badge-role-student'}`} style={{ fontSize: '0.62rem', padding: '0.12rem 0.45rem', marginTop: '2px', alignSelf: 'flex-start' }}>
              {role === 'ADMIN' ? <ShieldCheck size={10} /> : null}
              {role}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          style={{
            gap: '0.45rem',
            color: '#fb7185',
            borderColor: 'rgba(244, 63, 94, 0.25)',
            background: 'rgba(244, 63, 94, 0.08)'
          }}
          title="Sign out of account"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
