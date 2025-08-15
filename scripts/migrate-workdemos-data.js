#!/usr/bin/env node
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://localhost:8000';
const WORKDEMOS_DIR = './';

const DATA_FILES = {
  jobpostings: 'workdemos.jobpostings.json',
  resumes: 'workdemos.resumes.json',
  kfcpoints: 'workdemos.kfcpoints.json',
  cobecadmins: 'workdemos.cobecadmins.json',
  employees: 'workdemos.employees.json'
};

const convex = new ConvexHttpClient(CONVEX_URL);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { type: 'all', batchSize: 100, dryRun: false, help: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type':
        opts.type = args[++i];
        break;
      case '--batch-size':
        opts.batchSize = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--help':
        opts.help = true;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
  return opts;
}

function showHelp() {
  console.log(`
Usage:
  node scripts/migrate-workdemos-data.js [options]

Options:
  --type <type>     Data type to migrate (all, jobpostings, resumes, kfcpoints, cobecadmins, employees)
  --batch-size <n>  Batch size for large datasets (default: 100)
  --dry-run         Show what would be migrated without actually doing it
  --help            Show this help message

Supported Data Types:
  - jobpostings: Job posting data
  - resumes: Resume data
  - kfcpoints: KFC points data
  - cobecadmins: Cobec admin data
  - employees: Employee data
  - all: Migrate all data types
`);
}

