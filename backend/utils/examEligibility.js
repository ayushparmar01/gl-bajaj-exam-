const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const Branch = require('../models/Branch');
const Semester = require('../models/Semester');
const Section = require('../models/Section');
const Batch = require('../models/Batch');

/**
 * Validates ObjectIds in an array and returns unique strings.
 */
function sanitizeObjectIdArray(arr) {
  if (!Array.isArray(arr)) return [];
  const validIds = [];
  for (const item of arr) {
    const idStr = typeof item === 'object' && item !== null && item._id ? item._id.toString() : String(item || '').trim();
    if (mongoose.Types.ObjectId.isValid(idStr) && !validIds.includes(idStr)) {
      validIds.push(idStr);
    }
  }
  return validIds;
}

/**
 * Validates Exam Subject and Audience Targeting configuration.
 * Enforces role-based permissions (TEACHER vs ADMIN) and verifies referenced entities.
 *
 * @param {Object} user - The authenticated req.user document
 * @param {Object} payload - The exam payload containing subjectId, audienceType, target
 * @param {Boolean} isUpdate - Whether this is an update operation
 * @param {Object} existingExam - The existing exam document (for updates)
 * @returns {Promise<Object>} Sanitized configuration { cleanSubjectId, cleanSubjectCode, cleanAudienceType, cleanTarget }
 */
