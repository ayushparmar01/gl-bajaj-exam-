import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { academicService } from '../../services/academicService';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Calendar,
  Clock,
  Lock,
  Camera,
  BookOpen,
  Users,
  Layers,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';

const formatForDateTimeLocal = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const CreateEditExam = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isTeacher = role === 'TEACHER';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    passMarks: 1,
    isScheduled: false,
    startTime: '',
    endTime: '',
    allowMultipleAttempts: false,
    hasNegativeMarking: false,
    negativeMarks: 0.25,
    hasAccessCode: false,
    accessCode: '',
    requireCamera: true,
    isPublished: false,
    subjectId: '',
    audienceType: 'ENTIRE_COLLEGE',
    target: {
      academicYears: [],
      branches: [],
      semesters: [],
      sections: [],
      batches: []
    }
  });

  const [academicOptions, setAcademicOptions] = useState({
    academicYears: [],
    branches: [],
    semesters: [],
    sections: [],
    batches: [],
    subjects: []
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load Master Academic Options
  useEffect(() => {
    const loadAcademicOptions = async () => {
      try {
        const res = await academicService.getAllOptions();
        if (res.success && res.data) {
          setAcademicOptions(res.data);
        }
      } catch (err) {
        console.warn('Could not load academic master options for exam creation:', err);
      }
    };
    loadAcademicOptions();
  }, []);

  // Fetch Existing Exam for Edit Mode
  useEffect(() => {
    if (isEdit) {
      const fetchExam = async () => {
        try {
          setLoading(true);
          const res = await examService.getExamById(id);
          const exam = res.data;
          setFormData({
            title: exam.title || '',
            description: exam.description || '',
            duration: exam.duration || 30,
            passMarks: exam.passMarks || 1,
            isScheduled: exam.isScheduled || false,
            startTime: formatForDateTimeLocal(exam.startTime),
            endTime: formatForDateTimeLocal(exam.endTime),
            allowMultipleAttempts: exam.allowMultipleAttempts || false,
            hasNegativeMarking: exam.hasNegativeMarking || false,
            negativeMarks: exam.negativeMarks !== undefined ? exam.negativeMarks : 0.25,
            hasAccessCode: exam.hasAccessCode || false,
            accessCode: exam.accessCode || '',
            requireCamera: exam.requireCamera !== undefined ? exam.requireCamera : true,
            isPublished: exam.isPublished || false,
            subjectId: exam.subjectId ? (typeof exam.subjectId === 'object' ? exam.subjectId._id : exam.subjectId) : '',
            audienceType: exam.audienceType || 'ENTIRE_COLLEGE',
            target: {
              academicYears: (exam.target?.academicYears || []).map((x) => (typeof x === 'object' ? x._id : x)),
              branches: (exam.target?.branches || []).map((x) => (typeof x === 'object' ? x._id : x)),
              semesters: (exam.target?.semesters || []).map((x) => (typeof x === 'object' ? x._id : x)),
              sections: (exam.target?.sections || []).map((x) => (typeof x === 'object' ? x._id : x)),
              batches: (exam.target?.batches || []).map((x) => (typeof x === 'object' ? x._id : x))
            }
          });
        } catch (err) {
          const status = err.response?.status;
          if (status === 403) {
            setError('You are not authorized to view or edit this examination.');
          } else if (status === 404) {
            setError('The requested exam was not found.');
          } else {
            setError(err.message || 'Failed to fetch exam details');
          }
        } finally {
          setLoading(false);
        }
      };
      fetchExam();
    }
  }, [id, isEdit]);

  // Standard input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Audience Type change handler (resets irrelevant targets safely)
  const handleAudienceTypeChange = (e) => {
    const newType = e.target.value;
    setFormData((prev) => {
      let updatedTarget = { ...prev.target };
      if (newType === 'ENTIRE_COLLEGE') {
        updatedTarget = {
          academicYears: [],
          branches: [],
          semesters: [],
          sections: [],
          batches: []
        };
      } else if (newType === 'BRANCH') {
        updatedTarget.academicYears = [];
        updatedTarget.semesters = [];
        updatedTarget.sections = [];
        updatedTarget.batches = [];
      } else if (newType === 'SEMESTER') {
        updatedTarget.academicYears = [];
        updatedTarget.branches = [];
        updatedTarget.sections = [];
        updatedTarget.batches = [];
      } else if (newType === 'SECTION') {
        updatedTarget.academicYears = [];
        updatedTarget.branches = [];
        updatedTarget.semesters = [];
        updatedTarget.batches = [];
      } else if (newType === 'BATCH') {
        updatedTarget.academicYears = [];
        updatedTarget.branches = [];
        updatedTarget.semesters = [];
        updatedTarget.sections = [];
      } else if (newType === 'ACADEMIC_YEAR') {
        updatedTarget.branches = [];
        updatedTarget.semesters = [];
        updatedTarget.sections = [];
        updatedTarget.batches = [];
      }
      return {
        ...prev,
        audienceType: newType,
        target: updatedTarget
      };
    });
  };

  // Branch toggle with dependent section cleanup
  const handleToggleBranch = (branchId) => {
    setFormData((prev) => {
      const currentBranches = prev.target.branches || [];
      const exists = currentBranches.includes(branchId);
      const updatedBranches = exists
        ? currentBranches.filter((id) => id !== branchId)
        : [...currentBranches, branchId];

      // If branch was removed, also prune any sections that belonged to that branch
      let updatedSections = prev.target.sections || [];
      if (exists) {
        const removedBranchSectionIds = (academicOptions.sections || [])
          .filter((s) => s.branch && (s.branch._id === branchId || s.branch === branchId))
          .map((s) => s._id);
        updatedSections = updatedSections.filter((secId) => !removedBranchSectionIds.includes(secId));
      }

      return {
        ...prev,
        target: {
          ...prev.target,
          branches: updatedBranches,
          sections: updatedSections
        }
      };
    });
  };

  // Generic target dimension toggle
  const handleToggleTargetItem = (category, itemId) => {
    setFormData((prev) => {
      const currentList = prev.target[category] || [];
      const exists = currentList.includes(itemId);
      return {
        ...prev,
        target: {
          ...prev.target,
          [category]: exists ? currentList.filter((id) => id !== itemId) : [...currentList, itemId]
        }
      };
    });
  };

  // Select all / Clear all helper for a category
  const handleToggleSelectAll = (category, availableItems) => {
    setFormData((prev) => {
      const currentList = prev.target[category] || [];
      const availableIds = availableItems.map((item) => item._id);
      const allSelected = availableIds.length > 0 && availableIds.every((id) => currentList.includes(id));
      return {
        ...prev,
        target: {
          ...prev.target,
          [category]: allSelected ? [] : availableIds
        }
      };
    });
  };

  // Filter sections when branches are selected in COMBINATION_TARGET or SECTION mode
  const filteredSectionOptions = useMemo(() => {
    const allSections = academicOptions.sections || [];
    if (formData.audienceType === 'COMBINATION_TARGET' && formData.target.branches.length > 0) {
      return allSections.filter((s) => {
        const branchId = s.branch ? (typeof s.branch === 'object' ? s.branch._id : s.branch) : null;
        return branchId && formData.target.branches.includes(branchId);
      });
    }
    return allSections;
  }, [academicOptions.sections, formData.audienceType, formData.target.branches]);

  // Teacher Assignment Helpers for Visual Indicators
  const teacherAssignedSubjects = useMemo(() => {
    if (!isTeacher || !user?.assignedSubjects) return [];
    return user.assignedSubjects.map((s) => (typeof s === 'object' && s._id ? s._id : s));
  }, [isTeacher, user]);

  const canTeacherManageAllSubjects = isTeacher && Boolean(user?.permissions?.canManageAllSubjects);
  const canTeacherTargetEntireCollege = isTeacher && Boolean(user?.permissions?.canTargetEntireCollege);

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Frontend Validations
    if (!formData.title || !String(formData.title).trim()) {
      setError('Please provide an assessment title.');
      return;
    }

    const numDuration = Number(formData.duration);
    if (isNaN(numDuration) || numDuration <= 0) {
      setError('Please provide a valid duration in minutes.');
      return;
    }

    if (formData.isScheduled) {
      if (!formData.startTime || !formData.endTime) {
        setError('Please provide both the opening start time and closing end time for the scheduled window.');
        return;
      }
      if (new Date(formData.endTime) <= new Date(formData.startTime)) {
        setError('The scheduled closing time must be strictly after the opening start time.');
        return;
      }
    }

    if (formData.hasAccessCode && !formData.accessCode.trim()) {
      setError('Please enter an exam access passcode or disable secret passcode protection.');
      return;
    }

    // Audience-Specific Target Validation
    if (formData.audienceType === 'BRANCH' && formData.target.branches.length === 0) {
      setError('Please select at least one branch for Branch targeting.');
      return;
    }
    if (formData.audienceType === 'SEMESTER' && formData.target.semesters.length === 0) {
      setError('Please select at least one semester for Semester targeting.');
      return;
    }
    if (formData.audienceType === 'SECTION' && formData.target.sections.length === 0) {
      setError('Please select at least one section for Section targeting.');
      return;
    }
    if (formData.audienceType === 'BATCH' && formData.target.batches.length === 0) {
      setError('Please select at least one graduating batch for Batch targeting.');
      return;
    }
    if (formData.audienceType === 'ACADEMIC_YEAR' && formData.target.academicYears.length === 0) {
      setError('Please select at least one academic year for Academic Year targeting.');
      return;
    }
    if (formData.audienceType === 'COMBINATION_TARGET') {
      const totalSelected =
        formData.target.academicYears.length +
        formData.target.branches.length +
        formData.target.semesters.length +
        formData.target.sections.length +
        formData.target.batches.length;
      if (totalSelected === 0) {
        setError('Please select at least one targeting criterion (Branch, Semester, Section, Batch, or Year) for Combination targeting.');
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        title: String(formData.title).trim(),
        description: String(formData.description || '').trim(),
        duration: numDuration,
        passMarks: Math.max(0, Number(formData.passMarks) || 0),
        isScheduled: Boolean(formData.isScheduled),
        startTime: formData.isScheduled && formData.startTime ? new Date(formData.startTime) : null,
        endTime: formData.isScheduled && formData.endTime ? new Date(formData.endTime) : null,
        allowMultipleAttempts: Boolean(formData.allowMultipleAttempts),
        hasNegativeMarking: Boolean(formData.hasNegativeMarking),
        negativeMarks: formData.hasNegativeMarking ? Math.max(0, Number(formData.negativeMarks) || 0) : 0,
        hasAccessCode: Boolean(formData.hasAccessCode),
        accessCode: formData.hasAccessCode ? String(formData.accessCode).trim() : '',
        requireCamera: Boolean(formData.requireCamera),
        isPublished: Boolean(formData.isPublished),
        subjectId: formData.subjectId || null,
        audienceType: formData.audienceType || 'ENTIRE_COLLEGE',
        target: {
          academicYears: formData.target.academicYears || [],
          branches: formData.target.branches || [],
          semesters: formData.target.semesters || [],
          sections: formData.target.sections || [],
          batches: formData.target.batches || []
        }
      };

      if (isEdit) {
        await examService.updateExam(id, payload);
        setSuccessMessage('Exam updated successfully!');
      } else {
        await examService.createExam(payload);
        setSuccessMessage('Exam created successfully!');
      }

      setTimeout(() => {
        navigate('/admin/exams');
      }, 1000);
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message || err.message;

      if (status === 400) {
        setError(serverMsg || 'Invalid assessment configuration. Please review your inputs.');
      } else if (status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (status === 403) {
        setError(serverMsg || 'You are not authorized to target one or more selected academic groups or subjects.');
      } else if (status === 404) {
        setError('The requested exam or academic entity was not found.');
      } else {
        setError('Something went wrong while saving the assessment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '850px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="animate-spin" style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading assessment configuration...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '880px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          onClick={() => navigate('/admin/exams')}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={16} />
          Back to Assessments
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              background: isTeacher ? '#EEF2FF' : '#F1F5F9',
              color: isTeacher ? '#4F46E5' : '#334155',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid #E2E8F0'
            }}
          >
            <ShieldCheck size={14} />
            {isTeacher ? 'Faculty / Instructor Mode' : 'Administrator Control'}
          </span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2.25rem', borderRadius: '20px' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <span className="badge badge-primary" style={{ marginBottom: '0.6rem', display: 'inline-flex', gap: '0.35rem' }}>
            <Sparkles size={12} />
            ASSESSMENT CONFIGURATION
          </span>
          <h1 style={{ fontSize: '1.75rem', color: '#0F172A', marginBottom: '0.35rem', fontWeight: 800 }}>
            {isEdit ? 'Edit Assessment Settings' : 'Create New Assessment'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {isEdit
              ? 'Update examination parameters, syllabus context, candidate audience, and anti-cheat settings'
              : 'Set up core parameters and candidate eligibility before attaching test questions'}
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div
            style={{
              background: '#FEE2E2',
              border: '1px solid #F87171',
              color: '#DC2626',
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              marginBottom: '1.5rem',
              fontWeight: 500
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: '#DCFCE7',
              border: '1px solid #86EFAC',
              color: '#16A34A',
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '1.5rem',
              fontWeight: 600
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ========================================================= */}
          {/* SECTION 1: BASIC EXAM INFORMATION                         */}
          {/* ========================================================= */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
              1. Basic Assessment Information
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Exam Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="e.g. Data Structures & Algorithms Mid-Term Examination"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Description & Syllabus Instructions</label>
              <textarea
                name="description"
                className="form-textarea"
                rows={3}
                placeholder="Provide syllabus context, topics covered, calculator guidelines, or special instructions for candidates..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Exam Duration (Minutes) *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    name="duration"
                    className="form-input"
                    min={1}
                    max={360}
                    value={formData.duration}
                    onChange={handleChange}
                    required
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>mins</span>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Passing Mark Threshold</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    name="passMarks"
                    className="form-input"
                    min={0}
                    value={formData.passMarks}
                    onChange={handleChange}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>marks</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 2: ACADEMIC SUBJECT ASSOCIATION                   */}
          {/* ========================================================= */}
          <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                <BookOpen size={16} color="#4F46E5" />
                2. Academic Subject Association
              </label>
              {isTeacher && !canTeacherManageAllSubjects && (
                <span style={{ fontSize: '0.72rem', color: '#4F46E5', fontWeight: 700, background: '#EEF2FF', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                  Assigned Subjects Only
                </span>
              )}
            </div>

            <select
              name="subjectId"
              className="form-select"
              value={formData.subjectId}
              onChange={handleChange}
              style={{ fontSize: '0.875rem' }}
            >
              <option value="">-- General Assessment / No Specific Subject --</option>
              {(academicOptions.subjects || []).map((sub) => {
                const isAssigned = isTeacher ? teacherAssignedSubjects.includes(sub._id) : true;
                const labelSuffix = isTeacher && !canTeacherManageAllSubjects ? (isAssigned ? ' ✓ [Assigned]' : ' ✗ [Unassigned]') : '';
                return (
                  <option key={sub._id} value={sub._id}>
                    [{sub.subjectCode}] {sub.name} {sub.branch?.code ? `• ${sub.branch.code}` : ''} {sub.semester ? `(Sem ${sub.semester.number})` : ''}{labelSuffix}
                  </option>
                );
              })}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', margin: 0 }}>
              {isTeacher && !canTeacherManageAllSubjects
                ? 'Instructors can only publish exams for subjects assigned to their profile by administrators.'
                : 'Associates the examination with master curriculum records for accurate course analytics.'}
            </p>
          </div>

          {/* ========================================================= */}
          {/* SECTION 3: CANDIDATE AUDIENCE & TARGETING ENGINE          */}
          {/* ========================================================= */}
          <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '1.75rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                <Users size={16} color="#4F46E5" />
                3. Candidate Audience & Eligibility Targeting
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Specify which student groups are eligible to view, attempt, and submit this assessment.
              </p>
            </div>

            {/* Audience Type Selection Dropdown */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Audience Targeting Scope *</label>
              <select
                name="audienceType"
                className="form-select"
                value={formData.audienceType}
                onChange={handleAudienceTypeChange}
                style={{ fontSize: '0.875rem' }}
              >
                <option value="ENTIRE_COLLEGE">Entire College (All Enrolled Active Students)</option>
                <option value="BRANCH">Specific Branch(es) Only</option>
                <option value="SEMESTER">Specific Semester(s) Only</option>
                <option value="SECTION">Specific Section(s) Only</option>
                <option value="BATCH">Specific Graduating Batch(es) Only</option>
                <option value="ACADEMIC_YEAR">Specific Academic Year(s) Only</option>
                <option value="COMBINATION_TARGET">Advanced Multi-Dimension Target (Branch + Semester + Section + Batch)</option>
              </select>
            </div>

            {/* ENTIRE_COLLEGE Informational Banner */}
            {formData.audienceType === 'ENTIRE_COLLEGE' && (
              <div style={{ padding: '0.85rem 1rem', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px', color: '#3730A3', fontSize: '0.825rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Info size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Institution-Wide Availability</div>
                  <div style={{ fontSize: '0.775rem', marginTop: '0.15rem' }}>
                    This examination will be visible to all active enrolled students across all academic branches, semesters, and graduating cohorts.
                    {isTeacher && !canTeacherTargetEntireCollege && (
                      <span style={{ display: 'block', color: '#B91C1C', marginTop: '0.35rem', fontWeight: 600 }}>
                        Note: College-wide exam publishing requires explicit administrator privilege.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* COMBINATION_TARGET Semantics Banner */}
            {formData.audienceType === 'COMBINATION_TARGET' && (
              <div style={{ padding: '0.85rem 1rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#166534', fontSize: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <HelpCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Targeting Combination Logic (Strict AND between categories, OR within category)</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', lineHeight: 1.4 }}>
                    Candidates must satisfy <strong>all active categories</strong> (e.g. <code>CSE AND Semester 3 AND Section A</code>). Multiple selections within the same category match if candidate belongs to <strong>any</strong> of them.
                  </div>
                </div>
              </div>
            )}

            {/* ========================================= */}
            {/* TARGET DIMENSION PICKERS                  */}
            {/* ========================================= */}
            {formData.audienceType !== 'ENTIRE_COLLEGE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
                {/* 1. Branches Picker */}
                {(formData.audienceType === 'BRANCH' || formData.audienceType === 'COMBINATION_TARGET') && (
                  <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.775rem', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Target Branches ({formData.target.branches.length} selected)
                      </label>
                      {academicOptions.branches?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll('branches', academicOptions.branches)}
                          style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                          {formData.target.branches.length === academicOptions.branches.length ? 'Clear All' : 'Select All'}
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(academicOptions.branches || []).map((b) => {
                        const isChecked = formData.target.branches.includes(b._id);
                        return (
                          <button
                            key={b._id}
                            type="button"
                            onClick={() => handleToggleBranch(b._id)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '6px',
                              border: isChecked ? '1.5px solid #4F46E5' : '1px solid #CBD5E1',
                              background: isChecked ? '#EEF2FF' : '#FFFFFF',
                              color: isChecked ? '#4F46E5' : '#334155',
                              fontWeight: isChecked ? 700 : 500,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'all 0.1s ease'
                            }}
                          >
                            {isChecked ? '✓ ' : ''}{b.code} <span style={{ opacity: 0.75, fontSize: '0.72rem' }}>({b.name})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Semesters Picker */}
                {(formData.audienceType === 'SEMESTER' || formData.audienceType === 'COMBINATION_TARGET') && (
                  <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.775rem', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Target Semesters ({formData.target.semesters.length} selected)
                      </label>
                      {academicOptions.semesters?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll('semesters', academicOptions.semesters)}
                          style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                          {formData.target.semesters.length === academicOptions.semesters.length ? 'Clear All' : 'Select All'}
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(academicOptions.semesters || []).map((s) => {
                        const isChecked = formData.target.semesters.includes(s._id);
                        return (
                          <button
                            key={s._id}
                            type="button"
                            onClick={() => handleToggleTargetItem('semesters', s._id)}
                            style={{
                              padding: '0.35rem 0.7rem',
                              borderRadius: '6px',
                              border: isChecked ? '1.5px solid #4F46E5' : '1px solid #CBD5E1',
                              background: isChecked ? '#EEF2FF' : '#FFFFFF',
                              color: isChecked ? '#4F46E5' : '#334155',
                              fontWeight: isChecked ? 700 : 500,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isChecked ? '✓ ' : ''}Semester {s.number}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Sections Picker */}
                {(formData.audienceType === 'SECTION' || formData.audienceType === 'COMBINATION_TARGET') && (
                  <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.775rem', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Target Sections ({formData.target.sections.length} selected)
                      </label>
                      {filteredSectionOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll('sections', filteredSectionOptions)}
                          style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                          {formData.target.sections.length === filteredSectionOptions.length ? 'Clear All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    {filteredSectionOptions.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.4rem 0' }}>
                        No sections found matching selected branch criteria.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {filteredSectionOptions.map((sec) => {
                          const isChecked = formData.target.sections.includes(sec._id);
                          return (
                            <button
                              key={sec._id}
                              type="button"
                              onClick={() => handleToggleTargetItem('sections', sec._id)}
                              style={{
                                padding: '0.35rem 0.7rem',
                                borderRadius: '6px',
                                border: isChecked ? '1.5px solid #4F46E5' : '1px solid #CBD5E1',
                                background: isChecked ? '#EEF2FF' : '#FFFFFF',
                                color: isChecked ? '#4F46E5' : '#334155',
                                fontWeight: isChecked ? 700 : 500,
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              {isChecked ? '✓ ' : ''}Section {sec.name} {sec.branch?.code ? `(${sec.branch.code})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Batches Picker */}
                {(formData.audienceType === 'BATCH' || formData.audienceType === 'COMBINATION_TARGET') && (
                  <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.775rem', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Target Graduating Batches ({formData.target.batches.length} selected)
                      </label>
                      {academicOptions.batches?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll('batches', academicOptions.batches)}
                          style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                          {formData.target.batches.length === academicOptions.batches.length ? 'Clear All' : 'Select All'}
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(academicOptions.batches || []).map((bat) => {
                        const isChecked = formData.target.batches.includes(bat._id);
                        return (
                          <button
                            key={bat._id}
                            type="button"
                            onClick={() => handleToggleTargetItem('batches', bat._id)}
                            style={{
                              padding: '0.35rem 0.7rem',
                              borderRadius: '6px',
                              border: isChecked ? '1.5px solid #4F46E5' : '1px solid #CBD5E1',
                              background: isChecked ? '#EEF2FF' : '#FFFFFF',
                              color: isChecked ? '#4F46E5' : '#334155',
                              fontWeight: isChecked ? 700 : 500,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isChecked ? '✓ ' : ''}{bat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Academic Years Picker */}
                {(formData.audienceType === 'ACADEMIC_YEAR' || formData.audienceType === 'COMBINATION_TARGET') && (
                  <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.775rem', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Target Academic Years ({formData.target.academicYears.length} selected)
                      </label>
                      {academicOptions.academicYears?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll('academicYears', academicOptions.academicYears)}
                          style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                          {formData.target.academicYears.length === academicOptions.academicYears.length ? 'Clear All' : 'Select All'}
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(academicOptions.academicYears || []).map((ay) => {
                        const isChecked = formData.target.academicYears.includes(ay._id);
                        return (
                          <button
                            key={ay._id}
                            type="button"
                            onClick={() => handleToggleTargetItem('academicYears', ay._id)}
                            style={{
                              padding: '0.35rem 0.7rem',
                              borderRadius: '6px',
                              border: isChecked ? '1.5px solid #4F46E5' : '1px solid #CBD5E1',
                              background: isChecked ? '#EEF2FF' : '#FFFFFF',
                              color: isChecked ? '#4F46E5' : '#334155',
                              fontWeight: isChecked ? 700 : 500,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isChecked ? '✓ ' : ''}{ay.name} {ay.isCurrent ? '(Current)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SECTION 4: EXAM SCHEDULE & ACCESS WINDOW                  */}
          {/* ========================================================= */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
              <input
                type="checkbox"
                name="isScheduled"
                checked={formData.isScheduled}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: '#4F46E5' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} color="#4F46E5" />
                4. Set Scheduled Access Window (Specific Start & Cutoff Date/Time)
              </span>
            </label>

            {formData.isScheduled && (
              <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <Clock size={14} color="#0EA5E9" />
                    Window Opens (Start Time) *
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    className="form-input"
                    value={formData.startTime}
                    onChange={handleChange}
                    required={formData.isScheduled}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.35rem', margin: 0 }}>
                    Candidates cannot start before this scheduled timestamp.
                  </p>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <Clock size={14} color="#EF4444" />
                    Window Closes (Cutoff Time) *
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    className="form-input"
                    value={formData.endTime}
                    onChange={handleChange}
                    required={formData.isScheduled}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.35rem', margin: 0 }}>
                    No test sessions can be initiated after this cutoff.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SECTION 5: SECURITY & ANTI-CHEAT CONFIGURATION            */}
          {/* ========================================================= */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              5. Examination Security & Integrity Controls
            </div>

            {/* Negative Marking */}
            <div style={{ padding: '0.85rem 0', borderBottom: '1px solid #F1F5F9' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                <input
                  type="checkbox"
                  name="hasNegativeMarking"
                  checked={formData.hasNegativeMarking}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: '#EF4444' }}
                />
                <span>Enable Negative Marking for Incorrect Answers</span>
              </label>

              {formData.hasNegativeMarking && (
                <div style={{ marginTop: '0.75rem', marginLeft: '1.8rem', maxWidth: '300px' }}>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>Penalty Deducted Per Incorrect Answer (Marks) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      name="negativeMarks"
                      className="form-input"
                      min={0.01}
                      max={10}
                      step={0.05}
                      value={formData.negativeMarks}
                      onChange={handleChange}
                      required={formData.hasNegativeMarking}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>marks / question</span>
                  </div>
                </div>
              )}
            </div>

            {/* Access Passcode */}
            <div style={{ padding: '0.85rem 0', borderBottom: '1px solid #F1F5F9' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                <input
                  type="checkbox"
                  name="hasAccessCode"
                  checked={formData.hasAccessCode}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: '#4F46E5' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Lock size={15} color="#4F46E5" />
                  Protect Assessment with Secret Access PIN / Passcode
                </span>
              </label>

              {formData.hasAccessCode && (
                <div style={{ marginTop: '0.75rem', marginLeft: '1.8rem', maxWidth: '320px' }}>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>Exam Access Code *</label>
                  <input
                    type="text"
                    name="accessCode"
                    className="form-input"
                    placeholder="e.g. CS301-FINAL or PIN 9942"
                    value={formData.accessCode}
                    onChange={handleChange}
                    required={formData.hasAccessCode}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}
                  />
                </div>
              )}
            </div>

            {/* Live Camera Proctoring */}
            <div style={{ padding: '0.85rem 0', borderBottom: '1px solid #F1F5F9' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                <input
                  type="checkbox"
                  name="requireCamera"
                  checked={formData.requireCamera}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: '#4F46E5', marginTop: '2px' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Camera size={16} color="#0EA5E9" />
                    Require Candidate Webcam Proctoring
                    <span className="badge badge-primary" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                      ANTI-CHEAT
                    </span>
                  </div>
                  <p style={{ fontSize: '0.775rem', color: '#64748B', margin: '0.2rem 0 0', fontWeight: 400, lineHeight: 1.4 }}>
                    Candidates must enable their camera. Streams live activity alerts and periodic audit snapshots directly to the Live Proctoring Dashboard.
                  </p>
                </div>
              </label>
            </div>

            {/* Multiple Attempts */}
            <div style={{ padding: '0.85rem 0', borderBottom: '1px solid #F1F5F9' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                <input
                  type="checkbox"
                  name="allowMultipleAttempts"
                  checked={formData.allowMultipleAttempts}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: '#4F46E5' }}
                />
                <span>Allow candidates to re-attempt this exam multiple times</span>
              </label>
            </div>

            {/* Instant Publish */}
            <div style={{ paddingTop: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, color: '#16A34A' }}>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: '#16A34A' }}
                />
                <span>Publish Immediately (Eligible candidates will immediately see this test in their portal)</span>
              </label>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 6: ACTIONS / SUBMIT / CANCEL                      */}
          {/* ========================================================= */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/exams')}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                borderColor: '#4F46E5',
                padding: '0.75rem 1.75rem',
                fontSize: '0.95rem',
                fontWeight: 700
              }}
            >
              <Save size={18} />
              {submitting ? 'Saving Assessment...' : isEdit ? 'Update Assessment Settings' : 'Create Assessment & Configure Questions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditExam;
