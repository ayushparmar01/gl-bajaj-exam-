const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const {
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam,
  togglePublishExam
} = require('../controllers/examController');
const {
  startExam
} = require('../controllers/resultController');
const {
  addQuestion,
  getQuestionsForExamAdmin,
  extractQuestionsFromPdf,
  batchAddQuestions
} = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validator');

// Configure multer for PDF in-memory buffer handling with strict type check (up to 20MB)
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';
    const isPdfMime = file.mimetype === 'application/pdf';

    if (isPdfExt && isPdfMime) {
      cb(null, true);
    } else {
      cb(new Error('Only valid PDF documents (.pdf) are permitted!'), false);
    }
  }
});

// All exam routes require authentication
router.use(protect);

router.get('/:id/start', authorizeRoles('STUDENT'), validateObjectId('id'), startExam);

router
  .route('/')
  .get(getAllExams)
  .post(authorizeRoles('ADMIN', 'TEACHER'), createExam);

router
  .route('/:id')
  .all(validateObjectId('id'))
  .get(getExamById)
  .put(authorizeRoles('ADMIN', 'TEACHER'), updateExam)
  .delete(authorizeRoles('ADMIN', 'TEACHER'), deleteExam);

router
  .route('/:id/publish')
  .all(validateObjectId('id'))
  .patch(authorizeRoles('ADMIN', 'TEACHER'), togglePublishExam);

// Nested question routes on /api/exams/:examId/questions
router
  .route('/:examId/questions')
  .all(validateObjectId('examId'))
  .post(authorizeRoles('ADMIN', 'TEACHER'), addQuestion)
  .get(authorizeRoles('ADMIN', 'TEACHER'), getQuestionsForExamAdmin);

// PDF extraction and batch add questions
router.post(
  '/:examId/questions/extract-pdf',
  authorizeRoles('ADMIN', 'TEACHER'),
  validateObjectId('examId'),
  (req, res, next) => {
    uploadPdf.single('pdf')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'PDF file size exceeds maximum limit of 20MB.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  },
  extractQuestionsFromPdf
);

router.post(
  '/:examId/questions/batch',
  authorizeRoles('ADMIN', 'TEACHER'),
  validateObjectId('examId'),
  batchAddQuestions
);

module.exports = router;
