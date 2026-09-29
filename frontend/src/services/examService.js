import api from './api';

export const examService = {
  getAllExams: () => api.get('/exams'),
  getExamById: (id) => api.get(`/exams/${id}`),
  createExam: (examData) => api.post('/exams', examData),
  updateExam: (id, examData) => api.put(`/exams/${id}`, examData),
  deleteExam: (id) => api.delete(`/exams/${id}`),
  togglePublish: (id) => api.patch(`/exams/${id}/publish`),
  startExam: (id, accessCode) => api.get(`/exams/${id}/start`, { params: accessCode ? { accessCode } : {} })
};
