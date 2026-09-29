/**
 * Teacher Management Controller (Admin Only) - GLB ExamSphere
 * Provides teacher provisioning, listing with server-side search & filters,
 * secure editing, password reset, account status toggle, and safe deletion.
 */

const User = require('../models/User');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const Branch = require('../models/Branch');
const Semester = require('../models/Semester');
const Section = require('../models/Section');
const Batch = require('../models/Batch');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { isValidEmail } = require('../middleware/validator');

/**
 * Generate a cryptographically secure, random temporary password
 */
const generateSecureTemporaryPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let password = '';
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
};

// @desc    Get all teachers with server-side pagination, search & filters
// @route   GET /api/admin/teachers
// @access  Private/Admin
exports.getTeachers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      department = '',
      status = ''
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Filter by role TEACHER
    const query = { role: 'TEACHER' };

    if (department && department !== 'ALL') {
      query.department = new RegExp(`^${department.trim()}$`, 'i');
    }

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
        { employeeId: { $regex: cleanSearch, $options: 'i' } },
        { department: { $regex: cleanSearch, $options: 'i' } },
        { phone: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const [teachers, totalCount] = await Promise.all([
      User.find(query)
        .select('-password -otp -otpExpiry -otpAttempts -otpLastSentAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query)
    ]);

    // Attach count of exams created by each teacher
    const teachersWithMeta = await Promise.all(
      teachers.map(async (teacher) => {
        const examsCount = await Exam.countDocuments({ createdBy: teacher._id });
        return {
          ...teacher.toObject(),
          examsCount
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    res.status(200).json({
      success: true,
      count: teachersWithMeta.length,
      totalCount,
      page: pageNum,
      totalPages,
      data: teachersWithMeta
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single teacher details by ID
// @route   GET /api/admin/teachers/:id
// @access  Private/Admin
exports.getTeacherById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }

    const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' })
      .select('-password -otp -otpExpiry -otpAttempts -otpLastSentAt');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher account not found'
      });
    }

    const exams = await Exam.find({ createdBy: teacher._id })
      .select('title duration totalMarks passMarks isPublished isScheduled createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...teacher.toObject(),
        examsCount: exams.length,
        exams
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Teacher account (Admin only)
// @route   POST /api/admin/teachers
// @access  Private/Admin
exports.createTeacher = async (req, res, next) => {
  try {
    const {
      name,
      email,
      employeeId,
      department,
      phone,
      password,
      status
    } = req.body;

    const cleanName = name ? name.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanEmpId = employeeId ? String(employeeId).trim() : '';
    const cleanDept = department ? String(department).trim() : '';
    const cleanPhone = phone ? String(phone).trim() : '';

    if (!cleanName || !cleanEmail || !cleanEmpId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide teacher name, email, and employee/faculty ID'
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check for existing duplicate email or employeeId
    const existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        { employeeId: cleanEmpId }
      ]
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === cleanEmail) {
        return res.status(400).json({
          success: false,
          message: `Email '${cleanEmail}' is already registered`
        });
      }
      if (existingUser.employeeId && existingUser.employeeId.toLowerCase() === cleanEmpId.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: `Employee ID '${cleanEmpId}' is already in use`
        });
      }
    }

    const rawPassword = password && String(password).trim().length >= 6
      ? String(password).trim()
      : generateSecureTemporaryPassword();

    // SECURITY: Force role to TEACHER regardless of request body
    const teacher = await User.create({
      name: cleanName,
      email: cleanEmail,
      employeeId: cleanEmpId,
      department: cleanDept,
      phone: cleanPhone,
      password: rawPassword, // Automatically hashed by UserSchema pre-save hook
      role: 'TEACHER',
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      isVerified: true
    });

    res.status(201).json({
      success: true,
      message: 'Teacher account created successfully',
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        employeeId: teacher.employeeId,
        department: teacher.department,
        phone: teacher.phone,
        role: teacher.role,
        status: teacher.status,
        temporaryPassword: rawPassword
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `Duplicate value entered for ${field}. Please provide a unique value.`
      });
    }
    next(error);
  }
};

