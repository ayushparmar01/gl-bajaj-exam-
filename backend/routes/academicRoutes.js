const express = require('express');
const router = express.Router();
const {
  getAcademicYears,
  createAcademicYear,
  getAcademicYearById,
  updateAcademicYear,
  toggleAcademicYearStatus,
  deleteAcademicYear,
  getBranches,
  createBranch,
  getBranchById,
  updateBranch,
  toggleBranchStatus,
  deleteBranch,
  getSemesters,
  createSemester,
  getSemesterById,
  updateSemester,
  toggleSemesterStatus,
  deleteSemester,
  getSections,
  createSection,
  getSectionById,
  updateSection,
  toggleSectionStatus,
  deleteSection,
  getBatches,
  createBatch,
  getBatchById,
  updateBatch,
  toggleBatchStatus,
  deleteBatch,
  getSubjects,
  createSubject,
  getSubjectById,
  updateSubject,
  toggleSubjectStatus,
  deleteSubject,
  getMasterOptions
} = require('../controllers/academicController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validator');

// All academic management routes require authentication
router.use(protect);

// Unified master options for selectors (accessible by ADMIN and TEACHER)
router.get('/options/all', authorizeRoles('ADMIN', 'TEACHER'), getMasterOptions);

// All subsequent academic CRUD routes require ADMIN authentication
router.use(authorizeRoles('ADMIN'));

// Academic Years
router.route('/academic-years')
  .get(getAcademicYears)
  .post(createAcademicYear);

router.route('/academic-years/:id')
  .all(validateObjectId('id'))
  .get(getAcademicYearById)
  .put(updateAcademicYear)
  .delete(deleteAcademicYear);

router.patch('/academic-years/:id/status', validateObjectId('id'), toggleAcademicYearStatus);

// Branches
router.route('/branches')
  .get(getBranches)
  .post(createBranch);

router.route('/branches/:id')
  .all(validateObjectId('id'))
  .get(getBranchById)
  .put(updateBranch)
  .delete(deleteBranch);

router.patch('/branches/:id/status', validateObjectId('id'), toggleBranchStatus);

// Semesters
router.route('/semesters')
  .get(getSemesters)
  .post(createSemester);

router.route('/semesters/:id')
  .all(validateObjectId('id'))
  .get(getSemesterById)
  .put(updateSemester)
  .delete(deleteSemester);

router.patch('/semesters/:id/status', validateObjectId('id'), toggleSemesterStatus);

// Sections
router.route('/sections')
  .get(getSections)
  .post(createSection);

router.route('/sections/:id')
  .all(validateObjectId('id'))
  .get(getSectionById)
  .put(updateSection)
  .delete(deleteSection);

router.patch('/sections/:id/status', validateObjectId('id'), toggleSectionStatus);

// Batches
router.route('/batches')
  .get(getBatches)
  .post(createBatch);

router.route('/batches/:id')
  .all(validateObjectId('id'))
  .get(getBatchById)
  .put(updateBatch)
  .delete(deleteBatch);

router.patch('/batches/:id/status', validateObjectId('id'), toggleBatchStatus);

// Subjects
router.route('/subjects')
  .get(getSubjects)
  .post(createSubject);

router.route('/subjects/:id')
  .all(validateObjectId('id'))
  .get(getSubjectById)
  .put(updateSubject)
  .delete(deleteSubject);

router.patch('/subjects/:id/status', validateObjectId('id'), toggleSubjectStatus);

module.exports = router;
