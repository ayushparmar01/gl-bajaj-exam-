const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  uploadPreview,
  confirmImport,
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  toggleStudentStatus,
  resetStudentPassword,
  deleteStudent,
  getFilterOptions
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validator');
const { sensitiveAdminLimiter } = require('../middleware/rateLimitMiddleware');

// Configure Multer for Excel/CSV in-memory upload (max 10MB)
const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    const isExtAllowed = allowedExts.includes(ext);

    if (isExtAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel spreadsheets (.xlsx, .xls) and CSV (.csv) files are permitted!'), false);
    }
  }
});

// All student management endpoints require ADMIN authentication
router.use(protect);
router.use(authorizeRoles('ADMIN'));

// Bulk Excel/CSV Import
router.post(
  '/upload-preview',
  (req, res, next) => {
    uploadSpreadsheet.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Spreadsheet file size exceeds maximum limit of 10MB.'
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
  uploadPreview
);

router.post('/confirm-import', confirmImport);

// Filter Metadata
router.get('/filters/options', getFilterOptions);

// Student CRUD
router
  .route('/')
  .get(getStudents)
  .post(createStudent);

router
  .route('/:id')
  .all(validateObjectId('id'))
  .get(getStudentById)
  .put(updateStudent)
  .delete(deleteStudent);

router.patch('/:id/status', validateObjectId('id'), toggleStudentStatus);
router.post('/:id/reset-password', validateObjectId('id'), sensitiveAdminLimiter, resetStudentPassword);

module.exports = router;
