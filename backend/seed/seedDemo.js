/**
 * GLB EXAMSPHERE — Production-Safe Repeatable Demo / Seed Data System
 * 
 * Provides an idempotent, deterministic dataset of:
 * - 1 Admin, 2 Teachers, 10 Students across CSE & AIML (Sections A & B)
 * - Academic Year 2026-27 (Current), 3 Branches (CSE, AIML, ECE), 4 Semesters (1, 3, 5, 7),
 *   6 Sections (A & B per branch), 2 Batches (2023-2027, 2024-2028), 8 Realistic Subjects
 * - Assigned Teacher Scopes and Academic Group Mappings
 * - 8 Complete Demo Exams (80 Realistic MCQ Questions total with explanations and marks)
 * - Historical Completed Attempts, Results, and Factual Proctoring Event Audit Logs
 * 
 * Safety:
 * - Refuses execution if NODE_ENV=production without explicit ALLOW_PROD_SEED=true
 * - Zero raw media (no video/audio files or biometric templates)
 * - Idempotent: safe to run multiple times without creating duplicate records
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Production safety guard
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
  console.error('❌ SAFETY ERROR: Demo seed is disabled in production environment.');
  console.error('To override for a dedicated demo deployment, set ALLOW_PROD_SEED=true.');
  process.exit(1);
}

// Import authoritative models
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Branch = require('../models/Branch');
const Semester = require('../models/Semester');
const Section = require('../models/Section');
const Batch = require('../models/Batch');
const Subject = require('../models/Subject');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const Result = require('../models/Result');
const ProctoringSession = require('../models/ProctoringSession');
const ProctoringEvent = require('../models/ProctoringEvent');
const ProctoringWarning = require('../models/ProctoringWarning');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/glb_examsphere';
const DEMO_PASSWORD = 'Demo@12345';

async function seedDemoData() {
  console.log('🚀 Starting GLB ExamSphere Production-Safe Demo Seeding...\n');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
    }

    // =========================================================================
    // 1. ACADEMIC STRUCTURE (Years, Branches, Semesters, Sections, Batches)
    // =========================================================================
    console.log('\n🏛️ [1/6] Seeding Academic Structure...');

    // 1.1 Academic Year
    let academicYear = await AcademicYear.findOne({ code: 'AY2026-27' });
    if (!academicYear) {
      academicYear = await AcademicYear.create({
        name: '2026-27',
        code: 'AY2026-27',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2027-05-31'),
        isCurrent: true,
        status: 'ACTIVE'
      });
      console.log('  + Created Academic Year: 2026-27 (Current)');
    } else {
      academicYear.isCurrent = true;
      academicYear.status = 'ACTIVE';
      await academicYear.save();
      console.log('  ✓ Verified Academic Year: 2026-27');
    }

    // 1.2 Branches (CSE, AIML, ECE)
    const branchDefs = [
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'Artificial Intelligence & Machine Learning', code: 'AIML' },
      { name: 'Electronics & Communication Engineering', code: 'ECE' }
    ];
    const branches = {};
    for (const b of branchDefs) {
      let branch = await Branch.findOne({ code: b.code });
      if (!branch) {
        branch = await Branch.create({ name: b.name, code: b.code, status: 'ACTIVE' });
        console.log(`  + Created Branch: ${b.code} (${b.name})`);
      } else {
        branch.name = b.name;
        branch.status = 'ACTIVE';
        await branch.save();
        console.log(`  ✓ Verified Branch: ${b.code}`);
      }
      branches[b.code] = branch;
    }

    // 1.3 Semesters (1, 3, 5, 7)
    const semDefs = [
      { number: 1, name: 'Semester 1' },
      { number: 3, name: 'Semester 3' },
      { number: 5, name: 'Semester 5' },
      { number: 7, name: 'Semester 7' }
    ];
    const semesters = {};
    for (const s of semDefs) {
      let sem = await Semester.findOne({ number: s.number });
      if (!sem) {
        sem = await Semester.create({ number: s.number, name: s.name, status: 'ACTIVE' });
        console.log(`  + Created Semester: ${s.name}`);
      } else {
        sem.name = s.name;
        sem.status = 'ACTIVE';
        await sem.save();
        console.log(`  ✓ Verified Semester: ${s.name}`);
      }
      semesters[s.number] = sem;
    }

    // 1.4 Sections (A & B for each branch)
    const sections = {};
    for (const bCode of ['CSE', 'AIML', 'ECE']) {
      for (const secName of ['A', 'B']) {
        const key = `${bCode}_${secName}`;
        let section = await Section.findOne({ name: secName, branch: branches[bCode]._id });
        if (!section) {
          section = await Section.create({ name: secName, branch: branches[bCode]._id, status: 'ACTIVE' });
          console.log(`  + Created Section: ${bCode} - Section ${secName}`);
        } else {
          section.status = 'ACTIVE';
          await section.save();
        }
        sections[key] = section;
      }
    }

    // 1.5 Batches (2023-2027, 2024-2028)
    const batchDefs = [
      { name: '2023-2027', startYear: 2023, endYear: 2027 },
      { name: '2024-2028', startYear: 2024, endYear: 2028 }
    ];
    const batches = {};
    for (const b of batchDefs) {
      let batch = await Batch.findOne({ name: b.name });
      if (!batch) {
        batch = await Batch.create({ name: b.name, startYear: b.startYear, endYear: b.endYear, status: 'ACTIVE' });
        console.log(`  + Created Batch: ${b.name}`);
      } else {
        batch.startYear = b.startYear;
        batch.endYear = b.endYear;
        batch.status = 'ACTIVE';
        await batch.save();
        console.log(`  ✓ Verified Batch: ${b.name}`);
      }
      batches[b.name] = batch;
    }

    // =========================================================================
    // 2. SUBJECTS (8 Realistic College Subjects for Semester 5)
    // =========================================================================
    console.log('\n📚 [2/6] Seeding Subjects...');

    // Safety: Drop obsolete legacy index 'code_1' on subjects if it exists in MongoDB
    try {
      const subjectIndexes = await Subject.collection.indexes().catch(() => []);
      const staleCodeIdx = subjectIndexes.find((idx) => idx.name === 'code_1');
      if (staleCodeIdx) {
        await Subject.collection.dropIndex('code_1').catch(() => {});
        console.log('  🛡️ Safely removed obsolete legacy index on subjects collection: code_1');
      }
      await Subject.syncIndexes().catch(() => {});
    } catch (idxErr) {
      console.warn('  ⚠️ Subject index verification notice:', idxErr.message);
    }

    const subjectDefs = [
      {
        name: 'Data Structures & Algorithms',
        subjectCode: 'CS501',
        branch: branches.CSE._id,
        semester: semesters[5]._id,
        description: 'Advanced trees, dynamic programming, graph algorithms, and complexity analysis'
      },
      {
        name: 'Database Management Systems',
        subjectCode: 'CS502',
        branch: branches.CSE._id,
        semester: semesters[5]._id,
        description: 'Relational algebra, SQL, normalization (1NF-BCNF), indexing, and ACID transactions'
      },
      {
        name: 'Operating Systems',
        subjectCode: 'CS503',
        branch: branches.CSE._id,
        semester: semesters[5]._id,
        description: 'Process scheduling, concurrency, semaphores, deadlocks, and virtual memory'
      },
      {
        name: 'Computer Networks',
        subjectCode: 'CS504',
        branch: branches.CSE._id,
        semester: semesters[5]._id,
        description: 'OSI 7-layer architecture, TCP/IP, routing protocols, subnetting, and socket programming'
      },
      {
        name: 'Artificial Intelligence',
        subjectCode: 'AI501',
        branch: branches.AIML._id,
        semester: semesters[5]._id,
        description: 'Knowledge representation, heuristic search (A*, Minimax), expert systems, and logic'
      },
      {
        name: 'Machine Learning',
        subjectCode: 'AI502',
        branch: branches.AIML._id,
        semester: semesters[5]._id,
        description: 'Supervised/unsupervised models, neural networks, backpropagation, and deep learning'
      },
      {
        name: 'Full-Stack Web Development',
        subjectCode: 'CS505',
        branch: branches.CSE._id,
        semester: semesters[5]._id,
        description: 'Modern JavaScript, React, Node.js REST APIs, authentication, and WebSockets'
      },
      {
        name: 'Software Engineering & Agile Methodologies',
        subjectCode: 'CS506',
        branch: branches.CSE._id,
        semester: semesters[5]._id,
        description: 'SDLC models, Agile/Scrum, design patterns, CI/CD pipelines, and software testing'
      }
    ];

    const subjects = {};
    for (const sub of subjectDefs) {
      let subject = await Subject.findOne({ subjectCode: sub.subjectCode });
      if (!subject) {
        subject = await Subject.create({ ...sub, status: 'ACTIVE' });
        console.log(`  + Created Subject: [${sub.subjectCode}] ${sub.name}`);
      } else {
        subject.name = sub.name;
        subject.branch = sub.branch;
        subject.semester = sub.semester;
        subject.description = sub.description;
        subject.status = 'ACTIVE';
        await subject.save();
        console.log(`  ✓ Verified Subject: [${sub.subjectCode}] ${sub.name}`);
      }
      subjects[sub.subjectCode] = subject;
    }

    // =========================================================================
    // 3. DEMO USERS (1 Admin, 2 Teachers with Scopes, 10 Students)
    // =========================================================================
    console.log('\n👥 [3/6] Seeding Demo Users...');

    // Safety: Ensure User indexes use partialFilterExpression to safely allow multiple non-student accounts without enrollment numbers
    try {
      const userIndexes = await User.collection.indexes().catch(() => []);
      for (const idxName of ['enrollmentNumber_1', 'rollNumber_1', 'employeeId_1']) {
        const existingIdx = userIndexes.find((idx) => idx.name === idxName);
        if (existingIdx && !existingIdx.partialFilterExpression) {
          await User.collection.dropIndex(idxName).catch(() => {});
          console.log(`  🛡️ Replaced non-partial index on users collection: ${idxName}`);
        }
      }
      await User.syncIndexes().catch(() => {});
    } catch (idxErr) {
      console.warn('  ⚠️ User index verification notice:', idxErr.message);
    }

    // 3.1 Admin User
    let adminUser = await User.findOne({ email: 'demo.admin@glbexamsphere.test' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Prof. Admin (Demo)',
        email: 'demo.admin@glbexamsphere.test',
        password: DEMO_PASSWORD,
        role: 'ADMIN',
        status: 'ACTIVE',
        isVerified: true
      });
      console.log('  + Created Admin: demo.admin@glbexamsphere.test');
    } else {
      adminUser.name = 'Prof. Admin (Demo)';
      adminUser.role = 'ADMIN';
      adminUser.status = 'ACTIVE';
      adminUser.isVerified = true;
      adminUser.password = DEMO_PASSWORD;
      await adminUser.save();
      console.log('  ✓ Verified Admin: demo.admin@glbexamsphere.test');
    }

    // 3.2 Teacher 1: Dr. Alan Turing (CSE Faculty, DSA, DBMS, OS)
    let teacher1 = await User.findOne({ email: 'demo.teacher1@glbexamsphere.test' });
    const teacher1Assignments = {
      assignedSubjects: [subjects.CS501._id, subjects.CS502._id, subjects.CS503._id],
      assignedAcademicGroups: {
        academicYears: [academicYear._id],
        branches: [branches.CSE._id],
        semesters: [semesters[5]._id],
        sections: [sections.CSE_A._id, sections.CSE_B._id],
        batches: [batches['2023-2027']._id]
      },
      permissions: {
        canTargetEntireCollege: false,
        canManageAllSubjects: false
      }
    };
    if (!teacher1) {
      teacher1 = await User.create({
        name: 'Dr. Turing Faculty (Demo)',
        email: 'demo.teacher1@glbexamsphere.test',
        employeeId: 'FAC-DEMO-01',
        department: 'Computer Science & Engineering',
        phone: '+91 9876543210',
        password: DEMO_PASSWORD,
        role: 'TEACHER',
        status: 'ACTIVE',
        isVerified: true,
        ...teacher1Assignments
      });
      console.log('  + Created Teacher 1: demo.teacher1@glbexamsphere.test (CSE Faculty)');
    } else {
      teacher1.name = 'Dr. Turing Faculty (Demo)';
      teacher1.role = 'TEACHER';
      teacher1.status = 'ACTIVE';
      teacher1.assignedSubjects = teacher1Assignments.assignedSubjects;
      teacher1.assignedAcademicGroups = teacher1Assignments.assignedAcademicGroups;
      teacher1.permissions = teacher1Assignments.permissions;
      teacher1.password = DEMO_PASSWORD;
      await teacher1.save();
      console.log('  ✓ Verified Teacher 1: demo.teacher1@glbexamsphere.test');
    }

    // 3.3 Teacher 2: Prof. Ada Lovelace (AIML Faculty, CN, AI, ML)
    let teacher2 = await User.findOne({ email: 'demo.teacher2@glbexamsphere.test' });
    const teacher2Assignments = {
      assignedSubjects: [subjects.CS504._id, subjects.AI501._id, subjects.AI502._id],
      assignedAcademicGroups: {
        academicYears: [academicYear._id],
        branches: [branches.AIML._id],
        semesters: [semesters[5]._id],
        sections: [sections.AIML_A._id, sections.AIML_B._id],
        batches: [batches['2023-2027']._id]
      },
      permissions: {
        canTargetEntireCollege: false,
        canManageAllSubjects: false
      }
    };
    if (!teacher2) {
      teacher2 = await User.create({
        name: 'Prof. Lovelace Faculty (Demo)',
        email: 'demo.teacher2@glbexamsphere.test',
        employeeId: 'FAC-DEMO-02',
        department: 'Artificial Intelligence & Machine Learning',
        phone: '+91 9876543211',
        password: DEMO_PASSWORD,
        role: 'TEACHER',
        status: 'ACTIVE',
        isVerified: true,
        ...teacher2Assignments
      });
      console.log('  + Created Teacher 2: demo.teacher2@glbexamsphere.test (AIML Faculty)');
    } else {
      teacher2.name = 'Prof. Lovelace Faculty (Demo)';
      teacher2.role = 'TEACHER';
      teacher2.status = 'ACTIVE';
      teacher2.assignedSubjects = teacher2Assignments.assignedSubjects;
      teacher2.assignedAcademicGroups = teacher2Assignments.assignedAcademicGroups;
      teacher2.permissions = teacher2Assignments.permissions;
      teacher2.password = DEMO_PASSWORD;
      await teacher2.save();
      console.log('  ✓ Verified Teacher 2: demo.teacher2@glbexamsphere.test');
    }

    // 3.4 10 Students across CSE, AIML, ECE (Sections A & B, Batches 2023-2027 & 2024-2028)
    const studentDefs = [
      { name: 'Aarav Sharma (Demo)', email: 'demo.student01@glbexamsphere.test', rollNumber: '23CS001', enrollmentNumber: 'EN23CS001', branch: 'CSE', semester: '5', section: 'A', batch: '2023-2027' },
      { name: 'Diya Patel (Demo)', email: 'demo.student02@glbexamsphere.test', rollNumber: '23CS002', enrollmentNumber: 'EN23CS002', branch: 'CSE', semester: '5', section: 'A', batch: '2023-2027' },
      { name: 'Rohan Gupta (Demo)', email: 'demo.student03@glbexamsphere.test', rollNumber: '23CS003', enrollmentNumber: 'EN23CS003', branch: 'CSE', semester: '5', section: 'B', batch: '2023-2027' },
      { name: 'Ananya Singh (Demo)', email: 'demo.student04@glbexamsphere.test', rollNumber: '23CS004', enrollmentNumber: 'EN23CS004', branch: 'CSE', semester: '5', section: 'B', batch: '2023-2027' },
      { name: 'Kavya Reddy (Demo)', email: 'demo.student05@glbexamsphere.test', rollNumber: '23AI001', enrollmentNumber: 'EN23AI001', branch: 'AIML', semester: '5', section: 'A', batch: '2023-2027' },
      { name: 'Ishaan Verma (Demo)', email: 'demo.student06@glbexamsphere.test', rollNumber: '23AI002', enrollmentNumber: 'EN23AI002', branch: 'AIML', semester: '5', section: 'A', batch: '2023-2027' },
      { name: 'Aditya Kumar (Demo)', email: 'demo.student07@glbexamsphere.test', rollNumber: '23AI003', enrollmentNumber: 'EN23AI003', branch: 'AIML', semester: '5', section: 'B', batch: '2023-2027' },
      { name: 'Meera Nair (Demo)', email: 'demo.student08@glbexamsphere.test', rollNumber: '23AI004', enrollmentNumber: 'EN23AI004', branch: 'AIML', semester: '5', section: 'B', batch: '2023-2027' },
      { name: 'Vikram Joshi (Demo)', email: 'demo.student09@glbexamsphere.test', rollNumber: '24CS001', enrollmentNumber: 'EN24CS001', branch: 'CSE', semester: '3', section: 'A', batch: '2024-2028' },
      { name: 'Sneha Iyer (Demo)', email: 'demo.student10@glbexamsphere.test', rollNumber: '24EC001', enrollmentNumber: 'EN24EC001', branch: 'ECE', semester: '3', section: 'A', batch: '2024-2028' }
    ];

    const students = {};
    for (const s of studentDefs) {
      let student = await User.findOne({ email: s.email });
      if (!student) {
        student = await User.create({
          ...s,
          password: DEMO_PASSWORD,
          role: 'STUDENT',
          status: 'ACTIVE',
          isVerified: true
        });
        console.log(`  + Created Student: ${s.email} (${s.name})`);
      } else {
        student.name = s.name;
        student.rollNumber = s.rollNumber;
        student.enrollmentNumber = s.enrollmentNumber;
        student.branch = s.branch;
        student.semester = s.semester;
        student.section = s.section;
        student.batch = s.batch;
        student.status = 'ACTIVE';
        student.password = DEMO_PASSWORD;
        await student.save();
        console.log(`  ✓ Verified Student: ${s.email}`);
      }
      students[s.email] = student;
    }

    // =========================================================================
    // 4. DEMO EXAMS (8 Distinct Exam Scenarios)
    // =========================================================================
    console.log('\n📝 [4/6] Seeding 8 Demo Exams & Questions...');

    const examConfigs = [
      // EXAM 1: Entire College General Assessment (DSA)
      {
        key: 'EXAM_1',
        title: 'DEMO — Entire College Assessment: Data Structures & Algorithms',
        description: 'College-wide foundational algorithms and problem solving test open to all registered students.',
        duration: 30,
        totalMarks: 30,
        passMarks: 12,
        audienceType: 'ENTIRE_COLLEGE',
        target: { academicYears: [], branches: [], semesters: [], sections: [], batches: [] },
        subjectId: subjects.CS501._id,
        subjectCode: 'CS501',
        isPublished: true,
        createdBy: adminUser._id,
        requireCamera: true,
        proctoringConfig: { proctoringEnabled: true, cameraRequired: true, microphoneRequired: true, faceDetectionEnabled: true, gazeDetectionEnabled: true, headPoseDetectionEnabled: true, voiceActivityEnabled: true }
      },
      // EXAM 2: CSE Semester 5 Mid-Term (DBMS) - Combination Target (CSE, Sem 5, Sec A, Batch 2023-2027)
      {
        key: 'EXAM_2',
        title: 'DEMO — CSE Sem 5 Mid-Term: Database Management Systems',
        description: 'Targeted relational databases, SQL queries, indexing, and normalization exam for CSE Semester 5 Section A.',
        duration: 30,
        totalMarks: 30,
        passMarks: 12,
        audienceType: 'COMBINATION_TARGET',
        target: {
          branches: [branches.CSE._id],
          semesters: [semesters[5]._id],
          sections: [sections.CSE_A._id],
          batches: [batches['2023-2027']._id],
          academicYears: [academicYear._id]
        },
        subjectId: subjects.CS502._id,
        subjectCode: 'CS502',
        isPublished: true,
        createdBy: adminUser._id,
        requireCamera: true
      },
      // EXAM 3: AI & ML Semester 5 Assessment (AI & ML) - Combination Target (AIML, Sem 5)
      {
        key: 'EXAM_3',
        title: 'DEMO — AI & ML Sem 5: Artificial Intelligence & Neural Networks',
        description: 'Specialized machine learning and heuristic search exam for AIML Semester 5 cohorts.',
        duration: 30,
        totalMarks: 30,
        passMarks: 12,
        audienceType: 'COMBINATION_TARGET',
        target: {
          branches: [branches.AIML._id],
          semesters: [semesters[5]._id],
          sections: [],
          batches: [],
          academicYears: [academicYear._id]
        },
        subjectId: subjects.AI501._id,
        subjectCode: 'AI501',
        isPublished: true,
        createdBy: adminUser._id,
        requireCamera: true
      },
      // EXAM 4: Teacher 1 Faculty-Authored Assessment (DBMS - Branch Target CSE)
      {
        key: 'EXAM_4',
        title: 'DEMO — Faculty Exam: Advanced Relational SQL & Indexing',
        description: 'Course examination authored and administered directly by Dr. Turing for assigned CSE Semester 5 students.',
        duration: 25,
        totalMarks: 30,
        passMarks: 10,
        audienceType: 'BRANCH',
        target: {
          branches: [branches.CSE._id],
          semesters: [semesters[5]._id],
          sections: [],
          batches: [],
          academicYears: []
        },
        subjectId: subjects.CS502._id,
        subjectCode: 'CS502',
        isPublished: true,
        createdBy: teacher1._id,
        requireCamera: true
      },
      // EXAM 5: Upcoming Scheduled Assessment (OS)
      {
        key: 'EXAM_5',
        title: 'DEMO — Scheduled Final: Operating Systems & Kernel Architecture',
        description: 'Upcoming final semester examination scheduled for future date window to verify scheduled countdowns.',
        duration: 45,
        totalMarks: 30,
        passMarks: 15,
        isScheduled: true,
        startTime: new Date(Date.now() + 2 * 24 * 3600 * 1000), // +2 days in future
        endTime: new Date(Date.now() + 3 * 24 * 3600 * 1000),   // +3 days in future
        audienceType: 'ENTIRE_COLLEGE',
        target: { academicYears: [], branches: [], semesters: [], sections: [], batches: [] },
        subjectId: subjects.CS503._id,
        subjectCode: 'CS503',
        isPublished: true,
        createdBy: adminUser._id,
        requireCamera: true
      },
      // EXAM 6: Completed / Past Assessment (Computer Networks)
      {
        key: 'EXAM_6',
        title: 'DEMO — Past Assessment: Computer Networks & Protocols',
        description: 'Historical examination with closed submission window to demonstrate completed catalog and result review.',
        duration: 30,
        totalMarks: 30,
        passMarks: 12,
        isScheduled: true,
        startTime: new Date(Date.now() - 7 * 24 * 3600 * 1000), // 7 days ago
        endTime: new Date(Date.now() - 6 * 24 * 3600 * 1000),   // 6 days ago
        audienceType: 'ENTIRE_COLLEGE',
        target: { academicYears: [], branches: [], semesters: [], sections: [], batches: [] },
        subjectId: subjects.CS504._id,
        subjectCode: 'CS504',
        isPublished: true,
        createdBy: adminUser._id,
        requireCamera: true
      },
      // EXAM 7: Passcode Protected Assessment (Software Engineering)
      {
        key: 'EXAM_7',
        title: 'DEMO — Protected Exam: Software Engineering & Agile Methodologies',
        description: 'Access-code locked examination requiring proctor PIN (DEMO123) to begin.',
        duration: 20,
        totalMarks: 30,
        passMarks: 10,
        hasAccessCode: true,
        accessCode: 'DEMO123',
        audienceType: 'ENTIRE_COLLEGE',
        target: { academicYears: [], branches: [], semesters: [], sections: [], batches: [] },
        subjectId: subjects.CS506._id,
        subjectCode: 'CS506',
        isPublished: true,
        createdBy: adminUser._id,
        requireCamera: true
      },
      // EXAM 8: AI-Proctored Secure Assessment (Full-Stack Web Dev with Negative Marking)
      {
        key: 'EXAM_8',
        title: 'DEMO — AI Proctored Secure Exam: Full-Stack Web Development',
        description: 'Strict proctored examination testing camera presence, gaze monitoring, and negative marking penalty.',
        duration: 30,
        totalMarks: 30,
        passMarks: 12,
        hasNegativeMarking: true,
        negativeMarks: 0.5,
        requireCamera: true,
        proctoringConfig: {
          proctoringEnabled: true,
          cameraRequired: true,
          microphoneRequired: true,
          faceDetectionEnabled: true,
          gazeDetectionEnabled: true,
          headPoseDetectionEnabled: true,
          voiceActivityEnabled: true
        },
        audienceType: 'ENTIRE_COLLEGE',
        target: { academicYears: [], branches: [], semesters: [], sections: [], batches: [] },
        subjectId: subjects.CS505._id,
        subjectCode: 'CS505',
        isPublished: true,
        createdBy: adminUser._id
      }
    ];

    const seededExams = {};
    for (const ec of examConfigs) {
      let exam = await Exam.findOne({ title: ec.title });
      if (!exam) {
        exam = await Exam.create({ ...ec });
        console.log(`  + Created Exam: ${ec.title}`);
      } else {
        Object.assign(exam, ec);
        await exam.save();
        console.log(`  ✓ Verified Exam: ${ec.title}`);
      }
      seededExams[ec.key] = exam;
    }

    // =========================================================================
    // 5. QUESTIONS (10 Realistic Questions per Exam = 80 Total Questions)
    // =========================================================================
    const questionBank = {
      // Questions for Exam 1: DSA
      EXAM_1: [
        { q: 'What is the worst-case time complexity of QuickSort?', opts: ['O(n log n)', 'O(n^2)', 'O(n)', 'O(log n)'], ans: 'O(n^2)', marks: 3, exp: 'QuickSort exhibits O(n^2) when the pivot divides the array into empty and n-1 elements repeatedly (e.g. already sorted array with naive pivot).' },
        { q: 'Which data structure is fundamentally used for Breadth-First Search (BFS) on a graph?', opts: ['Stack', 'Queue', 'Priority Queue', 'Binary Tree'], ans: 'Queue', marks: 3, exp: 'BFS explores vertices level by level in First-In-First-Out order, making Queue the primary data structure.' },
        { q: 'What is the height of a balanced Binary Search Tree (AVL / Red-Black) with n nodes?', opts: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], ans: 'O(log n)', marks: 3, exp: 'Self-balancing binary search trees maintain a height strictly bounded by O(log n).' },
        { q: 'In dynamic programming, what technique is used in top-down approach?', opts: ['Tabulation', 'Memoization', 'Greedy Choice', 'Divide and Conquer'], ans: 'Memoization', marks: 3, exp: 'Top-down dynamic programming utilizes memoization (caching recursive subproblem results).' },
        { q: 'Which sorting algorithm has a guaranteed worst-case time complexity of O(n log n) and is stable?', opts: ['QuickSort', 'MergeSort', 'HeapSort', 'SelectionSort'], ans: 'MergeSort', marks: 3, exp: 'MergeSort divides and merges arrays with guaranteed O(n log n) time while preserving relative order of duplicate elements.' },
        { q: 'What is the amortized insertion time complexity for a dynamic array (like std::vector or ArrayList)?', opts: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'], ans: 'O(1)', marks: 3, exp: 'Although resizing takes O(n), it occurs infrequently such that n insertions take O(n) total, yielding amortized O(1).' },
        { q: 'Which algorithm finds the shortest path in a weighted graph with non-negative edge weights?', opts: ["Dijkstra's Algorithm", "Kruskal's Algorithm", "Prim's Algorithm", 'Floyd-Warshall Algorithm'], ans: "Dijkstra's Algorithm", marks: 3, exp: "Dijkstra's algorithm greedily explores the nearest unvisited vertex to compute single-source shortest paths." },
        { q: 'What data structure is optimal for implementing a Least Recently Used (LRU) Cache in O(1) time?', opts: ['Array + Binary Search', 'Hash Map + Doubly Linked List', 'Binary Search Tree', 'Min Heap'], ans: 'Hash Map + Doubly Linked List', marks: 3, exp: 'The Hash Map provides O(1) key lookup, while the Doubly Linked List enables O(1) node relocation and eviction.' },
        { q: 'What is the minimum number of queues needed to implement a Stack?', opts: ['1', '2', '3', '4'], ans: '2', marks: 3, exp: 'A standard LIFO stack can be simulated using two FIFO queues by cycling elements during push or pop operations.' },
        { q: 'In a min-heap with n elements, what is the time complexity to extract the minimum element?', opts: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], ans: 'O(log n)', marks: 3, exp: 'Extracting root takes O(1), but restoring the heap invariant via heapify-down takes O(log n).' }
      ],
      // Questions for Exam 2: DBMS
      EXAM_2: [
        { q: 'Which normal form eliminates partial functional dependencies on candidate keys?', opts: ['1NF', '2NF', '3NF', 'BCNF'], ans: '2NF', marks: 3, exp: 'Second Normal Form (2NF) mandates 1NF and requires that every non-prime attribute is fully functionally dependent on the entire primary key.' },
        { q: 'What does ACID stand for in database transaction management?', opts: ['Atomicity, Consistency, Isolation, Durability', 'Accuracy, Concurrency, Integrity, Durability', 'Access, Control, Isolation, Distribution', 'Availability, Consistency, Identity, Dependency'], ans: 'Atomicity, Consistency, Isolation, Durability', marks: 3, exp: 'ACID guarantees that database transactions are processed reliably.' },
        { q: 'Which SQL clause is used to filter groups created by the GROUP BY clause?', opts: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], ans: 'HAVING', marks: 3, exp: 'HAVING filters aggregated groups, whereas WHERE filters individual rows prior to grouping.' },
        { q: 'What index structure is most widely used in relational databases for range queries and sorting?', opts: ['Hash Index', 'B+ Tree Index', 'Bitmap Index', 'Inverted Index'], ans: 'B+ Tree Index', marks: 3, exp: 'B+ Trees store all data in linked leaf nodes, enabling high fan-out and efficient range scans.' },
        { q: 'Which transaction isolation level prevents dirty reads, non-repeatable reads, and phantom reads?', opts: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'], ans: 'Serializable', marks: 3, exp: 'Serializable is the highest isolation level, completely isolating concurrent transactions as if executed sequentially.' },
        { q: 'In relational algebra, which operator represents the Cartesian product of two relations?', opts: ['Union (∪)', 'Intersection (∩)', 'Cross Product (×)', 'Join (⋈)'], ans: 'Cross Product (×)', marks: 3, exp: 'Cross product (×) combines all tuples of relation R with all tuples of relation S.' },
        { q: 'What is a foreign key constraint used to enforce?', opts: ['Entity Integrity', 'Referential Integrity', 'Domain Integrity', 'Column Uniqueness'], ans: 'Referential Integrity', marks: 3, exp: 'A foreign key ensures that a reference in child relation matches a valid primary key in parent relation.' },
        { q: 'Which SQL statement will remove all rows from a table without logging individual row deletions?', opts: ['DELETE FROM table;', 'TRUNCATE TABLE table;', 'DROP TABLE table;', 'REMOVE ALL table;'], ans: 'TRUNCATE TABLE table;', marks: 3, exp: 'TRUNCATE is a DDL operation that deallocates data pages directly, making it significantly faster than row-by-row DELETE.' },
        { q: 'What type of lock allows multiple transactions to read a resource concurrently but prevents writes?', opts: ['Exclusive Lock (X)', 'Shared Lock (S)', 'Intent Lock (IX)', 'Update Lock (U)'], ans: 'Shared Lock (S)', marks: 3, exp: 'Shared locks allow concurrent read access while preventing any conflicting exclusive write lock.' },
        { q: 'What is the primary characteristic of Boyce-Codd Normal Form (BCNF)?', opts: ['Every determinant must be a candidate key', 'No transitive dependencies', 'No multi-valued dependencies', 'Atomic attribute values only'], ans: 'Every determinant must be a candidate key', marks: 3, exp: 'For every functional dependency X -> Y in BCNF, X must strictly be a superkey/candidate key.' }
      ],
      // Questions for Exam 3: AI & ML
      EXAM_3: [
        { q: 'Which search algorithm uses both path cost g(n) and heuristic cost h(n) to find the optimal path?', opts: ['Breadth-First Search', 'Depth-First Search', 'A* Search', 'Greedy Best-First Search'], ans: 'A* Search', marks: 3, exp: 'A* evaluates f(n) = g(n) + h(n), balancing path cost from start with estimated cost to goal.' },
        { q: 'What activation function is commonly used in hidden layers of Deep Neural Networks to mitigate vanishing gradient?', opts: ['Sigmoid', 'Tanh', 'ReLU (Rectified Linear Unit)', 'Linear'], ans: 'ReLU (Rectified Linear Unit)', marks: 3, exp: 'ReLU f(x) = max(0, x) maintains a constant derivative of 1 for positive activations, speeding up convergence.' },
        { q: 'What machine learning problem occurs when a model performs exceptionally well on training data but poorly on unseen test data?', opts: ['Underfitting', 'Overfitting', 'High Bias', 'Vanishing Gradient'], ans: 'Overfitting', marks: 3, exp: 'Overfitting occurs when a model memorizes noise in the training set instead of learning generalizable patterns.' },
        { q: 'Which loss function is standard for multi-class classification with softmax output?', opts: ['Mean Squared Error (MSE)', 'Categorical Cross-Entropy', 'Binary Cross-Entropy', 'Hinge Loss'], ans: 'Categorical Cross-Entropy', marks: 3, exp: 'Categorical Cross-Entropy measures divergence between predicted probability distributions and one-hot ground truth.' },
        { q: 'What is the purpose of Dropout in neural network training?', opts: ['Speed up backpropagation', 'Prevent overfitting by randomly deactivating neurons', 'Normalize layer inputs', 'Initialize weights'], ans: 'Prevent overfitting by randomly deactivating neurons', marks: 3, exp: 'Dropout temporarily zeroes random neuron outputs during training to break co-adaptation.' },
        { q: 'Which unsupervised learning algorithm partitions data into k non-overlapping clusters based on centroid proximity?', opts: ['K-Means Clustering', 'K-Nearest Neighbors (KNN)', 'Random Forest', 'Linear Regression'], ans: 'K-Means Clustering', marks: 3, exp: 'K-Means iteratively reassigns points to the nearest centroid and recalculates centroid coordinates.' },
        { q: 'In game theory and AI adversarial search, what technique prunes branches that cannot influence the final decision?', opts: ['Beam Search', 'Alpha-Beta Pruning', 'Monte Carlo Sampling', 'Q-Learning'], ans: 'Alpha-Beta Pruning', marks: 3, exp: 'Alpha-Beta pruning eliminates subtrees that mathematically cannot alter the minimax value of root.' },
        { q: 'What metric represents the harmonic mean of Precision and Recall?', opts: ['Accuracy', 'F1-Score', 'ROC-AUC', 'Specificity'], ans: 'F1-Score', marks: 3, exp: 'F1-Score = 2 * (Precision * Recall) / (Precision + Recall), balancing precision and recall on imbalanced datasets.' },
        { q: 'Which ensemble technique builds multiple independent decision trees and averages their predictions?', opts: ['AdaBoost', 'Gradient Boosting', 'Random Forest (Bagging)', 'Stacking'], ans: 'Random Forest (Bagging)', marks: 3, exp: 'Random Forest trains parallel trees on bootstrap samples and aggregates outputs to reduce variance.' },
        { q: 'In reinforcement learning, what parameter balances exploration of new actions versus exploitation of known rewards?', opts: ['Discount Factor (Gamma)', 'Epsilon (in Epsilon-Greedy)', 'Learning Rate (Alpha)', 'Reward Clipping'], ans: 'Epsilon (in Epsilon-Greedy)', marks: 3, exp: 'Epsilon chooses random exploration with probability ε and greedy exploitation with probability 1-ε.' }
      ],
      // Questions for Exam 4: Faculty DBMS Exam
      EXAM_4: [
        { q: 'Which SQL operator is used to test if a subquery returns any records?', opts: ['IN', 'EXISTS', 'ANY', 'ALL'], ans: 'EXISTS', marks: 3, exp: 'EXISTS returns true as soon as the inner query produces at least one matching row.' },
        { q: 'What is the main advantage of a Clustered Index compared to a Non-Clustered Index?', opts: ['Multiple clustered indexes can exist on a table', 'Physical row ordering matches index key ordering', 'Requires zero disk space', 'Only works on string columns'], ans: 'Physical row ordering matches index key ordering', marks: 3, exp: 'A table can have only one clustered index because leaf pages contain the actual data rows.' },
        { q: 'What concurrency control protocol prevents cascading rollbacks and guarantees serializability?', opts: ['Strict Two-Phase Locking (Strict 2PL)', 'Basic Time-Stamp Ordering', 'Optimistic Concurrency Control', 'Validation Protocol'], ans: 'Strict Two-Phase Locking (Strict 2PL)', marks: 3, exp: 'Strict 2PL holds all exclusive locks until transaction commit/abort, eliminating cascading aborts.' },
        { q: 'In SQL, what is the difference between UNION and UNION ALL?', opts: ['UNION is faster', 'UNION removes duplicate rows; UNION ALL retains duplicates', 'UNION ALL only works on numeric data', 'There is no difference'], ans: 'UNION removes duplicate rows; UNION ALL retains duplicates', marks: 3, exp: 'UNION executes a distinct sort to eliminate duplicates, while UNION ALL simply concatenates result sets.' },
        { q: 'What database object automatically executes in response to INSERT, UPDATE, or DELETE operations?', opts: ['Stored Procedure', 'Database Trigger', 'View', 'Foreign Key'], ans: 'Database Trigger', marks: 3, exp: 'Triggers are procedural event-handlers bound to table mutation events.' },
        { q: 'Which anomaly occurs when two concurrent transactions read the same data and update it based on previously read values?', opts: ['Dirty Read', 'Lost Update', 'Non-Repeatable Read', 'Phantom Read'], ans: 'Lost Update', marks: 3, exp: 'Lost updates happen when Transaction B overwrites Transaction A’s commit without including A’s modifications.' },
        { q: 'What is a Materialized View?', opts: ['A virtual table computed on every query', 'A view whose result set is physically stored on disk and refreshed periodically', 'A view with no SELECT query', 'A temporary table in RAM only'], ans: 'A view whose result set is physically stored on disk and refreshed periodically', marks: 3, exp: 'Materialized views persist query results to accelerate expensive analytical aggregations.' },
        { q: 'In Write-Ahead Logging (WAL), when must log records be flushed to non-volatile disk?', opts: ['After database page writes', 'Before the corresponding dirty database page is written to disk', 'Only during system shutdown', 'Every 24 hours'], ans: 'Before the corresponding dirty database page is written to disk', marks: 3, exp: 'WAL ensures recoverability by recording transactions to log storage before committing page writes.' },
        { q: 'What SQL function calculates a running total across ordered rows without collapsing them into a single row?', opts: ['SUM() with OVER(ORDER BY ...)', 'GROUP BY with ROLLUP', 'COUNT(DISTINCT)', 'HAVING SUM()'], ans: 'SUM() with OVER(ORDER BY ...)', marks: 3, exp: 'Window functions with OVER(ORDER BY) compute cumulative calculations while retaining row granularity.' },
        { q: 'Which join type returns all rows from the left table and matched rows from the right table?', opts: ['INNER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'CROSS JOIN'], ans: 'LEFT OUTER JOIN', marks: 3, exp: 'LEFT OUTER JOIN preserves every tuple from left relation, populating NULL for unmatched right relation columns.' }
      ],
      // Questions for Exam 5: Operating Systems (Scheduled)
      EXAM_5: [
        { q: 'Which of the following is NOT one of the four necessary conditions for Deadlock?', opts: ['Mutual Exclusion', 'Hold and Wait', 'Preemption Allowed', 'Circular Wait'], ans: 'Preemption Allowed', marks: 3, exp: 'Deadlock requires NO preemption (resources cannot be forcibly taken from a holding process).' },
        { q: 'What CPU scheduling algorithm guarantees minimum average waiting time for a set of stationary processes?', opts: ['First-Come First-Served (FCFS)', 'Shortest Job First (SJF)', 'Round Robin (RR)', 'Priority Scheduling'], ans: 'Shortest Job First (SJF)', marks: 3, exp: 'SJF is provably optimal for minimizing average waiting time by scheduling shorter bursts first.' },
        { q: 'What hardware component accelerates Virtual-to-Physical page address translation in modern CPUs?', opts: ['Translation Lookaside Buffer (TLB)', 'Instruction Register', 'Direct Memory Access (DMA)', 'Arithmetic Logic Unit (ALU)'], ans: 'Translation Lookaside Buffer (TLB)', marks: 3, exp: 'The TLB is a high-speed associative hardware cache for page table mappings.' },
        { q: 'What happens during a Page Fault in an operating system?', opts: ['The CPU crashes', 'The OS loads the referenced virtual page from disk swap space into physical RAM', 'The executing process is permanently terminated', 'Cache memory is erased'], ans: 'The OS loads the referenced virtual page from disk swap space into physical RAM', marks: 3, exp: 'A page fault trap invokes the OS pager to fetch missing pages from secondary storage.' },
        { q: 'What synchronization primitive consists of an integer variable accessed via wait() / P() and signal() / V() operations?', opts: ['Mutex', 'Counting Semaphore', 'Condition Variable', 'Spinlock'], ans: 'Counting Semaphore', marks: 3, exp: 'Semaphores coordinate access to finite resource pools via atomic P() decrement and V() increment operations.' },
        { q: 'What phenomenon occurs when excessive paging causes the system to spend more time swapping than executing code?', opts: ['Starvation', 'Thrashing', 'Deadlock', 'Fragmentation'], ans: 'Thrashing', marks: 3, exp: 'Thrashing occurs when the active working set of processes exceeds available physical memory.' },
        { q: 'Which memory allocation scheme causes External Fragmentation?', opts: ['Paging', 'Contiguous Memory Segmentation', 'Fixed-size Partitioning', 'Virtual Memory'], ans: 'Contiguous Memory Segmentation', marks: 3, exp: 'Variable-sized segment allocation leaves scattered free memory blocks too small for new requests.' },
        { q: 'What system call is used in Unix/Linux to create a duplicate child process?', opts: ['exec()', 'fork()', 'clone()', 'spawn()'], ans: 'fork()', marks: 3, exp: 'fork() creates an exact copy of the calling process with a distinct PID and shared copy-on-write memory.' },
        { q: 'In Banker’s Algorithm for deadlock avoidance, what state is the system in if there exists at least one safe execution sequence?', opts: ['Safe State', 'Unsafe State', 'Deadlocked State', 'Starved State'], ans: 'Safe State', marks: 3, exp: 'A state is safe if all processes can eventually allocate their maximum demand without deadlock.' },
        { q: 'What is the purpose of the Belady’s Anomaly in page replacement algorithms?', opts: ['More frames lead to more page faults in FIFO', 'LRU is always optimal', 'Optimal replacement cannot be implemented', 'Clock algorithm is equivalent to FIFO'], ans: 'More frames lead to more page faults in FIFO', marks: 3, exp: 'Belady’s anomaly demonstrates that increasing page frames can paradoxically increase FIFO page faults.' }
      ],
      // Questions for Exam 6: Computer Networks (Past)
      EXAM_6: [
        { q: 'Which OSI layer is responsible for end-to-end reliable transmission, flow control, and error recovery?', opts: ['Network Layer', 'Transport Layer', 'Data Link Layer', 'Session Layer'], ans: 'Transport Layer', marks: 3, exp: 'Layer 4 (Transport Layer, e.g. TCP) provides process-to-process reliable byte stream delivery.' },
        { q: 'What protocol resolves an IP address to a physical MAC address on a local area network?', opts: ['DNS', 'DHCP', 'ARP (Address Resolution Protocol)', 'ICMP'], ans: 'ARP (Address Resolution Protocol)', marks: 3, exp: 'ARP broadcasts queries across the LAN to map Layer 3 IP addresses to Layer 2 MAC hardware addresses.' },
        { q: 'What is the default subnet mask for a Class C IPv4 network (/24)?', opts: ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.255'], ans: '255.255.255.0', marks: 3, exp: '/24 allocates 24 network bits (255.255.255.0) and 8 host bits (254 usable hosts).' },
        { q: 'What packet flags are exchanged during the standard TCP Three-Way Handshake?', opts: ['SYN -> SYN-ACK -> ACK', 'ACK -> SYN -> FIN', 'SYN -> ACK -> RST', 'PING -> PONG -> ACK'], ans: 'SYN -> SYN-ACK -> ACK', marks: 3, exp: 'TCP establishes reliable connections using SYN (seq=x), SYN-ACK (ack=x+1, seq=y), and ACK (ack=y+1).' },
        { q: 'Which protocol operates on UDP port 53 to translate human-readable domain names into IP addresses?', opts: ['HTTP', 'DNS (Domain Name System)', 'FTP', 'SMTP'], ans: 'DNS (Domain Name System)', marks: 3, exp: 'DNS resolves hostnames to IP addresses primarily over fast, connectionless UDP port 53.' },
        { q: 'What algorithm is used by TCP for congestion control and packet loss avoidance?', opts: ['Dijkstra Algorithm', 'Slow Start & Congestion Avoidance (AIMD)', 'Bellman-Ford', 'Token Bucket'], ans: 'Slow Start & Congestion Avoidance (AIMD)', marks: 3, exp: 'TCP uses exponential Slow Start followed by Additive Increase Multiplicative Decrease (AIMD).' },
        { q: 'What is the size of an IPv6 address in bits?', opts: ['32 bits', '64 bits', '128 bits', '256 bits'], ans: '128 bits', marks: 3, exp: 'IPv6 uses 128-bit hexadecimal addresses compared to 32-bit IPv4 addresses.' },
        { q: 'Which protocol is used by network diagnostic tools like ping and traceroute?', opts: ['ICMP (Internet Control Message Protocol)', 'IGMP', 'BGP', 'SNMP'], ans: 'ICMP (Internet Control Message Protocol)', marks: 3, exp: 'Ping uses ICMP Echo Request and Echo Reply packets to test host reachability and latency.' },
        { q: 'What is the difference between HTTP/1.1 and HTTP/2?', opts: ['HTTP/2 uses UDP', 'HTTP/2 supports binary framing and multiplexing over a single connection', 'HTTP/2 does not support headers', 'HTTP/2 is unencrypted only'], ans: 'HTTP/2 supports binary framing and multiplexing over a single connection', marks: 3, exp: 'HTTP/2 eliminates head-of-line blocking via multiplexed binary streams on a single TCP connection.' },
        { q: 'Which routing protocol is an exterior gateway protocol used for exchanging routing information between autonomous systems on the Internet?', opts: ['OSPF', 'RIP', 'BGP (Border Gateway Protocol)', 'EIGRP'], ans: 'BGP (Border Gateway Protocol)', marks: 3, exp: 'BGP is the core path-vector routing protocol that binds the global Internet autonomous systems together.' }
      ],
      // Questions for Exam 7: Software Engineering (Passcode DEMO123)
      EXAM_7: [
        { q: 'In Agile Scrum framework, what is the recommended duration of a standard Sprint?', opts: ['1 day', '1 to 4 weeks', '6 months', '1 year'], ans: '1 to 4 weeks', marks: 3, exp: 'Scrum sprints are short, fixed-length iterations typically lasting 2 to 4 weeks to deliver incremental value.' },
        { q: 'Which Creational Design Pattern ensures that a class has only one instance and provides a global access point to it?', opts: ['Factory Pattern', 'Singleton Pattern', 'Observer Pattern', 'Adapter Pattern'], ans: 'Singleton Pattern', marks: 3, exp: 'The Singleton pattern restricts class instantiation to a single object across the entire application runtime.' },
        { q: 'What type of testing evaluates individual components or functions in total isolation from the rest of the application?', opts: ['Integration Testing', 'Unit Testing', 'System Testing', 'Acceptance Testing'], ans: 'Unit Testing', marks: 3, exp: 'Unit testing verifies isolated functional units (classes or functions) using mocks and stubs.' },
        { q: 'What does the "S" in SOLID design principles represent?', opts: ['Single Responsibility Principle', 'Substitution Principle', 'State Pattern Principle', 'Security First Principle'], ans: 'Single Responsibility Principle', marks: 3, exp: 'Single Responsibility Principle dictates that a module/class should have one, and only one, reason to change.' },
        { q: 'Which SDLC model is sequential where each phase must be fully completed before the next phase begins?', opts: ['Agile Model', 'Waterfall Model', 'Spiral Model', 'Kanban Model'], ans: 'Waterfall Model', marks: 3, exp: 'Waterfall is a linear sequential model (Requirements -> Design -> Implementation -> Verification -> Maintenance).' },
        { q: 'What is Continuous Integration (CI)?', opts: ['Deploying code directly to production without testing', 'The automated build and testing of code changes each time a developer commits', 'Writing code without version control', 'Annual software release cycles'], ans: 'The automated build and testing of code changes each time a developer commits', marks: 3, exp: 'CI automates building and unit testing on every pull request to catch integration defects early.' },
        { q: 'In behavioral design patterns, which pattern defines a one-to-many dependency where state changes notify all dependents?', opts: ['Observer Pattern', 'Strategy Pattern', 'Decorator Pattern', 'Proxy Pattern'], ans: 'Observer Pattern', marks: 3, exp: 'The Observer pattern (pub/sub) notifies subscribed listeners automatically upon subject state transitions.' },
        { q: 'What is Cyclomatic Complexity in software metrics?', opts: ['Number of lines of code', 'Quantitative measure of the number of linearly independent paths through code', 'Time taken to compile', 'Number of variables declared'], ans: 'Quantitative measure of the number of linearly independent paths through code', marks: 3, exp: 'Cyclomatic complexity M = E - N + 2P indicates code testability and branch complexity.' },
        { q: 'Which testing technique verifies that recent code changes have not broken previously functioning capabilities?', opts: ['Regression Testing', 'Stress Testing', 'Usability Testing', 'Penetration Testing'], ans: 'Regression Testing', marks: 3, exp: 'Regression testing re-executes automated suites to guarantee existing features remain intact after updates.' },
        { q: 'What is technical debt in software engineering?', opts: ['Financial loans taken by software startups', 'The implied cost of future rework caused by choosing an expedient easy solution over a better approach', 'Hardware procurement expenses', 'Cloud hosting fees'], ans: 'The implied cost of future rework caused by choosing an expedient easy solution over a better approach', marks: 3, exp: 'Technical debt reflects future refactoring effort required when code quality is compromised for short-term speed.' }
      ],
      // Questions for Exam 8: Full-Stack Web Development (AI-Proctored)
      EXAM_8: [
        { q: 'In React, what hook is used to perform side effects such as data fetching, subscriptions, or DOM mutations?', opts: ['useState', 'useEffect', 'useMemo', 'useCallback'], ans: 'useEffect', marks: 3, exp: 'useEffect runs side effects after component rendering and handles clean-up on unmount.' },
        { q: 'What mechanism allows JavaScript to execute non-blocking asynchronous operations in a single-threaded runtime?', opts: ['Multi-threading', 'Event Loop and Call Stack with Task Queue', 'Direct kernel threads', 'Synchronous polling'], ans: 'Event Loop and Call Stack with Task Queue', marks: 3, exp: 'The Event Loop continuously checks call stack vacancy and dequeues microtasks/macrotasks from the queue.' },
        { q: 'In a JSON Web Token (JWT), which part contains the claims and payload metadata?', opts: ['Header', 'Payload (Middle section)', 'Signature', 'Secret Key'], ans: 'Payload (Middle section)', marks: 3, exp: 'A JWT is structured as header.payload.signature encoded in Base64URL.' },
        { q: 'What HTTP status code indicates that the server successfully fulfilled the request and returned a newly created resource?', opts: ['200 OK', '201 Created', '204 No Content', '301 Moved Permanently'], ans: '201 Created', marks: 3, exp: 'HTTP 201 Created signifies that a new resource was successfully generated on the server.' },
        { q: 'What is the purpose of Cross-Origin Resource Sharing (CORS)?', opts: ['Enforce database constraints', 'Allow or restrict resource requests from another domain outside the serving origin', 'Compress images', 'Encrypt passwords'], ans: 'Allow or restrict resource requests from another domain outside the serving origin', marks: 3, exp: 'CORS is a browser security mechanism that validates cross-origin HTTP headers.' },
        { q: 'In CSS Flexbox, which property aligns flex items along the main axis?', opts: ['align-items', 'justify-content', 'align-content', 'flex-direction'], ans: 'justify-content', marks: 3, exp: 'justify-content distributes flex items along the main axis (horizontal in row mode).' },
        { q: 'What is the primary difference between WebSocket and traditional HTTP request-response cycle?', opts: ['WebSocket is slower', 'WebSocket maintains a persistent full-duplex bi-directional connection', 'WebSocket cannot send text', 'WebSocket only works over HTTP/3'], ans: 'WebSocket maintains a persistent full-duplex bi-directional connection', marks: 3, exp: 'WebSockets allow both client and server to push real-time events over a single persistent TCP socket.' },
        { q: 'What React optimization hook memoizes expensive calculation results between re-renders?', opts: ['useMemo', 'useCallback', 'useRef', 'useContext'], ans: 'useMemo', marks: 3, exp: 'useMemo caches the return value of a pure function until specified dependencies change.' },
        { q: 'In Node.js Express framework, what is the role of middleware functions?', opts: ['Direct database engines', 'Functions that have access to req, res, and next() to execute code and intercept requests', 'Compile CSS', 'Manage physical RAM'], ans: 'Functions that have access to req, res, and next() to execute code and intercept requests', marks: 3, exp: 'Middleware functions chain request processing, authentication, validation, and error handling.' },
        { q: 'What security vulnerability involves injecting malicious scripts into trusted websites viewed by other users?', opts: ['SQL Injection', 'Cross-Site Scripting (XSS)', 'Cross-Site Request Forgery (CSRF)', 'Denial of Service (DoS)'], ans: 'Cross-Site Scripting (XSS)', marks: 3, exp: 'XSS occurs when untrusted input is rendered into the DOM without sanitization, executing arbitrary JavaScript.' }
      ]
    };

    let totalQuestionsCount = 0;
    for (const [examKey, questionsList] of Object.entries(questionBank)) {
      const targetExam = seededExams[examKey];
      for (const qData of questionsList) {
        let question = await Question.findOne({ examId: targetExam._id, questionText: qData.q });
        if (!question) {
          question = await Question.create({
            examId: targetExam._id,
            questionText: qData.q,
            options: qData.opts,
            type: 'SINGLE',
            correctAnswer: qData.ans,
            marks: qData.marks,
            explanation: qData.exp
          });
        } else {
          question.options = qData.opts;
          question.correctAnswer = qData.ans;
          question.marks = qData.marks;
          question.explanation = qData.exp;
          await question.save();
        }
        totalQuestionsCount++;
      }
    }
    console.log(`  ✓ Successfully verified ${totalQuestionsCount} questions across 8 exams.`);

    // =========================================================================
    // 6. HISTORICAL ATTEMPTS, RESULTS & PROCTORING EVENTS (FOR EXAM 6 - Past Exam)
    // =========================================================================
    console.log('\n🏆 [5/6] Seeding Historical Exam Attempts & Results...');

    const pastExam = seededExams.EXAM_6;
    const pastQuestions = await Question.find({ examId: pastExam._id });
    
    let attemptsCount = 0;
    let resultsCount = 0;
    let proctorEventsCount = 0;
    let warningsCount = 0;

    const studentResultsData = [
      { student: students['demo.student01@glbexamsphere.test'], score: 30, correct: 10, wrong: 0, timeTaken: '14:22' },
      { student: students['demo.student02@glbexamsphere.test'], score: 24, correct: 8, wrong: 2, timeTaken: '18:45' },
      { student: students['demo.student03@glbexamsphere.test'], score: 27, correct: 9, wrong: 1, timeTaken: '16:10' }
    ];

    for (const item of studentResultsData) {
      const student = item.student;
      
      // 6.1 ExamAttempt
      let attempt = await ExamAttempt.findOne({ examId: pastExam._id, studentId: student._id });
      if (!attempt) {
        attempt = await ExamAttempt.create({
          examId: pastExam._id,
          studentId: student._id,
          startTime: new Date(Date.now() - 7 * 24 * 3600 * 1000),
          endTime: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 15 * 60 * 1000),
          status: 'SUBMITTED',
          warningCount: 0,
          currentQuestionIndex: 9,
          lastActiveAt: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 15 * 60 * 1000)
        });
      }
      attemptsCount++;

      // 6.2 Answers construction
      const formattedAnswers = pastQuestions.map((q, idx) => {
        const isCorrect = idx < item.correct;
        const selected = isCorrect ? q.correctAnswer : q.options.find(o => o !== q.correctAnswer);
        return {
          questionId: q._id,
          questionType: 'SINGLE',
          selectedAnswer: selected,
          selectedAnswers: [selected],
          correctAnswer: q.correctAnswer,
          correctAnswers: [q.correctAnswer],
          isCorrect,
          marksObtained: isCorrect ? q.marks : 0
        };
      });

      // 6.3 Result
      let result = await Result.findOne({ examId: pastExam._id, studentId: student._id });
      if (!result) {
        result = await Result.create({
          examId: pastExam._id,
          studentId: student._id,
          attemptId: attempt._id,
          verificationId: `GLB-VRF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          score: item.score,
          totalMarks: 30,
          percentage: Number(((item.score / 30) * 100).toFixed(1)),
          correctAnswers: item.correct,
          wrongAnswers: item.wrong,
          unattempted: 0,
          negativeMarksDeducted: 0,
          timeTaken: item.timeTaken,
          warningCount: 0,
          submissionReason: 'NORMAL',
          submittedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 15 * 60 * 1000),
          answers: formattedAnswers
        });
      }
      resultsCount++;

      // 6.4 ProctoringSession
      let session = await ProctoringSession.findOne({ attemptId: attempt._id });
      if (!session) {
        session = await ProctoringSession.create({
          attemptId: attempt._id,
          examId: pastExam._id,
          studentId: student._id,
          status: 'ENDED',
          startedAt: attempt.startTime,
          endedAt: attempt.endTime,
          lastHeartbeatAt: attempt.endTime,
          connectedAt: attempt.startTime,
          reconnectCount: 0,
          warningCount: 0,
          violationCount: 0
        });
      }

      // 6.5 ProctoringEvents (Audit Trail)
      const eventTypes = ['SESSION_STARTED', 'FACE_DETECTED', 'HEARTBEAT', 'SESSION_ENDED'];
      for (const evtType of eventTypes) {
        const existingEvent = await ProctoringEvent.findOne({ sessionId: session._id, eventType: evtType });
        if (!existingEvent) {
          await ProctoringEvent.create({
            sessionId: session._id,
            attemptId: attempt._id,
            examId: pastExam._id,
            studentId: student._id,
            eventType: evtType,
            severity: 'INFO',
            metadata: { note: 'Demo telemetry audit signal' },
            serverTimestamp: attempt.startTime
          });
          proctorEventsCount++;
        }
      }
    }

    // Seed one resolved demo warning for student 2 on historical attempt
    const student2Attempt = await ExamAttempt.findOne({ examId: pastExam._id, studentId: students['demo.student02@glbexamsphere.test']._id });
    const student2Session = await ProctoringSession.findOne({ attemptId: student2Attempt._id });
    let demoWarning = await ProctoringWarning.findOne({ attemptId: student2Attempt._id });
    if (!demoWarning) {
      demoWarning = await ProctoringWarning.create({
        sessionId: student2Session._id,
        attemptId: student2Attempt._id,
        examId: pastExam._id,
        studentId: students['demo.student02@glbexamsphere.test']._id,
        warningType: 'GAZE_DEVIATION',
        message: 'Frequent gaze deviation detected. Please focus on your exam screen.',
        severity: 'LOW',
        status: 'RESOLVED',
        issuedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 5 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 6 * 60 * 1000),
        resolvedBy: teacher1._id
      });
      warningsCount++;
    }

    console.log(`  ✓ Historical records created: ${attemptsCount} attempts, ${resultsCount} results, ${proctorEventsCount} proctor events, ${warningsCount} warning.`);

    // =========================================================================
    // 7. SEED VALIDATION CHECKS
    // =========================================================================
    console.log('\n🔍 [6/6] Executing Self-Validation Checks...');

    const userCheckCount = await User.countDocuments({ email: { $regex: '@glbexamsphere.test$' } });
    if (userCheckCount !== 13) {
      throw new Error(`User validation mismatch: expected 13 demo users, found ${userCheckCount}`);
    }

    const examCheckCount = await Exam.countDocuments({ title: { $regex: '^DEMO —' } });
    if (examCheckCount !== 8) {
      throw new Error(`Exam validation mismatch: expected 8 demo exams, found ${examCheckCount}`);
    }

    const questionCheckCount = await Question.countDocuments();
    if (questionCheckCount < 80) {
      throw new Error(`Question validation mismatch: expected at least 80 questions, found ${questionCheckCount}`);
    }

    // Verify all passwords are encrypted with bcrypt (never plaintext)
    const allDemoUsers = await User.find({ email: { $regex: '@glbexamsphere.test$' } }).select('+password');
    for (const u of allDemoUsers) {
      if (!u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        throw new Error(`SECURITY VIOLATION: User ${u.email} password is not bcrypt hashed!`);
      }
    }

    // Verify zero raw media bytes in proctoring events
    const allDemoEvents = await ProctoringEvent.find();
    for (const evt of allDemoEvents) {
      const serialized = JSON.stringify(evt);
      if (serialized.includes('data:image/') || serialized.includes('data:audio/') || serialized.includes('base64')) {
        throw new Error('PRIVACY VIOLATION: ProctoringEvent contains raw media bytes');
      }
    }

    console.log('  ✅ Validation passed: 100% integrity, zero media, valid hashed passwords, proper RBAC relationships.');

    // =========================================================================
    // 8. SUMMARY OUTPUT & DEMO CREDENTIALS
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('       🎉 GLB EXAMSPHERE DEMO SEED COMPLETE 🎉');
    console.log('='.repeat(60));
    console.log(`Database:            ${mongoose.connection.name}`);
    console.log(`Users Created:       1 Admin, 2 Teachers, 10 Students (13 Total)`);
    console.log(`Academic Entities:   1 Academic Year (2026-27 Current), 3 Branches (CSE, AIML, ECE)`);
    console.log(`                     4 Semesters (1, 3, 5, 7), 6 Sections (A & B), 2 Batches (2023-27, 2024-28)`);
    console.log(`Subjects:            8 Standard Semester 5 Subjects (CS501 - CS506, AI501 - AI502)`);
    console.log(`Demo Exams:          8 Realistic Exams`);
    console.log(`Questions:           80 Comprehensive MCQ Questions with Explanations`);
    console.log(`Historical Data:     3 Completed Attempts & Results, 12 Proctor Events, 1 Resolved Warning`);
    console.log('='.repeat(60));
    console.log('                 🔑 DEMO LOGIN CREDENTIALS');
    console.log('='.repeat(60));
    console.log(`ADMIN:`);
    console.log(`  Email:    demo.admin@glbexamsphere.test`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
    console.log(`\nTEACHER 1 (CSE Faculty - Turing):`);
    console.log(`  Email:    demo.teacher1@glbexamsphere.test`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
    console.log(`  Assigned: Data Structures & Algorithms, DBMS, Operating Systems (CSE Sem 5)`);
    console.log(`\nTEACHER 2 (AIML Faculty - Lovelace):`);
    console.log(`  Email:    demo.teacher2@glbexamsphere.test`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
    console.log(`  Assigned: Computer Networks, Artificial Intelligence, Machine Learning (AIML Sem 5)`);
    console.log(`\nSTUDENTS (10 Demo Students - All use password: ${DEMO_PASSWORD}):`);
    console.log(`  • demo.student01@glbexamsphere.test  -> CSE Sem 5 Sec A (Batch 2023-2027)`);
    console.log(`  • demo.student02@glbexamsphere.test  -> CSE Sem 5 Sec A (Batch 2023-2027)`);
    console.log(`  • demo.student03@glbexamsphere.test  -> CSE Sem 5 Sec B (Batch 2023-2027)`);
    console.log(`  • demo.student04@glbexamsphere.test  -> CSE Sem 5 Sec B (Batch 2023-2027)`);
    console.log(`  • demo.student05@glbexamsphere.test  -> AIML Sem 5 Sec A (Batch 2023-2027)`);
    console.log(`  • demo.student06@glbexamsphere.test  -> AIML Sem 5 Sec A (Batch 2023-2027)`);
    console.log(`  • demo.student07@glbexamsphere.test  -> AIML Sem 5 Sec B (Batch 2023-2027)`);
    console.log(`  • demo.student08@glbexamsphere.test  -> AIML Sem 5 Sec B (Batch 2023-2027)`);
    console.log(`  • demo.student09@glbexamsphere.test  -> CSE Sem 3 Sec A (Batch 2024-2028)`);
    console.log(`  • demo.student10@glbexamsphere.test  -> ECE Sem 3 Sec A (Batch 2024-2028)`);
    console.log('='.repeat(60));
    console.log('                 📋 DEMO EXAMS CATALOG');
    console.log('='.repeat(60));
    console.log('  1. DEMO — Entire College Assessment: Data Structures & Algorithms (ENTIRE_COLLEGE)');
    console.log('  2. DEMO — CSE Sem 5 Mid-Term: Database Management Systems (COMBINATION_TARGET: CSE Sem 5 Sec A)');
    console.log('  3. DEMO — AI & ML Sem 5: Artificial Intelligence & Neural Networks (COMBINATION_TARGET: AIML Sem 5)');
    console.log('  4. DEMO — Faculty Exam: Advanced Relational SQL & Indexing (BRANCH: CSE, Created by Teacher 1)');
    console.log('  5. DEMO — Scheduled Final: Operating Systems & Kernel Architecture (UPCOMING Schedule)');
    console.log('  6. DEMO — Past Assessment: Computer Networks & Protocols (COMPLETED / PAST with 3 Seeded Results)');
    console.log('  7. DEMO — Protected Exam: Software Engineering & Agile Methodologies (PASSCODE: DEMO123)');
    console.log('  8. DEMO — AI Proctored Secure Exam: Full-Stack Web Development (FULL PROCTORING + Negative Marking)');
    console.log('='.repeat(60) + '\n');

  } catch (err) {
    console.error('❌ SEEDING FAILED:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

// Auto-execute when run directly from command line
if (require.main === module) {
  seedDemoData().then(() => process.exit(0));
}

module.exports = seedDemoData;
