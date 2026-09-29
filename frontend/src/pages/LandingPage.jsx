import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Clock,
  BarChart3,
  ChevronDown,
  Menu,
  X,
  Play,
  ArrowRight,
  LogIn,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
  GraduationCap,
  BookOpen,
  Camera,
  Activity,
  Award,
  Cpu,
  TrendingUp,
  FolderTree,
  FileCheck,
  AlertTriangle,
  Key,
  FileText,
  Download,
  Building2,
  MapPin,
  Mail,
  Phone,
  CheckCircle,
  Shield
} from 'lucide-react';

// Authentic GL Bajaj Institutional Logo Component
const GLBajajLogo = () => {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img
        src="/logo.png"
        alt="GL Bajaj Group of Institutions, Mathura"
        onError={() => setImgError(true)}
        style={{
          height: '46px',
          width: 'auto',
          maxWidth: '220px',
          objectFit: 'contain',
          display: 'block'
        }}
      />
    );
  }

  // Graceful institutional vector fallback if /logo.png is not found
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', userSelect: 'none' }}>
      <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <circle cx="50" cy="50" r="46" fill="#F8FAFC" stroke="#C59B27" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="41" fill="#FFFFFF" stroke="#D4AF37" strokeWidth="1" strokeDasharray="2 2" />
        <path d="M50 16 L74 27 V52 C74 68 50 82 50 82 C50 82 26 68 26 52 V27 Z" fill="#996515" />
        <path d="M50 19 L71 29 V51 C71 65 50 78 50 78 C50 78 29 65 29 51 V29 Z" fill="#B8860B" />
        <path d="M50 22 L68 31 V50 C68 62 50 74 50 74 C50 74 32 62 32 50 V31 Z" fill="#D4AF37" />
        <path d="M50 28 C53 32 55 35 53 39 C51 43 47 43 47 40 C47 38 48 37 47 35 C46 38 44 41 45 44 C46 47 50 49 53 47 C57 44 57 37 54 33 Z" fill="#FFFFFF" />
        <path d="M50 30 C51 33 52 35 51 38 C49 40 48 39 48 37 C48 35 49 34 48 33 Z" fill="#F59E0B" />
        <rect x="48.5" y="44" width="3" height="8" fill="#FFFFFF" rx="1" />
        <path d="M36 56 C42 53 48 55 50 57 C52 55 58 53 64 56 V67 C58 64 52 66 50 68 C48 66 42 64 36 67 Z" fill="#FFFFFF" stroke="#996515" strokeWidth="1" />
        <line x1="50" y1="57" x2="50" y2="68" stroke="#996515" strokeWidth="1" />
        <path d="M22 78 Q50 88 78 78 L74 85 Q50 94 26 85 Z" fill="#800000" stroke="#D4AF37" strokeWidth="1" />
        <text x="50" y="86" fill="#FFFFFF" fontSize="5.5" fontWeight="900" fontFamily="serif" textAnchor="middle" letterSpacing="0.5">
          FINDING NEW PATHS
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontFamily: "'Cinzel', 'Georgia', serif", fontSize: '1.2rem', fontWeight: 900, color: '#1E293B', letterSpacing: '0.04em', lineHeight: 1 }}>
          GL BAJAJ
        </span>
        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '2px' }}>
          GROUP OF INSTITUTIONS
        </span>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [activeFaq, setActiveFaq] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (index) => {
    setActiveFaq((prev) => (prev === index ? null : index));
  };

  const dashboardPath =
    role === 'ADMIN'
      ? '/admin/dashboard'
      : role === 'TEACHER'
      ? '/teacher/dashboard'
      : '/student/dashboard';

  const scrollToSection = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const faqs = [
    {
      q: 'How do students log into GLB ExamSphere?',
      a: 'Student accounts are pre-provisioned and managed by the GL Bajaj college administration. Students authenticate securely using their verified institutional Google account or college credentials.'
    },
    {
      q: 'How does the live proctoring system work during online examinations?',
      a: 'GLB ExamSphere monitors assessments with real-time proctoring telemetry, camera and microphone streaming, browser fullscreen lockdown, tab-switch detection, and structured event logging.'
    },
    {
      q: 'How does academic targeting ensure students receive the correct examination?',
      a: 'Examinations are strictly mapped according to Academic Year, Branch (CSE, AIML, ECE, ME, MBA), Semester (1 to 8), Section, and Batch with server-side access control.'
    },
    {
      q: 'When and how are examination results and scorecards published?',
      a: 'Objective assessments are evaluated automatically upon final submission against verified institutional answer keys, generating immediate scorecards and downloadable PDF reports.'
    },
    {
      q: 'Who has permission to create exams and manage student records?',
      a: 'Authorized college administrators manage student rosters and departments, while designated faculty members curate question banks, schedule exams, and supervise live attempts.'
    }
  ];

  return (
    <div style={{ background: '#FFFFFF', color: '#0F172A', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* 1. TOP NAVBAR */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0.65rem 2rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem'
          }}
        >
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <GLBajajLogo />
          </Link>

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2.25rem',
              marginLeft: 'auto',
              marginRight: '2.5rem'
            }}
            className="desktop-nav-links"
          >
            <a
              href="#hero"
              onClick={(e) => scrollToSection(e, 'hero')}
              style={{ fontSize: '0.925rem', color: '#334155', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => (e.target.style.color = '#0084FF')}
              onMouseLeave={(e) => (e.target.style.color = '#334155')}
            >
              Home
            </a>
            <a
              href="#about"
              onClick={(e) => scrollToSection(e, 'about')}
              style={{ fontSize: '0.925rem', color: '#334155', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => (e.target.style.color = '#0084FF')}
              onMouseLeave={(e) => (e.target.style.color = '#334155')}
            >
              About
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              style={{ fontSize: '0.925rem', color: '#334155', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => (e.target.style.color = '#0084FF')}
              onMouseLeave={(e) => (e.target.style.color = '#334155')}
            >
              Features
            </a>
            <a
              href="#contact"
              onClick={(e) => scrollToSection(e, 'contact')}
              style={{ fontSize: '0.925rem', color: '#334155', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => (e.target.style.color = '#0084FF')}
              onMouseLeave={(e) => (e.target.style.color = '#334155')}
            >
              Contact
            </a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isAuthenticated ? (
              <button
                onClick={() => navigate(dashboardPath)}
                style={{
                  background: '#0084FF',
                  color: '#FFFFFF',
                  padding: '0.55rem 1.4rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 132, 255, 0.25)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#0070D8')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0084FF')}
              >
                <span>Dashboard</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <Link
                to="/login"
                style={{
                  background: '#0084FF',
                  color: '#FFFFFF',
                  padding: '0.55rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0, 132, 255, 0.25)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#0070D8')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0084FF')}
              >
                Login
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#334155',
                cursor: 'pointer',
                borderRadius: '8px',
                padding: '0.4rem',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="mobile-nav-toggle"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            style={{
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              padding: '1rem 0.5rem',
              marginTop: '0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <a href="#hero" onClick={(e) => scrollToSection(e, 'hero')} style={{ color: '#1E293B', padding: '0.6rem 1rem', textDecoration: 'none', fontWeight: 600 }}>Home</a>
            <a href="#about" onClick={(e) => scrollToSection(e, 'about')} style={{ color: '#1E293B', padding: '0.6rem 1rem', textDecoration: 'none', fontWeight: 600 }}>About</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} style={{ color: '#1E293B', padding: '0.6rem 1rem', textDecoration: 'none', fontWeight: 600 }}>Features</a>
            <a href="#contact" onClick={(e) => scrollToSection(e, 'contact')} style={{ color: '#1E293B', padding: '0.6rem 1rem', textDecoration: 'none', fontWeight: 600 }}>Contact</a>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section
        id="hero"
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #E6F3FF 0%, #F5FAFF 45%, #FFFFFF 100%)',
          minHeight: '480px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '56%',
            backgroundImage: `url(/assets/campus.png), url(/assets/glb-campus.png), url(/campus.png), url(https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1200&auto=format&fit=crop)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to right, #E6F3FF 0%, rgba(230, 243, 255, 0.95) 15%, rgba(245, 250, 255, 0.6) 40%, rgba(255, 255, 255, 0) 75%)'
            }}
          />
        </div>

        <div
          style={{
            maxWidth: '1360px',
            width: '100%',
            margin: '0 auto',
            padding: '3.75rem 2rem 5rem',
            position: 'relative',
            zIndex: 10
          }}
        >
          <div style={{ maxWidth: '580px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#0066CC',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '1.25rem'
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0084FF', lineHeight: 1 }}>C</span>
              <span>GL BAJAJ GROUP OF INSTITUTIONS, MATHURA</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.5rem, 4.5vw, 3.6rem)',
                lineHeight: 1.12,
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.03em',
                marginBottom: '0.85rem'
              }}
            >
              <span style={{ color: '#0F172A' }}>GLB </span>
              <span style={{ color: '#0084FF' }}>ExamSphere</span>
            </h1>

            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '1.15rem',
                letterSpacing: '-0.01em'
              }}
            >
              Smart • Secure • Seamless Examination Platform
            </div>

            <p
              style={{
                fontSize: '0.95rem',
                color: '#475569',
                lineHeight: 1.6,
                maxWidth: '480px',
                marginBottom: '2rem'
              }}
            >
              Streamlining the examination process with advanced technology, ensuring transparency, security and efficiency.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {isAuthenticated ? (
                <button
                  onClick={() => navigate(dashboardPath)}
                  style={{
                    background: '#0084FF',
                    color: '#FFFFFF',
                    padding: '0.8rem 1.85rem',
                    fontSize: '0.975rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 132, 255, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#0070D8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#0084FF')}
                >
                  <span>Dashboard</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <Link
                  to="/login"
                  style={{
                    background: '#0084FF',
                    color: '#FFFFFF',
                    padding: '0.8rem 1.85rem',
                    fontSize: '0.975rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 12px rgba(0, 132, 255, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#0070D8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#0084FF')}
                >
                  Login Now
                </Link>
              )}

              <a
                href="#features"
                onClick={(e) => scrollToSection(e, 'features')}
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#1E293B',
                  padding: '0.8rem 1.75rem',
                  fontSize: '0.975rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#94A3B8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>▷</span>
                <span>Learn More</span>
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '24px',
            background: '#FFFFFF',
            clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)',
            borderTop: '2px solid #0084FF',
            zIndex: 15
          }}
        />
      </section>

      {/* 3. HERO BOTTOM FEATURE STRIP */}
      <section
        style={{
          background: '#FFFFFF',
          padding: '2.5rem 1.5rem 3.5rem',
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '2rem'
          }}
          className="feature-strip-grid"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid #BAE6FD',
                boxShadow: '0 2px 8px rgba(0, 132, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0084FF',
                marginBottom: '0.85rem'
              }}
            >
              <Shield size={24} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
              Secure Exams
            </h3>
            <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>-</div>
            <p style={{ fontSize: '0.825rem', color: '#64748B', lineHeight: 1.4, maxWidth: '200px', margin: '0 auto' }}>
              AI-powered proctoring and monitoring
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid #BAE6FD',
                boxShadow: '0 2px 8px rgba(0, 132, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0084FF',
                marginBottom: '0.85rem'
              }}
            >
              <Lock size={22} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
              Easy Access
            </h3>
            <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>-</div>
            <p style={{ fontSize: '0.825rem', color: '#64748B', lineHeight: 1.4, maxWidth: '200px', margin: '0 auto' }}>
              Take exams anytime, anywhere
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid #BAE6FD',
                boxShadow: '0 2px 8px rgba(0, 132, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0084FF',
                marginBottom: '0.85rem'
              }}
            >
              <Clock size={23} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
              Real-time Results
            </h3>
            <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>-</div>
            <p style={{ fontSize: '0.825rem', color: '#64748B', lineHeight: 1.4, maxWidth: '200px', margin: '0 auto' }}>
              Instant evaluation and analytics
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid #BAE6FD',
                boxShadow: '0 2px 8px rgba(0, 132, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0084FF',
                marginBottom: '0.85rem'
              }}
            >
              <BarChart3 size={23} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
              Better Insights
            </h3>
            <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>-</div>
            <p style={{ fontSize: '0.825rem', color: '#64748B', lineHeight: 1.4, maxWidth: '200px', margin: '0 auto' }}>
              Data-driven performance reports
            </p>
          </div>
        </div>
      </section>

      {/* 4. WHY GLB EXAMSPHERE */}
      <section
        id="about"
        style={{
          padding: '5rem 1.5rem',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div
              style={{
                display: 'inline-block',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#0084FF',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
                background: '#EFF6FF',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #BAE6FD'
              }}
            >
              Institutional Purpose
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.2vw, 2.5rem)',
                color: '#0F172A',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '0.75rem'
              }}
            >
              Modern Examination Experience for GL Bajaj
            </h2>
            <p
              style={{
                color: '#64748B',
                fontSize: '1.025rem',
                maxWidth: '720px',
                margin: '0 auto',
                lineHeight: 1.6
              }}
            >
              GLB ExamSphere centralizes examination management, secure assessment delivery, proctoring supervision, and verified result generation for GL Bajaj Group of Institutions, Mathura.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
              gap: '1.75rem'
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '2rem 1.75rem',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#E0F2FE',
                  color: '#0084FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.65rem' }}>
                Centralized Assessment
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Unified coordination of semester tests, unit examinations, and mock competitive assessments tailored to GL Bajaj department curricula.
              </p>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '2rem 1.75rem',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.65rem' }}>
                Supervised Integrity
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Proctoring telemetry records dual webcam & microphone signals, screen blurs, and full-screen state to preserve absolute exam fairness.
              </p>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '2rem 1.75rem',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <Activity size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.65rem' }}>
                Instant Evaluation
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Automated algorithmic scoring against master answer keys eliminates manual turnaround, providing immediate feedback to students.
              </p>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '2rem 1.75rem',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#E0E7FF',
                  color: '#4F46E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <Award size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.65rem' }}>
                Verified PDF Certificates
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Tamper-resistant digital scorecards and academic certificates with GL Bajaj branding and verifiable validation keys.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PLATFORM FEATURES */}
      <section
        id="features"
        style={{
          padding: '5rem 1.5rem',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div
              style={{
                display: 'inline-block',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#0084FF',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
                background: '#EFF6FF',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #BAE6FD'
              }}
            >
              Comprehensive Capabilities
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.2vw, 2.5rem)',
                color: '#0F172A',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '0.75rem'
              }}
            >
              Platform Features
            </h2>
            <p style={{ color: '#64748B', fontSize: '1.025rem', maxWidth: '650px', margin: '0 auto', lineHeight: 1.6 }}>
              Engineered specifically for institutional examination standards, accuracy, and ease of use.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem'
            }}
          >
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E0F2FE', color: '#0084FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <BookOpen size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>Online Examination</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Distraction-free exam runner with countdown timers, dynamic question navigation, and autosave.</p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E0F2FE', color: '#0084FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Lock size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>Secure Authentication</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Verified institutional credentials, single active session enforcement, and role-based access.</p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Camera size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>Live Proctoring</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Continuous webcam telemetry, microphone activity tracking, and tab switch detection.</p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E0E7FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <FolderTree size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>Question Bank</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Categorized question repositories by subject, difficulty, and academic branch with bulk Excel import.</p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Cpu size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>Automated Evaluation</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Instant algorithmic grading on submission with customizable negative marking rules.</p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <CheckCircle2 size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>Instant Results</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Detailed breakdown of correct, incorrect, and skipped questions with instant solution keys.</p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E0F2FE', color: '#0084FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <TrendingUp size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>Performance Analytics</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Class averages, percentiles, subject distributions, and teacher insight reports.</p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E0E7FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Layers size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>Academic Targeting</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Precision grouping by Academic Year, Branch, Semester, Section, and Batch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section
        id="how-it-works"
        style={{
          padding: '5rem 1.5rem',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div
              style={{
                display: 'inline-block',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#0084FF',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
                background: '#EFF6FF',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #BAE6FD'
              }}
            >
              Workflow
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.2vw, 2.5rem)',
                color: '#0F172A',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '0.75rem'
              }}
            >
              How It Works
            </h2>
            <p style={{ color: '#64748B', fontSize: '1.025rem', maxWidth: '650px', margin: '0 auto', lineHeight: 1.6 }}>
              A smooth examination journey designed to minimize friction for students and faculty.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '2rem 1.5rem', textAlign: 'left' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#0084FF', marginBottom: '0.75rem', lineHeight: 1 }}>01</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Student Login</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Sign into your verified GL Bajaj student account using your institutional credentials.</p>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '2rem 1.5rem', textAlign: 'left' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#0084FF', marginBottom: '0.75rem', lineHeight: 1 }}>02</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Exam Access</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>View assigned tests targeted to your Academic Year, Branch, Semester, and Section.</p>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '2rem 1.5rem', textAlign: 'left' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#0084FF', marginBottom: '0.75rem', lineHeight: 1 }}>03</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Secure Examination</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Attempt your exam in a monitored environment with autosaving and live telemetry tracking.</p>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '2rem 1.5rem', textAlign: 'left' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#0084FF', marginBottom: '0.75rem', lineHeight: 1 }}>04</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Instant Results</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Receive instant automated grading, detailed question analysis, and downloadable PDF reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECURITY */}
      <section
        id="security"
        style={{
          padding: '5rem 1.5rem',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div
              style={{
                display: 'inline-block',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#0084FF',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
                background: '#EFF6FF',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #BAE6FD'
              }}
            >
              Integrity
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.2vw, 2.5rem)',
                color: '#0F172A',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '0.75rem'
              }}
            >
              Secure by Design
            </h2>
            <p style={{ color: '#64748B', fontSize: '1.025rem', maxWidth: '650px', margin: '0 auto', lineHeight: 1.6 }}>
              Multi-layered security protocols ensuring fair evaluation and indisputable exam integrity.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem', display: 'flex', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E0F2FE', color: '#0084FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>Secure Authentication</h3>
                <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Verified Google institutional sign-in with candidate identity validation and session lock.</p>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem', display: 'flex', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E0F2FE', color: '#0084FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Key size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>Exam Access Control</h3>
                <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Strict time-window enforcement, attempt limits, and cohort eligibility verification.</p>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem', display: 'flex', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>Camera & Microphone Monitoring</h3>
                <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Real-time audio-video telemetry tracking during active assessment sessions.</p>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem', display: 'flex', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>Tab Switch Detection</h3>
                <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Immediate logging and alert triggers when browser window focus is lost or changed.</p>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem', display: 'flex', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E0E7FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Activity size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>Proctoring Events & Logs</h3>
                <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Chronological incident log visible to faculty supervisors with snapshot captures.</p>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.75rem', display: 'flex', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileCheck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>Audit Records & Verification</h3>
                <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5 }}>Cryptographic submission receipts with tamper-evident answer verification records.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. ABOUT GL BAJAJ */}
      <section
        style={{
          padding: '5rem 1.5rem',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              borderRadius: '16px',
              padding: '3.5rem 3rem',
              color: '#FFFFFF',
              boxShadow: '0 16px 36px -12px rgba(15, 23, 42, 0.25)',
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: '3rem',
              alignItems: 'center'
            }}
            className="about-grid"
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  background: 'rgba(0, 132, 255, 0.2)',
                  border: '1px solid rgba(0, 132, 255, 0.4)',
                  color: '#38BDF8',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  marginBottom: '1rem',
                  textTransform: 'uppercase'
                }}
              >
                <Building2 size={14} />
                <span>GL BAJAJ GROUP OF INSTITUTIONS, MATHURA</span>
              </div>

              <h2
                style={{
                  fontSize: 'clamp(1.9rem, 3vw, 2.5rem)',
                  fontWeight: 900,
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                  marginBottom: '1.25rem',
                  lineHeight: 1.2
                }}
              >
                Built for GL Bajaj Group of Institutions, Mathura
              </h2>

              <p style={{ color: '#94A3B8', fontSize: '0.975rem', lineHeight: 1.7, marginBottom: '1.75rem' }}>
                GL Bajaj Group of Institutions, Mathura is a premier institution established in 2009, approved by AICTE, and affiliated with Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow. GLB ExamSphere represents the college's commitment to high-standard academic technology, transparent evaluations, and seamless digital administration.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '1.25rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '1.75rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38BDF8', fontFamily: "'Outfit', sans-serif" }}>2009</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Established</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38BDF8', fontFamily: "'Outfit', sans-serif" }}>AICTE</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Approved</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38BDF8', fontFamily: "'Outfit', sans-serif" }}>AKTU</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Affiliated</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38BDF8', fontFamily: "'Outfit', sans-serif" }}>B.Tech/MBA</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Programs</div>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '2rem',
                backdropFilter: 'blur(8px)'
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '1.25rem' }}>Campus Location</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#CBD5E1', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <MapPin size={18} color="#38BDF8" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <span style={{ fontWeight: 700, color: '#FFFFFF' }}>GL Bajaj Group of Institutions</span><br />
                    NH-2, Mathura-Delhi Road, PO-Chaumuhan, Mathura, Uttar Pradesh - 281406
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <Mail size={18} color="#38BDF8" style={{ flexShrink: 0 }} />
                  <span>info@glbajajgroup.org</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <Phone size={18} color="#38BDF8" style={{ flexShrink: 0 }} />
                  <span>+91 (05662) 241025 / 26</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section
        id="faq"
        style={{
          padding: '5rem 1.5rem',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div
              style={{
                display: 'inline-block',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#0084FF',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
                background: '#EFF6FF',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #BAE6FD'
              }}
            >
              Help & FAQ
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.2vw, 2.5rem)',
                color: '#0F172A',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '0.75rem'
              }}
            >
              Frequently Asked Questions
            </h2>
            <p style={{ color: '#64748B', fontSize: '1.025rem' }}>
              Common answers regarding GLB ExamSphere student examinations and administration.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  style={{
                    background: '#F8FAFC',
                    border: isOpen ? '1px solid #0084FF' : '1px solid #E2E8F0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    style={{
                      width: '100%',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '0.975rem',
                      gap: '1rem'
                    }}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      color="#0084FF"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }}
                    />
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: '0 1.5rem 1.25rem',
                        color: '#64748B',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        borderTop: '1px solid #E2E8F0',
                        paddingTop: '0.75rem'
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer
        id="contact"
        style={{
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '4.5rem 1.5rem 2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '3rem',
            marginBottom: '3.5rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#0084FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}
              >
                <GraduationCap size={22} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#FFFFFF' }}>
                GLB <span style={{ color: '#38BDF8' }}>ExamSphere</span>
              </span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              Official Examination & Evaluation Portal for GL Bajaj Group of Institutions, Mathura.
            </p>
            <p style={{ color: '#64748B', fontSize: '0.8rem', lineHeight: 1.5 }}>
              NH-2, Mathura-Delhi Road, Mathura, Uttar Pradesh, 281406
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
              Platform
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: '#94A3B8' }}>
              <li><a href="#features" onClick={(e) => scrollToSection(e, 'features')} style={{ color: 'inherit', textDecoration: 'none' }}>Examinations</a></li>
              <li><a href="#features" onClick={(e) => scrollToSection(e, 'features')} style={{ color: 'inherit', textDecoration: 'none' }}>Features</a></li>
              <li><a href="#security" onClick={(e) => scrollToSection(e, 'security')} style={{ color: 'inherit', textDecoration: 'none' }}>Security & Proctoring</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
              Portals
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: '#94A3B8' }}>
              <li><Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Student Login</Link></li>
              <li><Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Faculty Console</Link></li>
              <li><Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Admin Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
              Support
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: '#94A3B8' }}>
              <li><a href="#contact" onClick={(e) => scrollToSection(e, 'contact')} style={{ color: 'inherit', textDecoration: 'none' }}>Contact Desk</a></li>
              <li><a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a></li>
              <li><span style={{ color: '#64748B' }}>Email: examcell@glbajajgroup.org</span></li>
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            maxWidth: '1280px',
            margin: '0 auto',
            fontSize: '0.8rem',
            color: '#64748B'
          }}
        >
          <div>
            © {new Date().getFullYear()} GL Bajaj Group of Institutions, Mathura. All rights reserved.
          </div>
          <div>
            GLB ExamSphere Platform • Smart • Secure • Seamless
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .feature-strip-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.75rem !important;
          }
          .about-grid {
            grid-template-columns: 1fr !important;
            padding: 2.5rem 1.75rem !important;
          }
          .desktop-nav-links {
            display: none !important;
          }
          .mobile-nav-toggle {
            display: flex !important;
          }
        }
        @media (max-width: 580px) {
          .feature-strip-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;