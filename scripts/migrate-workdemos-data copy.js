#!/usr/bin/env node

/**
 * Workdemos Data Migration Script
 * 
 * This script migrates data from the workdemos JSON files directly into Convex
 * using the proper mutations and data transformations
 * 
 * Usage:
 *   node scripts/migrate-workdemos-data.js [options]
 * 
 * Options:
 *   --type <type>     Data type to migrate (all, jobs, resumes, cobecadmins, employees, kfcpoints)
 *   --batch-size <n>  Batch size for large datasets (default: 100)
 *   --dry-run         Show what would be migrated without actually doing it
 *   --help           Show this help message
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://localhost:8000';
const WORKDEMOS_DIR = './';

// Data file mappings
const DATA_FILES = {
  jobpostings: 'workdemos.jobpostings.json',
  resumes: 'workdemos.resumes.json',
  cobecadmins: 'workdemos.cobecadmins.json',
  employees: 'workdemos.employees.json',
  kfcpoints: 'workdemos.kfcpoints.json'
};

// Initialize Convex client
const convex = new ConvexHttpClient(CONVEX_URL);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: 'all',
    batchSize: 100,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type':
        options.type = args[++i];
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        options.help = true;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  return options;
}

// Show help
function showHelp() {
  console.log(`
Workdemos Data Migration Script

Usage:
  node scripts/migrate-workdemos-data.js [options]

Options:
  --type <type>     Data type to migrate (all, jobs, resumes, cobecadmins, employees, kfcpoints)
  --batch-size <n>  Batch size for large datasets (default: 100)
  --dry-run         Show what would be migrated without actually doing it
  --help           Show this help message

Examples:
  node scripts/migrate-workdemos-data.js --type all
  node scripts/migrate-workdemos-data.js --type jobs --batch-size 50
  node scripts/migrate-workdemos-data.js --type cobecadmins --dry-run
`);
}

// Load and parse JSON file
function loadJsonFile(filename) {
  const filepath = path.join(WORKDEMOS_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }

  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse ${filename}: ${error.message}`);
  }
}

// Analyze data file
function analyzeDataFile(data, type) {
  console.log(`\n📊 Analyzing ${type} data...`);
  console.log(`   Total records: ${data.length}`);
  
  if (data.length > 0) {
    const sample = data[0];
    console.log(`   Sample record keys: ${Object.keys(sample).join(', ')}`);
    
    if (sample._id) {
      console.log(`   ID format: ${typeof sample._id} (${sample._id.constructor?.name || 'unknown'})`);
    }
    
    if (sample.createdAt) {
      console.log(`   Date format: ${typeof sample.createdAt} (${sample.createdAt.constructor?.name || 'unknown'})`);
    }
  }
  
  return {
    count: data.length,
    hasId: data.length > 0 && !!data[0]._id,
    hasDates: data.length > 0 && !!data[0].createdAt
  };
}

// Transform MongoDB document to Convex format
function transformDocument(doc, type) {
  const transformed = { ...doc };
  const now = Date.now();
  
  // Convert MongoDB ObjectId to string
  if (doc._id && doc._id.$oid) {
    transformed._id = doc._id.$oid;
  }
  
  // Convert MongoDB dates to timestamps
  if (doc.createdAt && doc.createdAt.$date) {
    transformed.createdAt = new Date(doc.createdAt.$date).getTime();
  } else if (!transformed.createdAt) {
    transformed.createdAt = now;
  }
  
  if (doc.updatedAt && doc.updatedAt.$date) {
    transformed.updatedAt = new Date(doc.updatedAt.$date).getTime();
  } else {
    transformed.updatedAt = now;
  }
  
  // Handle specific transformations for each type
  switch (type) {
    case 'cobecadmins':
      // Transform clerkUserId from _id.clerkuserid to clerkUserId
      if (doc._id && doc._id.clerkuserid) {
        transformed.clerkUserId = doc._id.clerkuserid;
        delete transformed._id;
      }
      break;
      
    case 'kfcpoints':
      // Ensure events array is properly formatted
      if (doc.events && Array.isArray(doc.events)) {
        transformed.events = doc.events.map(event => ({
          type: event.type || 'Team',
          month: event.month || 'JAN',
          quantity: event.quantity || 1
        }));
      }
      break;
      
    case 'jobpostings':
      // Add metadata for tracking
      transformed._metadata = {
        originalIndex: doc._metadata?.originalIndex || 0,
        importedAt: now,
        sourceFile: 'workdemos.jobpostings.json',
        dataType: 'jobposting'
      };
      break;
      
    case 'resumes':
      // Add metadata for tracking
      transformed._metadata = {
        filePath: doc._metadata?.filePath || '',
        fileName: doc.filename || 'unknown',
        importedAt: now,
        parsedAt: doc._metadata?.parsedAt ? new Date(doc._metadata.parsedAt).getTime() : now
      };
      break;
  }
  
  return transformed;
}

// Run migration for a specific data type
async function runMigration(type, data, options) {
  console.log(`\n🚀 Starting migration for ${type}...`);
  
  if (options.dryRun) {
    console.log(`   DRY RUN: Would migrate ${data.length} records`);
    return { migrated: 0, errors: 0, dryRun: true };
  }
  
  try {
    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process in batches for large datasets
    const batches = [];
    for (let i = 0; i < data.length; i += options.batchSize) {
      batches.push(data.slice(i, i + options.batchSize));
    }
    
    console.log(`   Processing ${data.length} records in ${batches.length} batches...`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`   Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} records)...`);
      
      for (const doc of batch) {
        try {
          const transformedDoc = transformDocument(doc, type);
          
          switch (type) {
            case 'cobecadmins':
              await convex.mutation(api.cobecAdmins.insert, {
                clerkUserId: transformedDoc.clerkUserId,
                name: transformedDoc.name || '',
                email: transformedDoc.email || '',
                role: transformedDoc.role || 'admin',
                createdAt: transformedDoc.createdAt,
                updatedAt: transformedDoc.updatedAt
              });
              break;
              
            case 'employees':
              await convex.mutation(api.employees.insert, {
                name: transformedDoc.name,
                createdAt: transformedDoc.createdAt,
                updatedAt: transformedDoc.updatedAt
              });
              break;
              
            case 'kfcpoints':
              await convex.mutation(api.kfcData.insert, {
                name: transformedDoc.name,
                events: transformedDoc.events || [],
                march_status: transformedDoc.march_status || null,
                score: transformedDoc.score || 0,
                createdAt: transformedDoc.createdAt,
                updatedAt: transformedDoc.updatedAt
              });
              break;
              
            case 'jobpostings':
              await convex.mutation(api.jobPostings.insert, {
                jobTitle: transformedDoc.jobTitle || '',
                location: transformedDoc.location || '',
                salary: transformedDoc.salary || '',
                openDate: transformedDoc.openDate || '',
                closeDate: transformedDoc.closeDate || '',
                jobLink: transformedDoc.jobLink || '',
                jobType: transformedDoc.jobType || '',
                jobSummary: transformedDoc.jobSummary || '',
                duties: transformedDoc.duties || '',
                requirements: transformedDoc.requirements || '',
                qualifications: transformedDoc.qualifications || '',
                education: transformedDoc.education || '',
                howToApply: transformedDoc.howToApply || '',
                additionalInformation: transformedDoc.additionalInformation || '',
                department: transformedDoc.department || '',
                seriesGrade: transformedDoc.seriesGrade || '',
                travelRequired: transformedDoc.travelRequired || '',
                workSchedule: transformedDoc.workSchedule || '',
                securityClearance: transformedDoc.securityClearance || '',
                experienceRequired: transformedDoc.experienceRequired || '',
                educationRequired: transformedDoc.educationRequired || '',
                applicationDeadline: transformedDoc.applicationDeadline || '',
                contactInfo: transformedDoc.contactInfo || '',
                searchableText: transformedDoc.searchableText || '',
                extractedSkills: transformedDoc.extractedSkills || [],
                embedding: transformedDoc.embedding || [],
                _metadata: transformedDoc._metadata,
                createdAt: transformedDoc.createdAt,
                updatedAt: transformedDoc.updatedAt
              });
              break;
              
            case 'resumes':
              await convex.mutation(api.resumes.insert, {
                filename: transformedDoc.filename || '',
                originalText: transformedDoc.originalText || '',
                personalInfo: {
                  firstName: transformedDoc.personalInfo?.firstName || '',
                  middleName: transformedDoc.personalInfo?.middleName || '',
                  lastName: transformedDoc.personalInfo?.lastName || '',
                  email: transformedDoc.personalInfo?.email || '',
                  phone: transformedDoc.personalInfo?.phone || '',
                  yearsOfExperience: transformedDoc.personalInfo?.yearsOfExperience || 0
                },
                professionalSummary: transformedDoc.professionalSummary || '',
                education: transformedDoc.education || [],
                experience: transformedDoc.experience || [],
                skills: transformedDoc.skills || [],
                certifications: transformedDoc.certifications || '',
                professionalMemberships: transformedDoc.professionalMemberships || '',
                securityClearance: transformedDoc.securityClearance || '',
                searchableText: transformedDoc.searchableText || '',
                extractedSkills: transformedDoc.extractedSkills || [],
                embedding: transformedDoc.embedding || [],
                _metadata: transformedDoc._metadata,
                createdAt: transformedDoc.createdAt,
                updatedAt: transformedDoc.updatedAt
              });
              break;
              
            default:
              throw new Error(`Unknown migration type: ${type}`);
          }
          
          migratedCount++;
          
          // Progress indicator
          if (migratedCount % 10 === 0) {
            console.log(`     Migrated ${migratedCount}/${data.length} records...`);
          }
          
        } catch (error) {
          errorCount++;
          const errorMsg = `Record ${migratedCount + errorCount}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`     ❌ ${errorMsg}`);
        }
      }
    }
    
    console.log(`   ✅ Migration completed: ${migratedCount} migrated, ${errorCount} errors`);
    
    if (errors.length > 0) {
      console.log(`   ⚠️  First few errors:`);
      errors.slice(0, 5).forEach(error => console.log(`     ${error}`));
      if (errors.length > 5) {
        console.log(`     ... and ${errors.length - 5} more errors`);
      }
    }
    
    return { migrated: migratedCount, errors: errorCount, errorDetails: errors };
    
  } catch (error) {
    console.error(`   ❌ Migration failed: ${error.message}`);
    return { migrated: 0, errors: 1, error: error.message };
  }
}

// Main migration function
async function migrateData(options) {
  console.log('🔄 Workdemos Data Migration Script');
  console.log(`   Convex URL: ${CONVEX_URL}`);
  console.log(`   Migration type: ${options.type}`);
  console.log(`   Batch size: ${options.batchSize}`);
  console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
  
  const startTime = Date.now();
  const results = {};
  
  try {
    // Determine which types to migrate
    const typesToMigrate = options.type === 'all' 
      ? Object.keys(DATA_FILES)
      : [options.type];
    
    // Validate types
    for (const type of typesToMigrate) {
      if (!DATA_FILES[type]) {
        throw new Error(`Invalid migration type: ${type}`);
      }
    }
    
    // Process each type
    for (const type of typesToMigrate) {
      console.log(`\n📁 Processing ${type}...`);
      
      try {
        // Load data file
        const filename = DATA_FILES[type];
        const data = loadJsonFile(filename);
        
        // Analyze data
        const analysis = analyzeDataFile(data, type);
        
        // Transform data if needed
        const transformedData = data.map(doc => transformDocument(doc, type));
        
        // Run migration
        const result = await runMigration(type, transformedData, options);
        results[type] = result;
        
      } catch (error) {
        console.error(`   ❌ Failed to process ${type}: ${error.message}`);
        results[type] = { error: error.message };
      }
    }
    
    // Summary
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📋 Migration Summary');
    console.log(`   Duration: ${duration.toFixed(2)}s`);
    
    let totalMigrated = 0;
    let totalErrors = 0;
    
    for (const [type, result] of Object.entries(results)) {
      if (result.error) {
        console.log(`   ${type}: ❌ ${result.error}`);
      } else if (result.dryRun) {
        console.log(`   ${type}: 🔍 DRY RUN - ${result.migrated} records`);
      } else {
        console.log(`   ${type}: ✅ ${result.migrated} migrated, ${result.errors} errors`);
        totalMigrated += result.migrated || 0;
        totalErrors += result.errors || 0;
      }
    }
    
    console.log(`\n   Total migrated: ${totalMigrated}`);
    console.log(`   Total errors: ${totalErrors}`);
    
    if (totalErrors === 0 && !options.dryRun) {
      console.log('\n🎉 Migration completed successfully!');
    } else if (options.dryRun) {
      console.log('\n🔍 Dry run completed. No data was actually migrated.');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the output above.');
    }
    
  } catch (error) {
    console.error(`\n💥 Migration failed: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    
    if (options.help) {
      showHelp();
      return;
    }
    
    await migrateData(options);
    
  } catch (error) {
    console.error(`\n💥 Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
main();
