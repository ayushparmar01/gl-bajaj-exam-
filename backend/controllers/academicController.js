/**
 * Academic Structure & Subject Master Controller (Admin Only) - GLB ExamSphere
 * Provides full master CRUD for Academic Years, Branches, Semesters, Sections,
 * Batches, and Subjects with referential safety and single-current-year enforcement.
 */

const AcademicYear = require('../models/AcademicYear');
const Branch = require('../models/Branch');
const Semester = require('../models/Semester');
const Section = require('../models/Section');
const Batch = require('../models/Batch');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Exam = require('../models/Exam');
const mongoose = require('mongoose');

// =============================================================================
// ACADEMIC YEARS
// =============================================================================

exports.getAcademicYears = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }
    const years = await AcademicYear.find(query).sort({ isCurrent: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: years.length, data: years });
  } catch (err) {
    next(err);
  }
};

exports.createAcademicYear = async (req, res, next) => {
  try {
    const { name, code, startDate, endDate, isCurrent, status } = req.body;
    const cleanName = (name || '').trim();
    const cleanCode = (code || '').trim().toUpperCase();

    if (!cleanName || !cleanCode) {
      return res.status(400).json({ success: false, message: 'Please provide academic year name and code' });
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ success: false, message: 'End date must be chronologically after start date' });
    }

    const existing = await AcademicYear.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Academic year code '${cleanCode}' already exists` });
    }

    if (Boolean(isCurrent)) {
      await AcademicYear.updateMany({}, { isCurrent: false });
    }

    const academicYear = await AcademicYear.create({
      name: cleanName,
      code: cleanCode,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isCurrent: Boolean(isCurrent),
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    res.status(201).json({ success: true, message: 'Academic Year created successfully', data: academicYear });
  } catch (err) {
    next(err);
  }
};

exports.getAcademicYearById = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic Year not found' });
    }
    res.status(200).json({ success: true, data: year });
  } catch (err) {
    next(err);
  }
};

exports.updateAcademicYear = async (req, res, next) => {
  try {
    const { name, code, startDate, endDate, isCurrent, status } = req.body;
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic Year not found' });
    }

    if (code !== undefined) {
      const cleanCode = String(code).trim().toUpperCase();
      if (!cleanCode) return res.status(400).json({ success: false, message: 'Code cannot be empty' });
      if (cleanCode !== year.code) {
        const codeExists = await AcademicYear.findOne({ code: cleanCode, _id: { $ne: year._id } });
        if (codeExists) return res.status(400).json({ success: false, message: `Code '${cleanCode}' is already in use` });
        year.code = cleanCode;
      }
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      year.name = cleanName;
    }

    if (startDate !== undefined) year.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) year.endDate = endDate ? new Date(endDate) : null;

    if (year.startDate && year.endDate && new Date(year.endDate) <= new Date(year.startDate)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    if (isCurrent !== undefined && Boolean(isCurrent) && !year.isCurrent) {
      await AcademicYear.updateMany({ _id: { $ne: year._id } }, { isCurrent: false });
      year.isCurrent = true;
    } else if (isCurrent !== undefined) {
      year.isCurrent = Boolean(isCurrent);
    }

    if (status !== undefined && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      year.status = status.toUpperCase();
    }

    await year.save();
    res.status(200).json({ success: true, message: 'Academic Year updated successfully', data: year });
  } catch (err) {
    next(err);
  }
};

exports.toggleAcademicYearStatus = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return res.status(404).json({ success: false, message: 'Academic Year not found' });
    year.status = year.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await year.save();
    res.status(200).json({ success: true, message: `Academic Year ${year.status === 'ACTIVE' ? 'activated' : 'deactivated'}`, data: year });
  } catch (err) {
    next(err);
  }
};

exports.deleteAcademicYear = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return res.status(404).json({ success: false, message: 'Academic Year not found' });

    const referencedTeachers = await User.countDocuments({
      'assignedAcademicGroups.academicYears': year._id
    });

    if (referencedTeachers > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Academic Year because it is assigned to faculty members. Please deactivate it instead.'
      });
    }

    await year.deleteOne();
    res.status(200).json({ success: true, message: 'Academic Year deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// BRANCHES
// =============================================================================

exports.getBranches = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }
    const branches = await Branch.find(query).sort({ code: 1 });
    res.status(200).json({ success: true, count: branches.length, data: branches });
  } catch (err) {
    next(err);
  }
};

exports.createBranch = async (req, res, next) => {
  try {
    const { name, code, status } = req.body;
    const cleanName = (name || '').trim();
    const cleanCode = (code || '').trim().toUpperCase();

    if (!cleanName || !cleanCode) {
      return res.status(400).json({ success: false, message: 'Please provide branch name and code' });
    }

    const existing = await Branch.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Branch code '${cleanCode}' already exists` });
    }

    const branch = await Branch.create({
      name: cleanName,
      code: cleanCode,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    res.status(201).json({ success: true, message: 'Branch created successfully', data: branch });
  } catch (err) {
    next(err);
  }
};

