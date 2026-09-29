/**
 * Student Management Controller (Admin Only) - GLB ExamSphere
 * Provides bulk Excel/CSV import with pre-validation preview, manual student provisioning,
 * pagination, server-side filtering, password resetting, and account status controls.
 */

const User = require('../models/User');
const ExamAttempt = require('../models/ExamAttempt');
const Result = require('../models/Result');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { parseSpreadsheetBuffer, validateAndProcessStudentRows } = require('../utils/studentExcelParser');
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

// @desc    Upload & Preview Student Spreadsheet (Excel/CSV)
// @route   POST /api/admin/students/upload-preview
// @access  Private/Admin
exports.uploadPreview = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file'
      });
    }

    const rawRows = parseSpreadsheetBuffer(req.file.buffer, req.file.originalname);

    if (rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is empty or does not contain recognizable header columns'
      });
    }

    if (rawRows.length > 5000) {
      return res.status(400).json({
        success: false,
        message: `File exceeds maximum allowed limit of 5,000 students per batch (contains ${rawRows.length} rows)`
      });
    }

    const validationResult = await validateAndProcessStudentRows(rawRows);

    res.status(200).json({
      success: true,
      message: 'Spreadsheet parsed and validated successfully',
      filename: req.file.originalname,
      data: validationResult
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm & Execute Bulk Student Import
// @route   POST /api/admin/students/confirm-import
// @access  Private/Admin
exports.confirmImport = async (req, res, next) => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of validated student objects to import'
      });
    }

    if (students.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Batch size exceeds maximum limit of 5,000 students'
      });
    }

    // Extract emails and roll numbers to perform final database conflict check
    const emails = students.map(s => (s.email || '').trim().toLowerCase()).filter(Boolean);
    const rollNumbers = students.map(s => (s.rollNumber || '').trim()).filter(Boolean);
    const enrollmentNumbers = students.map(s => (s.enrollmentNumber || '').trim()).filter(Boolean);

    const existingUsers = await User.find({
      $or: [
        { email: { $in: emails } },
        { rollNumber: { $in: rollNumbers } },
        { enrollmentNumber: { $in: enrollmentNumbers } }
      ]
    }).select('email rollNumber enrollmentNumber');

    const existingEmailSet = new Set(existingUsers.map(u => (u.email || '').toLowerCase()));
    const existingRollSet = new Set(existingUsers.map(u => (u.rollNumber || '').toLowerCase()).filter(Boolean));
    const existingEnrollSet = new Set(existingUsers.map(u => (u.enrollmentNumber || '').toLowerCase()).filter(Boolean));

    const studentsToInsert = [];
    const credentialsReport = [];
    const skippedRecords = [];

    // Pre-hash passwords and prepare documents
    for (const student of students) {
      const cleanEmail = (student.email || '').trim().toLowerCase();
      const cleanRoll = (student.rollNumber || '').trim();
      const cleanEnroll = (student.enrollmentNumber || '').trim();

      if (
        existingEmailSet.has(cleanEmail) ||
        existingRollSet.has(cleanRoll.toLowerCase()) ||
        existingEnrollSet.has(cleanEnroll.toLowerCase())
      ) {
        skippedRecords.push({
          email: cleanEmail,
          rollNumber: cleanRoll,
          reason: 'Record conflict found in database during final confirmation'
        });
        continue;
      }

      // Add to sets to avoid duplicate collisions within same batch
      existingEmailSet.add(cleanEmail);
      existingRollSet.add(cleanRoll.toLowerCase());
      existingEnrollSet.add(cleanEnroll.toLowerCase());

      let hashedPassword = undefined;
      if (student.password && String(student.password).trim().length >= 6) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(String(student.password).trim(), salt);
      }

      const studentDoc = {
        name: (student.name || '').trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        rollNumber: cleanRoll,
        enrollmentNumber: cleanEnroll,
        branch: (student.branch || '').trim(),
        semester: (student.semester || '').trim(),
        section: (student.section || '').trim(),
        batch: (student.batch || '').trim(),
        role: 'STUDENT', // SECURITY: Strictly enforced
        status: (student.status || '').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        isVerified: true,
        createdAt: new Date()
      };

      if (hashedPassword) {
        studentDoc.password = hashedPassword;
      }

      studentsToInsert.push(studentDoc);
    }

    if (studentsToInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible students were available for insertion (all were duplicates or existing in DB)',
        skippedCount: skippedRecords.length,
        skippedRecords
      });
    }

    // Perform bulk insertion using insertMany with unordered execution for safety
    const inserted = await User.insertMany(studentsToInsert, { ordered: false });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} student candidate(s) into database!`,
      importedCount: inserted.length,
      skippedCount: skippedRecords.length,
      skippedRecords
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all students with server-side pagination, search & filters
// @route   GET /api/admin/students
// @access  Private/Admin
exports.getStudents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      branch = '',
      semester = '',
      section = '',
      batch = '',
      status = ''
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = { role: 'STUDENT' };

    if (branch && branch !== 'ALL') {
      query.branch = new RegExp(`^${branch.trim()}$`, 'i');
    }
    if (semester && semester !== 'ALL') {
      query.semester = new RegExp(`^${semester.trim()}$`, 'i');
    }
    if (section && section !== 'ALL') {
      query.section = new RegExp(`^${section.trim()}$`, 'i');
    }
    if (batch && batch !== 'ALL') {
      query.batch = new RegExp(`^${batch.trim()}$`, 'i');
    }
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
        { rollNumber: { $regex: cleanSearch, $options: 'i' } },
        { enrollmentNumber: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const [students, totalCount] = await Promise.all([
      User.find(query)
        .select('-password -otp -otpExpiry -otpAttempts -otpLastSentAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    res.status(200).json({
      success: true,
      count: students.length,
      totalCount,
      page: pageNum,
      totalPages,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single student details with academic & exam history
// @route   GET /api/admin/students/:id
// @access  Private/Admin
exports.getStudentById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }

    const student = await User.findOne({ _id: req.params.id, role: 'STUDENT' })
      .select('-password -otp -otpExpiry -otpAttempts -otpLastSentAt');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found'
      });
    }

    // Fetch student's exam attempts & completed results
    const [attemptsCount, results] = await Promise.all([
      ExamAttempt.countDocuments({ studentId: student._id }),
      Result.find({ studentId: student._id })
        .populate('examId', 'title totalMarks passMarks')
        .sort({ submittedAt: -1 })
        .limit(10)
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...student.toObject(),
        attemptsCount,
        results
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add single student manually (Admin only)
// @route   POST /api/admin/students
// @access  Private/Admin
exports.createStudent = async (req, res, next) => {
  try {
    const {
      name,
      email,
      rollNumber,
      enrollmentNumber,
      branch,
      semester,
      section,
      batch,
      password,
      status
    } = req.body;

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanName = name ? name.trim() : '';
    const cleanRoll = rollNumber ? String(rollNumber).trim() : '';
    const cleanEnroll = enrollmentNumber ? String(enrollmentNumber).trim() : '';

    if (!cleanName || !cleanEmail || !cleanRoll || !cleanEnroll) {
      return res.status(400).json({
        success: false,
        message: 'Please provide student name, email, roll number, and enrollment number'
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check for existing duplicates
    const existing = await User.findOne({
      $or: [
        { email: cleanEmail },
        { rollNumber: cleanRoll },
        { enrollmentNumber: cleanEnroll }
      ]
    });

    if (existing) {
      if (existing.email.toLowerCase() === cleanEmail) {
        return res.status(400).json({ success: false, message: `Email '${cleanEmail}' is already registered` });
      }
      if (existing.rollNumber && existing.rollNumber.toLowerCase() === cleanRoll.toLowerCase()) {
        return res.status(400).json({ success: false, message: `Roll number '${cleanRoll}' already exists` });
      }
      if (existing.enrollmentNumber && existing.enrollmentNumber.toLowerCase() === cleanEnroll.toLowerCase()) {
        return res.status(400).json({ success: false, message: `Enrollment number '${cleanEnroll}' already exists` });
      }
    }

    const studentDoc = {
      name: cleanName,
      email: cleanEmail,
      rollNumber: cleanRoll,
      enrollmentNumber: cleanEnroll,
      branch: branch ? String(branch).trim() : '',
      semester: semester ? String(semester).trim() : '',
      section: section ? String(section).trim() : '',
      batch: batch ? String(batch).trim() : '',
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      role: 'STUDENT',
      isVerified: true
    };

    if (password && String(password).trim().length >= 6) {
      studentDoc.password = String(password).trim();
    }

    const student = await User.create(studentDoc);

    res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        enrollmentNumber: student.enrollmentNumber,
        branch: student.branch,
        semester: student.semester,
        section: student.section,
        batch: student.batch,
        status: student.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update student details (Admin only)
// @route   PUT /api/admin/students/:id
// @access  Private/Admin
exports.updateStudent = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }

    let student = await User.findOne({ _id: req.params.id, role: 'STUDENT' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found'
      });
    }

    const {
      name,
      email,
      rollNumber,
      enrollmentNumber,
      branch,
      semester,
      section,
      batch,
      status
    } = req.body;

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email address format' });
      }
      if (cleanEmail !== student.email) {
        const emailExists = await User.findOne({ email: cleanEmail, _id: { $ne: student._id } });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'Email address already in use by another student' });
        }
        student.email = cleanEmail;
      }
    }

    if (rollNumber !== undefined) {
      const cleanRoll = String(rollNumber).trim();
      if (cleanRoll !== student.rollNumber) {
        const rollExists = await User.findOne({ rollNumber: cleanRoll, _id: { $ne: student._id } });
        if (rollExists) {
          return res.status(400).json({ success: false, message: 'Roll number already in use by another student' });
        }
        student.rollNumber = cleanRoll;
      }
    }

    if (enrollmentNumber !== undefined) {
      const cleanEnroll = String(enrollmentNumber).trim();
      if (cleanEnroll !== student.enrollmentNumber) {
        const enrollExists = await User.findOne({ enrollmentNumber: cleanEnroll, _id: { $ne: student._id } });
        if (enrollExists) {
          return res.status(400).json({ success: false, message: 'Enrollment number already in use by another student' });
        }
        student.enrollmentNumber = cleanEnroll;
      }
    }

    if (name !== undefined) student.name = String(name).trim();
    if (branch !== undefined) student.branch = String(branch).trim();
    if (semester !== undefined) student.semester = String(semester).trim();
    if (section !== undefined) student.section = String(section).trim();
    if (batch !== undefined) student.batch = String(batch).trim();
    if (status !== undefined && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      student.status = status.toUpperCase();
    }

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student details updated successfully',
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        enrollmentNumber: student.enrollmentNumber,
        branch: student.branch,
        semester: student.semester,
        section: student.section,
        batch: student.batch,
        status: student.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle student active/inactive status (Admin only)
// @route   PATCH /api/admin/students/:id/status
// @access  Private/Admin
exports.toggleStudentStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }

    const student = await User.findOne({ _id: req.params.id, role: 'STUDENT' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    student.status = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await student.save();

    res.status(200).json({
      success: true,
      message: `Student account ${student.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        status: student.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset student password by Admin
// @route   POST /api/admin/students/:id/reset-password
// @access  Private/Admin
exports.resetStudentPassword = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }

    const { newPassword } = req.body;

    const student = await User.findOne({ _id: req.params.id, role: 'STUDENT' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const passwordToSet = (newPassword && String(newPassword).trim().length >= 6)
      ? String(newPassword).trim()
      : generateSecureTemporaryPassword();

    student.password = passwordToSet; // Encrypted by UserSchema pre-save hook
    student.otp = null;
    student.otpExpiry = null;
    student.otpAttempts = 0;
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully for student',
      data: {
        id: student._id,
        email: student.email,
        name: student.name,
        temporaryPassword: passwordToSet
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete student account (Admin only)
// @route   DELETE /api/admin/students/:id
// @access  Private/Admin
exports.deleteStudent = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }

    const student = await User.findOne({ _id: req.params.id, role: 'STUDENT' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student has existing exam attempts or published results to preserve audit trail
    const [attemptsCount, resultsCount] = await Promise.all([
      ExamAttempt.countDocuments({ studentId: student._id }),
      Result.countDocuments({ studentId: student._id })
    ]);

    if (attemptsCount > 0 || resultsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete student with existing examination attempts or published results. Please deactivate the student account instead to preserve academic records and audit integrity.'
      });
    }

    await student.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Student account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get distinct branches, semesters, sections, batches for filters
// @route   GET /api/admin/students/filters/options
// @access  Private/Admin
exports.getFilterOptions = async (req, res, next) => {
  try {
    const [branches, semesters, sections, batches] = await Promise.all([
      User.distinct('branch', { role: 'STUDENT', branch: { $nin: ['', null] } }),
      User.distinct('semester', { role: 'STUDENT', semester: { $nin: ['', null] } }),
      User.distinct('section', { role: 'STUDENT', section: { $nin: ['', null] } }),
      User.distinct('batch', { role: 'STUDENT', batch: { $nin: ['', null] } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        branches: branches.sort(),
        semesters: semesters.sort(),
        sections: sections.sort(),
        batches: batches.sort()
      }
    });
  } catch (error) {
    next(error);
  }
};
