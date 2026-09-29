const express = require('express');
const router = express.Router();
const {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  toggleTeacherStatus,
  resetTeacherPassword,
  deleteTeacher,
  getFilterOptions,
  getTeacherAssignments,
  updateTeacherAssignments
} = require('../controllers/teacherController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validator');
const { sensitiveAdminLimiter } = require('../middleware/rateLimitMiddleware');

// All teacher management routes require ADMIN authentication
router.use(protect);
router.use(authorizeRoles('ADMIN'));

// Filter metadata
router.get('/filters/options', getFilterOptions);

// Teacher CRUD
router
  .route('/')
  .get(getTeachers)
  .post(createTeacher);

// Teacher Assignments & Permissions
router
  .route('/:id/assignments')
  .all(validateObjectId('id'))
  .get(getTeacherAssignments)
  .put(updateTeacherAssignments);

router
  .route('/:id')
  .all(validateObjectId('id'))
  .get(getTeacherById)
  .put(updateTeacher)
  .delete(deleteTeacher);

router.patch('/:id/status', validateObjectId('id'), toggleTeacherStatus);
router.post('/:id/reset-password', validateObjectId('id'), sensitiveAdminLimiter, resetTeacherPassword);

module.exports = router;
