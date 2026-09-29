import api from './api';

export const resultService = {
  submitExam: (submissionData) => api.post('/results/submit', submissionData),
  saveExamProgress: (examId, data) => api.patch(`/results/attempts/${examId}/save`, data),
  getMyResults: () => api.get('/results/my-results'),
  getResultById: (id) => api.get(`/results/${id}`),
  getAllResultsAdmin: () => api.get('/results/admin/all'),
  getAnalyticsOverview: () => api.get('/analytics/overview'),
  downloadResultPdf: async (id, fileName = 'Exam-Report.pdf') => {
    const res = await api.get(`/results/${id}/pdf`, { responseType: 'blob' });
    
    // api response interceptor returns response.data directly, which is the Blob
    const rawBlob = res instanceof Blob ? res : (res?.data instanceof Blob ? res.data : new Blob([res]));

    // If server returned a JSON error (e.g. unauthorized or not found), parse and throw
    if (rawBlob.type && (rawBlob.type === 'application/json' || rawBlob.type.includes('json'))) {
      const text = await rawBlob.text();
      let errorMsg = 'Failed to generate PDF test report';
      try {
        const json = JSON.parse(text);
        if (json.message) errorMsg = json.message;
      } catch (e) {
        // ignore
      }
      throw new Error(errorMsg);
    }

    const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Delay revocation to ensure browser has started the download stream
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1500);
  }
};
