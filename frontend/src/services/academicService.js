import api from './api';

export const academicService = {
  // Unified Master Options (Active entities for dropdowns and selectors)
  getMasterOptions: () => api.get('/admin/academic/options/all'),

  // Academic Years
  getAcademicYears: (params = {}) => api.get('/admin/academic/academic-years', { params }),
  createAcademicYear: (data) => api.post('/admin/academic/academic-years', data),
  getAcademicYearById: (id) => api.get(`/admin/academic/academic-years/${id}`),
  updateAcademicYear: (id, data) => api.put(`/admin/academic/academic-years/${id}`, data),
  toggleAcademicYearStatus: (id) => api.patch(`/admin/academic/academic-years/${id}/status`),
  deleteAcademicYear: (id) => api.delete(`/admin/academic/academic-years/${id}`),

  // Branches
  getBranches: (params = {}) => api.get('/admin/academic/branches', { params }),
  createBranch: (data) => api.post('/admin/academic/branches', data),
  getBranchById: (id) => api.get(`/admin/academic/branches/${id}`),
  updateBranch: (id, data) => api.put(`/admin/academic/branches/${id}`, data),
  toggleBranchStatus: (id) => api.patch(`/admin/academic/branches/${id}/status`),
  deleteBranch: (id) => api.delete(`/admin/academic/branches/${id}`),

  // Semesters
  getSemesters: (params = {}) => api.get('/admin/academic/semesters', { params }),
  createSemester: (data) => api.post('/admin/academic/semesters', data),
  getSemesterById: (id) => api.get(`/admin/academic/semesters/${id}`),
  updateSemester: (id, data) => api.put(`/admin/academic/semesters/${id}`, data),
  toggleSemesterStatus: (id) => api.patch(`/admin/academic/semesters/${id}/status`),
  deleteSemester: (id) => api.delete(`/admin/academic/semesters/${id}`),

  // Sections
  getSections: (params = {}) => api.get('/admin/academic/sections', { params }),
  createSection: (data) => api.post('/admin/academic/sections', data),
  getSectionById: (id) => api.get(`/admin/academic/sections/${id}`),
  updateSection: (id, data) => api.put(`/admin/academic/sections/${id}`, data),
  toggleSectionStatus: (id) => api.patch(`/admin/academic/sections/${id}/status`),
  deleteSection: (id) => api.delete(`/admin/academic/sections/${id}`),

  // Batches
  getBatches: (params = {}) => api.get('/admin/academic/batches', { params }),
  createBatch: (data) => api.post('/admin/academic/batches', data),
  getBatchById: (id) => api.get(`/admin/academic/batches/${id}`),
  updateBatch: (id, data) => api.put(`/admin/academic/batches/${id}`, data),
  toggleBatchStatus: (id) => api.patch(`/admin/academic/batches/${id}/status`),
  deleteBatch: (id) => api.delete(`/admin/academic/batches/${id}`),

  // Subjects
  getSubjects: (params = {}) => api.get('/admin/academic/subjects', { params }),
  createSubject: (data) => api.post('/admin/academic/subjects', data),
  getSubjectById: (id) => api.get(`/admin/academic/subjects/${id}`),
  updateSubject: (id, data) => api.put(`/admin/academic/subjects/${id}`, data),
  toggleSubjectStatus: (id) => api.patch(`/admin/academic/subjects/${id}/status`),
  deleteSubject: (id) => api.delete(`/admin/academic/subjects/${id}`)
};