// @desc    Update Teacher details (Admin only)
// @route   PUT /api/admin/teachers/:id
// @access  Private/Admin
exports.updateTeacher = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }

    const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher account not found'
      });
    }

    const {
      name,
      email,
      employeeId,
      department,
      phone,
      status
    } = req.body;

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email address format' });
      }
      if (cleanEmail !== teacher.email) {
        const emailExists = await User.findOne({ email: cleanEmail, _id: { $ne: teacher._id } });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'Email address is already in use by another user' });
        }
        teacher.email = cleanEmail;
      }
    }

    if (employeeId !== undefined) {
      const cleanEmpId = String(employeeId).trim();
      if (!cleanEmpId) {
        return res.status(400).json({ success: false, message: 'Employee ID cannot be empty' });
      }
      if (cleanEmpId !== teacher.employeeId) {
        const empIdExists = await User.findOne({ employeeId: cleanEmpId, _id: { $ne: teacher._id } });
        if (empIdExists) {
          return res.status(400).json({ success: false, message: 'Employee ID is already in use by another teacher' });
        }
        teacher.employeeId = cleanEmpId;
      }
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) {
        return res.status(400).json({ success: false, message: 'Teacher name cannot be empty' });
      }
      teacher.name = cleanName;
    }

    if (department !== undefined) teacher.department = String(department).trim();
    if (phone !== undefined) teacher.phone = String(phone).trim();
    if (status !== undefined && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      teacher.status = status.toUpperCase();
    }

    // SECURITY: Ensure role remains TEACHER and sensitive fields are untouched
    teacher.role = 'TEACHER';

    await teacher.save();

    res.status(200).json({
      success: true,
      message: 'Teacher details updated successfully',
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        employeeId: teacher.employeeId,
        department: teacher.department,
        phone: teacher.phone,
        role: teacher.role,
        status: teacher.status
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate value conflict occurred during update'
      });
    }
    next(error);
  }
};

// @desc    Toggle teacher status (ACTIVE / INACTIVE) (Admin only)
// @route   PATCH /api/admin/teachers/:id/status
// @access  Private/Admin
exports.toggleTeacherStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }

    const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher account not found'
      });
    }

    teacher.status = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await teacher.save();

    res.status(200).json({
      success: true,
      message: `Teacher account ${teacher.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        employeeId: teacher.employeeId,
        status: teacher.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Teacher Password (Admin only)
// @route   POST /api/admin/teachers/:id/reset-password
// @access  Private/Admin
exports.resetTeacherPassword = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }

    const { newPassword } = req.body;

    const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher account not found'
      });
    }

    const passwordToSet = (newPassword && String(newPassword).trim().length >= 6)
      ? String(newPassword).trim()
      : generateSecureTemporaryPassword();

    teacher.password = passwordToSet; // Encrypted by UserSchema pre-save hook
    teacher.otp = null;
    teacher.otpExpiry = null;
    teacher.otpAttempts = 0;
    await teacher.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully for teacher',
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        employeeId: teacher.employeeId,
        temporaryPassword: passwordToSet
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Safe Delete Teacher Account (Admin only)
// @route   DELETE /api/admin/teachers/:id
// @access  Private/Admin
exports.deleteTeacher = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }

    const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher account not found'
      });
    }

    // Safety check: verify if teacher has created existing exams
    const examsCount = await Exam.countDocuments({ createdBy: teacher._id });
    if (examsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete teacher who has created ${examsCount} exam(s). Please deactivate the teacher account instead to preserve academic records and examination history.`
      });
    }

    await teacher.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Teacher account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get distinct departments for filtering (Admin only)
