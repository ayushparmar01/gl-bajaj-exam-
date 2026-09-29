const express = require('express');
const router = express.Router();
const {
  submitExam,
  getMyResults,
  getResultById,
  getAllResultsAdmin,
  saveExamProgress,
  downloadResultPdf
} = require('../controllers/resultController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validator');

router.use(protect);

// Student routes
router.post('/submit', authorizeRoles('STUDENT'), submitExam);
router.patch('/attempts/:examId/save', authorizeRoles('STUDENT'), validateObjectId('examId'), saveExamProgress);
router.get('/my-results', authorizeRoles('STUDENT'), getMyResults);

// Shared routes (Access verified in controller)
router.get('/:id', validateObjectId('id'), getResultById);
router.get('/:id/pdf', validateObjectId('id'), downloadResultPdf);

// Admin routes
router.get('/admin/all', authorizeRoles('ADMIN'), getAllResultsAdmin);

module.exports = router;
