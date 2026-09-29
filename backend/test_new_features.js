const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();

let mongoServer;
let server;
const PORT = 5088;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runFeatureTests() {
  console.log('🚀 Testing Google Auth & Question Image Upload Features...\n');

  try {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    console.log('✅ In-Memory MongoDB Connected');

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/exams', require('./routes/examRoutes'));
    app.use('/api/questions', require('./routes/questionRoutes'));
    app.use('/api/results', require('./routes/resultRoutes'));
    app.use(require('./middleware/errorMiddleware').errorHandler);

    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
    console.log(`✅ Test server running on ${BASE_URL}\n`);

    const User = require('./models/User');

    // TEST 1: Google OAuth Registration & Login
    console.log('📌 Test 1: Testing Google OAuth Sign-in (Student)...');
    const mockStudentPayload = {
      sub: 'google_1234567890',
      email: 'student.google@example.com',
      name: 'Google Student',
      picture: 'https://lh3.googleusercontent.com/a/mockavatar',
      email_verified: true
    };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify(mockStudentPayload)).toString('base64');
    const mockStudentToken = `${header}.${payload}.mockSignature`;

    const googleStudentRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: mockStudentToken, role: 'STUDENT' })
    });
    const studentData = await googleStudentRes.json();
    console.log(`Response Status: ${googleStudentRes.status}`);
    console.log(`User created: ${studentData.data?.name}, Role: ${studentData.data?.role}, Avatar: ${studentData.data?.avatar}`);
    if (googleStudentRes.status !== 200 || !studentData.token || studentData.data.avatar !== mockStudentPayload.picture) {
      throw new Error('Google student authentication failed');
    }
    console.log('✅ Test 1 Passed: Google OAuth Student Registered & Logged In\n');

    // TEST 2: Google OAuth for Admin/Teacher
    console.log('📌 Test 2: Testing Google OAuth Sign-in (Admin/Teacher)...');
    const mockAdminPayload = {
      sub: 'google_admin_98765',
      email: 'admin.google@example.com',
      name: 'Dr. Google Teacher',
      picture: 'https://lh3.googleusercontent.com/a/teachavatar',
      email_verified: true
    };
    const adminHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const adminPayload = Buffer.from(JSON.stringify(mockAdminPayload)).toString('base64');
    const mockAdminToken = `${adminHeader}.${adminPayload}.mockSignature`;

    const googleAdminRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: mockAdminToken, role: 'ADMIN' })
    });
    const adminData = await googleAdminRes.json();
    console.log(`Admin created: ${adminData.data?.name}, Role: ${adminData.data?.role}`);
    if (googleAdminRes.status !== 200 || adminData.data.role !== 'ADMIN') {
      throw new Error('Google admin authentication failed');
    }
    const adminAuthToken = adminData.token;
    console.log('✅ Test 2 Passed: Google OAuth Admin Registered & Logged In\n');

    // TEST 3: Question Image Upload endpoint with multipart/form-data
    console.log('📌 Test 3: Uploading Question Image File...');
    // Create a dummy small image buffer (1x1 PNG)
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let body = `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="image"; filename="diagram.png"\r\n';
    body += 'Content-Type: image/png\r\n\r\n';

    const headerBuf = Buffer.from(body, 'utf8');
    const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const fullBody = Buffer.concat([headerBuf, pngBuffer, footerBuf]);

    const uploadRes = await fetch(`${BASE_URL}/api/questions/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: fullBody
    });
    const uploadData = await uploadRes.json();
    console.log(`Upload response:`, uploadData);
    if (uploadRes.status !== 200 || !uploadData.imageUrl || !uploadData.imageUrl.includes('question-')) {
      throw new Error('Image upload failed');
    }
    const uploadedImageUrl = uploadData.imageUrl;
    console.log('✅ Test 3 Passed: Question image uploaded successfully to ' + uploadedImageUrl + '\n');

    // TEST 4: Create Exam & Add Question with Image
    console.log('📌 Test 4: Creating Exam and adding Question with Image...');
    const examRes = await fetch(`${BASE_URL}/api/exams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({
        title: 'Physics & Circuit Diagrams Exam',
        duration: 30,
        passMarks: 5
      })
    });
    const examData = await examRes.json();
    const examId = examData.data._id;

    const questionRes = await fetch(`${BASE_URL}/api/exams/${examId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({
        questionText: 'Identify the circuit component shown in the attached diagram:',
        options: ['Capacitor', 'Inductor', 'Resistor', 'Transistor'],
        correctAnswer: 'Capacitor',
        marks: 5,
        explanation: 'The parallel plates symbol represents a capacitor.',
        imageUrl: uploadedImageUrl
      })
    });
    const questionData = await questionRes.json();
    console.log('Created question:', questionData.data);
    if (questionRes.status !== 201 || questionData.data.imageUrl !== uploadedImageUrl) {
      throw new Error('Question creation with imageUrl failed');
    }
    console.log('✅ Test 4 Passed: Question created with attached imageUrl\n');

    // TEST 5: Publish Exam & Student Starts Exam (Verify Image is returned)
    console.log('📌 Test 5: Publishing Exam and verifying Student receives question imageUrl...');
    await fetch(`${BASE_URL}/api/exams/${examId}/publish`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminAuthToken}` }
    });

    const startRes = await fetch(`${BASE_URL}/api/exams/${examId}/start`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${studentData.token}` }
    });
    const startData = await startRes.json();
    const studentQuestion = startData.data?.questions[0];
    console.log(`Student received question imageUrl: ${studentQuestion?.imageUrl}`);
    if (startRes.status !== 200 || studentQuestion?.imageUrl !== uploadedImageUrl) {
      throw new Error('Student startExam did not return question imageUrl');
    }
    console.log('✅ Test 5 Passed: Student receives question diagram during exam\n');

    // TEST 6: Student Submits Answer & Checks Review Page (Verify Image in detailed review)
    console.log('📌 Test 6: Submitting Exam and checking Result review has imageUrl...');
    const submitRes = await fetch(`${BASE_URL}/api/results/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentData.token}`
      },
      body: JSON.stringify({
        examId,
        answers: [{
          questionId: studentQuestion._id,
          selectedAnswer: 'Capacitor'
        }],
        timeTaken: '00:02:15'
      })
    });
    const submitData = await submitRes.json();
    const resultId = submitData.data.resultId;

    const resultRes = await fetch(`${BASE_URL}/api/results/${resultId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${studentData.token}` }
    });
    const resultDetail = await resultRes.json();
    const reviewAnswer = resultDetail.data?.answers[0];
    console.log(`Review answer contains imageUrl: ${reviewAnswer?.imageUrl}`);
    if (resultRes.status !== 200 || reviewAnswer?.imageUrl !== uploadedImageUrl) {
      throw new Error('Result detailed review did not return question imageUrl');
    }
    console.log('✅ Test 6 Passed: Student result review includes question diagram\n');

    console.log('🎉 ALL 6 FEATURE TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL.\n');
  } catch (err) {
    console.error('❌ Test Failure:', err);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((r) => server.close(r));
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
}

runFeatureTests();
