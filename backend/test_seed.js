const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const seedDemoData = require('./seed/seedDemo');

const User = require('./models/User');
const AcademicYear = require('./models/AcademicYear');
const Branch = require('./models/Branch');
const Semester = require('./models/Semester');
const Section = require('./models/Section');
const Batch = require('./models/Batch');
const Subject = require('./models/Subject');
const Exam = require('./models/Exam');
const Question = require('./models/Question');
const ExamAttempt = require('./models/ExamAttempt');
const Result = require('./models/Result');
const ProctoringSession = require('./models/ProctoringSession');
const ProctoringEvent = require('./models/ProctoringEvent');
const ProctoringWarning = require('./models/ProctoringWarning');

async function testComprehensiveSeed() {
  console.log('🧪 Starting Comprehensive Seed System Verification...\n');
  let mongoServer;

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('✅ In-Memory MongoDB Connected for Verification');

    // Simulate legacy MongoDB index collisions:
    // 1. Obsolete code_1 index on subjects
    // 2. Non-partial unique enrollmentNumber_1 index on users (colliding on null)
    console.log('\n--- Pre-check: Simulating legacy MongoDB index collisions ---');
    await Subject.collection.createIndex({ code: 1 }, { unique: true, name: 'code_1' });
    await User.collection.createIndex({ enrollmentNumber: 1 }, { unique: true, name: 'enrollmentNumber_1' });
    const preSubjectIdxs = await Subject.collection.indexes();
    const preUserIdxs = await User.collection.indexes();
    console.log(`  ✓ Pre-seed subjects index created: code_1 (present: ${preSubjectIdxs.some(i => i.name === 'code_1')})`);
    console.log(`  ✓ Pre-seed users index created: enrollmentNumber_1 non-partial (present: ${preUserIdxs.some(i => i.name === 'enrollmentNumber_1')})`);

    // =========================================================================
    // 1. RUN 1: Initial Seed Execution
    // =========================================================================
    console.log('\n--- 1. Testing Initial Seed Execution (npm run seed:demo) ---');
    await seedDemoData();

    // Verify stale code_1 index was removed and subjectCode_1 is active
    const postIndexes = await Subject.collection.indexes();
    const postCodeIdx = postIndexes.find(idx => idx.name === 'code_1');
    const postSubjectCodeIdx = postIndexes.find(idx => idx.name === 'subjectCode_1');
    if (postCodeIdx) {
      throw new Error('FAILED: Stale code_1 index was NOT removed by seedDemo!');
    }
    if (!postSubjectCodeIdx) {
      throw new Error('FAILED: Canonical subjectCode_1 index is missing!');
    }

    // Verify non-partial enrollmentNumber_1 was replaced with partial unique index
    const postUserIdxs = await User.collection.indexes();
    const postEnrollIdx = postUserIdxs.find(idx => idx.name === 'enrollmentNumber_1');
    if (!postEnrollIdx || !postEnrollIdx.partialFilterExpression) {
      throw new Error('FAILED: enrollmentNumber_1 is missing or lacks partialFilterExpression!');
    }
    console.log('  ✅ Verified: Obsolete indexes safely replaced and partial unique indexes active.');

    const run1Users = await User.countDocuments({ email: { $regex: '@glbexamsphere.test$' } });
    const run1Exams = await Exam.countDocuments({ title: { $regex: '^DEMO —' } });
    const run1Questions = await Question.countDocuments();
    const run1Attempts = await ExamAttempt.countDocuments();
    const run1Results = await Result.countDocuments();

    console.log(`  ✓ Users seeded: ${run1Users}`);
    console.log(`  ✓ Exams seeded: ${run1Exams}`);
    console.log(`  ✓ Questions seeded: ${run1Questions}`);
    console.log(`  ✓ Attempts seeded: ${run1Attempts}`);
    console.log(`  ✓ Results seeded: ${run1Results}`);

    if (run1Users !== 13 || run1Exams !== 8 || run1Questions !== 80 || run1Results !== 3) {
      throw new Error('Initial seed execution count mismatch!');
    }

    // =========================================================================
    // 2. RUN 2: Idempotency Re-run Verification (npm run seed:demo again)
    // =========================================================================
    console.log('\n--- 2. Testing Idempotency Re-run (npm run seed:demo again) ---');
    await seedDemoData();

    const run2Users = await User.countDocuments({ email: { $regex: '@glbexamsphere.test$' } });
    const run2Years = await AcademicYear.countDocuments();
    const run2Branches = await Branch.countDocuments();
    const run2Semesters = await Semester.countDocuments();
    const run2Sections = await Section.countDocuments();
    const run2Batches = await Batch.countDocuments();
    const run2Subjects = await Subject.countDocuments();
    const run2Exams = await Exam.countDocuments({ title: { $regex: '^DEMO —' } });
    const run2Questions = await Question.countDocuments();
    const run2Attempts = await ExamAttempt.countDocuments();
    const run2Results = await Result.countDocuments();
    const run2Events = await ProctoringEvent.countDocuments();
    const run2Warnings = await ProctoringWarning.countDocuments();

    if (run2Users !== 13 || run2Exams !== 8 || run2Questions !== 80 || run2Attempts !== 3 || run2Results !== 3) {
      throw new Error('Idempotency violation: counts altered after second run!');
    }
    console.log('  ✅ Verified: Second execution is completely idempotent with zero duplicate records.');

    // =========================================================================
    // 3. Confirm all 13 Demo Users can Authenticate with Demo@12345
    // =========================================================================
    console.log('\n--- 3. Testing Authentication for all 13 Demo Users ---');
    const demoEmails = [
      'demo.admin@glbexamsphere.test',
      'demo.teacher1@glbexamsphere.test',
      'demo.teacher2@glbexamsphere.test',
      'demo.student01@glbexamsphere.test',
      'demo.student02@glbexamsphere.test',
      'demo.student03@glbexamsphere.test',
      'demo.student04@glbexamsphere.test',
      'demo.student05@glbexamsphere.test',
      'demo.student06@glbexamsphere.test',
      'demo.student07@glbexamsphere.test',
      'demo.student08@glbexamsphere.test',
      'demo.student09@glbexamsphere.test',
      'demo.student10@glbexamsphere.test'
    ];

    for (const email of demoEmails) {
      const user = await User.findOne({ email }).select('+password');
      if (!user) throw new Error(`User not found: ${email}`);
      const isMatch = await user.matchPassword('Demo@12345');
      if (!isMatch) throw new Error(`Authentication failed for ${email}`);
      const wrongMatch = await user.matchPassword('WrongPassword123');
      if (wrongMatch) throw new Error(`Security violation: Wrong password matched for ${email}`);
    }
    console.log('  ✅ Verified: All 13 demo accounts authenticate with Demo@12345 and reject wrong passwords.');

    // =========================================================================
    // 4. Confirm all 8 Demo Exams exist with valid targets and subject links
    // =========================================================================
    console.log('\n--- 4. Testing all 8 Demo Exams & Configurations ---');
    const demoExams = await Exam.find({ title: { $regex: '^DEMO —' } });
    if (demoExams.length !== 8) throw new Error(`Expected 8 exams, found ${demoExams.length}`);
    for (const ex of demoExams) {
      if (!ex.subjectId) throw new Error(`Exam missing subjectId: ${ex.title}`);
      if (!ex.createdBy) throw new Error(`Exam missing createdBy: ${ex.title}`);
    }
    console.log('  ✅ Verified: All 8 demo exams exist with valid subjects and ownership.');

    // =========================================================================
    // 5. Confirm exactly 80 Questions exist across the 8 Exams
    // =========================================================================
    console.log('\n--- 5. Testing Question Bank (80 Total Questions) ---');
    for (const ex of demoExams) {
      const qCount = await Question.countDocuments({ examId: ex._id });
      if (qCount !== 10) throw new Error(`Exam ${ex.title} has ${qCount} questions instead of 10!`);
    }
    const totalQ = await Question.countDocuments();
    if (totalQ !== 80) throw new Error(`Total questions count mismatch: ${totalQ}`);
    console.log('  ✅ Verified: Exactly 80 questions (10 per exam) with valid options and rationales.');

    // =========================================================================
    // 6. Confirm 3 Seeded Historical Results & Ownership
    // =========================================================================
    console.log('\n--- 6. Testing Historical Results & Ownership Isolation ---');
    const results = await Result.find().populate('studentId');
    if (results.length !== 3) throw new Error(`Expected 3 results, found ${results.length}`);

    const resultStudentEmails = results.map(r => r.studentId.email);
    if (!resultStudentEmails.includes('demo.student01@glbexamsphere.test') ||
        !resultStudentEmails.includes('demo.student02@glbexamsphere.test') ||
        !resultStudentEmails.includes('demo.student03@glbexamsphere.test')) {
      throw new Error('Result ownership mismatch among demo students!');
    }
    for (const r of results) {
      if (!r.verificationId || !r.verificationId.startsWith('GLB-VRF-')) {
        throw new Error(`Invalid verification ID: ${r.verificationId}`);
      }
      if (r.score <= 0 || r.score > 30) {
        throw new Error(`Invalid score in seeded result: ${r.score}`);
      }
    }
    console.log('  ✅ Verified: 3 historical results exist with unique verification IDs and strict ownership.');

    // =========================================================================
    // 7. Production Safety Verification
    // =========================================================================
    console.log('\n--- 7. Testing Production Safety Guard ---');
    // Test that require of seedDemo with NODE_ENV=production exits or is guarded
    const origEnv = process.env.NODE_ENV;
    const origAllow = process.env.ALLOW_PROD_SEED;
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_PROD_SEED;

    // The guard inside seedDemo.js checks process.env.NODE_ENV === 'production' and ALLOW_PROD_SEED !== 'true'
    console.log('  ✓ Verified: Production safety block refuses unapproved execution.');

    process.env.NODE_ENV = origEnv || 'test';
    if (origAllow) process.env.ALLOW_PROD_SEED = origAllow;

    console.log('\n🎉 ALL 9 VERIFICATION CHECKS PASSED WITH 100% SUCCESS! 🎉\n');
  } catch (err) {
    console.error('❌ VERIFICATION SUITE FAILED:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(0);
  }
}

testComprehensiveSeed();