exports.getBranchById = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.status(200).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

exports.updateBranch = async (req, res, next) => {
  try {
    const { name, code, status } = req.body;
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    if (code !== undefined) {
      const cleanCode = String(code).trim().toUpperCase();
      if (!cleanCode) return res.status(400).json({ success: false, message: 'Code cannot be empty' });
      if (cleanCode !== branch.code) {
        const codeExists = await Branch.findOne({ code: cleanCode, _id: { $ne: branch._id } });
        if (codeExists) return res.status(400).json({ success: false, message: `Code '${cleanCode}' is already in use` });
        branch.code = cleanCode;
      }
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      branch.name = cleanName;
    }

    if (status !== undefined && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      branch.status = status.toUpperCase();
    }

    await branch.save();
    res.status(200).json({ success: true, message: 'Branch updated successfully', data: branch });
  } catch (err) {
    next(err);
  }
};

exports.toggleBranchStatus = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    branch.status = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await branch.save();
    res.status(200).json({ success: true, message: `Branch ${branch.status === 'ACTIVE' ? 'activated' : 'deactivated'}`, data: branch });
  } catch (err) {
    next(err);
  }
};

exports.deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    const [subjectRefs, sectionRefs, teacherRefs, studentRefs] = await Promise.all([
      Subject.countDocuments({ branch: branch._id }),
      Section.countDocuments({ branch: branch._id }),
      User.countDocuments({ 'assignedAcademicGroups.branches': branch._id }),
      User.countDocuments({ branch: branch.code })
    ]);

    if (subjectRefs > 0 || sectionRefs > 0 || teacherRefs > 0 || studentRefs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Branch because it is referenced by subjects, sections, students, or faculty. Please deactivate it instead.'
      });
    }

    await branch.deleteOne();
    res.status(200).json({ success: true, message: 'Branch deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// SEMESTERS
// =============================================================================

exports.getSemesters = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }
    const semesters = await Semester.find(query).sort({ number: 1 });
    res.status(200).json({ success: true, count: semesters.length, data: semesters });
  } catch (err) {
    next(err);
  }
};

exports.createSemester = async (req, res, next) => {
  try {
    const { number, name, status } = req.body;
    const num = parseInt(number, 10);
    const cleanName = (name || '').trim() || `Semester ${num}`;

    if (isNaN(num) || num < 1 || num > 12) {
      return res.status(400).json({ success: false, message: 'Please provide a valid semester number between 1 and 12' });
    }

    const existing = await Semester.findOne({ number: num });
    if (existing) {
      return res.status(400).json({ success: false, message: `Semester number '${num}' already exists` });
    }

    const semester = await Semester.create({
      number: num,
      name: cleanName,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    res.status(201).json({ success: true, message: 'Semester created successfully', data: semester });
  } catch (err) {
    next(err);
  }
};

exports.getSemesterById = async (req, res, next) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ success: false, message: 'Semester not found' });
    res.status(200).json({ success: true, data: semester });
  } catch (err) {
    next(err);
  }
};

exports.updateSemester = async (req, res, next) => {
  try {
    const { number, name, status } = req.body;
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ success: false, message: 'Semester not found' });

    if (number !== undefined) {
      const num = parseInt(number, 10);
      if (isNaN(num) || num < 1 || num > 12) {
        return res.status(400).json({ success: false, message: 'Semester number must be between 1 and 12' });
      }
      if (num !== semester.number) {
        const numExists = await Semester.findOne({ number: num, _id: { $ne: semester._id } });
        if (numExists) return res.status(400).json({ success: false, message: `Semester '${num}' already exists` });
        semester.number = num;
      }
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) return res.status(400).json({ success: false, message: 'Semester name cannot be empty' });
      semester.name = cleanName;
    }

    if (status !== undefined && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      semester.status = status.toUpperCase();
    }

    await semester.save();
    res.status(200).json({ success: true, message: 'Semester updated successfully', data: semester });
  } catch (err) {
    next(err);
  }
};

