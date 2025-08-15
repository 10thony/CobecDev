#!/usr/bin/env node

/**
 * MongoDB to Convex Migration Script
 * 
 * This script runs the complete migration from MongoDB to Convex.
 * It extracts data from MongoDB and inserts it into Convex tables.
 */

const { ConvexHttpClient } = require("convex/browser");
const { MongoClient, ServerApiVersion } = require("mongodb");

// Configuration
const CONVEX_URL = process.env.CONVEX_URL || "https://your-convex-url.convex.cloud";
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const mongoUri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

// Initialize Convex client
const convex = new ConvexHttpClient(CONVEX_URL);

async function runMigration() {
  let mongoClient;
  
  try {
    console.log('🚀 Starting MongoDB to Convex Migration...\n');
    
    // Step 1: Connect to MongoDB and validate data
    console.log('📊 Step 1: Validating MongoDB data...');
    mongoClient = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = mongoClient.db('workdemos');
    
    // Get counts from MongoDB
    const kfcCount = await db.collection('kfcpoints').countDocuments();
    const employeesCount = await db.collection('employees').countDocuments();
    const jobPostingsCount = await db.collection('jobpostings').countDocuments();
    const resumesCount = await db.collection('resumes').countDocuments();
    
    console.log('📊 MongoDB Data Summary:');
    console.log(`  • KFC Points: ${kfcCount}`);
    console.log(`  • Employees: ${employeesCount}`);
    console.log(`  • Job Postings: ${jobPostingsCount}`);
    console.log(`  • Resumes: ${resumesCount}\n`);
    
    // Step 2: Extract data from MongoDB using Convex actions
    console.log('🔄 Step 2: Extracting data from MongoDB...');
    
    const kfcData = await convex.action("migrations:migrateKfcData");
    console.log(`✅ KFC data extracted: ${kfcData.employees.length} employees, ${kfcData.kfcEntries.length} KFC entries`);
    
    const jobPostingsData = await convex.action("migrations:migrateJobPostings");
    console.log(`✅ Job postings extracted: ${jobPostingsData.jobPostings.length} jobs`);
    
    const resumesData = await convex.action("migrations:migrateResumes");
    console.log(`✅ Resumes extracted: ${resumesData.resumes.length} resumes\n`);
    
    // Step 3: Insert data into Convex
    console.log('🔄 Step 3: Inserting data into Convex...');
    
    // Insert KFC data
    const kfcInsertResult = await convex.mutation("migrationInsertions:insertKfcData", {
      employees: kfcData.employees,
      kfcEntries: kfcData.kfcEntries
    });
    console.log(`✅ KFC data inserted: ${kfcInsertResult.employees.success} employees, ${kfcInsertResult.kfcEntries.success} KFC entries`);
    
    // Insert job postings (in batches to avoid size limits)
    const jobBatchSize = 50;
    let totalJobSuccess = 0;
    for (let i = 0; i < jobPostingsData.jobPostings.length; i += jobBatchSize) {
      const batch = jobPostingsData.jobPostings.slice(i, i + jobBatchSize);
      const jobInsertResult = await convex.mutation("migrationInsertions:insertJobPostings", {
        jobPostings: batch
      });
      totalJobSuccess += jobInsertResult.successful;
      console.log(`✅ Job batch ${Math.floor(i / jobBatchSize) + 1} inserted: ${jobInsertResult.successful}/${batch.length}`);
    }
    
    // Insert resumes (in batches to avoid size limits)
    const resumeBatchSize = 20;
    let totalResumeSuccess = 0;
    for (let i = 0; i < resumesData.resumes.length; i += resumeBatchSize) {
      const batch = resumesData.resumes.slice(i, i + resumeBatchSize);
      const resumeInsertResult = await convex.mutation("migrationInsertions:insertResumes", {
        resumes: batch
      });
      totalResumeSuccess += resumeInsertResult.successful;
      console.log(`✅ Resume batch ${Math.floor(i / resumeBatchSize) + 1} inserted: ${resumeInsertResult.successful}/${batch.length}`);
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Final Summary:');
    console.log(`  • KFC Data: ${kfcInsertResult.employees.success} employees, ${kfcInsertResult.kfcEntries.success} KFC entries`);
    console.log(`  • Job Postings: ${totalJobSuccess}/${jobPostingsData.jobPostings.length}`);
    console.log(`  • Resumes: ${totalResumeSuccess}/${resumesData.resumes.length}`);
    
    // Step 4: Validate migration
    console.log('\n🔍 Step 4: Validating migration...');
    const validation = await convex.action("migrations:validateMigration");
    console.log('📊 Validation Results:');
    console.log(`  • MongoDB KFC: ${validation.mongodbCounts.kfc}`);
    console.log(`  • MongoDB Employees: ${validation.mongodbCounts.employees}`);
    console.log(`  • MongoDB Job Postings: ${validation.mongodbCounts.jobPostings}`);
    console.log(`  • MongoDB Resumes: ${validation.mongodbCounts.resumes}`);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('  1. Update components to use Convex queries/mutations');
    console.log('  2. Test all functionality');
    console.log('  3. Remove MongoDB dependencies');
    console.log('  4. Update documentation');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration }; 