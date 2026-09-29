import React, { useState, useEffect, useCallback } from 'react';
import { academicService } from '../../services/academicService';
import {
  BookOpen,
  Calendar,
  Building,
  Layers,
  Grid,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  X,
  RefreshCw,
  Sparkles,
  BookMarked,
  GraduationCap
} from 'lucide-react';

const AcademicStructure = () => {
  // Active Tab
  const [activeTab, setActiveTab] = useState('years'); // 'years' | 'branches' | 'semesters' | 'sections' | 'batches' | 'subjects'

  // Data States
  const [academicYears, setAcademicYears] = useState([]);
  const [branches, setBranches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Master options for dropdowns in modal
  const [masterOptions, setMasterOptions] = useState({
    academicYears: [],
    branches: [],
    semesters: [],
    sections: [],
    batches: [],
    subjects: []
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Entity Forms
  const [yearForm, setYearForm] = useState({ name: '', code: '', startDate: '', endDate: '', isCurrent: false, status: 'ACTIVE' });
  const [branchForm, setBranchForm] = useState({ name: '', code: '', status: 'ACTIVE' });
  const [semForm, setSemForm] = useState({ number: 1, name: '', status: 'ACTIVE' });
  const [sectionForm, setSectionForm] = useState({ name: '', branch: '', status: 'ACTIVE' });
  const [batchForm, setBatchForm] = useState({ name: '', startYear: '', endYear: '', status: 'ACTIVE' });
  const [subjectForm, setSubjectForm] = useState({ name: '', subjectCode: '', branch: '', semester: '', description: '', status: 'ACTIVE' });

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [yRes, bRes, sRes, secRes, batRes, subRes, optRes] = await Promise.all([
        academicService.getAcademicYears(),
        academicService.getBranches(),
        academicService.getSemesters(),
        academicService.getSections(),
        academicService.getBatches(),
        academicService.getSubjects(),
        academicService.getMasterOptions()
      ]);

      if (yRes.success) setAcademicYears(yRes.data || []);
      if (bRes.success) setBranches(bRes.data || []);
      if (sRes.success) setSemesters(sRes.data || []);
      if (secRes.success) setSections(secRes.data || []);
      if (batRes.success) setBatches(batRes.data || []);
      if (subRes.success) setSubjects(subRes.data || []);
      if (optRes.success) setMasterOptions(optRes.data || {});
    } catch (err) {
      showToast(err.message || 'Failed to load academic records', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Tab Switch
  const handleTabSwitch = (tabKey) => {
    setActiveTab(tabKey);
    setSearch('');
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedEntity(null);
    setFormError('');

    if (activeTab === 'years') setYearForm({ name: '', code: '', startDate: '', endDate: '', isCurrent: false, status: 'ACTIVE' });
    else if (activeTab === 'branches') setBranchForm({ name: '', code: '', status: 'ACTIVE' });
    else if (activeTab === 'semesters') setSemForm({ number: (semesters.length + 1) || 1, name: `Semester ${(semesters.length + 1) || 1}`, status: 'ACTIVE' });
    else if (activeTab === 'sections') setSectionForm({ name: '', branch: '', status: 'ACTIVE' });
    else if (activeTab === 'batches') setBatchForm({ name: '', startYear: new Date().getFullYear(), endYear: new Date().getFullYear() + 4, status: 'ACTIVE' });
    else if (activeTab === 'subjects') setSubjectForm({ name: '', subjectCode: '', branch: '', semester: '', description: '', status: 'ACTIVE' });

    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setModalMode('edit');
    setSelectedEntity(item);
    setFormError('');

    if (activeTab === 'years') {
      setYearForm({
        name: item.name || '',
        code: item.code || '',
        startDate: item.startDate ? item.startDate.split('T')[0] : '',
        endDate: item.endDate ? item.endDate.split('T')[0] : '',
        isCurrent: item.isCurrent || false,
        status: item.status || 'ACTIVE'
      });
    } else if (activeTab === 'branches') {
      setBranchForm({ name: item.name || '', code: item.code || '', status: item.status || 'ACTIVE' });
    } else if (activeTab === 'semesters') {
      setSemForm({ number: item.number || 1, name: item.name || '', status: item.status || 'ACTIVE' });
    } else if (activeTab === 'sections') {
      setSectionForm({ name: item.name || '', branch: item.branch?._id || item.branch || '', status: item.status || 'ACTIVE' });
    } else if (activeTab === 'batches') {
      setBatchForm({ name: item.name || '', startYear: item.startYear || '', endYear: item.endYear || '', status: item.status || 'ACTIVE' });
    } else if (activeTab === 'subjects') {
      setSubjectForm({
        name: item.name || '',
        subjectCode: item.subjectCode || '',
        branch: item.branch?._id || item.branch || '',
        semester: item.semester?._id || item.semester || '',
        description: item.description || '',
        status: item.status || 'ACTIVE'
      });
    }

    setIsModalOpen(true);
  };

  // Submit Modal
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      if (activeTab === 'years') {
        if (modalMode === 'create') await academicService.createAcademicYear(yearForm);
        else await academicService.updateAcademicYear(selectedEntity._id, yearForm);
      } else if (activeTab === 'branches') {
        if (modalMode === 'create') await academicService.createBranch(branchForm);
        else await academicService.updateBranch(selectedEntity._id, branchForm);
      } else if (activeTab === 'semesters') {
        if (modalMode === 'create') await academicService.createSemester(semForm);
        else await academicService.updateSemester(selectedEntity._id, semForm);
      } else if (activeTab === 'sections') {
        const payload = { ...sectionForm, branch: sectionForm.branch || null };
        if (modalMode === 'create') await academicService.createSection(payload);
        else await academicService.updateSection(selectedEntity._id, payload);
      } else if (activeTab === 'batches') {
        if (modalMode === 'create') await academicService.createBatch(batchForm);
        else await academicService.updateBatch(selectedEntity._id, batchForm);
      } else if (activeTab === 'subjects') {
        const payload = {
          ...subjectForm,
          branch: subjectForm.branch || null,
          semester: subjectForm.semester || null
        };
        if (modalMode === 'create') await academicService.createSubject(payload);
        else await academicService.updateSubject(selectedEntity._id, payload);
      }

      showToast(`Record ${modalMode === 'create' ? 'created' : 'updated'} successfully!`);
      setIsModalOpen(false);
      loadAllData();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (item) => {
    try {
      if (activeTab === 'years') await academicService.toggleAcademicYearStatus(item._id);
      else if (activeTab === 'branches') await academicService.toggleBranchStatus(item._id);
      else if (activeTab === 'semesters') await academicService.toggleSemesterStatus(item._id);
      else if (activeTab === 'sections') await academicService.toggleSectionStatus(item._id);
      else if (activeTab === 'batches') await academicService.toggleBatchStatus(item._id);
      else if (activeTab === 'subjects') await academicService.toggleSubjectStatus(item._id);

      showToast('Status updated');
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (item) => {
    setSelectedEntity(item);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!selectedEntity) return;
    setFormSubmitting(true);
    try {
      if (activeTab === 'years') await academicService.deleteAcademicYear(selectedEntity._id);
      else if (activeTab === 'branches') await academicService.deleteBranch(selectedEntity._id);
      else if (activeTab === 'semesters') await academicService.deleteSemester(selectedEntity._id);
      else if (activeTab === 'sections') await academicService.deleteSection(selectedEntity._id);
      else if (activeTab === 'batches') await academicService.deleteBatch(selectedEntity._id);
      else if (activeTab === 'subjects') await academicService.deleteSubject(selectedEntity._id);

      showToast('Record deleted successfully');
      setIsDeleteModalOpen(false);
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Delete operation blocked by referential constraint', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Tabs Configuration
  const tabs = [
    { key: 'years', label: 'Academic Years', icon: Calendar, count: academicYears.length },
    { key: 'branches', label: 'Branches / Departments', icon: Building, count: branches.length },
    { key: 'semesters', label: 'Semesters', icon: Layers, count: semesters.length },
    { key: 'sections', label: 'Sections', icon: Grid, count: sections.length },
    { key: 'batches', label: 'Batches (Cohorts)', icon: Clock, count: batches.length },
    { key: 'subjects', label: 'Subjects Catalog', icon: BookMarked, count: subjects.length }
  ];

  // Search Filter
  const filterList = (items, fields) => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter(item => {
      return fields.some(f => {
        const val = item[f];
        if (typeof val === 'string') return val.toLowerCase().includes(s);
        if (typeof val === 'number') return String(val).includes(s);
        if (val && typeof val === 'object' && val.name) return val.name.toLowerCase().includes(s);
        return false;
      });
    });
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Toast */}
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
            fontSize: '0.9rem'
          }}
        >
          {toastMessage.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              color: '#0284C7',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '0.5rem'
            }}
          >
            <BookOpen size={13} />
            INSTITUTIONAL ACADEMIC STRUCTURE
          </div>
          <h1 style={{ fontSize: '1.95rem', color: '#0F172A', marginBottom: '0.35rem', fontWeight: 800 }}>
            Academic Structure & Subject Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Configure and maintain master academic years, departments, semesters, sections, student cohorts, and course subjects.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadAllData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)', borderColor: '#0284C7' }}
          >
            <Plus size={16} />
            Add {tabs.find(t => t.key === activeTab)?.label.split(' ')[0]}
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E2E8F0', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabSwitch(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.15rem',
                borderRadius: '10px 10px 0 0',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0284C7' : '#64748B',
                background: isActive ? '#FFFFFF' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? '#E2E8F0 #E2E8F0 #FFFFFF' : 'transparent',
                borderBottom: isActive ? '2px solid #0284C7' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} color={isActive ? '#0284C7' : '#94A3B8'} />
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '12px',
                  background: isActive ? '#E0F2FE' : '#F1F5F9',
                  color: isActive ? '#0284C7' : '#64748B'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar for Tab Data */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Search size={16} color="var(--text-subtle)" />
        <input
          type="text"
          className="form-input"
          placeholder={`Search ${tabs.find(t => t.key === activeTab)?.label}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: 'none', background: 'transparent', padding: '0.2rem', fontSize: '0.875rem', width: '100%', outline: 'none' }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="btn-icon" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Table Display Panels */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {/* TAB 1: ACADEMIC YEARS */}
          {activeTab === 'years' && (
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ACADEMIC YEAR</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CODE</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SESSION DATES</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CURRENT SESSION</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filterList(academicYears, ['name', 'code']).map(y => (
                  <tr key={y._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0F172A' }}>{y.name}</td>
                    <td style={{ padding: '1rem' }}><code style={{ fontWeight: 700, background: '#F1F5F9', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>{y.code}</code></td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {y.startDate ? new Date(y.startDate).toLocaleDateString() : '—'} to {y.endDate ? new Date(y.endDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {y.isCurrent ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800, background: '#E0F2FE', color: '#0284C7', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                          <Sparkles size={12} /> ACTIVE CURRENT
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>No</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: y.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: y.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
                        {y.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button onClick={() => handleOpenEditModal(y)} className="btn-icon" style={{ color: '#0284C7' }}><Edit2 size={15} /></button>
                        <button onClick={() => handleToggleStatus(y)} className="btn-icon" style={{ color: y.status === 'ACTIVE' ? '#DC2626' : '#16A34A' }}>{y.status === 'ACTIVE' ? <XCircle size={15} /> : <CheckCircle size={15} />}</button>
                        <button onClick={() => handleOpenDeleteModal(y)} className="btn-icon" style={{ color: '#DC2626' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: BRANCHES */}
          {activeTab === 'branches' && (
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>BRANCH / DEPARTMENT</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CODE</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filterList(branches, ['name', 'code']).map(b => (
                  <tr key={b._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0F172A' }}>{b.name}</td>
                    <td style={{ padding: '1rem' }}><code style={{ fontWeight: 700, background: '#EEF2FF', color: '#4F46E5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{b.code}</code></td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: b.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: b.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button onClick={() => handleOpenEditModal(b)} className="btn-icon" style={{ color: '#0284C7' }}><Edit2 size={15} /></button>
                        <button onClick={() => handleToggleStatus(b)} className="btn-icon" style={{ color: b.status === 'ACTIVE' ? '#DC2626' : '#16A34A' }}>{b.status === 'ACTIVE' ? <XCircle size={15} /> : <CheckCircle size={15} />}</button>
                        <button onClick={() => handleOpenDeleteModal(b)} className="btn-icon" style={{ color: '#DC2626' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 3: SEMESTERS */}
          {activeTab === 'semesters' && (
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SEMESTER NUMBER</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>DISPLAY LABEL</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filterList(semesters, ['name', 'number']).map(s => (
                  <tr key={s._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0F172A' }}>Semester {s.number}</td>
                    <td style={{ padding: '1rem', color: '#334155' }}>{s.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: s.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: s.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button onClick={() => handleOpenEditModal(s)} className="btn-icon" style={{ color: '#0284C7' }}><Edit2 size={15} /></button>
                        <button onClick={() => handleToggleStatus(s)} className="btn-icon" style={{ color: s.status === 'ACTIVE' ? '#DC2626' : '#16A34A' }}>{s.status === 'ACTIVE' ? <XCircle size={15} /> : <CheckCircle size={15} />}</button>
                        <button onClick={() => handleOpenDeleteModal(s)} className="btn-icon" style={{ color: '#DC2626' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 4: SECTIONS */}
          {activeTab === 'sections' && (
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SECTION</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>BRANCH SCOPE</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filterList(sections, ['name']).map(sec => (
                  <tr key={sec._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0F172A' }}>Section {sec.name}</td>
                    <td style={{ padding: '1rem' }}>
                      {sec.branch ? (
                        <span style={{ fontWeight: 600, color: '#4F46E5', background: '#EEF2FF', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                          {sec.branch.code} ({sec.branch.name})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All Branches (Universal)</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: sec.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: sec.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
                        {sec.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button onClick={() => handleOpenEditModal(sec)} className="btn-icon" style={{ color: '#0284C7' }}><Edit2 size={15} /></button>
                        <button onClick={() => handleToggleStatus(sec)} className="btn-icon" style={{ color: sec.status === 'ACTIVE' ? '#DC2626' : '#16A34A' }}>{sec.status === 'ACTIVE' ? <XCircle size={15} /> : <CheckCircle size={15} />}</button>
                        <button onClick={() => handleOpenDeleteModal(sec)} className="btn-icon" style={{ color: '#DC2626' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 5: BATCHES */}
          {activeTab === 'batches' && (
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>BATCH (COHORT)</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>YEAR SPAN</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filterList(batches, ['name']).map(bat => (
                  <tr key={bat._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0F172A' }}>{bat.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {bat.startYear ? `${bat.startYear} - ${bat.endYear || 'Present'}` : '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: bat.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: bat.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
                        {bat.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button onClick={() => handleOpenEditModal(bat)} className="btn-icon" style={{ color: '#0284C7' }}><Edit2 size={15} /></button>
                        <button onClick={() => handleToggleStatus(bat)} className="btn-icon" style={{ color: bat.status === 'ACTIVE' ? '#DC2626' : '#16A34A' }}>{bat.status === 'ACTIVE' ? <XCircle size={15} /> : <CheckCircle size={15} />}</button>
                        <button onClick={() => handleOpenDeleteModal(bat)} className="btn-icon" style={{ color: '#DC2626' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 6: SUBJECTS */}
          {activeTab === 'subjects' && (
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SUBJECT NAME</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SUBJECT CODE</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>BRANCH</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SEMESTER</th>
                  <th style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filterList(subjects, ['name', 'subjectCode']).map(sub => (
                  <tr key={sub._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{sub.name}</div>
                      {sub.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{sub.description}</div>}
                    </td>
                    <td style={{ padding: '1rem' }}><code style={{ fontWeight: 700, background: '#F1F5F9', color: '#1E293B', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{sub.subjectCode}</code></td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{sub.branch ? <span style={{ fontWeight: 600, color: '#4F46E5' }}>{sub.branch.code}</span> : '—'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{sub.semester ? `Sem ${sub.semester.number}` : '—'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: sub.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: sub.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button onClick={() => handleOpenEditModal(sub)} className="btn-icon" style={{ color: '#0284C7' }}><Edit2 size={15} /></button>
                        <button onClick={() => handleToggleStatus(sub)} className="btn-icon" style={{ color: sub.status === 'ACTIVE' ? '#DC2626' : '#16A34A' }}>{sub.status === 'ACTIVE' ? <XCircle size={15} /> : <CheckCircle size={15} />}</button>
                        <button onClick={() => handleOpenDeleteModal(sub)} className="btn-icon" style={{ color: '#DC2626' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* ADD / EDIT MODAL                           */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px', width: '95%', borderRadius: '20px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#0F172A', margin: 0 }}>
                {modalMode === 'create' ? 'Add' : 'Edit'} {tabs.find(t => t.key === activeTab)?.label}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon"><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: '0.75rem 1rem', background: '#FEE2E2', border: '1px solid #F87171', borderRadius: '10px', color: '#DC2626', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleModalSubmit}>
              {/* YEAR FORM */}
              {activeTab === 'years' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Academic Year Name *</label>
                    <input type="text" className="form-input" placeholder="e.g. 2026-27" value={yearForm.name} onChange={e => setYearForm({ ...yearForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Code *</label>
                    <input type="text" className="form-input" placeholder="e.g. AY2627" value={yearForm.code} onChange={e => setYearForm({ ...yearForm, code: e.target.value })} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label">Start Date</label>
                      <input type="date" className="form-input" value={yearForm.startDate} onChange={e => setYearForm({ ...yearForm, startDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">End Date</label>
                      <input type="date" className="form-input" value={yearForm.endDate} onChange={e => setYearForm({ ...yearForm, endDate: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px' }}>
                    <input type="checkbox" id="isCurrentYear" checked={yearForm.isCurrent} onChange={e => setYearForm({ ...yearForm, isCurrent: e.target.checked })} />
                    <label htmlFor="isCurrentYear" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>Set as Current Active Academic Year</label>
                  </div>
                </div>
              )}

              {/* BRANCH FORM */}
              {activeTab === 'branches' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Branch / Department Name *</label>
                    <input type="text" className="form-input" placeholder="e.g. Computer Science & Engineering" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Branch Code *</label>
                    <input type="text" className="form-input" placeholder="e.g. CSE" value={branchForm.code} onChange={e => setBranchForm({ ...branchForm, code: e.target.value })} required />
                  </div>
                </div>
              )}

              {/* SEMESTER FORM */}
              {activeTab === 'semesters' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Semester Number (1-12) *</label>
                    <input type="number" min="1" max="12" className="form-input" value={semForm.number} onChange={e => setSemForm({ ...semForm, number: parseInt(e.target.value, 10) || 1, name: `Semester ${e.target.value}` })} required />
                  </div>
                  <div>
                    <label className="form-label">Display Label *</label>
                    <input type="text" className="form-input" placeholder="e.g. Semester 5" value={semForm.name} onChange={e => setSemForm({ ...semForm, name: e.target.value })} required />
                  </div>
                </div>
              )}

              {/* SECTION FORM */}
              {activeTab === 'sections' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Section Name *</label>
                    <input type="text" className="form-input" placeholder="e.g. A, B, C" value={sectionForm.name} onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Branch Scope (Optional)</label>
                    <select className="form-input" value={sectionForm.branch} onChange={e => setSectionForm({ ...sectionForm, branch: e.target.value })}>
                      <option value="">Universal (All Branches)</option>
                      {masterOptions.branches.map(b => (
                        <option key={b._id} value={b._id}>{b.code} - {b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* BATCH FORM */}
              {activeTab === 'batches' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Batch Name (Cohort) *</label>
                    <input type="text" className="form-input" placeholder="e.g. 2023-2027" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label">Start Year</label>
                      <input type="number" className="form-input" placeholder="2023" value={batchForm.startYear} onChange={e => setBatchForm({ ...batchForm, startYear: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">End Year</label>
                      <input type="number" className="form-input" placeholder="2027" value={batchForm.endYear} onChange={e => setBatchForm({ ...batchForm, endYear: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {/* SUBJECT FORM */}
              {activeTab === 'subjects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Subject Title *</label>
                    <input type="text" className="form-input" placeholder="e.g. Database Management Systems" value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Subject Code *</label>
                    <input type="text" className="form-input" placeholder="e.g. CS501" value={subjectForm.subjectCode} onChange={e => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label">Branch</label>
                      <select className="form-input" value={subjectForm.branch} onChange={e => setSubjectForm({ ...subjectForm, branch: e.target.value })}>
                        <option value="">Select Branch</option>
                        {masterOptions.branches.map(b => (
                          <option key={b._id} value={b._id}>{b.code}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Semester</label>
                      <select className="form-input" value={subjectForm.semester} onChange={e => setSubjectForm({ ...subjectForm, semester: e.target.value })}>
                        <option value="">Select Semester</option>
                        {masterOptions.semesters.map(s => (
                          <option key={s._id} value={s._id}>Sem {s.number}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows="2" placeholder="Course outline / description..." value={subjectForm.description} onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={formSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#0284C7', borderColor: '#0284C7' }} disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DELETE CONFIRMATION MODAL                  */}
      {/* ========================================== */}
      {isDeleteModalOpen && selectedEntity && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '95%', borderRadius: '20px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Trash2 size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.5rem' }}>Delete Academic Entity?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong>{selectedEntity.name || selectedEntity.code || selectedEntity.number}</strong>? If referenced by students, exams, or faculty assignments, deletion will be safely rejected.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary" disabled={formSubmitting}>Cancel</button>
              <button onClick={handleDeleteConfirm} className="btn btn-primary" style={{ background: '#DC2626', borderColor: '#DC2626' }} disabled={formSubmitting}>
                {formSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicStructure;
