import React, { useState, useEffect, useCallback, useRef } from 'react';
import { studentService } from '../../services/studentService';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MoreVertical,
  Edit2,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
  Eye,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  FileText,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

const StudentList = () => {
  // Main Data States
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter Options from DB
  const [filterOptions, setFilterOptions] = useState({
    branches: [],
    semesters: [],
    sections: [],
    batches: []
  });

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected Student for Modals
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewStudentData, setViewStudentData] = useState(null);

  // Notifications / Feedback
  const [toastMessage, setToastMessage] = useState(null); // { type: 'success'|'error', text: '' }

  // Form State for Add / Edit
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    rollNumber: '',
    enrollmentNumber: '',
    branch: '',
    semester: '',
    section: '',
    batch: '',
    password: '',
    status: 'ACTIVE'
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Password Reset State
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetSuccessData, setResetSuccessData] = useState(null);

  // ==========================================
  // BULK IMPORT STATES (4-STEP WORKFLOW)
  // ==========================================
  const [importStep, setImportStep] = useState(1); // 1: Upload, 2: Preview, 3: Processing, 4: Results
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewTab, setPreviewTab] = useState('valid'); // 'valid' | 'invalid' | 'duplicates' | 'existing'
  const [importResult, setImportResult] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const fileInputRef = useRef(null);

  // Show Toast Helper
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch Filter Metadata
  const fetchFilterOptions = async () => {
    try {
      const res = await studentService.getFilterOptions();
      if (res.success) {
        setFilterOptions(res.data);
      }
    } catch (e) {
      console.warn('Could not load dynamic filter options:', e);
    }
  };

  // Fetch Paginated Students
  const fetchStudents = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const params = {
        page,
        limit,
        search: search.trim() || undefined,
        branch: branchFilter !== 'ALL' ? branchFilter : undefined,
        semester: semesterFilter !== 'ALL' ? semesterFilter : undefined,
        section: sectionFilter !== 'ALL' ? sectionFilter : undefined,
        batch: batchFilter !== 'ALL' ? batchFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };

      const res = await studentService.getStudents(params);
      if (res.success) {
        setStudents(res.data || []);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch students', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, search, branchFilter, semesterFilter, sectionFilter, batchFilter, statusFilter]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset page to 1 when filters change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setBranchFilter('ALL');
    setSemesterFilter('ALL');
    setSectionFilter('ALL');
    setBatchFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  // ==========================================
  // SINGLE STUDENT CRUD HANDLERS
  // ==========================================
  const handleOpenAddModal = () => {
    setStudentForm({
      name: '',
      email: '',
      rollNumber: '',
      enrollmentNumber: '',
      branch: '',
      semester: '',
      section: '',
      batch: '',
      password: '',
      status: 'ACTIVE'
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (student) => {
    setSelectedStudent(student);
    setStudentForm({
      name: student.name || '',
      email: student.email || '',
      rollNumber: student.rollNumber || '',
      enrollmentNumber: student.enrollmentNumber || '',
      branch: student.branch || '',
      semester: student.semester || '',
      section: student.section || '',
      batch: student.batch || '',
      status: student.status || 'ACTIVE'
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenViewModal = async (student) => {
    setSelectedStudent(student);
    setViewStudentData(null);
    setIsViewModalOpen(true);
    try {
      const res = await studentService.getStudentById(student._id);
      if (res.success) {
        setViewStudentData(res.data);
      }
    } catch (e) {
      showToast('Could not load full student record', 'error');
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      if (isEditModalOpen && selectedStudent) {
        await studentService.updateStudent(selectedStudent._id, studentForm);
        showToast(`Student details for '${studentForm.name}' updated successfully!`);
        setIsEditModalOpen(false);
      } else {
        await studentService.createStudent(studentForm);
        showToast(`Student '${studentForm.name}' added successfully!`);
        setIsAddModalOpen(false);
      }
      fetchStudents(true);
      fetchFilterOptions();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (student) => {
    try {
      const res = await studentService.toggleStudentStatus(student._id);
      showToast(`Student ${student.name} is now ${res.data.status}`);
      fetchStudents(true);
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleDeleteStudentSubmit = async () => {
    if (!selectedStudent) return;
    setFormSubmitting(true);
    try {
      await studentService.deleteStudent(selectedStudent._id);
      showToast(`Student account '${selectedStudent.name}' deleted.`);
      setIsDeleteModalOpen(false);
      fetchStudents();
      fetchFilterOptions();
    } catch (err) {
      showToast(err.message || 'Failed to delete student', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ==========================================
  // BULK IMPORT STEP WORKFLOW
  // ==========================================
  const handleOpenImportModal = () => {
    setImportStep(1);
    setSelectedFile(null);
    setImportError('');
    setPreviewData(null);
    setImportResult(null);
    setIsImportModalOpen(true);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setImportError('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setImportError('Invalid file type. Please upload a .xlsx, .xls, or .csv spreadsheet.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportError('File size exceeds maximum limit of 10MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;
    setImportLoading(true);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await studentService.uploadPreview(formData);
      if (res.success) {
        setPreviewData(res.data);
        setImportStep(2);
      }
    } catch (err) {
      setImportError(err.message || 'Failed to parse and validate spreadsheet');
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.validRows || previewData.validRows.length === 0) {
      setImportError('No valid rows available to import.');
      return;
    }

    setImportLoading(true);
    setImportStep(3);
    setImportError('');

    try {
      const res = await studentService.confirmImport(previewData.validRows);
      if (res.success) {
        setImportResult(res);
        setImportStep(4);
        fetchStudents();
        fetchFilterOptions();
      }
    } catch (err) {
      setImportError(err.message || 'Bulk import execution failed');
      setImportStep(2);
    } finally {
      setImportLoading(false);
    }
  };

  // Download Sample CSV Template
  const handleDownloadSampleCsv = () => {
    const csvContent =
      'Email,Roll Number,Enrollment Number,Branch,Semester,Section,Batch,Status,Name\n' +
      'student1@college.edu,23CSE001,GLB2023001,CSE,5,A,2023-2027,ACTIVE,Aarav Sharma\n' +
      'student2@college.edu,23CSE002,GLB2023002,CSE,5,A,2023-2027,ACTIVE,Diya Patel\n' +
      'student3@college.edu,23IT015,GLB2023045,IT,5,B,2023-2027,ACTIVE,Rohan Gupta\n' +
      'student4@college.edu,23EC010,GLB2023010,ECE,3,A,2024-2028,ACTIVE,Ananya Verma\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'GLB_ExamSphere_Student_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Global Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: toastMessage.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
          className="animate-fade-in-up"
        >
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '0.65rem', display: 'inline-flex', gap: '0.35rem' }}>
            <Users size={13} />
            Candidate Administration
          </span>
          <h1 style={{ fontSize: '1.85rem', color: '#0F172A', marginBottom: '0.35rem' }}>Student Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Preload and manage candidate rosters, assign batches, reset passwords, and bulk import students via Excel/CSV.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadSampleCsv}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem' }}
          >
            <Download size={15} />
            Sample Template
          </button>

          <button
            onClick={handleOpenImportModal}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', borderColor: 'rgba(14, 165, 233, 0.4)', color: '#0284C7' }}
          >
            <FileSpreadsheet size={16} />
            Import Excel / CSV
          </button>

          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem' }}
          >
            <UserPlus size={16} />
            Add Student
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>Total Enrolled</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>{totalCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>Active Status</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16A34A' }}>
              {students.filter(s => s.status === 'ACTIVE').length} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>(on this page)</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserX size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>Deactivated</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626' }}>
              {students.filter(s => s.status === 'INACTIVE').length}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>Unique Branches</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>{filterOptions.branches.length || '—'}</div>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by Name, Email, Roll No, or Enrollment No..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              className="form-input"
              value={branchFilter}
              onChange={(e) => handleFilterChange(setBranchFilter, e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="ALL">All Branches</option>
              {filterOptions.branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <select
              className="form-input"
              value={semesterFilter}
              onChange={(e) => handleFilterChange(setSemesterFilter, e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="ALL">All Semesters</option>
              {filterOptions.semesters.map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              className="form-input"
              value={sectionFilter}
              onChange={(e) => handleFilterChange(setSectionFilter, e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="ALL">All Sections</option>
              {filterOptions.sections.map(sec => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div>
            <select
              className="form-input"
              value={batchFilter}
              onChange={(e) => handleFilterChange(setBatchFilter, e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="ALL">All Batches</option>
              {filterOptions.batches.map(bat => (
                <option key={bat} value={bat}>{bat}</option>
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
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {/* Clear Button */}
          <div>
            <button
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.825rem', padding: '0.55rem' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Student Data Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Showing <strong>{students.length}</strong> of <strong>{totalCount}</strong> candidates
          </div>

          <button
            onClick={() => fetchStudents(true)}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            disabled={refreshing}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
              <RefreshCw size={24} />
            </div>
            <p>Loading candidate students from database...</p>
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Users size={40} style={{ color: 'var(--text-subtle)', marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#0F172A', marginBottom: '0.35rem' }}>No student records found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              {search || branchFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or reset filters.'
                : 'Get started by importing a student spreadsheet (.xlsx / .csv) or adding students manually.'}
            </p>
            <button onClick={handleOpenImportModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <FileSpreadsheet size={15} />
              Import Excel / CSV
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Info</th>
                  <th>Roll No</th>
                  <th>Enrollment No</th>
                  <th>Branch / Sem / Sec</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    {/* Student Info */}
                    <td style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: student.status === 'ACTIVE' ? '#E0F2FE' : '#F1F5F9',
                            color: student.status === 'ACTIVE' ? '#0369A1' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            flexShrink: 0
                          }}
                        >
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#0F172A', fontSize: '0.9rem' }}>{student.name}</div>
                          <div style={{ color: 'var(--text-subtle)', fontSize: '0.78rem', fontWeight: 400 }}>{student.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Roll No */}
                    <td style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                      {student.rollNumber || '—'}
                    </td>

                    {/* Enrollment No */}
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {student.enrollmentNumber || '—'}
                    </td>

                    {/* Branch / Sem / Sec */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: '#0284C7' }}>{student.branch || 'General'}</span>
                      <span style={{ color: 'var(--text-subtle)', margin: '0 0.35rem' }}>•</span>
                      <span style={{ color: '#475569' }}>Sem {student.semester || '1'} ({student.section || 'A'})</span>
                    </td>

                    {/* Batch */}
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {student.batch || '—'}
                    </td>

                    {/* Status Badge */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {student.status === 'ACTIVE' ? (
                        <span className="badge badge-published" style={{ gap: '0.3rem' }}>
                          <CheckCircle size={11} />
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-draft" style={{ gap: '0.3rem', background: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5' }}>
                          <XCircle size={11} />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleOpenViewModal(student)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
                          title="View Profile & Exam History"
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
                          title="Edit Student Information"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setNewPasswordInput('');
                            setResetSuccessData(null);
                            setFormError('');
                            setIsResetPwdModalOpen(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
                          title="Reset Student Password"
                        >
                          <KeyRound size={13} />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(student)}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.35rem 0.55rem',
                            fontSize: '0.78rem',
                            color: student.status === 'ACTIVE' ? '#DC2626' : '#16A34A'
                          }}
                          title={student.status === 'ACTIVE' ? 'Deactivate Student Account' : 'Activate Student Account'}
                        >
                          {student.status === 'ACTIVE' ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsDeleteModalOpen(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem', color: '#DC2626' }}
                          title="Delete Student"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                disabled={page <= 1}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary"
                disabled={page >= totalPages}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 4-STEP EXCEL / CSV BULK IMPORT MODAL       */}
      {/* ========================================== */}
      {isImportModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div
            className="modal-content glass-panel"
            style={{
              maxWidth: '860px',
              width: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '20px',
              padding: '2rem'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '0.35rem' }}>Bulk Provisioning</span>
                <h2 style={{ fontSize: '1.4rem', color: '#0F172A', margin: 0 }}>Import Student Spreadsheet</h2>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Progress Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 1rem' }}>
              {[
                { num: 1, label: 'Upload File' },
                { num: 2, label: 'Preview & Validate' },
                { num: 3, label: 'Processing' },
                { num: 4, label: 'Results' }
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: importStep >= s.num ? '#0284C7' : '#E2E8F0',
                        color: importStep >= s.num ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                    >
                      {importStep > s.num ? <Check size={16} /> : s.num}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: importStep >= s.num ? '#0284C7' : '#94A3B8' }}>
                      {s.label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div
                      style={{
                        flex: 1,
                        height: '2px',
                        background: importStep > s.num ? '#0284C7' : '#E2E8F0',
                        margin: '0 0.5rem',
                        marginBottom: '1rem'
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {importError && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#DC2626',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertTriangle size={18} />
                <span>{importError}</span>
              </div>
            )}

            {/* STEP 1: UPLOAD SPREADSHEET */}
            {importStep === 1 && (
              <div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? '#0284C7' : 'rgba(14, 165, 233, 0.3)'}`,
                    background: isDragging ? 'rgba(14, 165, 233, 0.05)' : '#F8FAFC',
                    borderRadius: '16px',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '1.5rem'
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                  />

                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#E0F2FE', color: '#0284C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Upload size={28} />
                  </div>

                  <h3 style={{ fontSize: '1.1rem', color: '#0F172A', marginBottom: '0.35rem' }}>
                    {selectedFile ? selectedFile.name : 'Choose an Excel (.xlsx, .xls) or CSV file'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    Drag & drop file here or click to browse (Max file size: 10MB)
                  </p>
                  {selectedFile && (
                    <span className="badge badge-published" style={{ marginTop: '0.5rem' }}>
                      Ready to parse ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                {/* Column Format Info Box */}
                <div style={{ background: '#F1F5F9', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.825rem' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.35rem' }}>Required Columns in Spreadsheet:</div>
                  <div style={{ color: '#475569', lineHeight: 1.6 }}>
                    <code>Name</code>, <code>Roll Number</code>, <code>Enrollment Number</code>, <code>Email</code>, <code>Branch</code>, <code>Semester</code>, <code>Section</code>, <code>Batch</code>, <code>Password</code> (optional)
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={handleDownloadSampleCsv} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                    <Download size={14} />
                    Download CSV Template
                  </button>

                  <button
                    onClick={handleUploadAndAnalyze}
                    className="btn btn-primary"
                    disabled={!selectedFile || importLoading}
                    style={{ fontSize: '0.875rem', padding: '0.65rem 1.5rem' }}
                  >
                    {importLoading ? 'Analyzing File...' : 'Upload & Preview'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PREVIEW & VALIDATE */}
            {importStep === 2 && previewData && (
              <div>
                {/* Metric Counter Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>TOTAL ROWS</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>{previewData.totalRows}</div>
                  </div>

                  <div
                    onClick={() => setPreviewTab('valid')}
                    style={{
                      background: previewTab === 'valid' ? '#DCFCE7' : '#F0FDF4',
                      border: `1px solid ${previewTab === 'valid' ? '#22C55E' : '#86EFAC'}`,
                      borderRadius: '10px',
                      padding: '0.75rem',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 700 }}>READY TO IMPORT</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16A34A' }}>{previewData.validCount}</div>
                  </div>

                  <div
                    onClick={() => setPreviewTab('invalid')}
                    style={{
                      background: previewTab === 'invalid' ? '#FEE2E2' : '#FEF2F2',
                      border: `1px solid ${previewTab === 'invalid' ? '#EF4444' : '#FCA5A5'}`,
                      borderRadius: '10px',
                      padding: '0.75rem',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700 }}>INVALID ROWS</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#DC2626' }}>{previewData.invalidCount}</div>
                  </div>

                  <div
                    onClick={() => setPreviewTab('duplicates')}
                    style={{
                      background: previewTab === 'duplicates' ? '#FFEDD5' : '#FFF7ED',
                      border: `1px solid ${previewTab === 'duplicates' ? '#F97316' : '#FDBA74'}`,
                      borderRadius: '10px',
                      padding: '0.75rem',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#EA580C', fontWeight: 700 }}>FILE DUPLICATES</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#EA580C' }}>{previewData.duplicateInFileCount}</div>
                  </div>

                  <div
                    onClick={() => setPreviewTab('existing')}
                    style={{
                      background: previewTab === 'existing' ? '#E0E7FF' : '#EEF2FF',
                      border: `1px solid ${previewTab === 'existing' ? '#6366F1' : '#A5B4FC'}`,
                      borderRadius: '10px',
                      padding: '0.75rem',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#4F46E5', fontWeight: 700 }}>ALREADY IN DB</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4F46E5' }}>{previewData.existingInDbCount}</div>
                  </div>
                </div>

                {/* Tabbed Preview Area */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', maxHeight: '320px', overflowY: 'auto', marginBottom: '1.5rem', background: '#FFFFFF' }}>
                  {previewTab === 'valid' && (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#16A34A', marginBottom: '0.5rem' }}>
                        Valid Records ({previewData.validRows.length}) — Ready for DB insertion:
                      </div>
                      {previewData.validRows.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No valid rows to insert.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="data-table" style={{ fontSize: '0.8rem' }}>
                            <thead>
                              <tr>
                                <th>Row</th>
                                <th>Name</th>
                                <th>Roll No</th>
                                <th>Enrollment No</th>
                                <th>Email</th>
                                <th>Branch / Sem</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.validRows.slice(0, 50).map((r, i) => (
                                <tr key={i}>
                                  <td>#{r.rowNumber}</td>
                                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                                  <td>{r.rollNumber}</td>
                                  <td>{r.enrollmentNumber}</td>
                                  <td>{r.email}</td>
                                  <td>{r.branch} - Sem {r.semester}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {previewData.validRows.length > 50 && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                              Showing first 50 of {previewData.validRows.length} valid records.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {previewTab === 'invalid' && (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#DC2626', marginBottom: '0.5rem' }}>
                        Invalid Rows ({previewData.invalidRows.length}) — These rows will be skipped:
                      </div>
                      {previewData.invalidRows.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No validation errors found.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {previewData.invalidRows.map((inv, i) => (
                            <div key={i} style={{ padding: '0.65rem', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FCA5A5', fontSize: '0.8rem' }}>
                              <strong>Row #{inv.rowNumber} ({inv.data.name || 'Unnamed'}):</strong>
                              <ul style={{ margin: '0.25rem 0 0 1.25rem', color: '#DC2626' }}>
                                {inv.errors.map((err, errIdx) => (
                                  <li key={errIdx}>{err}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {previewTab === 'duplicates' && (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#EA580C', marginBottom: '0.5rem' }}>
                        Duplicates in Spreadsheet ({previewData.duplicateInFileRows.length}) — Skipped to prevent duplicate accounts:
                      </div>
                      {previewData.duplicateInFileRows.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No in-file duplicates found.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {previewData.duplicateInFileRows.map((dup, i) => (
                            <div key={i} style={{ padding: '0.65rem', background: '#FFF7ED', borderRadius: '8px', border: '1px solid #FDBA74', fontSize: '0.8rem' }}>
                              <strong>Row #{dup.rowNumber} ({dup.data.name || 'Unnamed'}):</strong> {dup.reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {previewTab === 'existing' && (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#4F46E5', marginBottom: '0.5rem' }}>
                        Already Registered in MongoDB ({previewData.existingInDbRows.length}) — Existing records will not be overwritten:
                      </div>
                      {previewData.existingInDbRows.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No existing database conflicts.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {previewData.existingInDbRows.map((ex, i) => (
                            <div key={i} style={{ padding: '0.65rem', background: '#EEF2FF', borderRadius: '8px', border: '1px solid #C7D2FE', fontSize: '0.8rem' }}>
                              <strong>Row #{ex.rowNumber} ({ex.data.name}):</strong> {ex.reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => setImportStep(1)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                    Back to Upload
                  </button>

                  <button
                    onClick={handleConfirmImport}
                    className="btn btn-primary"
                    disabled={previewData.validCount === 0 || importLoading}
                    style={{ fontSize: '0.875rem', padding: '0.65rem 1.5rem', background: '#16A34A', borderColor: '#16A34A' }}
                  >
                    Confirm & Import {previewData.validCount} Students
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PROCESSING */}
            {importStep === 3 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div className="animate-spin" style={{ display: 'inline-block', color: '#0284C7', marginBottom: '1rem' }}>
                  <RefreshCw size={36} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.35rem' }}>Importing Students...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Securely hashing passwords and provisioning accounts into MongoDB database.
                </p>
              </div>
            )}

            {/* STEP 4: RESULTS */}
            {importStep === 4 && importResult && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <CheckCircle size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', color: '#0F172A', marginBottom: '0.35rem' }}>Bulk Import Completed!</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Successfully imported <strong>{importResult.importedCount}</strong> student academic profiles into the institutional roster.
                  </p>
                </div>

                {/* Summary Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16A34A' }}>{importResult.importedCount}</div>
                    <div style={{ fontSize: '0.8rem', color: '#15803D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Students Imported</div>
                  </div>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#64748B' }}>{importResult.skippedCount}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Students Failed / Skipped</div>
                  </div>
                </div>

                {/* Information Notice */}
                <div style={{
                  background: 'rgba(2, 132, 199, 0.08)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.85rem',
                  color: '#0369A1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  lineHeight: 1.5
                }}>
                  <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Google Identity Authentication Active:</strong> Students will authenticate seamlessly using their official college Google account. No plaintext passwords or password hashes are required or stored in GLB ExamSphere.
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => {
                      setIsImportModalOpen(false);
                      fetchStudents();
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.875rem', padding: '0.65rem 1.5rem' }}
                  >
                    Done & Refresh Roster
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ADD / EDIT SINGLE STUDENT MODAL            */}
      {/* ========================================== */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '560px', width: '95%', borderRadius: '20px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#0F172A', margin: 0 }}>
                {isEditModalOpen ? `Edit Student: ${selectedStudent?.name}` : 'Add New Student'}
              </h2>
              <button
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStudent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Aarav Sharma"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">College Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="student1@college.edu"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Roll Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="23CSE001"
                    value={studentForm.rollNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Enrollment Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="GLB2023001"
                    value={studentForm.enrollmentNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, enrollmentNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Branch *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="CSE / IT / ECE"
                    value={studentForm.branch}
                    onChange={(e) => setStudentForm({ ...studentForm, branch: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Semester *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 5"
                    value={studentForm.semester}
                    onChange={(e) => setStudentForm({ ...studentForm, semester: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Section *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="A / B / C"
                    value={studentForm.section}
                    onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Batch *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="2023-2027"
                    value={studentForm.batch}
                    onChange={(e) => setStudentForm({ ...studentForm, batch: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Account Status</label>
                  <select
                    className="form-input"
                    value={studentForm.status}
                    onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE (Can Login & Take Exams)</option>
                    <option value="INACTIVE">INACTIVE (Login Blocked)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : (isEditModalOpen ? 'Save Changes' : 'Create Student')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* RESET PASSWORD MODAL                       */}
      {/* ========================================== */}
      {isResetPwdModalOpen && selectedStudent && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', width: '95%', borderRadius: '20px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} color="#0284C7" />
                <h2 style={{ fontSize: '1.25rem', color: '#0F172A', margin: 0 }}>Reset Student Password</h2>
              </div>
              <button
                onClick={() => setIsResetPwdModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Reset credentials for <strong>{selectedStudent.name}</strong> ({selectedStudent.email}).
            </p>

            {formError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            {resetSuccessData ? (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <CheckCircle size={28} color="#16A34A" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 700, color: '#16A34A', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                  New Password Assigned Successfully!
                </div>
                <div style={{ fontSize: '0.825rem', color: '#475569', marginBottom: '0.75rem' }}>
                  Please safely share this temporary password with the student:
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#FFFFFF', border: '1px solid #BBF7D0', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                  <code style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                    {resetSuccessData.temporaryPassword}
                  </code>
                  <button
                    onClick={() => copyToClipboard(resetSuccessData.temporaryPassword, 'reset')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284C7' }}
                  >
                    {copiedIndex === 'reset' ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">New Password (Leave blank to generate random secure password)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter custom password or leave blank"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsResetPwdModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW STUDENT PROFILE & HISTORY MODAL       */}
      {/* ========================================== */}
      {isViewModalOpen && selectedStudent && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '640px', width: '95%', borderRadius: '20px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem' }}>
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: '#0F172A', margin: 0 }}>{selectedStudent.name}</h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedStudent.email}</div>
                </div>
              </div>

              <button
                onClick={() => setIsViewModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Academic Detail Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', background: '#F8FAFC', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Roll Number</span>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>{selectedStudent.rollNumber || '—'}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Enrollment No</span>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>{selectedStudent.enrollmentNumber || '—'}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Status</span>
                <div>
                  <span className={`badge ${selectedStudent.status === 'ACTIVE' ? 'badge-published' : 'badge-draft'}`}>
                    {selectedStudent.status}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Branch</span>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>{selectedStudent.branch || '—'}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Semester & Sec</span>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>Sem {selectedStudent.semester || '1'} ({selectedStudent.section || 'A'})</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Batch</span>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>{selectedStudent.batch || '—'}</div>
              </div>
            </div>

            {/* Recent Assessments History */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#0F172A', marginBottom: '0.65rem' }}>Assessment Participation & Results</h3>

              {!viewStudentData ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading assessment records...</p>
              ) : (viewStudentData.results || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', background: '#F8FAFC', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  No completed exams recorded for this candidate yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {viewStudentData.results.map((r) => (
                    <div
                      key={r._id}
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
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{r.examId?.title || 'Exam'}</div>
                        <div style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
                          Submitted: {new Date(r.submittedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: r.score >= (r.examId?.passMarks || 0) ? '#16A34A' : '#DC2626' }}>
                          {r.score} / {r.totalMarks} ({r.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DELETE CONFIRMATION MODAL                  */}
      {/* ========================================== */}
      {isDeleteModalOpen && selectedStudent && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '95%', borderRadius: '20px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.5rem' }}>Delete Student Account?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Are you sure you want to permanently delete <strong>{selectedStudent.name}</strong> ({selectedStudent.email})? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteStudentSubmit}
                className="btn btn-primary"
                disabled={formSubmitting}
                style={{ background: '#DC2626', borderColor: '#DC2626' }}
              >
                {formSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