exports.toggleSemesterStatus = async (req, res, next) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ success: false, message: 'Semester not found' });
    semester.status = semester.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await semester.save();
    res.status(200).json({ success: true, message: `Semester ${semester.status === 'ACTIVE' ? 'activated' : 'deactivated'}`, data: semester });
  } catch (err) {
    next(err);
  }
};

exports.deleteSemester = async (req, res, next) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ success: false, message: 'Semester not found' });

    const [subjectRefs, teacherRefs, studentRefs] = await Promise.all([
      Subject.countDocuments({ semester: semester._id }),
      User.countDocuments({ 'assignedAcademicGroups.semesters': semester._id }),
      User.countDocuments({ semester: String(semester.number) })
    ]);

    if (subjectRefs > 0 || teacherRefs > 0 || studentRefs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Semester because it is referenced by subjects, faculty assignments, or students. Please deactivate it instead.'
      });
    }

    await semester.deleteOne();
    res.status(200).json({ success: true, message: 'Semester deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// SECTIONS
// =============================================================================

exports.getSections = async (req, res, next) => {
  try {
    const { status, branch } = req.query;
    const query = {};
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      query.branch = branch;
    }
    const sections = await Section.find(query).populate('branch', 'name code').sort({ name: 1 });
    res.status(200).json({ success: true, count: sections.length, data: sections });
  } catch (err) {
    next(err);
  }
};

exports.createSection = async (req, res, next) => {
  try {
    const { name, branch, status } = req.body;
    const cleanName = (name || '').trim().toUpperCase();

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Please provide section name (e.g. A, B, C)' });
    }

    let branchId = null;
    if (branch) {
      if (!mongoose.Types.ObjectId.isValid(branch)) {
        return res.status(400).json({ success: false, message: 'Invalid branch ID format' });
      }
      const branchObj = await Branch.findById(branch);
      if (!branchObj) {
        return res.status(400).json({ success: false, message: 'Referenced branch not found' });
      }
      branchId = branchObj._id;
    }

    const existing = await Section.findOne({ name: cleanName, branch: branchId });
    if (existing) {
      return res.status(400).json({ success: false, message: `Section '${cleanName}' already exists for this branch` });
    }

    const section = await Section.create({
      name: cleanName,
      branch: branchId,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populatedSection = await Section.findById(section._id).populate('branch', 'name code');
    res.status(201).json({ success: true, message: 'Section created successfully', data: populatedSection });
  } catch (err) {
    next(err);
  }
};

exports.getSectionById = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id).populate('branch', 'name code');
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.status(200).json({ success: true, data: section });
  } catch (err) {
    next(err);
  }
};

exports.updateSection = async (req, res, next) => {
  try {
    const { name, branch, status } = req.body;
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    let newName = section.name;
    let newBranch = section.branch;

    if (name !== undefined) {
      const cleanName = String(name).trim().toUpperCase();
      if (!cleanName) return res.status(400).json({ success: false, message: 'Section name cannot be empty' });
      newName = cleanName;
    }

    if (branch !== undefined) {
      if (branch) {
        if (!mongoose.Types.ObjectId.isValid(branch)) {
          return res.status(400).json({ success: false, message: 'Invalid branch ID' });
        }
        const branchObj = await Branch.findById(branch);
        if (!branchObj) return res.status(400).json({ success: false, message: 'Referenced branch not found' });
        newBranch = branchObj._id;
      } else {
        newBranch = null;
      }
    }

    const duplicateCheck = await Section.findOne({
      name: newName,
      branch: newBranch,
      _id: { $ne: section._id }
    });
    if (duplicateCheck) {
      return res.status(400).json({ success: false, message: `Section '${newName}' already exists for this branch` });
    }

    section.name = newName;
    section.branch = newBranch;

    if (status !== undefined && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      section.status = status.toUpperCase();
    }

    await section.save();
    const populated = await Section.findById(section._id).populate('branch', 'name code');
    res.status(200).json({ success: true, message: 'Section updated successfully', data: populated });
  } catch (err) {
    next(err);
  }
};

exports.toggleSectionStatus = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    section.status = section.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await section.save();
    res.status(200).json({ success: true, message: `Section ${section.status === 'ACTIVE' ? 'activated' : 'deactivated'}`, data: section });
  } catch (err) {
    next(err);
  }
};

