#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🚀 clean-workdemos-data.js script starting...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILES = {
  jobpostings: 'workdemos.jobpostings.json',
  resumes: 'workdemos.resumes.json'
};

const OUTPUT_DIR = './cleaned-data';

/**
 * Clean jobpostings data to match Convex schema
 */
function cleanJobPostings(data) {
  console.log(`\nCleaning ${data.length} jobpostings records...`);
  
  return data.map((item, index) => {
    const cleaned = { ...item };
    const removedFields = [];
    
    // Clean metadata to match schema - only keep allowed fields
    if (cleaned.metadata) {
      const originalMetadata = { ...cleaned.metadata };
      
      // Remove problematic fields that aren't in schema
      if (cleaned.metadata.parsedAt !== undefined) {
        removedFields.push(`metadata.parsedAt: ${cleaned.metadata.parsedAt}`);
        delete cleaned.metadata.parsedAt;
      }
      
      if (cleaned.metadata.embeddingModel !== undefined) {
        removedFields.push(`metadata.embeddingModel: ${cleaned.metadata.embeddingModel}`);
        delete cleaned.metadata.embeddingModel;
      }
      
      if (cleaned.metadata.processedAt !== undefined) {
        removedFields.push(`metadata.processedAt: ${JSON.stringify(cleaned.metadata.processedAt)}`);
        delete cleaned.metadata.processedAt;
      }
      
      if (cleaned.metadata.sourceCollection !== undefined) {
        removedFields.push(`metadata.sourceCollection: ${cleaned.metadata.sourceCollection}`);
        delete cleaned.metadata.sourceCollection;
      }
      
      if (cleaned.metadata.migrationVersion !== undefined) {
        removedFields.push(`metadata.migrationVersion: ${cleaned.metadata.migrationVersion}`);
        delete cleaned.metadata.migrationVersion;
      }
      
      if (cleaned.metadata.originalId !== undefined) {
        removedFields.push(`metadata.originalId: ${cleaned.metadata.originalId}`);
        delete cleaned.metadata.originalId;
      }
      
      // Keep only schema-allowed fields
      cleaned.metadata = {
        originalIndex: cleaned.metadata.originalIndex || index,
        importedAt: (() => {
          const importedAt = cleaned.metadata.importedAt;
          if (importedAt && typeof importedAt === 'object' && importedAt.date) {
            return new Date(importedAt.date).getTime();
          } else if (importedAt && typeof importedAt === 'string') {
            return new Date(importedAt).getTime();
          } else if (typeof importedAt === 'number') {
            return importedAt;
          } else {
            return Date.now();
          }
        })(),
        sourceFile: cleaned.metadata.sourceFile || DATA_FILES.jobpostings,
        dataType: 'jobposting'
      };
      
      // Log what was removed if anything
      if (removedFields.length > 0) {
        console.log(`  Record ${index}: Removed fields: ${removedFields.join(', ')}`);
      }
    } else {
      cleaned.metadata = {
        originalIndex: index,
        importedAt: Date.now(),
        sourceFile: DATA_FILES.jobpostings,
        dataType: 'jobposting'
      };
      console.log(`  Record ${index}: Created new metadata (no existing metadata)`);
    }

    // Ensure required fields exist
    cleaned.jobTitle = cleaned.jobTitle || '';
    cleaned.location = cleaned.location || '';
    cleaned.salary = cleaned.salary || '';
    cleaned.openDate = cleaned.openDate || '';
    cleaned.closeDate = cleaned.closeDate || '';
    cleaned.jobLink = cleaned.jobLink || '';
    cleaned.jobType = cleaned.jobType || '';
    cleaned.jobSummary = cleaned.jobSummary || '';
    cleaned.duties = cleaned.duties || '';
    cleaned.requirements = cleaned.requirements || '';
    cleaned.qualifications = cleaned.qualifications || '';
    cleaned.education = cleaned.education || '';
    cleaned.howToApply = cleaned.howToApply || '';
    cleaned.additionalInformation = cleaned.additionalInformation || '';
    cleaned.department = cleaned.department || '';
    cleaned.seriesGrade = cleaned.seriesGrade || '';
    cleaned.travelRequired = cleaned.travelRequired || '';
    cleaned.workSchedule = cleaned.workSchedule || '';
    cleaned.securityClearance = cleaned.securityClearance || '';
    cleaned.experienceRequired = cleaned.experienceRequired || '';
    cleaned.educationRequired = cleaned.educationRequired || '';
    cleaned.applicationDeadline = cleaned.applicationDeadline || '';
    cleaned.contactInfo = cleaned.contactInfo || '';
    
    // Ensure arrays are arrays
    if (!Array.isArray(cleaned.education)) {
      cleaned.education = cleaned.education ? [String(cleaned.education)] : [];
    }
    
    if (!Array.isArray(cleaned.extractedSkills)) {
      cleaned.extractedSkills = [];
    }
    
    if (!Array.isArray(cleaned.embedding)) {
      cleaned.embedding = [];
    }

    // Ensure timestamps are numbers
    cleaned.createdAt = typeof cleaned.createdAt === 'number' ? cleaned.createdAt : Date.now();
    cleaned.updatedAt = typeof cleaned.updatedAt === 'number' ? cleaned.updatedAt : Date.now();

    return cleaned;
  });
}

