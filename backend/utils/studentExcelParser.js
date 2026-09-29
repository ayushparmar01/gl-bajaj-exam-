/**
 * Student Excel / CSV Import Parser & Validation Engine (GLB ExamSphere)
 * Supports .xlsx, .xls, and .csv files with resilient column header mapping,
 * row-level validation, in-file duplicate detection, and database duplicate checks.
 */

const User = require('../models/User');
const { isValidEmail } = require('../middleware/validator');

/**
 * Standardize and normalize header string for tolerant matching
 */
const normalizeHeader = (header) => {
  if (!header || typeof header !== 'string') return '';
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Map normalized header to canonical student schema field
 */
const getFieldFromHeader = (normalized) => {
  // Name
  if (['name', 'studentname', 'fullname', 'candidatename'].includes(normalized)) {
    return 'name';
  }
  // Roll Number
  if (['rollnumber', 'rollno', 'roll', 'studentrollno', 'rollnum'].includes(normalized)) {
    return 'rollNumber';
  }
  // Enrollment Number
  if (['enrollmentnumber', 'enrollmentno', 'enrolmentnumber', 'enrolmentno', 'enrollno', 'enrollment', 'enrolment'].includes(normalized)) {
    return 'enrollmentNumber';
  }
  // Email
  if (['email', 'emailaddress', 'emailid', 'mail', 'studentemail'].includes(normalized)) {
    return 'email';
  }
  // Branch
  if (['branch', 'department', 'dept', 'stream', 'course'].includes(normalized)) {
    return 'branch';
  }
  // Semester
  if (['semester', 'sem', 'currentsemester', 'term'].includes(normalized)) {
    return 'semester';
  }
  // Section
  if (['section', 'sec', 'classsection'].includes(normalized)) {
    return 'section';
  }
  // Batch
  if (['batch', 'academicyear', 'session', 'batchyear', 'year'].includes(normalized)) {
    return 'batch';
  }
  // Status
  if (['status', 'accountstatus', 'state'].includes(normalized)) {
    return 'status';
  }
  // Password (optional / ignored)
  if (['password', 'pass', 'pwd', 'initialpassword'].includes(normalized)) {
    return 'password';
  }

  return null;
};

/**
 * Lightweight, robust RFC 4180 compliant CSV parser
 */
const parseCSV = (csvText) => {
  // Strip UTF-8 BOM if present
  let cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip CRLF
      }
      row.push(currentField.trim());
      if (row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Push trailing field/row
  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    if (row.some(cell => cell.length > 0)) {
      lines.push(row);
    }
  }

  if (lines.length < 2) {
    return [];
  }

  const rawHeaders = lines[0];
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    const field = getFieldFromHeader(norm);
    if (field) {
      headerMap[idx] = field;
    }
  });

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const rowData = lines[i];
    const record = { _rowNumber: i + 1, _raw: {} };
    rawHeaders.forEach((h, idx) => {
      record._raw[h] = rowData[idx] || '';
    });

    Object.keys(headerMap).forEach(idx => {
      const field = headerMap[idx];
      record[field] = (rowData[idx] || '').trim();
    });

    records.push(record);
  }

  return records;
};

/**
 * Parse Excel Buffer using xlsx library or CSV fallback
 */
const parseSpreadsheetBuffer = (buffer, filename) => {
  const isCsv = filename && filename.toLowerCase().endsWith('.csv');

  if (isCsv) {
    const csvText = buffer.toString('utf8');
    return parseCSV(csvText);
  }

  // Parse Excel (.xlsx, .xls) using xlsx library
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Spreadsheet has no readable sheets');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!Array.isArray(rawRows) || rawRows.length < 2) {
      return [];
    }

    const rawHeaders = rawRows[0].map(h => String(h || '').trim());
    const headerMap = {};
    rawHeaders.forEach((h, idx) => {
      const norm = normalizeHeader(h);
      const field = getFieldFromHeader(norm);
      if (field) {
        headerMap[idx] = field;
      }
    });

    const records = [];
    for (let i = 1; i < rawRows.length; i++) {
      const rowData = rawRows[i];
      if (!Array.isArray(rowData) || !rowData.some(cell => String(cell || '').trim().length > 0)) {
        continue; // Skip empty row
      }

      const record = { _rowNumber: i + 1, _raw: {} };
      rawHeaders.forEach((h, idx) => {
        record._raw[h] = String(rowData[idx] || '').trim();
      });

      Object.keys(headerMap).forEach(idx => {
        const field = headerMap[idx];
        record[field] = String(rowData[idx] || '').trim();
      });

      records.push(record);
    }

    return records;
  } catch (err) {
    // If xlsx fails or file is CSV mislabeled as xlsx, attempt text parsing
    try {
      const fallbackText = buffer.toString('utf8');
      if (fallbackText.includes(',') || fallbackText.includes('\n')) {
        return parseCSV(fallbackText);
      }
    } catch (e) {}
    throw new Error(`Failed to parse spreadsheet file: ${err.message}`);
  }
};

/**
 * Validate parsed student rows and run duplicate detection
 */
