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
  resumes: 'workdemos.resumes.json'
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
  --type <type>     Data type to migrate (all, jobpostings, resumes)
  --batch-size <n>  Batch size for large datasets (default: 100)
  --dry-run         Show what would be migrated without actually doing it
  --help            Show this help message
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

function transformDocument(doc, type) {
  const transformed = { ...doc };
  const now = Date.now();

  if (doc._id && doc._id.$oid) transformed._id = doc._id.$oid;
  if (doc.createdAt && doc.createdAt.$date) transformed.createdAt = new Date(doc.createdAt.$date).getTime();
  else if (!transformed.createdAt) transformed.createdAt = now;
  if (doc.updatedAt && doc.updatedAt.$date) transformed.updatedAt = new Date(doc.updatedAt.$date).getTime();
  else transformed.updatedAt = now;

  if (type === 'jobpostings') {
    transformed._metadata = {
      originalIndex: doc._metadata?.originalIndex || 0,
      importedAt: now,
      sourceFile: DATA_FILES.jobpostings,
      dataType: 'jobposting'
    };
  }

  if (type === 'resumes') {
    transformed._metadata = {
      filePath: doc._metadata?.filePath || '',
      fileName: doc.filename || 'unknown',
      importedAt: now,
      parsedAt: doc._metadata?.parsedAt ? new Date(doc._metadata.parsedAt).getTime() : now
    };
  }

  // k/v defaults for fields used in inserts
  return transformed;
}

async function runMigration(type, data, options) {
  const result = { migrated: 0, errors: 0, errorDetails: [] };

  if (options.dryRun) {
    result.dryRun = true;
    result.migrated = data.length;
    return result;
  }

  const batches = [];
  for (let i = 0; i < data.length; i += options.batchSize) {
    batches.push(data.slice(i, i + options.batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    for (let i = 0; i < batch.length; i++) {
      const doc = batch[i];
      let transformed;
      try {
        transformed = transformDocument(doc, type);
      } catch (err) {
        result.errors++;
        result.errorDetails.push({
          stage: 'transform',
          index: batchIndex * options.batchSize + i,
          message: err.message
        });
        continue;
      }

      try {
        if (type === 'jobpostings') {
          await convex.mutation(api.jobPostings.insert, {
            jobTitle: transformed.jobTitle || '',
            location: transformed.location || '',
            salary: transformed.salary || '',
            openDate: transformed.openDate || '',
            closeDate: transformed.closeDate || '',
            jobLink: transformed.jobLink || '',
            jobType: transformed.jobType || '',
            jobSummary: transformed.jobSummary || '',
            duties: transformed.duties || '',
            requirements: transformed.requirements || '',
            qualifications: transformed.qualifications || '',
            education: transformed.education || '',
            howToApply: transformed.howToApply || '',
            additionalInformation: transformed.additionalInformation || '',
            department: transformed.department || '',
            seriesGrade: transformed.seriesGrade || '',
            travelRequired: transformed.travelRequired || '',
            workSchedule: transformed.workSchedule || '',
            securityClearance: transformed.securityClearance || '',
            experienceRequired: transformed.experienceRequired || '',
            educationRequired: transformed.educationRequired || '',
            applicationDeadline: transformed.applicationDeadline || '',
            contactInfo: transformed.contactInfo || '',
            searchableText: transformed.searchableText || '',
            extractedSkills: transformed.extractedSkills || [],
            embedding: transformed.embedding || [],
            _metadata: transformed._metadata,
            createdAt: transformed.createdAt,
            updatedAt: transformed.updatedAt
          });
        } else if (type === 'resumes') {
          await convex.mutation(api.resumes.insert, {
            filename: transformed.filename || '',
            originalText: transformed.originalText || '',
            personalInfo: {
              firstName: transformed.personalInfo?.firstName || '',
              middleName: transformed.personalInfo?.middleName || '',
              lastName: transformed.personalInfo?.lastName || '',
              email: transformed.personalInfo?.email || '',
              phone: transformed.personalInfo?.phone || '',
              yearsOfExperience: transformed.personalInfo?.yearsOfExperience || 0
            },
            professionalSummary: transformed.professionalSummary || '',
            education: transformed.education || [],
            experience: transformed.experience || [],
            skills: transformed.skills || [],
            certifications: transformed.certifications || '',
            professionalMemberships: transformed.professionalMemberships || '',
            securityClearance: transformed.securityClearance || '',
            searchableText: transformed.searchableText || '',
            extractedSkills: transformed.extractedSkills || [],
            embedding: transformed.embedding || [],
            _metadata: transformed._metadata,
            createdAt: transformed.createdAt,
            updatedAt: transformed.updatedAt
          });
        } else {
          throw new Error(`Unsupported type: ${type}`);
        }

        result.migrated++;
      } catch (err) {
        result.errors++;
        result.errorDetails.push({
          stage: 'upsert',
          index: batchIndex * options.batchSize + i,
          message: err.message
        });
      }
    }
  }

  return result;
}

async function migrateData(options) {
  console.log('Starting migration');
  console.log(`Convex: ${CONVEX_URL}  Type: ${options.type}  Batch: ${options.batchSize}  DryRun: ${options.dryRun ? 'yes' : 'no'}`);

  const typesToRun = options.type === 'all' ? Object.keys(DATA_FILES) : [options.type];
  for (const t of typesToRun) {
    if (!DATA_FILES[t]) {
      console.error(`Invalid type: ${t}`);
      continue;
    }

    try {
      const filename = DATA_FILES[t];
      const raw = loadJsonFile(filename);
      const transformedData = raw.map(d => transformDocument(d, t));

      const res = await runMigration(t, transformedData, options);

      if (res.dryRun) {
        console.log(`${t}: DRY RUN - would process ${res.migrated} records`);
        continue;
      }

      if (res.errors === 0) {
        console.log(`${t}: SUCCESS - ${res.migrated} records upserted`);
      } else {
        console.error(`${t}: COMPLETED WITH ERRORS - ${res.migrated} upserted, ${res.errors} errors`);
        // Provide details for failures
        res.errorDetails.forEach((e, idx) => {
          // print first 10 errors only
          if (idx < 10) {
            console.error(`  [${e.stage}] record ${e.index}: ${e.message}`);
          }
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