function loadJsonFile(filename) {
  const filepath = path.join(WORKDEMOS_DIR, filename);
  if (!fs.existsSync(filepath)) throw new Error(`File not found: ${filepath}`);
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse ${filename}: ${e.message}`);
  }
}

/**
 * Build a safe string from possibly-complex searchableText values.
 * Accepts string or object and returns a single string.
 */
function normalizeSearchableText(value, fallbackParts = []) {
  if (!value) {
    // fallbackParts is an array of fallback strings (originalText, summary, filename)
    return fallbackParts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    const parts = [];
    // Support common keys we saw in your data
    const keys = ['combined', 'education', 'experience', 'name', 'skills', 'summary'];
    for (const k of keys) {
      const v = value[k];
      if (!v) continue;
      if (Array.isArray(v)) parts.push(v.join(' '));
      else parts.push(String(v));
    }
    // If object was different shape, also flatten any string/array values
    for (const [k, v] of Object.entries(value)) {
      if (parts.length > 0 && keys.includes(k)) continue;
      if (!v) continue;
      if (typeof v === 'string') parts.push(v);
      else if (Array.isArray(v)) parts.push(v.join(' '));
      else parts.push(String(v));
    }
    const combined = parts.join(' ').replace(/\s+/g, ' ').trim();
    return combined || fallbackParts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }
  // other types -> stringify
  return String(value);
}

/**
 * Convert any underscore-prefixed user fields (like _metadata) to non-underscore
 * or drop them. Also coerce common types to match the Convex schema.
 */
function transformDocument(doc, type) {
  const transformed = { ...doc };
  const now = Date.now();
  
  // Log data type being processed for debugging
  if (type === 'kfcpoints' || type === 'cobecadmins' || type === 'employees') {
    console.log(`🔍 Processing ${type} document:`, {
      id: doc._id,
      name: doc.name || doc._id?.clerkuserid,
      hasEvents: type === 'kfcpoints' ? Array.isArray(doc.events) : 'N/A',
      hasScore: type === 'kfcpoints' ? typeof doc.score : 'N/A'
    });
  }

  // canonicalize MongoDB ObjectId -> string id
  if (doc._id && doc._id.$oid) transformed._id = doc._id.$oid;
  if (doc.id && doc.id.$oid) transformed._id = doc.id.$oid;

  // normalize createdAt/updatedAt that might be MongoDB $date objects
  if (doc.createdAt && doc.createdAt.$date) {
    transformed.createdAt = new Date(doc.createdAt.$date).getTime();
  } else if (typeof doc.createdAt === 'string' && !isNaN(Date.parse(doc.createdAt))) {
    transformed.createdAt = new Date(doc.createdAt).getTime();
  } else if (!transformed.createdAt) {
    transformed.createdAt = now;
  }

  if (doc.updatedAt && doc.updatedAt.$date) {
    transformed.updatedAt = new Date(doc.updatedAt.$date).getTime();
  } else if (typeof doc.updatedAt === 'string' && !isNaN(Date.parse(doc.updatedAt))) {
    transformed.updatedAt = new Date(doc.updatedAt).getTime();
  } else {
    transformed.updatedAt = transformed.updatedAt || now;
  }

  // Handle metadata date conversion - preserve existing metadata structure
  if (transformed.metadata) {
    // Convert importedAt to number if it's a date object
    if (transformed.metadata.importedAt && transformed.metadata.importedAt.date) {
      transformed.metadata.importedAt = new Date(transformed.metadata.importedAt.date).getTime();
    } else if (transformed.metadata.importedAt && typeof transformed.metadata.importedAt === 'string') {
      transformed.metadata.importedAt = new Date(transformed.metadata.importedAt).getTime();
    } else if (typeof transformed.metadata.importedAt !== 'number') {
      transformed.metadata.importedAt = now;
    }
    
    // Convert parsedAt to number if it's a date object
    // Remove parsedAt processing to match current schema validation
    // if (transformed.metadata.parsedAt && transformed.metadata.parsedAt.date) {
    //   transformed.metadata.parsedAt = new Date(transformed.metadata.parsedAt.date).getTime();
    // } else if (transformed.metadata.parsedAt && typeof transformed.metadata.parsedAt === 'string') {
    //   transformed.metadata.parsedAt = new Date(transformed.metadata.parsedAt).getTime();
    // } else if (typeof transformed.metadata.parsedAt !== 'number') {
    //   transformed.metadata.parsedAt = now;
    // }
  }

  // Add source metadata for jobpostings/resumes (keeps non-underscore naming)
  if (type === 'jobpostings') {
    transformed.metadata = transformed.metadata || {};
    transformed.metadata.originalIndex = transformed.metadata.originalIndex || doc._index || 0;
    transformed.metadata.importedAt = transformed.metadata.importedAt || now;
    transformed.metadata.sourceFile = transformed.metadata.sourceFile || DATA_FILES.jobpostings;
    transformed.metadata.dataType = 'jobposting';
    // Remove parsedAt to match current schema validation
    // transformed.metadata.parsedAt = transformed.metadata.parsedAt || now;
    
    // Preserve original MongoDB ObjectId if present
    if (doc._id && doc._id.$oid) {
      transformed._id = doc._id.$oid;
    }
  }

  if (type === 'resumes') {
    transformed.metadata = transformed.metadata || {};
    transformed.metadata.filePath = transformed.metadata.filePath || doc._metadata?.filePath || '';
    transformed.metadata.fileName = transformed.metadata.fileName || doc.filename || 'unknown';
    transformed.metadata.importedAt = transformed.metadata.importedAt || now;
    // Remove parsedAt to match current schema validation
    // transformed.metadata.parsedAt = transformed.metadata.parsedAt || now;
    
    // Preserve original MongoDB ObjectId if present
    if (doc._id && doc._id.$oid) {
      transformed._id = doc._id.$oid;
    }
    
    // Preserve legacy metadata for compatibility
    if (doc._metadata) {
      transformed._metadata = doc._metadata;
    }
  }

  if (type === 'kfcpoints') {
    // Ensure events array has proper structure
    if (Array.isArray(transformed.events)) {
      transformed.events = transformed.events.map(event => ({
        type: String(event.type || ''),
        month: String(event.month || ''),
        quantity: event.quantity !== undefined ? Number(event.quantity) : undefined
      }));
    } else {
      transformed.events = [];
    }
    
    // Ensure march_status is properly handled
    if (transformed.march_status === undefined || transformed.march_status === null) {
      transformed.march_status = null;
    } else {
      transformed.march_status = String(transformed.march_status);
    }
    
    // Ensure score is a number
    if (typeof transformed.score !== 'number') {
      transformed.score = Number(transformed.score) || 0;
    }
  }

  if (type === 'cobecadmins') {
    // Handle the different _id structure for cobecadmins
    if (doc._id && doc._id.clerkuserid) {
      transformed.clerkUserId = doc._id.clerkuserid;
    } else if (doc.clerkUserId) {
      transformed.clerkUserId = doc.clerkUserId;
    } else {
      // Generate a fallback ID if none exists
      transformed.clerkUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Set default values for optional fields
    transformed.name = transformed.name || `Admin ${transformed.clerkUserId.substring(0, 8)}`;
    transformed.email = transformed.email || `${transformed.clerkUserId}@example.com`;
    transformed.role = transformed.role || 'admin';
  }

  if (type === 'employees') {
    // Ensure name is properly formatted
    if (transformed.name) {
      transformed.name = String(transformed.name).trim();
    }
    
    // Preserve original MongoDB ObjectId if present
    if (doc._id && doc._id.$oid) {
      transformed._id = doc._id.$oid;
    }
  }

  // Ensure searchableText is always a string.
  const fallbackParts = [
    transformed.originalText,
    transformed.professionalSummary,
    transformed.filename,
    transformed.jobTitle,
    transformed.jobSummary
  ].filter(Boolean);
  transformed.searchableText = normalizeSearchableText(transformed.searchableText, fallbackParts);

  // Ensure person info fields exist and are typed correctly
  transformed.personalInfo = transformed.personalInfo || {};
  transformed.personalInfo.firstName = String(transformed.personalInfo.firstName || '');
  transformed.personalInfo.middleName = String(transformed.personalInfo.middleName || '');
  transformed.personalInfo.lastName = String(transformed.personalInfo.lastName || '');
  transformed.personalInfo.email = String(transformed.personalInfo.email || '');
  transformed.personalInfo.phone = String(transformed.personalInfo.phone || '');
  transformed.personalInfo.yearsOfExperience = Number(transformed.personalInfo.yearsOfExperience || 0);

  // Ensure arrays are arrays with primitive types expected by schema
  if (!Array.isArray(transformed.education)) {
    transformed.education = transformed.education ? [String(transformed.education)] : [];
  } else {
    transformed.education = transformed.education.map(String);
  }

  if (!Array.isArray(transformed.experience)) {
    transformed.experience = transformed.experience ? [transformed.experience] : [];
  }
  transformed.experience = transformed.experience.map(item => ({
    title: String(item.title || item.jobTitle || ''),
    company: String(item.company || ''),
    location: String(item.location || ''),
    duration: String(item.duration || ''),
    responsibilities: Array.isArray(item.responsibilities)
      ? item.responsibilities.map(String)
      : item.responsibilities
      ? [String(item.responsibilities)]
      : []
  }));

  transformed.skills = Array.isArray(transformed.skills) ? transformed.skills.map(String) : [];

  transformed.extractedSkills = Array.isArray(transformed.extractedSkills)
    ? transformed.extractedSkills.map(String)
    : [];

  // embedding must be array of numbers if present
  transformed.embedding = Array.isArray(transformed.embedding)
    ? transformed.embedding.map(n => (n === null || n === undefined ? 0 : Number(n)))
    : [];

  // Final defaults: strings where schema expects strings
  const stringFields = [
    'filename',
    'originalText',
    'professionalSummary',
    'certifications',
    'professionalMemberships',
    'securityClearance',
    'jobTitle',
    'location',
    'salary',
    'openDate',
    'closeDate',
    'jobLink',
    'jobType',
    'jobSummary',
    'duties',
    'requirements',
    'qualifications',
    'educationRequired',
    'howToApply',
    'additionalInformation',
    'department',
    'seriesGrade',
    'travelRequired',
    'workSchedule',
    'experienceRequired',
    'applicationDeadline',
    'contactInfo'
  ];
  for (const f of stringFields) {
    if (f in transformed && transformed[f] !== undefined && transformed[f] !== null) {
      transformed[f] = typeof transformed[f] === 'string' ? transformed[f] : String(transformed[f]);
    }
  }

  // Final metadata cleanup - ensure all date fields are numbers
  if (transformed.metadata) {
    if (transformed.metadata.importedAt !== undefined) {
      if (typeof transformed.metadata.importedAt === 'object' && transformed.metadata.importedAt.date) {
        transformed.metadata.importedAt = new Date(transformed.metadata.importedAt.date).getTime();
      } else if (typeof transformed.metadata.importedAt === 'string') {
        transformed.metadata.importedAt = new Date(transformed.metadata.importedAt).getTime();
      } else if (typeof transformed.metadata.importedAt !== 'number') {
        transformed.metadata.importedAt = now;
      }
    }
    
    // Remove parsedAt processing to match current schema validation
    // if (transformed.metadata.parsedAt !== undefined) {
    //   if (typeof transformed.metadata.parsedAt === 'object' && transformed.metadata.parsedAt.date) {
    //     transformed.metadata.parsedAt = new Date(transformed.metadata.parsedAt.date).getTime();
    //   } else if (typeof transformed.metadata.parsedAt === 'string') {
    //     transformed.metadata.parsedAt = new Date(transformed.metadata.parsedAt).getTime();
    //   } else if (typeof transformed.metadata.parsedAt !== 'number') {
    //     transformed.metadata.parsedAt = now;
    //   }
    // }
  }

  return transformed;
}

/**
 * Lightweight schema-ish checks to catch obvious mismatches before upsert.
 * Returns null on success, otherwise returns a short reason string.
 */
function validateForUpsert(type, doc) {
  // Validate metadata date fields are numbers
  if (doc.metadata) {
    if (doc.metadata.importedAt !== undefined && typeof doc.metadata.importedAt !== 'number') {
      return `metadata.importedAt must be a number, got ${typeof doc.metadata.importedAt}`;
    }
    // Remove parsedAt validation since we're not sending that field
    // if (doc.metadata.parsedAt !== undefined && typeof doc.metadata.parsedAt !== 'number') {
    //   return `metadata.parsedAt must be a number, got ${typeof doc.metadata.parsedAt}`;
    // }
    
    // Validate required metadata fields
    if (type === 'jobpostings' && !doc.metadata.dataType) {
      return 'metadata.dataType is required for jobpostings';
    }
    if (type === 'resumes' && !doc.metadata.fileName) {
      return 'metadata.fileName is required for resumes';
    }
  }
  
  if (type === 'jobpostings') {
    if (typeof doc.jobTitle !== 'string') return 'jobTitle must be a string';
    if (typeof doc.location !== 'string') return 'location must be a string';
    if (doc.searchableText !== undefined && typeof doc.searchableText !== 'string')
      return 'searchableText must be a string';
    if (!doc.createdAt || typeof doc.createdAt !== 'number') return 'createdAt must be a number';
    return null;
  }
  if (type === 'resumes') {
    if (typeof doc.filename !== 'string') return 'filename must be a string';
    if (typeof doc.originalText !== 'string') return 'originalText must be a string';
    if (typeof doc.personalInfo !== 'object') return 'personalInfo must be an object';
    if (typeof doc.personalInfo.yearsOfExperience !== 'number')
      return 'personalInfo.yearsOfExperience must be a number';
    if (doc.searchableText !== undefined && typeof doc.searchableText !== 'string')
      return 'searchableText must be a string';
    if (!doc.createdAt || typeof doc.createdAt !== 'number') return 'createdAt must be a number';
    return null;
  }
  if (type === 'kfcpoints') {
    if (typeof doc.name !== 'string') return 'name must be a string';
    if (!Array.isArray(doc.events)) return 'events must be an array';
    if (typeof doc.score !== 'number') return 'score must be a number';
    if (!doc.createdAt || typeof doc.createdAt !== 'number') return 'createdAt must be a number';
    // Validate events structure
    for (const event of doc.events) {
      if (typeof event.type !== 'string') return 'event.type must be a string';
      if (typeof event.month !== 'string') return 'event.month must be a string';
    }
    return null;
  }
  if (type === 'cobecadmins') {
    if (typeof doc.clerkUserId !== 'string') return 'clerkUserId must be a string';
    if (!doc.createdAt || typeof doc.createdAt !== 'number') return 'createdAt must be a number';
    return null;
  }
  if (type === 'employees') {
    if (typeof doc.name !== 'string') return 'name must be a string';
    if (!doc.createdAt || typeof doc.createdAt !== 'number') return 'createdAt must be a number';
    return null;
  }
  return 'unsupported type';
}

async function runMigration(type, data, options) {
  const result = { migrated: 0, errors: 0, errorDetails: [] };

  if (options.dryRun) {
    result.dryRun = true;
    result.migrated = data.length;
    return result;
  }

  console.log(`🔄 Starting migration for ${type} with ${data.length} records...`);
  
  const batches = [];
  for (let i = 0; i < data.length; i += options.batchSize) {
    batches.push(data.slice(i, i + options.batchSize));
  }
  
  console.log(`📦 Processing ${batches.length} batches of ${options.batchSize} records each...`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`📊 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} records)...`);
    
    for (let i = 0; i < batch.length; i++) {
      const originalDoc = batch[i];
      let doc;
      try {
        doc = transformDocument(originalDoc, type);
      } catch (err) {
        result.errors++;
        result.errorDetails.push({
          stage: 'transform',
          index: batchIndex * options.batchSize + i,
          message: err.message || String(err)
        });
        continue;
      }

      // lightweight validation to avoid server-side schema rejections
      const validationError = validateForUpsert(type, doc);
      if (validationError) {
        result.errors++;
        result.errorDetails.push({
          stage: 'validate',
          index: batchIndex * options.batchSize + i,
          message: validationError
        });
        continue;
      }

      try {
        if (type === 'jobpostings') {
          await convex.mutation(api.jobPostings.insert, {
            jobTitle: doc.jobTitle || '',
            location: doc.location || '',
            salary: doc.salary || '',
            openDate: doc.openDate || '',
            closeDate: doc.closeDate || '',
            jobLink: doc.jobLink || '',
            jobType: doc.jobType || '',
            jobSummary: doc.jobSummary || '',
            duties: doc.duties || '',
            requirements: doc.requirements || '',
            qualifications: doc.qualifications || '',
            education: doc.education || '',
            howToApply: doc.howToApply || '',
            additionalInformation: doc.additionalInformation || '',
            department: doc.department || '',
            seriesGrade: doc.seriesGrade || '',
            travelRequired: doc.travelRequired || '',
            workSchedule: doc.workSchedule || '',
            securityClearance: doc.securityClearance || '',
            experienceRequired: doc.experienceRequired || '',
            educationRequired: doc.educationRequired || '',
            applicationDeadline: doc.applicationDeadline || '',
            contactInfo: doc.contactInfo || '',
            searchableText: doc.searchableText || '',
            extractedSkills: doc.extractedSkills || [],
            embedding: doc.embedding || [],
            // use metadata (non-underscore) to avoid underscore rejection
            metadata: doc.metadata || null,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          });
        } else if (type === 'resumes') {
          await convex.mutation(api.resumes.insert, {
            filename: doc.filename || '',
            originalText: doc.originalText || '',
            personalInfo: {
              firstName: doc.personalInfo?.firstName || '',
              middleName: doc.personalInfo?.middleName || '',
              lastName: doc.personalInfo?.lastName || '',
              email: doc.personalInfo?.email || '',
              phone: doc.personalInfo?.phone || '',
              yearsOfExperience: doc.personalInfo?.yearsOfExperience || 0
            },
            professionalSummary: doc.professionalSummary || '',
            education: doc.education || [],
            experience: doc.experience || [],
            skills: doc.skills || [],
            certifications: doc.certifications || '',
            professionalMemberships: doc.professionalMemberships || '',
            securityClearance: doc.securityClearance || '',
            searchableText: doc.searchableText || '',
            extractedSkills: doc.extractedSkills || [],
            embedding: doc.embedding || [],
            metadata: doc.metadata || null,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          });
        } else if (type === 'kfcpoints') {
          await convex.mutation(api.kfcData.insert, {
            name: doc.name || '',
            events: doc.events || [],
            march_status: doc.march_status || null,
            score: doc.score || 0,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          });
        } else if (type === 'cobecadmins') {
          await convex.mutation(api.cobecAdmins.insert, {
            clerkUserId: doc.clerkUserId || '',
            name: doc.name || '',
            email: doc.email || '',
            role: doc.role || '',
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          });
        } else if (type === 'employees') {
          await convex.mutation(api.employees.insert, {
            name: doc.name || '',
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          });
        } else {
          throw new Error(`Unsupported type: ${type}`);
        }

        result.migrated++;
        
        // Progress indicator every 10 records
        if (result.migrated % 10 === 0) {
          console.log(`✅ Migrated ${result.migrated} records...`);
        }
      } catch (err) {
        result.errors++;
        const errorMessage = err?.message ? String(err.message) : String(err);
        
        // Log detailed error for debugging
        console.error(`❌ Error migrating record ${batchIndex * options.batchSize + i}:`, errorMessage);
        
        result.errorDetails.push({
          stage: 'upsert',
          index: batchIndex * options.batchSize + i,
          message: errorMessage
        });
      }
    }
  }

  return result;
}

async function checkDataIntegrity(type, expectedCount) {
  try {
    console.log(`🔍 Checking data integrity for ${type}...`);
    
    let actualCount = 0;
    if (type === 'kfcpoints') {
      const result = await convex.query(api.kfcData.list);
      actualCount = result.length;
    } else if (type === 'cobecadmins') {
      const result = await convex.query(api.cobecAdmins.list);
      actualCount = result.length;
    } else if (type === 'employees') {
      const result = await convex.query(api.employees.list);
      actualCount = result.length;
    }
    
    console.log(`📊 ${type}: Expected ${expectedCount}, Found ${actualCount}`);
    return actualCount === expectedCount;
  } catch (error) {
    console.error(`❌ Error checking data integrity for ${type}:`, error.message);
    return false;
  }
}

async function migrateData(options) {
  console.log('🚀 Starting migration');
  console.log(
    `Convex: ${CONVEX_URL}  Type: ${options.type}  Batch: ${options.batchSize}  DryRun: ${
      options.dryRun ? 'yes' : 'no'
    }`
  );

  const typesToRun = options.type === 'all' ? Object.keys(DATA_FILES) : [options.type];
  for (const t of typesToRun) {
    if (!DATA_FILES[t]) {
      console.error(`Invalid type: ${t}`);
      continue;
    }

    try {
      const filename = DATA_FILES[t];
      const raw = loadJsonFile(filename);

      // Don't eagerly transform the whole file if very large — but keeping same behavior
      const transformedData = raw.map(d => transformDocument(d, t));

      const res = await runMigration(t, transformedData, options);

      if (res.dryRun) {
        console.log(`${t}: DRY RUN - would process ${res.migrated} records`);
        continue;
      }

      if (res.errors === 0) {
        console.log(`${t}: SUCCESS - ${res.migrated} records upserted`);
        
        // Check data integrity for new data types
        if (!options.dryRun && (t === 'kfcpoints' || t === 'cobecadmins' || t === 'employees')) {
          const integrityCheck = await checkDataIntegrity(t, res.migrated);
          if (integrityCheck) {
            console.log(`✅ Data integrity check passed for ${t}`);
          } else {
            console.warn(`⚠️  Data integrity check failed for ${t}`);
          }
        }
      } else {
        console.error(`${t}: COMPLETED WITH ERRORS - ${res.migrated} upserted, ${res.errors} errors`);
        // Print first 10 concise errors only
        res.errorDetails.slice(0, 10).forEach(e => {
          console.error(`  [${e.stage}] record ${e.index}: ${e.message}`);
        });
        if (res.errorDetails.length > 10) {
          console.error(`  ...and ${res.errorDetails.length - 10} more errors`);
        }
      }
    } catch (err) {
      console.error(`${t}: FAILED - ${err.message}`);
    }
  }
}

async function main() {
  try {
    const opts = parseArgs();
    if (opts.help) {
      showHelp();
      return;
    }
    await migrateData(opts);
  } catch (err) {
    console.error(`Script failed: ${err.message}`);
    process.exit(1);
  }
}

main();