/**
 * Clean resumes data to match Convex schema
 */
function cleanResumes(data) {
  console.log(`\nCleaning ${data.length} resumes records...`);
  
  return data.map((item, index) => {
    const cleaned = { ...item };
    const removedFields = [];
    
    // Clean metadata to match schema - only keep allowed fields
    if (cleaned.metadata) {
      const originalMetadata = { ...cleaned.metadata };
      
      // Remove problematic fields that aren't in schema
      if (cleaned.metadata.dataType !== undefined) {
        removedFields.push(`metadata.dataType: ${cleaned.metadata.dataType}`);
        delete cleaned.metadata.dataType;
      }
      
      if (cleaned.metadata.embeddingModel !== undefined) {
        removedFields.push(`metadata.embeddingModel: ${cleaned.metadata.embeddingModel}`);
        delete cleaned.metadata.embeddingModel;
      }
      
      if (cleaned.metadata.processedAt !== undefined) {
        removedFields.push(`metadata.processedAt: ${JSON.stringify(cleaned.metadata.processedAt)}`);
        delete cleaned.metadata.processedAt;
      }
      
      if (cleaned.metadata.sourceCollection !== undefined) {
        removedFields.push(`metadata.sourceCollection: ${cleaned.metadata.sourceCollection}`);
        delete cleaned.metadata.sourceCollection;
      }
      
      if (cleaned.metadata.migrationVersion !== undefined) {
        removedFields.push(`metadata.migrationVersion: ${cleaned.metadata.migrationVersion}`);
        delete cleaned.metadata.migrationVersion;
      }
      
      if (cleaned.metadata.originalId !== undefined) {
        removedFields.push(`metadata.originalId: ${cleaned.metadata.originalId}`);
        delete cleaned.metadata.originalId;
      }
      
      if (cleaned.metadata.fileSize !== undefined) {
        removedFields.push(`metadata.fileSize: ${cleaned.metadata.fileSize}`);
        delete cleaned.metadata.fileSize;
      }
      
      if (cleaned.metadata.mimeType !== undefined) {
        removedFields.push(`metadata.mimeType: ${cleaned.metadata.mimeType}`);
        delete cleaned.metadata.mimeType;
      }
      
      // Keep only schema-allowed fields
      cleaned.metadata = {
        filePath: cleaned.metadata.filePath || '',
        fileName: cleaned.metadata.fileName || cleaned.filename || 'unknown',
        importedAt: (() => {
          const importedAt = cleaned.metadata.importedAt;
          if (importedAt && typeof importedAt === 'object' && importedAt.date) {
            return new Date(importedAt.date).getTime();
          } else if (importedAt && typeof importedAt === 'string') {
            return new Date(importedAt).getTime();
          } else if (typeof importedAt === 'number') {
            return importedAt;
          } else {
            return Date.now();
          }
        })(),
        parsedAt: (() => {
          const parsedAt = cleaned.metadata.parsedAt;
          if (parsedAt && typeof parsedAt === 'object' && parsedAt.date) {
            return new Date(parsedAt.date).getTime();
          } else if (parsedAt && typeof parsedAt === 'string') {
            return new Date(parsedAt).getTime();
          } else if (typeof parsedAt === 'number') {
            return parsedAt;
          } else {
            return Date.now();
          }
        })()
      };
      
      // Log what was removed if anything
      if (removedFields.length > 0) {
        console.log(`  Record ${index}: Removed fields: ${removedFields.join(', ')}`);
      }
    } else {
      cleaned.metadata = {
        filePath: '',
        fileName: cleaned.filename || 'unknown',
        importedAt: Date.now(),
        parsedAt: Date.now()
      };
      console.log(`  Record ${index}: Created new metadata (no existing metadata)`);
    }

    // Ensure required fields exist
    cleaned.filename = cleaned.filename || 'unknown';
    cleaned.originalText = cleaned.originalText || '';
    
    // Ensure personalInfo exists and has required fields
    cleaned.personalInfo = cleaned.personalInfo || {};
    cleaned.personalInfo.firstName = cleaned.personalInfo.firstName || '';
    cleaned.personalInfo.middleName = cleaned.personalInfo.middleName || '';
    cleaned.personalInfo.lastName = cleaned.personalInfo.lastName || '';
    cleaned.personalInfo.email = cleaned.personalInfo.email || '';
    cleaned.personalInfo.phone = cleaned.personalInfo.phone || '';
    cleaned.personalInfo.yearsOfExperience = Number(cleaned.personalInfo.yearsOfExperience || 0);

    cleaned.professionalSummary = cleaned.professionalSummary || '';
    cleaned.certifications = cleaned.certifications || '';
    cleaned.professionalMemberships = cleaned.professionalMemberships || '';
    cleaned.securityClearance = cleaned.securityClearance || '';

    // Ensure arrays are arrays
    if (!Array.isArray(cleaned.education)) {
      cleaned.education = cleaned.education ? [String(cleaned.education)] : [];
    }
    
    if (!Array.isArray(cleaned.experience)) {
      cleaned.experience = cleaned.experience ? [cleaned.experience] : [];
    }
    
    // Clean experience array
    cleaned.experience = cleaned.experience.map(item => ({
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

    if (!Array.isArray(cleaned.skills)) {
      cleaned.skills = cleaned.skills ? [String(cleaned.skills)] : [];
    }
    
    if (!Array.isArray(cleaned.extractedSkills)) {
      cleaned.extractedSkills = [];
    }
    
    if (!Array.isArray(cleaned.embedding)) {
      cleaned.embedding = [];
    }

    // Ensure timestamps are numbers
    cleaned.createdAt = typeof cleaned.createdAt === 'number' ? cleaned.createdAt : Date.now();
    cleaned.updatedAt = typeof cleaned.updatedAt === 'number' ? cleaned.updatedAt : Date.now();

    return cleaned;
  });
}

/**
 * Validate that cleaned data matches expected schema
 */
function validateCleanedData(data, type) {
  const validationErrors = [];
  
  data.forEach((item, index) => {
    // Check metadata structure
    if (item.metadata) {
      if (type === 'jobpostings') {
        // Should only have: originalIndex, importedAt, sourceFile, dataType
        const allowedFields = ['originalIndex', 'importedAt', 'sourceFile', 'dataType'];
        const actualFields = Object.keys(item.metadata);
        const extraFields = actualFields.filter(field => !allowedFields.includes(field));
        
        if (extraFields.length > 0) {
          validationErrors.push(`Record ${index}: Extra metadata fields: ${extraFields.join(', ')}`);
        }
        
        // Check required fields
        if (!item.metadata.dataType) {
          validationErrors.push(`Record ${index}: Missing required metadata.dataType`);
        }
        if (typeof item.metadata.importedAt !== 'number') {
          validationErrors.push(`Record ${index}: metadata.importedAt must be number, got ${typeof item.metadata.importedAt}`);
        }
      } else if (type === 'resumes') {
        // Should only have: filePath, fileName, importedAt, parsedAt
        const allowedFields = ['filePath', 'fileName', 'importedAt', 'parsedAt'];
        const actualFields = Object.keys(item.metadata);
        const extraFields = actualFields.filter(field => !allowedFields.includes(field));
        
        if (extraFields.length > 0) {
          validationErrors.push(`Record ${index}: Extra metadata fields: ${extraFields.join(', ')}`);
        }
        
        // Check required fields
        if (!item.metadata.fileName) {
          validationErrors.push(`Record ${index}: Missing required metadata.fileName`);
        }
        if (typeof item.metadata.importedAt !== 'number') {
          validationErrors.push(`Record ${index}: metadata.importedAt must be number, got ${typeof item.metadata.importedAt}`);
        }
        if (typeof item.metadata.parsedAt !== 'number') {
          validationErrors.push(`Record ${index}: metadata.parsedAt must be number, got ${typeof item.metadata.parsedAt}`);
        }
      }
    } else {
      validationErrors.push(`Record ${index}: Missing metadata object`);
    }
  });
  
  return validationErrors;
}

/**
 * Main cleaning function
 */
function cleanData() {
  console.log('Starting data cleaning process...');
  
  const cleaningStats = {
    jobpostings: { processed: 0, cleaned: 0, errors: 0, removedFields: 0 },
    resumes: { processed: 0, cleaned: 0, errors: 0, removedFields: 0 }
  };
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const [type, filename] of Object.entries(DATA_FILES)) {
    try {
      console.log(`\nProcessing ${type} data...`);
      
      // Read original file
      const filepath = path.join('.', filename);
      if (!fs.existsSync(filepath)) {
        console.error(`File not found: ${filepath}`);
        continue;
      }

      const rawData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      console.log(`  Original records: ${rawData.length}`);
      cleaningStats[type].processed = rawData.length;

      // Clean data based on type
      let cleanedData;
      try {
        if (type === 'jobpostings') {
          cleanedData = cleanJobPostings(rawData);
        } else if (type === 'resumes') {
          cleanedData = cleanResumes(rawData);
        } else {
          console.error(`Unknown type: ${type}`);
          continue;
        }
        
        cleaningStats[type].cleaned = cleanedData.length;
        
        // Count removed fields by looking at console output patterns
        // This is a simple approach - in practice you might want to return this info
        const removedFieldsCount = cleanedData.filter(item => 
          item.metadata && Object.keys(item.metadata).length <= 4
        ).length;
        cleaningStats[type].removedFields = removedFieldsCount;
        
        // Validate cleaned data
        console.log(`  Validating cleaned data...`);
        const validationErrors = validateCleanedData(cleanedData, type);
        if (validationErrors.length > 0) {
          console.error(`  Validation errors found: ${validationErrors.length}`);
          validationErrors.slice(0, 5).forEach(error => {
            console.error(`    ${error}`);
          });
          if (validationErrors.length > 5) {
            console.error(`    ...and ${validationErrors.length - 5} more validation errors`);
          }
          cleaningStats[type].errors += validationErrors.length;
        } else {
          console.log(`  ✅ All records passed validation`);
        }
        
      } catch (error) {
        console.error(`  Error during cleaning: ${error.message}`);
        cleaningStats[type].errors++;
        continue;
      }

      // Write cleaned data
      const outputFile = path.join(OUTPUT_DIR, `cleaned.${filename}`);
      fs.writeFileSync(outputFile, JSON.stringify(cleanedData, null, 2));
      
      console.log(`  Cleaned records: ${cleanedData.length}`);
      console.log(`  Output file: ${outputFile}`);

      // Show sample of cleaned metadata
      if (cleanedData.length > 0) {
        console.log(`  Sample cleaned metadata:`, JSON.stringify(cleanedData[0].metadata, null, 2));
      }

    } catch (error) {
      console.error(`Error processing ${type}:`, error.message);
      cleaningStats[type].errors++;
    }
  }

  // Display cleaning summary
  console.log('\n' + '='.repeat(60));
  console.log('DATA CLEANING SUMMARY');
  console.log('='.repeat(60));
  
  for (const [type, stats] of Object.entries(cleaningStats)) {
    console.log(`\n${type.toUpperCase()}:`);
    console.log(`  Processed: ${stats.processed} records`);
    console.log(`  Successfully cleaned: ${stats.cleaned} records`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  Records with removed fields: ~${stats.removedFields}`);
  }
  
  console.log('\nData cleaning completed!');
  console.log(`Check the '${OUTPUT_DIR}' directory for cleaned files.`);
  
  // Return stats for potential programmatic use
  return cleaningStats;
}

// Run if called directly
const scriptPath = fileURLToPath(import.meta.url);
const currentScript = process.argv[1];

console.log('Script path:', scriptPath);
console.log('Current script:', currentScript);

// Normalize paths for comparison (handle Windows vs Unix differences)
const normalizedScriptPath = scriptPath.replace(/\\/g, '/').toLowerCase();
const normalizedCurrentScript = currentScript.replace(/\\/g, '/').toLowerCase();

if (normalizedScriptPath.includes(normalizedCurrentScript) || normalizedCurrentScript.includes(normalizedScriptPath)) {
  console.log('✅ Script is being run directly');
  console.log('Arguments:', process.argv);
  
  const args = process.argv.slice(2);
  
  if (args.includes('--validate-only')) {
    console.log('Running validation only on existing cleaned data...');
    
    // Try to validate existing cleaned files
    for (const [type, filename] of Object.entries(DATA_FILES)) {
      const cleanedFile = path.join(OUTPUT_DIR, `cleaned.${filename}`);
      if (fs.existsSync(cleanedFile)) {
        try {
          const cleanedData = JSON.parse(fs.readFileSync(cleanedFile, 'utf8'));
          console.log(`\nValidating ${cleanedFile} (${cleanedData.length} records)...`);
          
          const validationErrors = validateCleanedData(cleanedData, type);
          if (validationErrors.length > 0) {
            console.error(`❌ Found ${validationErrors.length} validation errors:`);
            validationErrors.slice(0, 10).forEach(error => {
              console.error(`  ${error}`);
            });
            if (validationErrors.length > 10) {
              console.error(`  ...and ${validationErrors.length - 10} more errors`);
            }
          } else {
            console.log(`✅ All ${cleanedData.length} records passed validation`);
          }
        } catch (error) {
          console.error(`Error validating ${cleanedFile}: ${error.message}`);
        }
      } else {
        console.log(`No cleaned file found: ${cleanedFile}`);
      }
    }
  } else {
    console.log('Running full data cleaning process...');
    cleanData();
  }
} else {
  console.log('❌ Script is not being run directly');
  console.log('import.meta.url:', import.meta.url);
  console.log('process.argv[1]:', process.argv[1]);
}

export { cleanJobPostings, cleanResumes, cleanData };