async function validateExamTargeting(user, payload, isUpdate = false, existingExam = null) {
  const isAdmin = user && user.role === 'ADMIN';
  const isTeacher = user && user.role === 'TEACHER';

  let subjectId = payload.subjectId !== undefined ? payload.subjectId : (existingExam ? existingExam.subjectId : null);
  let audienceType = payload.audienceType !== undefined ? payload.audienceType : (existingExam ? existingExam.audienceType : 'ENTIRE_COLLEGE');
  let targetInput = payload.target !== undefined ? payload.target : (existingExam ? existingExam.target : {});

  // 1. SUBJECT VALIDATION
  let cleanSubjectId = null;
  let cleanSubjectCode = '';

  if (subjectId) {
    const subIdStr = typeof subjectId === 'object' && subjectId._id ? subjectId._id.toString() : String(subjectId).trim();
    if (!mongoose.Types.ObjectId.isValid(subIdStr)) {
      const err = new Error('Invalid subject ID format');
      err.statusCode = 400;
      throw err;
    }

    const subjectDoc = await Subject.findById(subIdStr);
    if (!subjectDoc) {
      const err = new Error('Referenced subject does not exist');
      err.statusCode = 400;
      throw err;
    }

    // For new/changed subject, ensure it is ACTIVE
    if (!isUpdate || (existingExam && String(existingExam.subjectId) !== subIdStr)) {
      if (subjectDoc.status !== 'ACTIVE') {
        const err = new Error(`Subject '${subjectDoc.name}' is inactive and cannot be selected for an assessment`);
        err.statusCode = 400;
        throw err;
      }
    }

    // TEACHER Subject Authorization Check
    if (isTeacher) {
      const canManageAll = Boolean(user.permissions && user.permissions.canManageAllSubjects);
      const assignedSubIds = (user.assignedSubjects || []).map((s) => (typeof s === 'object' && s._id ? s._id.toString() : String(s)));
      const isAssigned = assignedSubIds.includes(subIdStr);

      if (!canManageAll && !isAssigned) {
        const err = new Error(`You are not authorized to create or manage assessments for subject '${subjectDoc.name}' (${subjectDoc.subjectCode})`);
        err.statusCode = 403;
        throw err;
      }
    }

    cleanSubjectId = subjectDoc._id;
    cleanSubjectCode = subjectDoc.subjectCode || '';
  } else {
    // If teacher is creating an exam with no subjectId and lacks canManageAllSubjects
    if (isTeacher && !isUpdate) {
      const canManageAll = Boolean(user.permissions && user.permissions.canManageAllSubjects);
      if (!canManageAll) {
        const err = new Error('Instructors must select an assigned academic subject for new assessments');
        err.statusCode = 403;
        throw err;
      }
    }
  }

  // 2. AUDIENCE TYPE VALIDATION
  const validAudienceTypes = [
    'ENTIRE_COLLEGE',
    'ACADEMIC_YEAR',
    'BRANCH',
    'SEMESTER',
    'SECTION',
    'BATCH',
    'COMBINATION_TARGET'
  ];

  const cleanAudienceType = validAudienceTypes.includes(audienceType) ? audienceType : 'ENTIRE_COLLEGE';

  // 3. TARGET ARRAY SANITIZATION
  const cleanTarget = {
    academicYears: sanitizeObjectIdArray(targetInput.academicYears),
    branches: sanitizeObjectIdArray(targetInput.branches),
    semesters: sanitizeObjectIdArray(targetInput.semesters),
    sections: sanitizeObjectIdArray(targetInput.sections),
    batches: sanitizeObjectIdArray(targetInput.batches)
  };

  // 4. AUDIENCE-SPECIFIC RULES
  if (cleanAudienceType === 'ENTIRE_COLLEGE') {
    if (isTeacher) {
      const canTargetEntire = Boolean(user.permissions && user.permissions.canTargetEntireCollege);
      if (!canTargetEntire) {
        const err = new Error('You do not have permission to publish assessments for the entire college');
        err.statusCode = 403;
        throw err;
      }
    }
    // Normalize target arrays to empty for ENTIRE_COLLEGE
    cleanTarget.academicYears = [];
    cleanTarget.branches = [];
    cleanTarget.semesters = [];
    cleanTarget.sections = [];
    cleanTarget.batches = [];
  } else if (cleanAudienceType === 'ACADEMIC_YEAR') {
    if (cleanTarget.academicYears.length === 0) {
      const err = new Error('Academic Year targeting requires at least one Academic Year to be selected');
      err.statusCode = 400;
      throw err;
    }
    cleanTarget.branches = [];
    cleanTarget.semesters = [];
    cleanTarget.sections = [];
    cleanTarget.batches = [];
  } else if (cleanAudienceType === 'BRANCH') {
    if (cleanTarget.branches.length === 0) {
      const err = new Error('Branch targeting requires at least one Branch to be selected');
      err.statusCode = 400;
      throw err;
    }
    cleanTarget.academicYears = [];
    cleanTarget.semesters = [];
    cleanTarget.sections = [];
    cleanTarget.batches = [];
  } else if (cleanAudienceType === 'SEMESTER') {
    if (cleanTarget.semesters.length === 0) {
      const err = new Error('Semester targeting requires at least one Semester to be selected');
      err.statusCode = 400;
      throw err;
    }
    cleanTarget.academicYears = [];
    cleanTarget.branches = [];
    cleanTarget.sections = [];
    cleanTarget.batches = [];
  } else if (cleanAudienceType === 'SECTION') {
    if (cleanTarget.sections.length === 0) {
      const err = new Error('Section targeting requires at least one Section to be selected');
      err.statusCode = 400;
      throw err;
    }
    cleanTarget.academicYears = [];
    cleanTarget.branches = [];
    cleanTarget.semesters = [];
    cleanTarget.batches = [];
  } else if (cleanAudienceType === 'BATCH') {
    if (cleanTarget.batches.length === 0) {
      const err = new Error('Batch targeting requires at least one Graduating Batch to be selected');
      err.statusCode = 400;
      throw err;
    }
    cleanTarget.academicYears = [];
    cleanTarget.branches = [];
    cleanTarget.semesters = [];
    cleanTarget.sections = [];
  } else if (cleanAudienceType === 'COMBINATION_TARGET') {
    const totalSelected =
      cleanTarget.academicYears.length +
      cleanTarget.branches.length +
      cleanTarget.semesters.length +
      cleanTarget.sections.length +
      cleanTarget.batches.length;

    if (totalSelected === 0) {
      const err = new Error('Combination targeting requires at least one target criterion (Year, Branch, Semester, Section, or Batch)');
      err.statusCode = 400;
      throw err;
    }
  }

  // 5. DATABASE EXISTENCE & ACTIVE STATUS VALIDATION FOR REFERENCED TARGET ENTITIES
  if (cleanTarget.academicYears.length > 0) {
    const found = await AcademicYear.find({ _id: { $in: cleanTarget.academicYears } });
    if (found.length !== cleanTarget.academicYears.length) {
      const err = new Error('One or more targeted Academic Years do not exist');
      err.statusCode = 400;
      throw err;
    }
    if (!isUpdate && found.some((x) => x.status !== 'ACTIVE')) {
      const err = new Error('Cannot target an inactive Academic Year');
      err.statusCode = 400;
      throw err;
    }
  }

  if (cleanTarget.branches.length > 0) {
    const found = await Branch.find({ _id: { $in: cleanTarget.branches } });
    if (found.length !== cleanTarget.branches.length) {
      const err = new Error('One or more targeted Branches do not exist');
      err.statusCode = 400;
      throw err;
    }
    if (!isUpdate && found.some((x) => x.status !== 'ACTIVE')) {
      const err = new Error('Cannot target an inactive Branch');
      err.statusCode = 400;
      throw err;
    }
  }

  if (cleanTarget.semesters.length > 0) {
    const found = await Semester.find({ _id: { $in: cleanTarget.semesters } });
    if (found.length !== cleanTarget.semesters.length) {
      const err = new Error('One or more targeted Semesters do not exist');
      err.statusCode = 400;
      throw err;
    }
    if (!isUpdate && found.some((x) => x.status !== 'ACTIVE')) {
      const err = new Error('Cannot target an inactive Semester');
      err.statusCode = 400;
      throw err;
    }
  }

  if (cleanTarget.sections.length > 0) {
    const found = await Section.find({ _id: { $in: cleanTarget.sections } });
    if (found.length !== cleanTarget.sections.length) {
      const err = new Error('One or more targeted Sections do not exist');
      err.statusCode = 400;
      throw err;
    }
    if (!isUpdate && found.some((x) => x.status !== 'ACTIVE')) {
      const err = new Error('Cannot target an inactive Section');
      err.statusCode = 400;
      throw err;
    }
  }

  if (cleanTarget.batches.length > 0) {
    const found = await Batch.find({ _id: { $in: cleanTarget.batches } });
    if (found.length !== cleanTarget.batches.length) {
      const err = new Error('One or more targeted Batches do not exist');
      err.statusCode = 400;
      throw err;
    }
    if (!isUpdate && found.some((x) => x.status !== 'ACTIVE')) {
      const err = new Error('Cannot target an inactive Batch');
      err.statusCode = 400;
      throw err;
    }
  }

  // 6. TEACHER ACADEMIC GROUP AUTHORIZATION VALIDATION
  if (isTeacher && cleanAudienceType !== 'ENTIRE_COLLEGE') {
    const teacherGroups = user.assignedAcademicGroups || {};

    const dimensions = [
      { key: 'academicYears', label: 'Academic Years' },
      { key: 'branches', label: 'Branches' },
      { key: 'semesters', label: 'Semesters' },
      { key: 'sections', label: 'Sections' },
      { key: 'batches', label: 'Batches' }
    ];

    for (const { key, label } of dimensions) {
      const targetedIds = cleanTarget[key] || [];
      if (targetedIds.length > 0) {
        const assignedIds = (teacherGroups[key] || []).map((x) =>
          typeof x === 'object' && x._id ? x._id.toString() : String(x)
        );

        if (assignedIds.length === 0) {
          const err = new Error(`You have no assigned ${label}. You cannot target ${label.toLowerCase()} in your assessments.`);
          err.statusCode = 403;
          throw err;
        }

        const unauthorizedIds = targetedIds.filter((id) => !assignedIds.includes(id));
        if (unauthorizedIds.length > 0) {
          const err = new Error(`Targeting for ${label} contains items outside your assigned academic groups.`);
          err.statusCode = 403;
          throw err;
        }
      }
    }
  }

  return {
    cleanSubjectId,
    cleanSubjectCode,
    cleanAudienceType,
    cleanTarget
  };
}