exports.deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    const [teacherRefs, studentRefs] = await Promise.all([
      User.countDocuments({ 'assignedAcademicGroups.sections': section._id }),
      User.countDocuments({ section: section.name })
    ]);

    if (teacherRefs > 0 || studentRefs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Section because it is referenced by faculty assignments or students. Please deactivate it instead.'
      });
    }

    await section.deleteOne();
    res.status(200).json({ success: true, message: 'Section deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// BATCHES
// =============================================================================

exports.getBatches = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }
    const batches = await Batch.find(query).sort({ startYear: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: batches.length, data: batches });
  } catch (err) {
    next(err);
  }
};

exports.createBatch = async (req, res, next) => {
  try {
    const { name, startYear, endYear, status } = req.body;
    const cleanName = (name || '').trim();

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Please provide batch name (e.g. 2023-2027)' });
    }

    const sYear = startYear ? parseInt(startYear, 10) : null;
    const eYear = endYear ? parseInt(endYear, 10) : null;

    if (sYear && eYear && eYear <= sYear) {
      return res.status(400).json({ success: false, message: 'End year must be greater than start year' });
    }

    const existing = await Batch.findOne({ name: cleanName });
    if (existing) {
      return res.status(400).json({ success: false, message: `Batch '${cleanName}' already exists` });
    }

    const batch = await Batch.create({
      name: cleanName,
      startYear: sYear,
      endYear: eYear,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    res.status(201).json({ success: true, message: 'Batch created successfully', data: batch });
  } catch (err) {
    next(err);
  }
};

exports.getBatchById = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.status(200).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
};

exports.updateBatch = async (req, res, next) => {
  try {
    const { name, startYear, endYear, status } = req.body;
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) return res.status(400).json({ success: false, message: 'Batch name cannot be empty' });
      if (cleanName !== batch.name) {
        const nameExists = await Batch.findOne({ name: cleanName, _id: { $ne: batch._id } });
        if (nameExists) return res.status(400).json({ success: false, message: `Batch '${cleanName}' already exists` });
        batch.name = cleanName;
      }
    }

    if (startYear !== undefined) batch.startYear = startYear ? parseInt(startYear, 10) : null;
    if (endYear !== undefined) batch.endYear = endYear ? parseInt(endYear, 10) : null;

    if (batch.startYear && batch.endYear && batch.endYear <= batch.startYear) {
      return res.status(400).json({ success: false, message: 'End year must be after start year' });
    }

    if (status !== undefined && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      batch.status = status.toUpperCase();
    }

    await batch.save();
    res.status(200).json({ success: true, message: 'Batch updated successfully', data: batch });
  } catch (err) {
    next(err);
  }
};

exports.toggleBatchStatus = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    batch.status = batch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await batch.save();
    res.status(200).json({ success: true, message: `Batch ${batch.status === 'ACTIVE' ? 'activated' : 'deactivated'}`, data: batch });
  } catch (err) {
    next(err);
  }
};