// @route   GET /api/admin/teachers/filters/options
// @access  Private/Admin
exports.getFilterOptions = async (req, res, next) => {
  try {
    const departments = await User.distinct('department', {
      role: 'TEACHER',
      department: { $nin: ['', null] }
    });

    res.status(200).json({
      success: true,
      data: {
        departments: departments.sort()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Teacher Assignments & Permissions (Admin only)
// @route   GET /api/admin/teachers/:id/assignments
// @access  Private/Admin
exports.getTeacherAssignments = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID format' });
    }

    const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' })
      .populate('assignedSubjects', 'name subjectCode branch semester status')
      .populate('assignedAcademicGroups.academicYears', 'name code isCurrent status')
      .populate('assignedAcademicGroups.branches', 'name code status')
      .populate('assignedAcademicGroups.semesters', 'number name status')
      .populate('assignedAcademicGroups.sections', 'name branch status')
      .populate('assignedAcademicGroups.batches', 'name startYear endYear status');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher account not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        employeeId: teacher.employeeId,
        department: teacher.department,
        assignedSubjects: teacher.assignedSubjects || [],
        assignedAcademicGroups: teacher.assignedAcademicGroups || {
          academicYears: [],
          branches: [],
          semesters: [],
          sections: [],
          batches: []
        },
        permissions: teacher.permissions || {
          canTargetEntireCollege: false,
          canManageAllSubjects: false
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Teacher Assignments & Permissions (Admin only)
// @route   PUT /api/admin/teachers/:id/assignments
// @access  Private/Admin
exports.updateTeacherAssignments = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID format' });
    }

    const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher account not found' });
    }

    const { assignedSubjects, assignedAcademicGroups, permissions } = req.body;

    // Validate Subjects
    if (assignedSubjects !== undefined) {
      if (!Array.isArray(assignedSubjects)) {
        return res.status(400).json({ success: false, message: 'assignedSubjects must be an array of IDs' });
      }
      const validSubjectIds = [...new Set(assignedSubjects.filter(id => mongoose.Types.ObjectId.isValid(id)))];
      const existingSubjects = await Subject.find({ _id: { $in: validSubjectIds } }).select('_id');
      teacher.assignedSubjects = existingSubjects.map(s => s._id);
    }

    // Validate Academic Groups
    if (assignedAcademicGroups && typeof assignedAcademicGroups === 'object') {
      const { academicYears, branches, semesters, sections, batches } = assignedAcademicGroups;

      if (!teacher.assignedAcademicGroups) {
        teacher.assignedAcademicGroups = { academicYears: [], branches: [], semesters: [], sections: [], batches: [] };
      }

      if (Array.isArray(academicYears)) {
        const validYearIds = [...new Set(academicYears.filter(id => mongoose.Types.ObjectId.isValid(id)))];
        const existingYears = await AcademicYear.find({ _id: { $in: validYearIds } }).select('_id');
        teacher.assignedAcademicGroups.academicYears = existingYears.map(y => y._id);
      }

      if (Array.isArray(branches)) {
        const validBranchIds = [...new Set(branches.filter(id => mongoose.Types.ObjectId.isValid(id)))];
        const existingBranches = await Branch.find({ _id: { $in: validBranchIds } }).select('_id');
        teacher.assignedAcademicGroups.branches = existingBranches.map(b => b._id);
      }

      if (Array.isArray(semesters)) {
        const validSemIds = [...new Set(semesters.filter(id => mongoose.Types.ObjectId.isValid(id)))];
        const existingSemesters = await Semester.find({ _id: { $in: validSemIds } }).select('_id');
        teacher.assignedAcademicGroups.semesters = existingSemesters.map(s => s._id);
      }

      if (Array.isArray(sections)) {
        const validSecIds = [...new Set(sections.filter(id => mongoose.Types.ObjectId.isValid(id)))];
        const existingSections = await Section.find({ _id: { $in: validSecIds } }).select('_id');
        teacher.assignedAcademicGroups.sections = existingSections.map(s => s._id);
      }

      if (Array.isArray(batches)) {
        const validBatchIds = [...new Set(batches.filter(id => mongoose.Types.ObjectId.isValid(id)))];
        const existingBatches = await Batch.find({ _id: { $in: validBatchIds } }).select('_id');
        teacher.assignedAcademicGroups.batches = existingBatches.map(b => b._id);
      }
    }

    // Permissions
    if (permissions && typeof permissions === 'object') {
      if (!teacher.permissions) {
        teacher.permissions = { canTargetEntireCollege: false, canManageAllSubjects: false };
      }
      if (permissions.canTargetEntireCollege !== undefined) {
        teacher.permissions.canTargetEntireCollege = Boolean(permissions.canTargetEntireCollege);
      }
      if (permissions.canManageAllSubjects !== undefined) {
        teacher.permissions.canManageAllSubjects = Boolean(permissions.canManageAllSubjects);
      }
    }

    await teacher.save();

    const populated = await User.findById(teacher._id)
      .populate('assignedSubjects', 'name subjectCode branch semester status')
      .populate('assignedAcademicGroups.academicYears', 'name code isCurrent status')
      .populate('assignedAcademicGroups.branches', 'name code status')
      .populate('assignedAcademicGroups.semesters', 'number name status')
      .populate('assignedAcademicGroups.sections', 'name branch status')
      .populate('assignedAcademicGroups.batches', 'name startYear endYear status');

    res.status(200).json({
      success: true,
      message: 'Teacher assignments and permissions updated successfully',
      data: {
        id: populated._id,
        name: populated.name,
        email: populated.email,
        employeeId: populated.employeeId,
        assignedSubjects: populated.assignedSubjects || [],
        assignedAcademicGroups: populated.assignedAcademicGroups || {},
        permissions: populated.permissions || {}
      }
    });
  } catch (error) {
    next(error);
  }
};
