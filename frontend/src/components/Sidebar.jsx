import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  GraduationCap,
  Award,
  BarChart3,
  BookOpen,
  History,
  ShieldAlert
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  const adminLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/proctor', icon: ShieldAlert, label: 'Live Proctoring', isLive: true },
    { to: '/admin/exams', icon: FileText, label: 'All Exams' },
    { to: '/admin/create-exam', icon: PlusCircle, label: 'Create Exam' },
    { to: '/admin/students', icon: Users, label: 'Students' },
    { to: '/admin/teachers', icon: GraduationCap, label: 'Teachers' },
    { to: '/admin/academics', icon: BookOpen, label: 'Academic Setup' },
    { to: '/admin/results', icon: Award, label: 'Student Results' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' }
  ];

  const teacherLinks = [
    { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'Instructor Portal' },
    { to: '/admin/proctor', icon: ShieldAlert, label: 'Live Proctoring', isLive: true },
    { to: '/admin/exams', icon: FileText, label: 'Exams' },
    { to: '/admin/results', icon: Award, label: 'Results' }
  ];

  const studentLinks = [
    { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/exams', icon: BookOpen, label: 'Available Exams' },
    { to: '/student/results', icon: History, label: 'My Performance' }
  ];

  const links = role === 'ADMIN' ? adminLinks : (role === 'TEACHER' ? teacherLinks : studentLinks);

  return (
    <aside className={`layout-sidebar ${isOpen ? 'open' : ''}`}>
      <div style={{
        fontSize: '0.72rem',
        fontWeight: 800,
        color: 'var(--text-subtle)',
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        padding: '0.25rem 0.75rem 0.65rem'
      }}>
        {role === 'ADMIN' ? 'Admin Portal' : (role === 'TEACHER' ? 'Faculty Portal' : 'Student Portal')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : '#94A3B8',
                background: isActive 
                  ? 'rgba(14, 165, 233, 0.15)' 
                  : 'transparent',
                border: isActive ? '1px solid rgba(14, 165, 233, 0.35)' : '1px solid transparent',
                boxShadow: isActive ? '0 2px 8px rgba(14, 165, 233, 0.2)' : 'none',
                transition: 'var(--transition)',
                position: 'relative'
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} color={link.isLive ? '#EF4444' : (isActive ? '#38BDF8' : 'currentColor')} />
                  <span>{link.label}</span>
                  {link.isLive && (
                    <span style={{
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#EF4444',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em'
                    }}>
                      LIVE
                    </span>
                  )}
                  {isActive && (
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#0EA5E9',
                      boxShadow: '0 0 8px #0EA5E9'
                    }} />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Sidebar Footer System Tag */}
      <div style={{
        padding: '0.85rem',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        marginTop: 'auto',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 6px #10b981'
          }} />
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>System Active</span>
        </div>
        <div style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>
          GLB ExamSphere • GL Bajaj Mathura
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