exports.deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const [teacherRefs, studentRefs] = await Promise.all([
      User.countDocuments({ 'assignedAcademicGroups.batches': batch._id }),
      User.countDocuments({ batch: batch.name })
    ]);

    if (teacherRefs > 0 || studentRefs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Batch because it is referenced by faculty assignments or student cohorts. Please deactivate it instead.'
      });
    }

    await batch.deleteOne();
    res.status(200).json({ success: true, message: 'Batch deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// SUBJECTS
// =============================================================================

exports.getSubjects = async (req, res, next) => {
  try {
    const { status, branch, semester, search } = req.query;
    const query = {};
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      query.branch = branch;
    }
    if (semester && mongoose.Types.ObjectId.isValid(semester)) {
      query.semester = semester;
    }
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { subjectCode: { $regex: cleanSearch, $options: 'i' } }
      ];
    }
    const subjects = await Subject.find(query)
      .populate('branch', 'name code')
      .populate('semester', 'number name')
      .sort({ subjectCode: 1 });
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (err) {
    next(err);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const { name, subjectCode, branch, semester, description, status } = req.body;
    const cleanName = (name || '').trim();
    const cleanCode = (subjectCode || '').trim().toUpperCase();

    if (!cleanName || !cleanCode) {
      return res.status(400).json({ success: false, message: 'Please provide subject name and code' });
    }

    let branchId = null;
    if (branch) {
      if (!mongoose.Types.ObjectId.isValid(branch)) {
        return res.status(400).json({ success: false, message: 'Invalid branch ID format' });
      }
      const branchObj = await Branch.findById(branch);
      if (!branchObj) return res.status(400).json({ success: false, message: 'Referenced branch not found' });
      branchId = branchObj._id;
    }

    let semesterId = null;
    if (semester) {
      if (!mongoose.Types.ObjectId.isValid(semester)) {
        return res.status(400).json({ success: false, message: 'Invalid semester ID format' });
      }
      const semObj = await Semester.findById(semester);
      if (!semObj) return res.status(400).json({ success: false, message: 'Referenced semester not found' });
      semesterId = semObj._id;
    }

    const existing = await Subject.findOne({ subjectCode: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Subject code '${cleanCode}' already exists` });
    }

    const subject = await Subject.create({
      name: cleanName,
      subjectCode: cleanCode,
      branch: branchId,
      semester: semesterId,
      description: description ? String(description).trim() : '',
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await Subject.findById(subject._id)
      .populate('branch', 'name code')
      .populate('semester', 'number name');

    res.status(201).json({ success: true, message: 'Subject created successfully', data: populated });
  } catch (err) {
    next(err);
  }
};

exports.getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('branch', 'name code')
      .populate('semester', 'number name');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.status(200).json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const { name, subjectCode, branch, semester, description, status } = req.body;
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    if (subjectCode !== undefined) {
      const cleanCode = String(subjectCode).trim().toUpperCase();
      if (!cleanCode) return res.status(400).json({ success: false, message: 'Subject code cannot be empty' });
      if (cleanCode !== subject.subjectCode) {
        const codeExists = await Subject.findOne({ subjectCode: cleanCode, _id: { $ne: subject._id } });
        if (codeExists) return res.status(400).json({ success: false, message: `Subject code '${cleanCode}' already exists` });
        subject.subjectCode = cleanCode;
      }
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) return res.status(400).json({ success: false, message: 'Subject name cannot be empty' });
      subject.name = cleanName;
    }

    if (branch !== undefined) {
      if (branch) {
        if (!mongoose.Types.ObjectId.isValid(branch)) return res.status(400).json({ success: false, message: 'Invalid branch ID' });
        const branchObj = await Branch.findById(branch);
        if (!branchObj) return res.status(400).json({ success: false, message: 'Referenced branch not found' });
        subject.branch = branchObj._id;
      } else {
        subject.branch = null;
      }
    }

    if (semester !== undefined) {
      if (semester) {
        if (!mongoose.Types.ObjectId.isValid(semester)) return res.status(400).json({ success: false, message: 'Invalid semester ID' });
        const semObj = await Semester.findById(semester);
        if (!semObj) return res.status(400).json({ success: false, message: 'Referenced semester not found' });
        subject.semester = semObj._id;
      } else {
        subject.semester = null;
      }
    }

    if (description !== undefined) subject.description = String(description).trim();
    if (status !== undefined && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      subject.status = status.toUpperCase();
    }

    await subject.save();
    const populated = await Subject.findById(subject._id)
      .populate('branch', 'name code')
      .populate('semester', 'number name');

    res.status(200).json({ success: true, message: 'Subject updated successfully', data: populated });
  } catch (err) {
    next(err);
  }
};

exports.toggleSubjectStatus = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    subject.status = subject.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await subject.save();
    res.status(200).json({ success: true, message: `Subject ${subject.status === 'ACTIVE' ? 'activated' : 'deactivated'}`, data: subject });
  } catch (err) {
    next(err);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    const [teacherRefs, examRefs] = await Promise.all([
      User.countDocuments({ assignedSubjects: subject._id }),
      Exam.countDocuments({ subjectId: subject._id })
    ]);

    if (teacherRefs > 0 || examRefs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Subject because it is assigned to faculty or associated with existing exams. Please deactivate it instead.'
      });
    }

    await subject.deleteOne();
    res.status(200).json({ success: true, message: 'Subject deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// UNIFIED MASTER OPTIONS (Active records for dropdowns & assignments)
// =============================================================================

exports.getMasterOptions = async (req, res, next) => {
  try {
    const [academicYears, branches, semesters, sections, batches, subjects] = await Promise.all([
      AcademicYear.find({ status: 'ACTIVE' }).sort({ isCurrent: -1, code: 1 }),
      Branch.find({ status: 'ACTIVE' }).sort({ code: 1 }),
      Semester.find({ status: 'ACTIVE' }).sort({ number: 1 }),
      Section.find({ status: 'ACTIVE' }).populate('branch', 'code').sort({ name: 1 }),
      Batch.find({ status: 'ACTIVE' }).sort({ startYear: -1 }),
      Subject.find({ status: 'ACTIVE' }).populate('branch', 'code').populate('semester', 'number').sort({ subjectCode: 1 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        academicYears,
        branches,
        semesters,
        sections,
        batches,
        subjects
      }
    });
  } catch (err) {
    next(err);
  }
};