const validateAndProcessStudentRows = async (rawRows) => {
  const validRows = [];
  const invalidRows = [];
  const duplicateInFileRows = [];
  const existingInDbRows = [];

  // Track in-file duplicates
  const seenEmails = new Set();
  const seenRollNumbers = new Set();
  const seenEnrollmentNumbers = new Set();

  // Collect values to query MongoDB in a single batch
  const emailsToCheck = [];
  const rollNumbersToCheck = [];
  const enrollmentNumbersToCheck = [];

  const intermediateRows = [];

  for (const row of rawRows) {
    const rowNum = row._rowNumber;
    const errors = [];

    const rawName = (row.name || '').trim();
    const email = (row.email || '').trim().toLowerCase();
    const rollNumber = (row.rollNumber || '').trim();
    const enrollmentNumber = (row.enrollmentNumber || '').trim();
    const branch = (row.branch || '').trim();
    const semester = (row.semester || '').trim();
    const section = (row.section || '').trim();
    const batch = (row.batch || '').trim();
    const status = (row.status || '').trim().toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const password = (row.password || '').trim();

    const name = rawName || (email ? email.split('@')[0] : '');

    // Required fields check
    if (!name && !email) errors.push('Student Name or Email is required');
    if (!email) errors.push('Email address is required');
    else if (!isValidEmail(email)) errors.push(`Invalid email format (${email})`);

    if (!rollNumber) errors.push('Roll Number is required');
    if (!enrollmentNumber) errors.push('Enrollment Number is required');
    if (!branch) errors.push('Branch is required');
    if (!semester) errors.push('Semester is required');
    if (!section) errors.push('Section is required');
    if (!batch) errors.push('Batch is required');

    const studentObj = {
      rowNumber: rowNum,
      name,
      email,
      rollNumber,
      enrollmentNumber,
      branch,
      semester,
      section,
      batch,
      status,
      hasCustomPassword: Boolean(password),
      password: password || null
    };

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: rowNum,
        data: studentObj,
        errors
      });
      continue;
    }

    // In-file duplicate checks
    let isFileDuplicate = false;
    const duplicateReasons = [];

    if (seenEmails.has(email)) {
      isFileDuplicate = true;
      duplicateReasons.push(`Email '${email}' is duplicated within this file`);
    } else {
      seenEmails.add(email);
      emailsToCheck.push(email);
    }

    if (seenRollNumbers.has(rollNumber.toLowerCase())) {
      isFileDuplicate = true;
      duplicateReasons.push(`Roll Number '${rollNumber}' is duplicated within this file`);
    } else {
      seenRollNumbers.add(rollNumber.toLowerCase());
      rollNumbersToCheck.push(rollNumber);
    }

    if (seenEnrollmentNumbers.has(enrollmentNumber.toLowerCase())) {
      isFileDuplicate = true;
      duplicateReasons.push(`Enrollment Number '${enrollmentNumber}' is duplicated within this file`);
    } else {
      seenEnrollmentNumbers.add(enrollmentNumber.toLowerCase());
      enrollmentNumbersToCheck.push(enrollmentNumber);
    }

    if (isFileDuplicate) {
      duplicateInFileRows.push({
        rowNumber: rowNum,
        data: studentObj,
        reason: duplicateReasons.join('; ')
      });
      continue;
    }

    intermediateRows.push(studentObj);
  }

  // Batch query database for existing duplicates
  const existingUsers = await User.find({
    $or: [
      { email: { $in: emailsToCheck } },
      { rollNumber: { $in: rollNumbersToCheck } },
      { enrollmentNumber: { $in: enrollmentNumbersToCheck } }
    ]
  }).select('email rollNumber enrollmentNumber name');

  const existingEmailSet = new Set(existingUsers.map(u => (u.email || '').toLowerCase()));
  const existingRollSet = new Set(existingUsers.map(u => (u.rollNumber || '').toLowerCase()).filter(Boolean));
  const existingEnrollSet = new Set(existingUsers.map(u => (u.enrollmentNumber || '').toLowerCase()).filter(Boolean));

  for (const student of intermediateRows) {
    const dbConflicts = [];

    if (existingEmailSet.has(student.email.toLowerCase())) {
      dbConflicts.push(`Email '${student.email}' is already registered in database`);
    }
    if (existingRollSet.has(student.rollNumber.toLowerCase())) {
      dbConflicts.push(`Roll Number '${student.rollNumber}' already exists in database`);
    }
    if (existingEnrollSet.has(student.enrollmentNumber.toLowerCase())) {
      dbConflicts.push(`Enrollment Number '${student.enrollmentNumber}' already exists in database`);
    }

    if (dbConflicts.length > 0) {
      existingInDbRows.push({
        rowNumber: student.rowNumber,
        data: student,
        reason: dbConflicts.join('; ')
      });
    } else {
      validRows.push(student);
    }
  }

  return {
    totalRows: rawRows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    duplicateInFileCount: duplicateInFileRows.length,
    existingInDbCount: existingInDbRows.length,
    validRows,
    invalidRows,
    duplicateInFileRows,
    existingInDbRows
  };
};

module.exports = {
  parseSpreadsheetBuffer,
  validateAndProcessStudentRows
};
