import api from './api';

export const questionService = {
  addQuestion: (examId, questionData) => api.post(`/exams/${examId}/questions`, questionData),
  getQuestionsForExamAdmin: (examId) => api.get(`/exams/${examId}/questions`),
  updateQuestion: (id, questionData) => api.put(`/questions/${id}`, questionData),
  deleteQuestion: (id) => api.delete(`/questions/${id}`),
  uploadImage: (formData) => api.post('/questions/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  extractPdfQuestions: (examId, formData) => api.post(`/exams/${examId}/questions/extract-pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  batchAddQuestions: (examId, questions) => api.post(`/exams/${examId}/questions/batch`, { questions })
};
