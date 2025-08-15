#!/usr/bin/env node

/**
 * MongoDB to Convex Migration Script
 * 
 * This script migrates job postings and resumes from MongoDB to Convex
 * with vector embeddings for semantic search capabilities.
 * 
 * Usage:
 *   node scripts/migrate-to-convex.js [--jobs] [--resumes] [--all] [--status] [--cleanup]
 * 
 * Options:
 *   --jobs     Migrate job postings only
 *   --resumes  Migrate resumes only  
 *   --all      Migrate both jobs and resumes
 *   --status   Check migration status
 *   --cleanup  Clean up MongoDB data after migration (use with caution!)
 */

import { ConvexHttpClient } from "convex/browser";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

// Initialize Convex client
const convex = new ConvexHttpClient(CONVEX_URL);

// MongoDB connection string
let mongoUri;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  mongoUri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  mongoUri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

// MongoDB client
let mongoClient;

async function connectToMongoDB() {
  try {
    mongoClient = new MongoClient(mongoUri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
    });
    
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

async function disconnectFromMongoDB() {
  if (mongoClient) {
    await mongoClient.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function checkMigrationStatus() {
  try {
    console.log('📊 Checking migration status...');
    
    const status = await convex.action('migrations:getMigrationStatus');
    
    console.log('\n📈 Migration Progress:');
    console.log(`   Jobs: ${status.convex.jobs}/${status.mongodb.jobs} (${status.progress.jobs.toFixed(1)}%)`);
    console.log(`   Resumes: ${status.convex.resumes}/${status.mongodb.resumes} (${status.progress.resumes.toFixed(1)}%)`);
    
    if (status.progress.jobs >= 95 && status.progress.resumes >= 95) {
      console.log('\n🎉 Migration is nearly complete!');
      console.log('   You can now safely clean up MongoDB data.');
    } else if (status.progress.jobs > 0 || status.progress.resumes > 0) {
      console.log('\n🔄 Migration is in progress...');
      console.log('   Continue running migration until complete.');
    } else {
      console.log('\n🚀 Ready to start migration!');
    }
    
    return status;
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    return null;
  }
}

async function migrateJobPostings(batchSize = 100) {
  try {
    console.log(`🔄 Starting job postings migration (batch size: ${batchSize})...`);
    
    let totalMigrated = 0;
    let totalErrors = 0;
    let hasMore = true;
    let lastId = null;
    
    while (hasMore) {
      console.log(`\n📦 Processing batch starting from: ${lastId || 'beginning'}`);
      
      const result = await convex.action('migrations:migrateJobPostings', {
        batchSize,
        startFrom: lastId
      });
      
      totalMigrated += result.migrated;
      totalErrors += result.errors;
      lastId = result.lastId;
      hasMore = result.hasMore;
      
      console.log(`   ✅ Migrated: ${result.migrated}`);
      console.log(`   ❌ Errors: ${result.errors}`);
      console.log(`   📍 Last ID: ${lastId}`);
      console.log(`   🔄 Has more: ${hasMore}`);
      
      // Progress update
      console.log(`\n📊 Total Progress: ${totalMigrated} migrated, ${totalErrors} errors`);
      
      if (hasMore) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Job postings migration completed!`);
    console.log(`   Total migrated: ${totalMigrated}`);
    console.log(`   Total errors: ${totalErrors}`);
    
    return { totalMigrated, totalErrors };
  } catch (error) {
    console.error('❌ Error migrating job postings:', error.message);
    throw error;
  }
}

async function migrateResumes(batchSize = 100) {
  try {
    console.log(`🔄 Starting resumes migration (batch size: ${batchSize})...`);
    
    let totalMigrated = 0;
    let totalErrors = 0;
    let hasMore = true;
    let lastId = null;
    
    while (hasMore) {
      console.log(`\n📦 Processing batch starting from: ${lastId || 'beginning'}`);
      
      const result = await convex.action('migrations:migrateResumes', {
        batchSize,
        startFrom: lastId
      });
      
      totalMigrated += result.migrated;
      totalErrors += result.errors;
      lastId = result.lastId;
      hasMore = result.hasMore;
      
      console.log(`   ✅ Migrated: ${result.migrated}`);
      console.log(`   ❌ Errors: ${result.errors}`);
      console.log(`   📍 Last ID: ${lastId}`);
      console.log(`   🔄 Has more: ${hasMore}`);
      
      // Progress update
      console.log(`\n📊 Total Progress: ${totalMigrated} migrated, ${totalErrors} errors`);
      
      if (hasMore) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Resumes migration completed!`);
    console.log(`   Total migrated: ${totalMigrated}`);
    console.log(`   Total errors: ${totalErrors}`);
    
    return { totalMigrated, totalErrors };
  } catch (error) {
    console.error('❌ Error migrating resumes:', error.message);
    throw error;
  }
}

async function cleanupMongoDBData() {
  try {
    console.log('🧹 Starting MongoDB cleanup...');
    console.log('⚠️  This will permanently delete all job postings and resumes from MongoDB!');
    console.log('⚠️  Make sure migration is complete and data is verified in Convex first!');
    
    // Double-check migration status
    const status = await checkMigrationStatus();
    if (!status || status.progress.jobs < 95 || status.progress.resumes < 95) {
      console.error('❌ Migration not complete. Cannot cleanup MongoDB data yet.');
      return false;
    }
    
    console.log('\n🔍 Migration verification passed. Proceeding with cleanup...');
    
    const result = await convex.action('migrations:cleanupMongoDBData', {
      confirm: true
    });
    
    if (result.success) {
      console.log('✅ MongoDB cleanup completed successfully!');
      console.log(`   Dropped collections: ${result.droppedCollections.join(', ')}`);
      return true;
    } else {
      console.error('❌ MongoDB cleanup failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error during MongoDB cleanup:', error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 MongoDB to Convex Migration Script');
    console.log('\nUsage:');
    console.log('  node scripts/migrate-to-convex.js [--jobs] [--resumes] [--all] [--status] [--cleanup]');
    console.log('\nOptions:');
    console.log('  --jobs     Migrate job postings only');
    console.log('  --resumes  Migrate resumes only');
    console.log('  --all      Migrate both jobs and resumes');
    console.log('  --status   Check migration status');
    console.log('  --cleanup  Clean up MongoDB data after migration');
    return;
  }
  
  try {
    // Check if Convex URL is configured
    if (!CONVEX_URL) {
      console.error('❌ CONVEX_URL not configured. Please set VITE_CONVEX_URL or CONVEX_URL environment variable.');
      process.exit(1);
    }
    
    console.log('🚀 MongoDB to Convex Migration Script');
    console.log(`📍 Convex URL: ${CONVEX_URL}`);
    console.log(`📍 MongoDB: ${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`);
    console.log('');
    
    // Connect to MongoDB
    const mongoConnected = await connectToMongoDB();
    if (!mongoConnected) {
      process.exit(1);
    }
    
    // Process arguments
    if (args.includes('--status')) {
      await checkMigrationStatus();
    }
    
    if (args.includes('--jobs') || args.includes('--all')) {
      await migrateJobPostings();
    }
    
    if (args.includes('--resumes') || args.includes('--all')) {
      await migrateResumes();
    }
    
    if (args.includes('--cleanup')) {
      await cleanupMongoDBData();
    }
    
    // Show final status
    if (!args.includes('--status')) {
      console.log('\n📊 Final Migration Status:');
      await checkMigrationStatus();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await disconnectFromMongoDB();
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 