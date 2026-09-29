/**
 * Database-Level Index Verification & Submission Stress Test
 * Specifically inspects the raw MongoDB collection indexes on 'results'
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

async function runDatabaseVerification() {
  console.log('🔍 Starting Direct MongoDB Index & Submission Verification...\n');
  let mongoServer;

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const User = require('./models/User');
    const Exam = require('./models/Exam');
    const Question = require('./models/Question');
    const ExamAttempt = require('./models/ExamAttempt');
    const Result = require('./models/Result');

    // Ensure indexes are built & synced
    await Result.syncIndexes();

    // 1. Fetch raw MongoDB index specifications
    const rawIndexes = await Result.collection.indexes();
    console.log('📋 Actual MongoDB Indexes on collection "results":');
    console.log(JSON.stringify(rawIndexes, null, 2));

    // Verify verificationId index in raw MongoDB output
    const vrfIndex = rawIndexes.find(idx => idx.key && idx.key.verificationId === 1);

    if (!vrfIndex) {
      throw new Error('FAILED: verificationId_1 index not found on results collection!');
    }

    if (!vrfIndex.unique) {
      throw new Error('FAILED: verificationId_1 index is NOT unique!');
    }

    if (!vrfIndex.sparse) {
      throw new Error('FAILED: verificationId_1 index is NOT sparse!');
    }

    console.log('\n✅ Verified Raw MongoDB Index for verificationId:');
    console.log(`   - Name: ${vrfIndex.name}`);
    console.log(`   - Key: ${JSON.stringify(vrfIndex.key)}`);
    console.log(`   - Unique: ${vrfIndex.unique}`);
    console.log(`   - Sparse: ${vrfIndex.sparse}`);

    // Setup Test Data
    const student1 = await User.create({
      name: 'Verification Student 1',
      email: 'vrf.student1@glb.edu',
      password: 'password123',
      role: 'STUDENT',
      isVerified: true
    });

    const student2 = await User.create({
      name: 'Verification Student 2',
      email: 'vrf.student2@glb.edu',
      password: 'password123',
      role: 'STUDENT',
      isVerified: true
    });

    const exam = await Exam.create({
      title: 'Database Verification Assessment',
      duration: 30,
      totalMarks: 10,
      passMarks: 4,
      allowMultipleAttempts: false,
      isPublished: true
    });

    const q1 = await Question.create({
      examId: exam._id,
      questionText: 'What does ACID stand for in DBMS?',
      options: ['Atomicity, Consistency, Isolation, Durability', 'All, Core, Internal, Data'],
      correctAnswer: 'Atomicity, Consistency, Isolation, Durability',
      marks: 5
    });

    // TEST 1: First Normal Submission
    console.log('\n--- TEST 1: First Normal Submission ---');
    const attempt1 = await ExamAttempt.create({
      studentId: student1._id,
      examId: exam._id,
      status: 'IN_PROGRESS',
      startTime: new Date()
    });

    const vrfId1 = 'GLB-VRF-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const result1 = await Result.create({
      studentId: student1._id,
      examId: exam._id,
      attemptId: attempt1._id,
      verificationId: vrfId1,
      answers: [{
        questionId: q1._id,
        selectedAnswer: 'Atomicity, Consistency, Isolation, Durability',
        correctAnswer: 'Atomicity, Consistency, Isolation, Durability',
        isCorrect: true,
        marksObtained: 5
      }],
      score: 5,
      totalMarks: 10,
      percentage: 50,
      correctAnswers: 1,
      wrongAnswers: 0,
      unattempted: 0
    });

    console.log(`✅ Result 1 created successfully with Verification ID: ${result1.verificationId}`);

    // TEST 2: Second Submission Attempt for the Same Exam Attempt (Must be rejected)
    console.log('\n--- TEST 2: Duplicate Submission for Same Attempt ---');
    let duplicateAttemptBlocked = false;
    try {
      await Result.create({
        studentId: student1._id,
        examId: exam._id,
        attemptId: attempt1._id, // Same attemptId
        verificationId: 'GLB-VRF-ANOTHER-RANDOM-ID',
        answers: [],
        score: 0,
        totalMarks: 10,
        percentage: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        unattempted: 1
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        duplicateAttemptBlocked = true;
        console.log(`✅ Duplicate attempt submission successfully BLOCKED by MongoDB duplicate key constraint (attemptId unique index).`);
      } else {
        throw dupErr;
      }
    }

    if (!duplicateAttemptBlocked) {
      throw new Error('FAILED: Duplicate attemptId submission was not blocked!');
    }

    // TEST 3: Multiple Results with Different verificationIds
    console.log('\n--- TEST 3: Multiple Results with Distinct verificationIds ---');
    const attempt2 = await ExamAttempt.create({
      studentId: student2._id,
      examId: exam._id,
      status: 'IN_PROGRESS',
      startTime: new Date()
    });

    const vrfId2 = 'GLB-VRF-' + (Date.now() + 100).toString(36).toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const result2 = await Result.create({
      studentId: student2._id,
      examId: exam._id,
      attemptId: attempt2._id,
      verificationId: vrfId2,
      answers: [{
        questionId: q1._id,
        selectedAnswer: 'Atomicity, Consistency, Isolation, Durability',
        correctAnswer: 'Atomicity, Consistency, Isolation, Durability',
        isCorrect: true,
        marksObtained: 5
      }],
      score: 5,
      totalMarks: 10,
      percentage: 50,
      correctAnswers: 1,
      wrongAnswers: 0,
      unattempted: 0
    });

    console.log(`✅ Result 2 created successfully with Verification ID: ${result2.verificationId}`);
    if (result1.verificationId === result2.verificationId) {
      throw new Error('FAILED: verificationId collision between two distinct results!');
    }

    console.log('\n🎉 ALL DATABASE-LEVEL INDEX AND SUBMISSION VERIFICATIONS PASSED! 🎉\n');
  } catch (err) {
    console.error('❌ Verification Error:', err.message);
  } finally {
    if (mongoose.connection) await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
  }
}

runDatabaseVerification();
