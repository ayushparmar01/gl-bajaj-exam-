const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Result = require('../models/Result');

async function seedData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return;
    }

    console.log('⚡ Initializing demo seed data for GLB EXAMSPHERE...');

    // 1. Create Admin
    const admin = await User.create({
      name: 'Administrator',
      email: 'admin@exampro.com',
      password: 'password123',
      role: 'ADMIN',
      isVerified: true
    });

    // 2. Create Student
    const student = await User.create({
      name: 'Alex Student',
      email: 'student@exampro.com',
      password: 'password123',
      role: 'STUDENT',
      isVerified: true
    });

    // 3. Create Published Exam 1: JavaScript & Web Development
    const exam1 = await Exam.create({
      title: 'JavaScript & Web Development Fundamentals',
      description: 'Comprehensive quiz covering JavaScript core concepts, DOM, async/await, and modern ES6+ features.',
      duration: 15,
      passMarks: 3,
      totalMarks: 4,
      isPublished: false,
      allowMultipleAttempts: true,
      createdBy: admin._id
    });

    await Question.create([
      {
        examId: exam1._id,
        questionText: 'What is the evaluated output of typeof null in standard JavaScript?',
        options: ['"null"', '"object"', '"undefined"', '"number"'],
        correctAnswer: '"object"',
        marks: 1,
        explanation: 'In JavaScript, typeof null returns "object" due to an original legacy implementation quirk in JS engines.'
      },
      {
        examId: exam1._id,
        questionText: 'Which variable declaration keyword creates a block-scoped variable that cannot be reassigned?',
        options: ['var', 'let', 'const', 'function'],
        correctAnswer: 'const',
        marks: 1,
        explanation: 'const creates a read-only, block-scoped reference to a value that cannot be reassigned.'
      },
      {
        examId: exam1._id,
        questionText: 'Which Promise method resolves when all input promises have resolved, or rejects immediately if any fails?',
        options: ['Promise.race()', 'Promise.all()', 'Promise.any()', 'Promise.allSettled()'],
        correctAnswer: 'Promise.all()',
        marks: 1,
        explanation: 'Promise.all() aggregates an array of promises into a single promise that rejects if any input rejects.'
      },
      {
        examId: exam1._id,
        questionText: 'Which HTTP status code signifies "Created" when a new resource is successfully created on the server?',
        options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
        correctAnswer: '201 Created',
        marks: 1,
        explanation: 'HTTP status 201 Created confirms that the request succeeded and resulted in a new resource.'
      }
    ]);

    // 4. Create Published Exam 2: Database Systems & SQL Essentials (with Negative Marking)
    const exam2 = await Exam.create({
      title: 'Database Systems & SQL Essentials',
      description: 'Test your understanding of relational database design, SQL querying, primary keys, and joins.',
      duration: 20,
      passMarks: 2,
      totalMarks: 3,
      isPublished: false,
      allowMultipleAttempts: true,
      hasNegativeMarking: true,
      negativeMarks: 0.25,
      createdBy: admin._id
    });

    const q2List = await Question.create([
      {
        examId: exam2._id,
        questionText: 'Which SQL clause is used to filter groups created by the GROUP BY clause?',
        options: ['WHERE', 'HAVING', 'ORDER BY', 'FILTER'],
        correctAnswer: 'HAVING',
        marks: 1,
        explanation: 'HAVING filters aggregated groups, whereas WHERE filters individual rows before aggregation.'
      },
      {
        examId: exam2._id,
        questionText: 'Which constraint uniquely identifies each record in a database table and disallows NULL values?',
        options: ['FOREIGN KEY', 'PRIMARY KEY', 'UNIQUE', 'INDEX'],
        correctAnswer: 'PRIMARY KEY',
        marks: 1,
        explanation: 'A PRIMARY KEY uniquely identifies each record in a table and cannot contain NULL values.'
      },
      {
        examId: exam2._id,
        questionText: 'What type of JOIN returns all records when there is a match in either the left or right table?',
        options: ['INNER JOIN', 'FULL OUTER JOIN', 'LEFT JOIN', 'CROSS JOIN'],
        correctAnswer: 'FULL OUTER JOIN',
        marks: 1,
        explanation: 'FULL OUTER JOIN returns all records when there is a match in either table.'
      }
    ]);

    // 5. Create Draft Exam 3: Data Structures & Algorithms (Draft mode for Admin preview)
    const exam3 = await Exam.create({
      title: 'Data Structures & Algorithms Basics',
      description: 'Introductory assessment on arrays, stacks, queues, and time complexity.',
      duration: 25,
      passMarks: 2,
      totalMarks: 2,
      isPublished: false,
      allowMultipleAttempts: false,
      createdBy: admin._id
    });

    await Question.create([
      {
        examId: exam3._id,
        questionText: 'Which data structure follows the LIFO (Last In, First Out) principle?',
        options: ['Queue', 'Stack', 'Array', 'Linked List'],
        correctAnswer: 'Stack',
        marks: 1,
        explanation: 'A Stack follows Last-In-First-Out (LIFO) semantics.'
      },
      {
        examId: exam3._id,
        questionText: 'What is the average time complexity of searching in a balanced Binary Search Tree (BST)?',
        options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
        correctAnswer: 'O(log n)',
        marks: 1,
        explanation: 'In a balanced BST, search cuts the search space in half at each step, yielding O(log n).'
      }
    ]);

    // 6. Seed a completed result for the student on Exam 2 for instant analytics & history
    await Result.create({
      studentId: student._id,
      examId: exam2._id,
      verificationId: 'GLB-VRF-DEMO-SEED-001',
      answers: [
        {
          questionId: q2List[0]._id,
          selectedAnswer: 'HAVING',
          correctAnswer: 'HAVING',
          isCorrect: true,
          marksObtained: 1
        },
        {
          questionId: q2List[1]._id,
          selectedAnswer: 'PRIMARY KEY',
          correctAnswer: 'PRIMARY KEY',
          isCorrect: true,
          marksObtained: 1
        },
        {
          questionId: q2List[2]._id,
          selectedAnswer: 'INNER JOIN',
          correctAnswer: 'FULL OUTER JOIN',
          isCorrect: false,
          marksObtained: -0.25
        }
      ],
      score: 1.75,
      totalMarks: 3,
      percentage: 58.33,
      correctAnswers: 2,
      wrongAnswers: 1,
      unattempted: 0,
      negativeMarksDeducted: 0.25,
      timeTaken: '05:32',
      submittedAt: new Date(Date.now() - 3600000)
    });

    console.log('\n' + '='.repeat(58));
    console.log('  🎓 GLB EXAMSPHERE Demo Accounts Ready!');
    console.log('  --------------------------------------------------------');
    console.log('  👑 Admin:   admin@exampro.com  / password123');
    console.log('  👨‍🎓 Student: student@exampro.com / password123');
    console.log('='.repeat(58) + '\n');
  } catch (err) {
    console.error('Seed data error:', err.message);
  }
}

module.exports = seedData;
