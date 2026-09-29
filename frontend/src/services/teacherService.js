import api from './api';

export const teacherService = {
  // Get paginated teacher list with search and filters
  getTeachers: (params = {}) =>
    api.get('/admin/teachers', { params }),

  // Get single teacher details with owned exams
  getTeacherById: (id) =>
    api.get(`/admin/teachers/${id}`),

  // Add new teacher
  createTeacher: (data) =>
    api.post('/admin/teachers', data),

  // Update teacher details
  updateTeacher: (id, data) =>
    api.put(`/admin/teachers/${id}`, data),

  // Toggle teacher active/inactive status
  toggleTeacherStatus: (id) =>
    api.patch(`/admin/teachers/${id}/status`),

  // Reset teacher password
  resetTeacherPassword: (id, newPassword = null) =>
    api.post(`/admin/teachers/${id}/reset-password`, { newPassword }),

  // Safe delete teacher
  deleteTeacher: (id) =>
    api.delete(`/admin/teachers/${id}`),

  // Get teacher assignments
  getTeacherAssignments: (id) =>
    api.get(`/admin/teachers/${id}/assignments`),

  // Update teacher assignments
  updateTeacherAssignments: (id, data) =>
    api.put(`/admin/teachers/${id}/assignments`, data),

  // Get distinct filter options (departments)
  getFilterOptions: () =>
    api.get('/admin/teachers/filters/options')
};
