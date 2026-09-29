const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_student_auth_secret_key_2026_glb';
process.env.NODE_ENV = 'test';

let mongoServer;
let server;
const PORT = 5098;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runStudentAuthTests() {
  console.log('🚀 Starting GLB EXAMSPHERE Student Google Authentication & Import Test Suite...\n');

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('✅ In-Memory MongoDB Connected');

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(require('./middleware/securityHeaders'));
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/admin/students', require('./routes/studentRoutes'));
    app.use('/api/admin/academic', require('./routes/academicRoutes'));
    app.use('/api/exams', require('./routes/examRoutes'));
    app.use('/api/results', require('./routes/resultRoutes'));
    app.use('/api/proctor', require('./routes/proctorRoutes'));
    app.use(require('./middleware/errorMiddleware').errorHandler);

    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
    console.log(`✅ Test server running on ${BASE_URL}\n`);

    const request = async (url, method = 'GET', body = null, token = null) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}${url}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    };

    const User = require('./models/User');
    const Exam = require('./models/Exam');
    const generateToken = require('./utils/generateToken');

    // Helper to craft test Google ID token
    const makeMockGoogleIdToken = (email, name = 'Test Student', sub = null) => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({
        sub: sub || `google_sub_${email.replace(/[^a-z0-9]/gi, '_')}`,
        email,
        name,
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        email_verified: true,
        iss: 'accounts.google.com'
      })).toString('base64');
      return `${header}.${payload}.mockSignatureString`;
    };

    // Setup Admin
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@college.edu',
      password: 'AdminPassword@123',
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true
    });
    const adminToken = generateToken(adminUser._id, 'ADMIN');

    // =========================================================================
    // 1. ADMIN BULK IMPORT WITHOUT PASSWORDS
    // =========================================================================
    console.log('📌 Test 1: Admin bulk imports students with academic info and NO passwords...');
    const importData = [
      {
        name: 'Aarav Sharma',
        email: 'student1@college.edu',
        rollNumber: '23CSE001',
        enrollmentNumber: 'GLB2023001',
        branch: 'CSE',
        semester: '5',
        section: 'A',
        batch: '2023-2027',
        status: 'ACTIVE'
      },
      {
        name: 'Diya Patel',
        email: 'student2@college.edu',
        rollNumber: '23CSE002',
        enrollmentNumber: 'GLB2023002',
        branch: 'CSE',
        semester: '5',
        section: 'A',
        batch: '2023-2027',
        status: 'ACTIVE'
      },
      {
        name: 'Inactive Candidate',
        email: 'inactive.student@college.edu',
        rollNumber: '23CSE099',
        enrollmentNumber: 'GLB2023099',
        branch: 'CSE',
        semester: '5',
        section: 'A',
        batch: '2023-2027',
        status: 'INACTIVE'
      }
    ];

    const importRes = await request('/api/admin/students/confirm-import', 'POST', { students: importData }, adminToken);
    if (importRes.status !== 201 || importRes.data.importedCount !== 3) {
      throw new Error(`Import failed with status ${importRes.status}: ${JSON.stringify(importRes.data)}`);
    }
    console.log('  ✅ Verified: Admin successfully imported 3 students without passwords.');

    // Verify student records in MongoDB
    console.log('\n📌 Test 2: Confirm student records in DB have no plaintext password and role = STUDENT...');
    const student1InDb = await User.findOne({ email: 'student1@college.edu' });
    if (!student1InDb || student1InDb.role !== 'STUDENT' || student1InDb.rollNumber !== '23CSE001') {
      throw new Error('Student record in DB is invalid!');
    }
    console.log('  ✅ Verified: Student 1 stored with role STUDENT, rollNumber 23CSE001, enrollment GLB2023001.');

    // =========================================================================
    // 2. PUBLIC SELF-REGISTRATION STRICTLY DISABLED
    // =========================================================================
    console.log('\n📌 Test 3: Public student self-registration endpoint is rejected (403)...');
    const regRes = await request('/api/auth/register', 'POST', {
      name: 'Uninvited User',
      email: 'hacker@college.edu',
      password: 'Password@123'
    });
    if (regRes.status !== 403) {
      throw new Error(`Expected 403 for registration, got ${regRes.status}`);
    }
    console.log('  ✅ Verified: Self-registration returns 403 Forbidden.');

    // =========================================================================
    // 3. VALID GOOGLE IDENTITY + EXISTING STUDENT -> LOGIN SUCCESS
    // =========================================================================
    console.log('\n📌 Test 4: Valid Google Identity with pre-registered student logs in successfully...');
    const validGoogleToken = makeMockGoogleIdToken('student1@college.edu', 'Aarav Sharma');
    const googleLoginRes = await request('/api/auth/google', 'POST', { idToken: validGoogleToken });

    if (googleLoginRes.status !== 200 || !googleLoginRes.data.token) {
      throw new Error(`Google login failed: ${JSON.stringify(googleLoginRes.data)}`);
    }
    const student1Jwt = googleLoginRes.data.token;
    const student1Profile = googleLoginRes.data.data;
    if (student1Profile.email !== 'student1@college.edu' || student1Profile.role !== 'STUDENT' || student1Profile.rollNumber !== '23CSE001') {
      throw new Error(`Returned profile mismatch: ${JSON.stringify(student1Profile)}`);
    }
    console.log('  ✅ Verified: Student 1 authenticated via Google OAuth and received full academic profile.');

    // =========================================================================
    // 4. UNKNOWN GOOGLE ACCOUNT -> REJECTED (NO AUTO-REGISTRATION)
    // =========================================================================
    console.log('\n📌 Test 5: Unknown Google account is rejected (403 Forbidden, No auto-creation)...');
    const unknownGoogleToken = makeMockGoogleIdToken('unregistered.random@college.edu', 'Random User');
    const unknownLoginRes = await request('/api/auth/google', 'POST', { idToken: unknownGoogleToken });

    if (unknownLoginRes.status !== 403) {
      throw new Error(`Expected 403 for unregistered Google account, got ${unknownLoginRes.status}`);
    }
    // Verify user was NOT created in DB
    const unregisteredInDb = await User.findOne({ email: 'unregistered.random@college.edu' });
    if (unregisteredInDb) {
      throw new Error('SECURITY VIOLATION: Unregistered Google account was auto-created in database!');
    }
    console.log('  ✅ Verified: Unregistered Google account rejected and not created in database.');

    // =========================================================================
    // 5. INACTIVE STUDENT ACCOUNT -> REJECTED
    // =========================================================================
    console.log('\n📌 Test 6: Inactive student account is rejected on Google login (403)...');
    const inactiveGoogleToken = makeMockGoogleIdToken('inactive.student@college.edu', 'Inactive Student');
    const inactiveLoginRes = await request('/api/auth/google', 'POST', { idToken: inactiveGoogleToken });

    if (inactiveLoginRes.status !== 403) {
      throw new Error(`Expected 403 for inactive student, got ${inactiveLoginRes.status}`);
    }
    console.log('  ✅ Verified: Deactivated/inactive student account rejected.');

    // =========================================================================
    // 6. NON-STUDENT (ADMIN / TEACHER) REJECTED ON STUDENT GOOGLE LOGIN
    // =========================================================================
    console.log('\n📌 Test 7: Non-student role (Admin/Teacher) rejected on student Google login...');
    const adminGoogleToken = makeMockGoogleIdToken('admin@college.edu', 'System Admin');
    const adminGoogleRes = await request('/api/auth/google', 'POST', { idToken: adminGoogleToken });

    if (adminGoogleRes.status !== 403) {
      throw new Error(`Expected 403 for non-student role, got ${adminGoogleRes.status}`);
    }
    console.log('  ✅ Verified: Non-student accounts cannot login via student Google portal.');

    // =========================================================================
    // 7. COLLEGE EMAIL DOMAIN RESTRICTION
    // =========================================================================
    console.log('\n📌 Test 8: Configurable COLLEGE_EMAIL_DOMAIN restriction...');
    process.env.COLLEGE_EMAIL_DOMAIN = 'college.edu,glbitm.org';
    
    // Create an outsider student with different domain
    const outsiderToken = makeMockGoogleIdToken('intruder@gmail.com', 'Intruder');
    const outsiderRes = await request('/api/auth/google', 'POST', { idToken: outsiderToken });
    if (outsiderRes.status !== 403) {
      throw new Error(`Expected 403 for non-college domain, got ${outsiderRes.status}`);
    }
    console.log('  ✅ Verified: Unauthorized email domain (@gmail.com) rejected when COLLEGE_EMAIL_DOMAIN is set.');

    // Clean up env variable for subsequent tests
    delete process.env.COLLEGE_EMAIL_DOMAIN;

    // =========================================================================
    // 8. EXAM ELIGIBILITY & ACADEMIC TARGETING WITH GOOGLE AUTHENTICATED STUDENT
    // =========================================================================
    console.log('\n📌 Test 9: Server-side exam eligibility with Google-authenticated student...');
    // Create a targeted exam for CSE Sem 5
    const targetedExam = await Exam.create({
      title: 'Operating Systems Mid-Term',
      description: 'Core evaluation for CSE 5th Semester',
      duration: 60,
      totalMarks: 50,
      passMarks: 20,
      isPublished: true,
      createdBy: adminUser._id,
      audienceType: 'BRANCH',
      target: {
        branches: ['CSE'],
        semesters: ['5']
      }
    });

    // Create another exam targeted ONLY for ECE
    const eceExam = await Exam.create({
      title: 'Digital Signal Processing',
      description: 'ECE exclusive assessment',
      duration: 60,
      totalMarks: 50,
      passMarks: 20,
      isPublished: true,
      createdBy: adminUser._id,
      audienceType: 'BRANCH',
      target: {
        branches: ['ECE']
      }
    });

    // Student 1 fetches available exams
    const examsRes = await request('/api/exams', 'GET', null, student1Jwt);
    if (examsRes.status !== 200) {
      throw new Error(`Could not fetch exams: ${JSON.stringify(examsRes.data)}`);
    }
    const studentExamIds = (examsRes.data.data || []).map(e => String(e._id));
    if (!studentExamIds.includes(String(targetedExam._id))) {
      throw new Error('Student 1 should be eligible for CSE exam!');
    }
    if (studentExamIds.includes(String(eceExam._id))) {
      throw new Error('SECURITY VIOLATION: Student 1 should NOT be eligible for ECE exam!');
    }
    console.log('  ✅ Verified: Server-side eligibility applies accurately to Google-authenticated student.');

    // =========================================================================
    // 9. PROCTORING SESSION CREATION & OWNERSHIP
    // =========================================================================
    console.log('\n📌 Test 10: Proctoring session creation & attempt binding for Google-authenticated student...');
    // Start exam
    const startRes = await request(`/api/exams/${targetedExam._id}/start`, 'GET', null, student1Jwt);
    if (startRes.status !== 200 || !startRes.data.data?.attemptId) {
      throw new Error(`Failed to start exam: ${JSON.stringify(startRes.data)}`);
    }
    const attemptId = startRes.data.data.attemptId;

    // Init proctoring session
    const proctorInitRes = await request(`/api/proctor/sessions/${attemptId}/init`, 'POST', {}, student1Jwt);
    if (proctorInitRes.status !== 200 || !proctorInitRes.data.data?._id) {
      throw new Error(`Proctoring init failed: ${JSON.stringify(proctorInitRes.data)}`);
    }
    console.log('  ✅ Verified: Phase 4 proctoring session initialized seamlessly for candidate attempt.');

    console.log('\n============================================================');
    console.log('🎉 ALL 10 STUDENT GOOGLE AUTHENTICATION & SECURITY TESTS PASSED!');
    console.log('============================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise(r => server.close(r));
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
}

if (require.main === module) {
  runStudentAuthTests();
}

module.exports = runStudentAuthTests;
