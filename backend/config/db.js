const mongoose = require('mongoose');

let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If currently connecting, wait until connection completes
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }

  // If a connection is already in progress via connectionPromise, reuse it
  if (connectionPromise) {
    return connectionPromise;
  }

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless && !process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in Vercel Environment Variables. Please add your MongoDB Atlas connection string in Vercel Project Settings -> Environment Variables.');
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exampro';

  connectionPromise = (async () => {
    try {
      // Attempt standard connection (Atlas or local) with 15s timeout on serverless
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: isServerless ? 15000 : 10000,
        maxPoolSize: isServerless ? 10 : 50
      });
      isConnected = true;
      console.log(`✅ MongoDB Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

      // Seed sample data if database is empty
      try {
        const seedData = require('./seed');
        await seedData();
      } catch (seedErr) {
        console.warn('Seed data warning:', seedErr.message);
      }

      // Sync indexes to ensure unique and partial indexes are cleanly maintained in MongoDB
      try {
        const Result = require('../models/Result');
        const resultIndexes = await Result.collection.indexes().catch(() => []);
        const oldAttemptIdx = resultIndexes.find((idx) => idx.name === 'attemptId_1');
        if (oldAttemptIdx && !oldAttemptIdx.partialFilterExpression) {
          await Result.collection.dropIndex('attemptId_1').catch(() => {});
        }
        await Result.syncIndexes();

        const Subject = require('../models/Subject');
        const subjectIndexes = await Subject.collection.indexes().catch(() => []);
        const staleSubjectCodeIdx = subjectIndexes.find((idx) => idx.name === 'code_1');
        if (staleSubjectCodeIdx) {
          await Subject.collection.dropIndex('code_1').catch(() => {});
        }
        await Subject.syncIndexes();

        const User = require('../models/User');
        const userIndexes = await User.collection.indexes().catch(() => []);
        for (const idxName of ['enrollmentNumber_1', 'rollNumber_1', 'employeeId_1']) {
          const existingIdx = userIndexes.find((idx) => idx.name === idxName);
          if (existingIdx && !existingIdx.partialFilterExpression) {
            await User.collection.dropIndex(idxName).catch(() => {});
          }
        }
        await User.syncIndexes();
      } catch (idxErr) {
        console.warn('Index sync warning:', idxErr.message);
      }

      return mongoose.connection;
    } catch (err) {
      console.warn(`\n⚠️  Standard MongoDB connection failed (${err.message}).`);

      // In production/serverless (e.g. Vercel), in-memory binary cannot be downloaded or executed
      if (isServerless || process.env.NODE_ENV === 'production') {
        console.error(
          '❌ Running on Vercel / Production. MongoMemoryServer fallback is disabled.\n' +
          '👉 Please set the MONGO_URI environment variable in your Vercel project settings to a MongoDB Atlas connection string.'
        );
        throw err;
      }

      console.warn(`⚠️  FALLING BACK TO IN-MEMORY DATABASE (MongoMemoryServer).`);
      console.warn(`⚠️  NOTICE: Data created in this session WILL NOT PERSIST across server restarts!\n`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const memoryUri = mongoServer.getUri();
        await mongoose.connect(memoryUri);
        isConnected = true;
        console.log(`MongoDB Memory Server Connected: ${memoryUri}`);

        const seedData = require('./seed');
        await seedData();
        const Result = require('../models/Result');
        await Result.syncIndexes();
        return mongoose.connection;
      } catch (memErr) {
        console.error(`Failed to start Mongo Memory Server: ${memErr.message}`);
        process.exit(1);
      }
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

module.exports = connectDB;
