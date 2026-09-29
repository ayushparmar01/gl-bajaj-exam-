import React, { useState, useEffect, useCallback } from 'react';
import { teacherService } from '../../services/teacherService';
import { academicService } from '../../services/academicService';
import {
  GraduationCap,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Edit2,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Building,
  Phone,
  Mail,
  BadgeAlert,
  BookOpen,
  ShieldCheck,
  Layers,
  Sliders
} from 'lucide-react';

const TeacherList = () => {
  // Main Data States
  const [teachers, setTeachers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter Options from DB
  const [filterOptions, setFilterOptions] = useState({
    departments: []
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignmentsModalOpen, setIsAssignmentsModalOpen] = useState(false);

  // Selected Teacher for Modals
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [viewTeacherData, setViewTeacherData] = useState(null);
  const [assignmentTeacher, setAssignmentTeacher] = useState(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Academic Master Options for Assignments
  const [academicOptions, setAcademicOptions] = useState({
    academicYears: [],
    branches: [],
    semesters: [],
    sections: [],
    batches: [],
    subjects: []
  });

  // Assignment Form State
  const [assignmentForm, setAssignmentForm] = useState({
    assignedSubjects: [],
    assignedAcademicGroups: {
      academicYears: [],
      branches: [],
      semesters: [],
      sections: [],
      batches: []
    },
    permissions: {
      canTargetEntireCollege: false,
      canManageAllSubjects: false
    }
  });

  // Notifications / Feedback
  const [toastMessage, setToastMessage] = useState(null); // { type: 'success'|'error', text: '' }

  // Form State for Add / Edit
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '',
    phone: '',
    password: '',
    status: 'ACTIVE'
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Password Reset State
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetSuccessData, setResetSuccessData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch Filter Metadata
  const fetchFilterOptions = async () => {
    try {
      const res = await teacherService.getFilterOptions();
      if (res.success && res.data) {
        setFilterOptions(res.data);
      }
    } catch (e) {
      console.warn('Could not load dynamic teacher filter options:', e);
    }
  };

  // Fetch Paginated Teachers
  const fetchTeachers = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const params = {
        page,
        limit,
        search: search.trim() || undefined,
        department: departmentFilter !== 'ALL' ? departmentFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };

      const res = await teacherService.getTeachers(params);
      if (res.success) {
        setTeachers(res.data || []);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch teachers', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, search, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Reset page to 1 when filters change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDepartmentFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  // Open Modals
  const handleOpenAddModal = () => {
    setTeacherForm({
      name: '',
      email: '',
      employeeId: '',
      department: '',
      phone: '',
      password: '',
      status: 'ACTIVE'
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (teacher) => {
    setSelectedTeacher(teacher);
    setTeacherForm({
      name: teacher.name || '',
      email: teacher.email || '',
      employeeId: teacher.employeeId || '',
      department: teacher.department || '',
      phone: teacher.phone || '',
      status: teacher.status || 'ACTIVE'
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenViewModal = async (teacher) => {
    setSelectedTeacher(teacher);
    setViewTeacherData(null);
    setIsViewModalOpen(true);
    try {
      const res = await teacherService.getTeacherById(teacher._id);
      setViewTeacherData(res.data);
    } catch (err) {
      showToast(err.message || 'Failed to fetch teacher profile details', 'error');
    }
  };

  const handleOpenResetPwdModal = (teacher) => {
    setSelectedTeacher(teacher);
    setNewPasswordInput('');
    setResetSuccessData(null);
    setFormError('');
    setCopiedKey(false);
    setIsResetPwdModalOpen(true);
  };

  const handleOpenAssignmentsModal = async (teacher) => {
    setAssignmentTeacher(teacher);
    setIsAssignmentsModalOpen(true);
    setLoadingAssignments(true);
    setFormError('');
    try {
      const [optRes, assignRes] = await Promise.all([
        academicService.getAllOptions(),
        teacherService.getTeacherAssignments(teacher._id)
      ]);
      if (optRes.success && optRes.data) {
        setAcademicOptions(optRes.data);
      }
      if (assignRes.success && assignRes.data) {
        const data = assignRes.data;
        setAssignmentForm({
          assignedSubjects: (data.assignedSubjects || []).map((s) => (typeof s === 'object' ? s._id : s)),
          assignedAcademicGroups: {
            academicYears: (data.assignedAcademicGroups?.academicYears || []).map((x) => (typeof x === 'object' ? x._id : x)),
            branches: (data.assignedAcademicGroups?.branches || []).map((x) => (typeof x === 'object' ? x._id : x)),
            semesters: (data.assignedAcademicGroups?.semesters || []).map((x) => (typeof x === 'object' ? x._id : x)),
            sections: (data.assignedAcademicGroups?.sections || []).map((x) => (typeof x === 'object' ? x._id : x)),
            batches: (data.assignedAcademicGroups?.batches || []).map((x) => (typeof x === 'object' ? x._id : x))
          },
          permissions: {
            canTargetEntireCollege: !!data.permissions?.canTargetEntireCollege,
            canManageAllSubjects: !!data.permissions?.canManageAllSubjects
          }
        });
      }
    } catch (err) {
      showToast(err.message || 'Failed to load teacher assignments', 'error');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleToggleSubject = (subjectId) => {
    setAssignmentForm((prev) => {
      const exists = prev.assignedSubjects.includes(subjectId);
      return {
        ...prev,
        assignedSubjects: exists
          ? prev.assignedSubjects.filter((id) => id !== subjectId)
          : [...prev.assignedSubjects, subjectId]
      };
    });
  };

  const handleToggleAcademicGroupItem = (category, itemId) => {
    setAssignmentForm((prev) => {
      const currentList = prev.assignedAcademicGroups[category] || [];
      const exists = currentList.includes(itemId);
      return {
        ...prev,
        assignedAcademicGroups: {
          ...prev.assignedAcademicGroups,
          [category]: exists ? currentList.filter((id) => id !== itemId) : [...currentList, itemId]
        }
      };
    });
  };

  const handleSelectAllGroup = (category, allItems) => {
    const allIds = allItems.map((item) => item._id);
    setAssignmentForm((prev) => {
      const currentList = prev.assignedAcademicGroups[category] || [];
      const allSelected = allIds.length > 0 && allIds.every((id) => currentList.includes(id));
      return {
        ...prev,
        assignedAcademicGroups: {
          ...prev.assignedAcademicGroups,
          [category]: allSelected ? [] : allIds
        }
      };
    });
  };

  const handleSaveAssignmentsSubmit = async (e) => {
    e.preventDefault();
    if (!assignmentTeacher) return;
    setFormSubmitting(true);
    setFormError('');

    try {
      const res = await teacherService.updateTeacherAssignments(assignmentTeacher._id, assignmentForm);
      if (res.success) {
        showToast(`Assignments & permissions updated for '${assignmentTeacher.name}'`);
        setIsAssignmentsModalOpen(false);
        fetchTeachers(true);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save assignments');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (teacher) => {
    setSelectedTeacher(teacher);
    setIsDeleteModalOpen(true);
  };

  // Submit Add / Edit
  const handleTeacherFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      if (isAddModalOpen) {
        if (!teacherForm.name.trim() || !teacherForm.email.trim() || !teacherForm.employeeId.trim()) {
          setFormError('Please fill in Name, Email, and Employee/Faculty ID');
          setFormSubmitting(false);
          return;
        }

        const res = await teacherService.createTeacher(teacherForm);
        showToast(`Teacher account for '${res.data.name}' created successfully.`);
        setIsAddModalOpen(false);
      } else if (isEditModalOpen && selectedTeacher) {
        if (!teacherForm.name.trim() || !teacherForm.email.trim() || !teacherForm.employeeId.trim()) {
          setFormError('Please fill in Name, Email, and Employee/Faculty ID');
          setFormSubmitting(false);
          return;
        }

        const res = await teacherService.updateTeacher(selectedTeacher._id, teacherForm);
        showToast(`Teacher details for '${res.data.name}' updated successfully.`);
        setIsEditModalOpen(false);
      }
      fetchTeachers(true);
      fetchFilterOptions();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (teacher) => {
    try {
      const res = await teacherService.toggleTeacherStatus(teacher._id);
      showToast(`Teacher ${teacher.name} is now ${res.data.status}`);
      fetchTeachers(true);
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      const res = await teacherService.resetTeacherPassword(selectedTeacher._id, newPasswordInput.trim() || null);
      setResetSuccessData(res.data);
      showToast(`Password successfully reset for ${selectedTeacher.name}`);
    } catch (err) {
      setFormError(err.message || 'Failed to reset password');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteTeacherSubmit = async () => {
    if (!selectedTeacher) return;
    setFormSubmitting(true);
    try {
      await teacherService.deleteTeacher(selectedTeacher._id);
      showToast(`Teacher account '${selectedTeacher.name}' deleted.`);
      setIsDeleteModalOpen(false);
      fetchTeachers();
      fetchFilterOptions();
    } catch (err) {
      showToast(err.message || 'Failed to delete teacher', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '1rem 1.4rem',
            borderRadius: '12px',
            background: toastMessage.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          {toastMessage.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#818CF8',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '0.5rem'
            }}
          >
            <GraduationCap size={13} />
            FACULTY & INSTRUCTOR DIRECTORY
          </div>
          <h1 style={{ fontSize: '1.95rem', color: '#0F172A', marginBottom: '0.35rem', fontWeight: 800 }}>
            Teacher Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Provision, manage, and configure instructor accounts, faculty identifiers, and access credentials.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchTeachers(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            disabled={refreshing || loading}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              borderColor: '#4F46E5'
            }}
          >
            <UserPlus size={16} />
            Add Teacher
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <GraduationCap size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Faculty
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>{totalCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              Active Status
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16A34A' }}>
              {teachers.filter((t) => t.status === 'ACTIVE').length}{' '}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>(on page)</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <UserX size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              Deactivated
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626' }}>
              {teachers.filter((t) => t.status === 'INACTIVE').length}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#F1F5F9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Building size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              Departments
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>
              {filterOptions.departments.length || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem',
            alignItems: 'center'
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by Name, Email, Employee ID, Department, Phone..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)'
              }}
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              className="form-input"
              value={departmentFilter}
              onChange={(e) => handleFilterChange(setDepartmentFilter, e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="ALL">All Departments</option>
              {filterOptions.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Deactivated</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(search || departmentFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <div>
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.825rem', padding: '0.65rem' }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Teachers Table Panel */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Faculty Member</th>
                <th style={{ padding: '0.95rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employee ID</th>
                <th style={{ padding: '0.95rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</th>
                <th style={{ padding: '0.95rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact</th>
                <th style={{ padding: '0.95rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exams Created</th>
                <th style={{ padding: '0.95rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div className="animate-spin" style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%', marginBottom: '0.5rem' }} />
                    <div>Loading instructor accounts...</div>
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <GraduationCap size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
                    <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '0.25rem' }}>No Teacher Accounts Found</div>
                    <div style={{ fontSize: '0.85rem' }}>No teachers match your search and filter criteria.</div>
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {/* Faculty Member */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: t.status === 'ACTIVE' ? 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)' : '#F1F5F9',
                            color: t.status === 'ACTIVE' ? '#4F46E5' : '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}
                        >
                          {t.name ? t.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>{t.name}</div>
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-subtle)' }}>{t.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#1E293B', background: '#F8FAFC', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                        {t.employeeId || '—'}
                      </span>
                    </td>

                    {/* Department */}
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#334155' }}>
                      {t.department ? (
                        <span style={{ fontWeight: 600, color: '#4F46E5', background: '#EEF2FF', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.775rem' }}>
                          {t.department}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {t.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Phone size={13} />
                          <span>{t.phone}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Exams Created Count */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                        {t.examsCount || 0}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: t.status === 'ACTIVE' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                          color: t.status === 'ACTIVE' ? '#16A34A' : '#DC2626'
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }} />
                        {t.status === 'ACTIVE' ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleOpenViewModal(t)}
                          title="View Details"
                          className="btn-icon"
                          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569' }}
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          onClick={() => handleOpenAssignmentsModal(t)}
                          title="Subject & Academic Group Assignments"
                          className="btn-icon"
                          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#4F46E5' }}
                        >
                          <ShieldCheck size={15} />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(t)}
                          title="Edit Teacher"
                          className="btn-icon"
                          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0284C7' }}
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          onClick={() => handleOpenResetPwdModal(t)}
                          title="Reset Password"
                          className="btn-icon"
                          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#D97706' }}
                        >
                          <KeyRound size={15} />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(t)}
                          title={t.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                          className="btn-icon"
                          style={{
                            padding: '0.4rem',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            color: t.status === 'ACTIVE' ? '#DC2626' : '#16A34A'
                          }}
                        >
                          {t.status === 'ACTIVE' ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>

                        <button
                          onClick={() => handleOpenDeleteModal(t)}
                          title="Delete Teacher"
                          className="btn-icon"
                          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#DC2626' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing <strong>{teachers.length}</strong> of <strong>{totalCount}</strong> teachers (Page {page} of {totalPages})
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* ADD / EDIT TEACHER MODAL                   */}
      {/* ========================================== */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '540px', width: '95%', borderRadius: '20px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0F172A', margin: 0 }}>
                    {isAddModalOpen ? 'Add New Teacher' : 'Edit Teacher Details'}
                  </h3>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.775rem', margin: 0 }}>
                    {isAddModalOpen ? 'Provision a new faculty member account' : `Updating record for ${selectedTeacher?.name}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="btn-icon"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.75rem 1rem', background: '#FEE2E2', border: '1px solid #F87171', borderRadius: '10px', color: '#DC2626', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleTeacherFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Faculty Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. ramesh.kumar@glbexamsphere.edu"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Employee / Faculty ID *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. EMP-CSE-102"
                    value={teacherForm.employeeId}
                    onChange={(e) => setTeacherForm({ ...teacherForm, employeeId: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Department / Branch</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Computer Science"
                    value={teacherForm.department}
                    onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +91 9876543210"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Account Status</label>
                  <select
                    className="form-input"
                    value={teacherForm.status}
                    onChange={(e) => setTeacherForm({ ...teacherForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Deactivated</option>
                  </select>
                </div>

                {isAddModalOpen && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      Initial Password (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Leave blank to generate secure temporary password"
                      value={teacherForm.password}
                      onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.35rem' }}>
                      If left blank, a high-entropy random temporary password will be auto-generated.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="btn btn-secondary"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', borderColor: '#4F46E5' }}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : isAddModalOpen ? 'Create Teacher' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW TEACHER PROFILE MODAL                 */}
      {/* ========================================== */}
      {isViewModalOpen && selectedTeacher && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '580px', width: '95%', borderRadius: '20px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                  {selectedTeacher.name?.charAt(0).toUpperCase() || 'T'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#0F172A', margin: 0 }}>{selectedTeacher.name}</h3>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem', margin: 0 }}>
                    Faculty Account • {selectedTeacher.employeeId || 'ID Pending'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>EMAIL ADDRESS</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedTeacher.email}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>EMPLOYEE ID</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedTeacher.employeeId || '—'}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>DEPARTMENT</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedTeacher.department || '—'}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>CONTACT PHONE</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedTeacher.phone || '—'}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>ACCOUNT STATUS</span>
                <span style={{ fontWeight: 700, color: selectedTeacher.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
                  {selectedTeacher.status}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>REGISTERED ON</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {selectedTeacher.createdAt ? new Date(selectedTeacher.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>

            {/* Exams Created by Teacher */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#0F172A', marginBottom: '0.75rem', fontWeight: 700 }}>
                Assessments Created ({viewTeacherData?.examsCount || 0})
              </h4>

              {!viewTeacherData ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading created assessments...</p>
              ) : (viewTeacherData.exams || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', background: '#F8FAFC', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  No exams created by this instructor yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {viewTeacherData.exams.map((ex) => (
                    <div
                      key={ex._id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.825rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{ex.title}</div>
                        <div style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
                          Duration: {ex.duration} mins • Marks: {ex.totalMarks}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: ex.isPublished ? '#DCFCE7' : '#F1F5F9',
                          color: ex.isPublished ? '#16A34A' : '#64748B'
                        }}
                      >
                        {ex.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsViewModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* RESET PASSWORD MODAL                       */}
      {/* ========================================== */}
      {isResetPwdModalOpen && selectedTeacher && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', width: '95%', borderRadius: '20px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0F172A', margin: 0 }}>Reset Teacher Password</h3>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.775rem', margin: 0 }}>
                    {selectedTeacher.name} ({selectedTeacher.email})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsResetPwdModalOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            {resetSuccessData ? (
              <div>
                <div style={{ padding: '1rem', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '10px', color: '#16A34A', fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} />
                  <span>Password has been successfully updated!</span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, marginBottom: '0.35rem' }}>NEW TEMPORARY PASSWORD</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <code style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', letterSpacing: '0.05em' }}>
                      {resetSuccessData.temporaryPassword}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resetSuccessData.temporaryPassword)}
                      className="btn-icon"
                      title="Copy Password"
                      style={{ color: copiedKey ? '#16A34A' : '#4F46E5' }}
                    >
                      {copiedKey ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <button onClick={() => setIsResetPwdModalOpen(false)} className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', borderColor: '#4F46E5' }}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit}>
                {formError && (
                  <div style={{ padding: '0.75rem 1rem', background: '#FEE2E2', border: '1px solid #F87171', borderRadius: '10px', color: '#DC2626', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    {formError}
                  </div>
                )}

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>New Password (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Leave blank to generate random secure password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.35rem' }}>
                    If left blank, a high-entropy temporary password will be automatically created.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setIsResetPwdModalOpen(false)} className="btn btn-secondary" disabled={formSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#D97706', borderColor: '#D97706' }} disabled={formSubmitting}>
                    {formSubmitting ? 'Resetting...' : 'Confirm Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ASSIGNMENTS & PERMISSIONS MODAL            */}
      {/* ========================================== */}
      {isAssignmentsModalOpen && assignmentTeacher && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div
            className="modal-content glass-panel"
            style={{
              maxWidth: '850px',
              width: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '20px',
              padding: '2rem'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#0F172A', margin: 0, fontWeight: 700 }}>
                    Teacher Assignments & Permissions
                  </h3>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                    {assignmentTeacher.name} ({assignmentTeacher.email}) • Dept: {assignmentTeacher.department || '—'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAssignmentsModalOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            {loadingAssignments ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div className="animate-spin" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%', marginBottom: '0.5rem' }} />
                <div>Loading teacher assignments and academic metadata...</div>
              </div>
            ) : (
              <form onSubmit={handleSaveAssignmentsSubmit}>
                {formError && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#FEE2E2',
                      border: '1px solid #F87171',
                      borderRadius: '10px',
                      color: '#DC2626',
                      fontSize: '0.85rem',
                      marginBottom: '1.25rem'
                    }}
                  >
                    {formError}
                  </div>
                )}

                {/* --- 1. OVERRIDE PERMISSIONS --- */}
                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    1. Elevated Exam Creation Permissions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {/* Can Target Entire College */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        background: assignmentForm.permissions.canTargetEntireCollege ? '#EEF2FF' : '#FFFFFF',
                        border: assignmentForm.permissions.canTargetEntireCollege ? '1.5px solid #6366F1' : '1px solid #CBD5E1',
                        borderRadius: '10px',
                        padding: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={assignmentForm.permissions.canTargetEntireCollege}
                        onChange={(e) =>
                          setAssignmentForm((prev) => ({
                            ...prev,
                            permissions: { ...prev.permissions, canTargetEntireCollege: e.target.checked }
                          }))
                        }
                        style={{ marginTop: '0.2rem', accentColor: '#4F46E5' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>
                          Target Entire College
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Grants permission to publish exams for all students across the entire institution without group restrictions.
                        </div>
                      </div>
                    </label>

                    {/* Can Manage All Subjects */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        background: assignmentForm.permissions.canManageAllSubjects ? '#EEF2FF' : '#FFFFFF',
                        border: assignmentForm.permissions.canManageAllSubjects ? '1.5px solid #6366F1' : '1px solid #CBD5E1',
                        borderRadius: '10px',
                        padding: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={assignmentForm.permissions.canManageAllSubjects}
                        onChange={(e) =>
                          setAssignmentForm((prev) => ({
                            ...prev,
                            permissions: { ...prev.permissions, canManageAllSubjects: e.target.checked }
                          }))
                        }
                        style={{ marginTop: '0.2rem', accentColor: '#4F46E5' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>
                          Manage All Subjects
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Grants access to create assessments for any academic subject, bypassing specific subject assignments.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* --- 2. ASSIGNED SUBJECTS --- */}
                <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        2. Assigned Subjects ({assignmentForm.assignedSubjects.length} selected)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Select the subjects this teacher is authorized to author and manage exams for.
                      </div>
                    </div>
                    {academicOptions.subjects?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectAllGroup('subjects', academicOptions.subjects)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.725rem', padding: '0.3rem 0.6rem' }}
                      >
                        {assignmentForm.assignedSubjects.length === academicOptions.subjects.length ? 'Clear All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {assignmentForm.permissions.canManageAllSubjects && (
                    <div style={{ padding: '0.6rem 0.85rem', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', color: '#92400E', fontSize: '0.775rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={15} />
                      <span>Teacher currently has <strong>Manage All Subjects</strong> privilege enabled above.</span>
                    </div>
                  )}

                  {(!academicOptions.subjects || academicOptions.subjects.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', background: '#F8FAFC', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No active subjects configured. Add subjects in Academic Setup first.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto', padding: '0.25rem' }}>
                      {academicOptions.subjects.map((sub) => {
                        const isChecked = assignmentForm.assignedSubjects.includes(sub._id);
                        return (
                          <label
                            key={sub._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              border: isChecked ? '1px solid #6366F1' : '1px solid #E2E8F0',
                              background: isChecked ? '#EEF2FF' : '#F8FAFC',
                              cursor: 'pointer',
                              fontSize: '0.825rem'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSubject(sub._id)}
                              style={{ accentColor: '#4F46E5' }}
                            />
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>
                                <span style={{ color: '#4F46E5', fontFamily: 'monospace', marginRight: '0.35rem' }}>[{sub.subjectCode}]</span>
                                {sub.name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                                {sub.branch?.code || ''} {sub.semester ? `• Sem ${sub.semester.number}` : ''}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* --- 3. ASSIGNED ACADEMIC GROUPS --- */}
                <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    3. Assigned Academic Target Groups
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Specify which academic groups this teacher can target when scheduling assessments.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {/* Academic Years */}
                    <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.775rem', color: '#1E293B', textTransform: 'uppercase' }}>
                          Academic Years ({assignmentForm.assignedAcademicGroups.academicYears.length})
                        </span>
                        {academicOptions.academicYears?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllGroup('academicYears', academicOptions.academicYears)}
                            style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                          >
                            Toggle All
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {(academicOptions.academicYears || []).map((ay) => {
                          const isChecked = assignmentForm.assignedAcademicGroups.academicYears.includes(ay._id);
                          return (
                            <label
                              key={ay._id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: isChecked ? '1px solid #6366F1' : '1px solid #CBD5E1',
                                background: isChecked ? '#EEF2FF' : '#FFFFFF',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAcademicGroupItem('academicYears', ay._id)}
                                style={{ accentColor: '#4F46E5' }}
                              />
                              <span style={{ fontWeight: isChecked ? 700 : 500 }}>{ay.name} {ay.isCurrent ? '(Current)' : ''}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Branches */}
                    <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.775rem', color: '#1E293B', textTransform: 'uppercase' }}>
                          Branches ({assignmentForm.assignedAcademicGroups.branches.length})
                        </span>
                        {academicOptions.branches?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllGroup('branches', academicOptions.branches)}
                            style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                          >
                            Toggle All
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {(academicOptions.branches || []).map((br) => {
                          const isChecked = assignmentForm.assignedAcademicGroups.branches.includes(br._id);
                          return (
                            <label
                              key={br._id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: isChecked ? '1px solid #6366F1' : '1px solid #CBD5E1',
                                background: isChecked ? '#EEF2FF' : '#FFFFFF',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAcademicGroupItem('branches', br._id)}
                                style={{ accentColor: '#4F46E5' }}
                              />
                              <span style={{ fontWeight: isChecked ? 700 : 500 }}>{br.code}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Semesters */}
                    <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.775rem', color: '#1E293B', textTransform: 'uppercase' }}>
                          Semesters ({assignmentForm.assignedAcademicGroups.semesters.length})
                        </span>
                        {academicOptions.semesters?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllGroup('semesters', academicOptions.semesters)}
                            style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                          >
                            Toggle All
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {(academicOptions.semesters || []).map((sem) => {
                          const isChecked = assignmentForm.assignedAcademicGroups.semesters.includes(sem._id);
                          return (
                            <label
                              key={sem._id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: isChecked ? '1px solid #6366F1' : '1px solid #CBD5E1',
                                background: isChecked ? '#EEF2FF' : '#FFFFFF',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAcademicGroupItem('semesters', sem._id)}
                                style={{ accentColor: '#4F46E5' }}
                              />
                              <span style={{ fontWeight: isChecked ? 700 : 500 }}>Sem {sem.number}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sections */}
                    <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.775rem', color: '#1E293B', textTransform: 'uppercase' }}>
                          Sections ({assignmentForm.assignedAcademicGroups.sections.length})
                        </span>
                        {academicOptions.sections?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllGroup('sections', academicOptions.sections)}
                            style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                          >
                            Toggle All
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {(academicOptions.sections || []).map((sec) => {
                          const isChecked = assignmentForm.assignedAcademicGroups.sections.includes(sec._id);
                          return (
                            <label
                              key={sec._id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: isChecked ? '1px solid #6366F1' : '1px solid #CBD5E1',
                                background: isChecked ? '#EEF2FF' : '#FFFFFF',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAcademicGroupItem('sections', sec._id)}
                                style={{ accentColor: '#4F46E5' }}
                              />
                              <span style={{ fontWeight: isChecked ? 700 : 500 }}>Sec {sec.name} ({sec.branch?.code || '—'})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Batches */}
                    <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.775rem', color: '#1E293B', textTransform: 'uppercase' }}>
                          Batches ({assignmentForm.assignedAcademicGroups.batches.length})
                        </span>
                        {academicOptions.batches?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllGroup('batches', academicOptions.batches)}
                            style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                          >
                            Toggle All
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {(academicOptions.batches || []).map((bat) => {
                          const isChecked = assignmentForm.assignedAcademicGroups.batches.includes(bat._id);
                          return (
                            <label
                              key={bat._id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: isChecked ? '1px solid #6366F1' : '1px solid #CBD5E1',
                                background: isChecked ? '#EEF2FF' : '#FFFFFF',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAcademicGroupItem('batches', bat._id)}
                                style={{ accentColor: '#4F46E5' }}
                              />
                              <span style={{ fontWeight: isChecked ? 700 : 500 }}>{bat.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit / Cancel Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAssignmentsModalOpen(false)}
                    className="btn btn-secondary"
                    disabled={formSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', borderColor: '#4F46E5' }}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? 'Saving Assignments...' : 'Save Assignments & Permissions'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DELETE CONFIRMATION MODAL                  */}
      {/* ========================================== */}
      {isDeleteModalOpen && selectedTeacher && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '95%', borderRadius: '20px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.5rem' }}>Delete Teacher Account?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Are you sure you want to permanently delete <strong>{selectedTeacher.name}</strong> ({selectedTeacher.email})? If this instructor has created assessments, deletion will be blocked to preserve audit integrity.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary" disabled={formSubmitting}>
                Cancel
              </button>
              <button onClick={handleDeleteTeacherSubmit} className="btn btn-primary" style={{ background: '#DC2626', borderColor: '#DC2626' }} disabled={formSubmitting}>
                {formSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherList;
