#!/usr/bin/env node

/**
 * MongoDB Backup Script
 * 
 * This script creates a backup of all MongoDB data before migration.
 * It exports data to JSON files for safety.
 */

const { MongoClient } = require("mongodb");
const fs = require("fs").promises;
const path = require("path");

// Configuration
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let mongoUri;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  mongoUri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  mongoUri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

// Helper function to convert MongoDB documents to JSON-safe format
function convertMongoDocument(doc) {
  if (!doc) return doc;

  // If this is an ObjectId, convert to string
  if (doc.constructor && doc.constructor.name === 'ObjectId' && doc.toString) {
    return doc.toString();
  }

  // If this is an array, recursively convert each element
  if (Array.isArray(doc)) {
    return doc.map(item => convertMongoDocument(item));
  }

  // If this is an object, recursively convert each property
  if (typeof doc === 'object') {
    const newDoc = {};
    for (const [key, value] of Object.entries(doc)) {
      newDoc[key] = convertMongoDocument(value);
    }
    return newDoc;
  }

  // Otherwise, return as is
  return doc;
}

async function createBackup() {
  let client;
  
  try {
    console.log('🔄 Creating MongoDB backup...\n');
    
    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups', `mongodb-backup-${new Date().toISOString().split('T')[0]}`);
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`📁 Backup directory created: ${backupDir}`);
    
    // Connect to MongoDB
    client = new MongoClient(mongoUri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // No SSL/TLS needed for local MongoDB
      // No serverApi version needed for local MongoDB
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('workdemos');
    
    // Collections to backup
    const collections = [
      'kfcpoints',
      'employees', 
      'jobpostings',
      'resumes',
      'nominations',
      'cobecadmins'
    ];
    
    const backupSummary = {};
    
    for (const collectionName of collections) {
      try {
        console.log(`📊 Backing up ${collectionName}...`);
        
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        // Convert documents to JSON-safe format
        const convertedDocuments = documents.map(doc => convertMongoDocument(doc));
        
        // Write to file
        const backupFile = path.join(backupDir, `${collectionName}.json`);
        await fs.writeFile(backupFile, JSON.stringify(convertedDocuments, null, 2));
        
        backupSummary[collectionName] = {
          count: documents.length,
          file: backupFile,
          size: (await fs.stat(backupFile)).size
        };
        
        console.log(`✅ ${collectionName}: ${documents.length} documents backed up`);
        
      } catch (error) {
        console.error(`❌ Failed to backup ${collectionName}:`, error.message);
        backupSummary[collectionName] = {
          error: error.message
        };
      }
    }
    
    // Create backup summary
    const summaryFile = path.join(backupDir, 'backup-summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      collections: backupSummary,
      totalDocuments: Object.values(backupSummary).reduce((sum, info) => {
        return sum + (info.count || 0);
      }, 0)
    };
    
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Backup completed successfully!');
    console.log('📊 Backup Summary:');
    console.log(`  • Backup location: ${backupDir}`);
    console.log(`  • Total documents: ${summary.totalDocuments}`);
    console.log(`  • Collections backed up: ${Object.keys(backupSummary).length}`);
    
    // Display collection details
    for (const [collectionName, info] of Object.entries(backupSummary)) {
      if (info.error) {
        console.log(`  • ${collectionName}: ❌ ${info.error}`);
      } else {
        console.log(`  • ${collectionName}: ${info.count} documents (${(info.size / 1024).toFixed(1)} KB)`);
      }
    }
    
    console.log('\n📝 Backup files:');
    console.log(`  • Summary: ${summaryFile}`);
    for (const [collectionName, info] of Object.entries(backupSummary)) {
      if (!info.error) {
        console.log(`  • ${collectionName}: ${info.file}`);
      }
    }
    
    return {
      success: true,
      backupDir,
      summary
    };
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Function to restore from backup
async function restoreFromBackup(backupDir) {
  let client;
  
  try {
    console.log(`🔄 Restoring from backup: ${backupDir}\n`);
    
    // Read backup summary
    const summaryFile = path.join(backupDir, 'backup-summary.json');
    const summary = JSON.parse(await fs.readFile(summaryFile, 'utf8'));
    
    console.log(`📊 Backup summary from ${summary.timestamp}`);
    console.log(`  • Total documents: ${summary.totalDocuments}`);
    console.log(`  • Collections: ${Object.keys(summary.collections).length}\n`);
    
    // Connect to MongoDB
    client = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('workdemos');
    
    const restoreSummary = {};
    
    for (const [collectionName, info] of Object.entries(summary.collections)) {
      if (info.error) {
        console.log(`⚠️ Skipping ${collectionName}: ${info.error}`);
        continue;
      }
      
      try {
        console.log(`📊 Restoring ${collectionName}...`);
        
        const backupFile = path.join(backupDir, `${collectionName}.json`);
        const documents = JSON.parse(await fs.readFile(backupFile, 'utf8'));
        
        const collection = db.collection(collectionName);
        
        // Clear existing data
        await collection.deleteMany({});
        console.log(`  • Cleared existing ${collectionName} data`);
        
        // Insert backup data
        if (documents.length > 0) {
          await collection.insertMany(documents);
        }
        
        restoreSummary[collectionName] = {
          restored: documents.length
        };
        
        console.log(`✅ ${collectionName}: ${documents.length} documents restored`);
        
      } catch (error) {
        console.error(`❌ Failed to restore ${collectionName}:`, error.message);
        restoreSummary[collectionName] = {
          error: error.message
        };
      }
    }
    
    console.log('\n✅ Restore completed!');
    console.log('📊 Restore Summary:');
    for (const [collectionName, info] of Object.entries(restoreSummary)) {
      if (info.error) {
        console.log(`  • ${collectionName}: ❌ ${info.error}`);
      } else {
        console.log(`  • ${collectionName}: ${info.restored} documents restored`);
      }
    }
    
    return {
      success: true,
      restoreSummary
    };
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'backup') {
    await createBackup();
  } else if (command === 'restore') {
    const backupDir = args[1];
    if (!backupDir) {
      console.error('❌ Please provide backup directory path');
      console.log('Usage: node backup-mongodb.js restore <backup-dir>');
      process.exit(1);
    }
    await restoreFromBackup(backupDir);
  } else {
    console.log('MongoDB Backup Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node backup-mongodb.js backup     - Create backup');
    console.log('  node backup-mongodb.js restore <dir> - Restore from backup');
    console.log('');
    console.log('Examples:');
    console.log('  node backup-mongodb.js backup');
    console.log('  node backup-mongodb.js restore ./backups/mongodb-backup-2024-01-15');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createBackup, restoreFromBackup }; 