/**
 * Evaluates whether a student is eligible to see, start, or submit an exam.
 *
 * @param {Object} student - The student User document
 * @param {Object} exam - The Exam document (may contain populated or unpopulated target entities)
 * @returns {Promise<Object>} { eligible: Boolean, reason?: String, statusCode: Number }
 */
async function isStudentEligibleForExam(student, exam) {
  // 1. Basic entity validity
  if (!student) {
    return { eligible: false, reason: 'STUDENT_NOT_FOUND', statusCode: 404 };
  }
  if (student.status !== 'ACTIVE') {
    return { eligible: false, reason: 'STUDENT_INACTIVE', statusCode: 403 };
  }
  if (!exam) {
    return { eligible: false, reason: 'EXAM_NOT_FOUND', statusCode: 404 };
  }
  if (!exam.isPublished) {
    return { eligible: false, reason: 'EXAM_NOT_PUBLISHED', statusCode: 403 };
  }

  // 2. ENTIRE_COLLEGE audience type (or legacy/default)
  const audienceType = exam.audienceType || 'ENTIRE_COLLEGE';
  if (audienceType === 'ENTIRE_COLLEGE') {
    return { eligible: true };
  }

  const target = exam.target || {};

  // Helper matching functions for student fields
  // Branch Matcher: supports branch ObjectId or branch code string
  const checkBranchMatch = async (targetBranchIds) => {
    if (!targetBranchIds || targetBranchIds.length === 0) return true;
    const targetIdsStr = targetBranchIds.map((b) => (typeof b === 'object' && b._id ? b._id.toString() : String(b)));

    // If student has explicit branch ObjectId or string
    const studentBranchStr = String(student.branch || '').trim();
    if (!studentBranchStr) return false;

    // Check direct ObjectId match
    if (targetIdsStr.includes(studentBranchStr)) return true;

    // Lookup target branches to compare branch code
    const targetBranchDocs = await Branch.find({ _id: { $in: targetIdsStr } });
    const targetCodes = targetBranchDocs.map((b) => (b.code || '').toUpperCase());
    return targetCodes.includes(studentBranchStr.toUpperCase());
  };

  // Semester Matcher: supports semester ObjectId or semester number (1-12)
  const checkSemesterMatch = async (targetSemesterIds) => {
    if (!targetSemesterIds || targetSemesterIds.length === 0) return true;
    const targetIdsStr = targetSemesterIds.map((s) => (typeof s === 'object' && s._id ? s._id.toString() : String(s)));

    const studentSemStr = String(student.semester || '').trim();
    if (!studentSemStr) return false;

    // Check direct ObjectId match
    if (targetIdsStr.includes(studentSemStr)) return true;

    // Normalize student semester to numeric representation (e.g., "3", "Semester 3" -> 3)
    const semNumMatch = studentSemStr.match(/\d+/);
    const studentSemNum = semNumMatch ? parseInt(semNumMatch[0], 10) : null;

    if (studentSemNum !== null) {
      const targetSemDocs = await Semester.find({ _id: { $in: targetIdsStr } });
      const targetNumbers = targetSemDocs.map((s) => s.number);
      return targetNumbers.includes(studentSemNum);
    }

    return false;
  };

  // Section Matcher: supports section ObjectId or section name + branch context
  const checkSectionMatch = async (targetSectionIds) => {
    if (!targetSectionIds || targetSectionIds.length === 0) return true;
    const targetIdsStr = targetSectionIds.map((s) => (typeof s === 'object' && s._id ? s._id.toString() : String(s)));

    const studentSecStr = String(student.section || '').trim().toUpperCase();
    if (!studentSecStr) return false;

    // Check direct ObjectId match
    if (targetIdsStr.includes(studentSecStr)) return true;

    // Fetch target sections with populated branch to ensure branch-scoped accuracy
    const targetSectionDocs = await Section.find({ _id: { $in: targetIdsStr } }).populate('branch');
    const studentBranchStr = String(student.branch || '').trim().toUpperCase();

    for (const secDoc of targetSectionDocs) {
      const secName = (secDoc.name || '').toUpperCase();
      if (secName === studentSecStr) {
        // If section has branch attached, verify student branch matches section branch
        if (secDoc.branch) {
          const branchCode = (secDoc.branch.code || '').toUpperCase();
          const branchIdStr = secDoc.branch._id.toString();
          if (studentBranchStr === branchCode || studentBranchStr === branchIdStr) {
            return true;
          }
        } else {
          return true;
        }
      }
    }

    return false;
  };

  // Batch Matcher: supports batch ObjectId or batch name string (e.g. "2023-2027")
  const checkBatchMatch = async (targetBatchIds) => {
    if (!targetBatchIds || targetBatchIds.length === 0) return true;
    const targetIdsStr = targetBatchIds.map((b) => (typeof b === 'object' && b._id ? b._id.toString() : String(b)));

    const studentBatchStr = String(student.batch || '').trim().toUpperCase();
    if (!studentBatchStr) return false;

    // Check direct ObjectId match
    if (targetIdsStr.includes(studentBatchStr)) return true;

    // Lookup target batches to compare batch name
    const targetBatchDocs = await Batch.find({ _id: { $in: targetIdsStr } });
    const targetNames = targetBatchDocs.map((b) => (b.name || '').toUpperCase());
    return targetNames.includes(studentBatchStr);
  };

  // Academic Year Matcher:
  // Phase 2 students may not have an academicYear field. Fails safely if missing.
  const checkAcademicYearMatch = async (targetYearIds) => {
    if (!targetYearIds || targetYearIds.length === 0) return true;
    const targetIdsStr = targetYearIds.map((y) => (typeof y === 'object' && y._id ? y._id.toString() : String(y)));

    const studentYear = student.academicYear;
    if (!studentYear) return false; // Fails safely for legacy students without academic year

    const studentYearStr = typeof studentYear === 'object' && studentYear._id ? studentYear._id.toString() : String(studentYear).trim();
    if (targetIdsStr.includes(studentYearStr)) return true;

    const targetYearDocs = await AcademicYear.find({ _id: { $in: targetIdsStr } });
    const targetCodes = targetYearDocs.map((y) => (y.code || '').toUpperCase());
    return targetCodes.includes(studentYearStr.toUpperCase());
  };

  // 3. TARGETING EVALUATION
  if (audienceType === 'ACADEMIC_YEAR') {
    const isMatch = await checkAcademicYearMatch(target.academicYears);
    return isMatch ? { eligible: true } : { eligible: false, reason: 'ACADEMIC_YEAR_MISMATCH', statusCode: 403 };
  }

  if (audienceType === 'BRANCH') {
    const isMatch = await checkBranchMatch(target.branches);
    return isMatch ? { eligible: true } : { eligible: false, reason: 'BRANCH_MISMATCH', statusCode: 403 };
  }

  if (audienceType === 'SEMESTER') {
    const isMatch = await checkSemesterMatch(target.semesters);
    return isMatch ? { eligible: true } : { eligible: false, reason: 'SEMESTER_MISMATCH', statusCode: 403 };
  }

  if (audienceType === 'SECTION') {
    const isMatch = await checkSectionMatch(target.sections);
    return isMatch ? { eligible: true } : { eligible: false, reason: 'SECTION_MISMATCH', statusCode: 403 };
  }

  if (audienceType === 'BATCH') {
    const isMatch = await checkBatchMatch(target.batches);
    return isMatch ? { eligible: true } : { eligible: false, reason: 'BATCH_MISMATCH', statusCode: 403 };
  }

  if (audienceType === 'COMBINATION_TARGET') {
    // Non-empty fields must ALL match (AND between fields, OR within each field)
    if (target.academicYears && target.academicYears.length > 0) {
      const yearMatch = await checkAcademicYearMatch(target.academicYears);
      if (!yearMatch) return { eligible: false, reason: 'TARGET_MISMATCH', statusCode: 403 };
    }

    if (target.branches && target.branches.length > 0) {
      const branchMatch = await checkBranchMatch(target.branches);
      if (!branchMatch) return { eligible: false, reason: 'TARGET_MISMATCH', statusCode: 403 };
    }

    if (target.semesters && target.semesters.length > 0) {
      const semMatch = await checkSemesterMatch(target.semesters);
      if (!semMatch) return { eligible: false, reason: 'TARGET_MISMATCH', statusCode: 403 };
    }

    if (target.sections && target.sections.length > 0) {
      const secMatch = await checkSectionMatch(target.sections);
      if (!secMatch) return { eligible: false, reason: 'TARGET_MISMATCH', statusCode: 403 };
    }

    if (target.batches && target.batches.length > 0) {
      const batchMatch = await checkBatchMatch(target.batches);
      if (!batchMatch) return { eligible: false, reason: 'TARGET_MISMATCH', statusCode: 403 };
    }

    return { eligible: true };
  }

  return { eligible: true };
}

module.exports = {
  validateExamTargeting,
  isStudentEligibleForExam,
  sanitizeObjectIdArray
};
