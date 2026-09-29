import api from './api';

export const studentService = {
  // Upload and preview student spreadsheet (.xlsx, .xls, .csv)
  uploadPreview: (formData) =>
    api.post('/admin/students/upload-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Confirm import of validated student rows
  confirmImport: (students) =>
    api.post('/admin/students/confirm-import', { students }),

  // Get paginated student list with search and filters
  getStudents: (params = {}) =>
    api.get('/admin/students', { params }),

  // Get single student profile with history
  getStudentById: (id) =>
    api.get(`/admin/students/${id}`),

  // Manually add single student
  createStudent: (data) =>
    api.post('/admin/students', data),

  // Update existing student details
  updateStudent: (id, data) =>
    api.put(`/admin/students/${id}`, data),

  // Toggle student active/inactive status
  toggleStudentStatus: (id) =>
    api.patch(`/admin/students/${id}/status`),

  // Reset student password
  resetStudentPassword: (id, newPassword = null) =>
    api.post(`/admin/students/${id}/reset-password`, { newPassword }),

  // Delete student
  deleteStudent: (id) =>
    api.delete(`/admin/students/${id}`),

  // Get distinct filter options (branches, semesters, sections, batches)
  getFilterOptions: () =>
    api.get('/admin/students/filters/options')
};
