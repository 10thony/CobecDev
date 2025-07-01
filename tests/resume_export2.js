const fs = require('fs').promises;
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');
const mammoth = require('mammoth');

// Hardcoded MongoDB credentials (for testing only)
const MONGODB_USERNAME = '';
const MONGODB_PASSWORD = '';
const MONGODB_CLUSTER = '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function extractDateFromFilename(filename) {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(docx|doc|pdf)$/i, '');
  
  // Pattern 1: YYYY MM DD (e.g., "2024 11 21", "2023 03 15")
  let match = nameWithoutExt.match(/(\d{4})\s+(\d{1,2})\s+(\d{1,2})/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  // Pattern 2: MM.DD.YYYY (e.g., "01.10.2023", "10.14.2019")
  match = nameWithoutExt.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
  }
  
  // Pattern 3: MM-DD-YYYY (e.g., "11-24-20", "12-02-2020")
  match = nameWithoutExt.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
  }
  
  // Pattern 4: YYYYMMDD (e.g., "20221205", "20230328")
  match = nameWithoutExt.match(/(\d{4})(\d{2})(\d{2})/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  // Pattern 5: MM-DD-YY (e.g., "10-16-19", "10-2-2019")
  match = nameWithoutExt.match(/(\d{1,2})-(\d{1,2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[3]) + 2000; // Assume 20xx
    return new Date(year, parseInt(match[1]) - 1, parseInt(match[2]));
  }
  
  // Pattern 6: MM/DD/YYYY (e.g., "01/10/2023")
  match = nameWithoutExt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
  }
  
  // Pattern 7: MM/DD/YY (e.g., "01/10/23")
  match = nameWithoutExt.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
  if (match) {
    const year = parseInt(match[3]) + 2000; // Assume 20xx
    return new Date(year, parseInt(match[1]) - 1, parseInt(match[2]));
  }
  
  // If no date found, return a very old date
  return new Date(1900, 0, 1);
}

function getPersonIdentifier(filename) {
  // Extract person name from filename
  // Remove common prefixes and suffixes
  let name = filename
    .replace(/\.(docx|doc|pdf)$/i, '')
    .replace(/Cobec Resume/i, '')
    .replace(/Resume/i, '')
    .replace(/PSS/i, '')
    .replace(/Template/i, '')
    .replace(/ATEPS/i, '')
    .replace(/HSI/i, '')
    .replace(/SETIS/i, '')
    .replace(/EPICS/i, '')
    .replace(/LST/i, '')
    .replace(/FAA/i, '')
    .replace(/NISC/i, '')
    .replace(/NISC/i, '')
    .replace(/v\d+\.?\d*/gi, '') // Remove version numbers
    .replace(/\d{4}\s+\d{1,2}\s+\d{1,2}/g, '') // Remove YYYY MM DD
    .replace(/\d{1,2}\.\d{1,2}\.\d{4}/g, '') // Remove MM.DD.YYYY
    .replace(/\d{1,2}-\d{1,2}-\d{4}/g, '') // Remove MM-DD-YYYY
    .replace(/\d{4}\d{2}\d{2}/g, '') // Remove YYYYMMDD
    .replace(/\d{1,2}-\d{1,2}-\d{2}/g, '') // Remove MM-DD-YY
    .replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '') // Remove MM/DD/YYYY
    .replace(/\d{1,2}\/\d{1,2}\/\d{2}/g, '') // Remove MM/DD/YY
    .replace(/\d{4}/g, '') // Remove any remaining 4-digit years
    .replace(/\d{1,2}/g, '') // Remove any remaining 1-2 digit numbers
    .replace(/[^\w\s]/g, ' ') // Replace special characters with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  // Extract first and last name (first two words)
  const words = name.split(' ').filter(word => word.length > 0);
  if (words.length >= 2) {
    return `${words[0]} ${words[1]}`.toLowerCase();
  } else if (words.length === 1) {
    return words[0].toLowerCase();
  }
  
  return name.toLowerCase();
}

async function scanResumeDirectories(dirPath) {
  const resumeFiles = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip node_modules and other non-resume directories
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || 
            entry.name === 'exported_resumes' || 
            entry.name.startsWith('.') ||
            entry.name === 'Archive') {
          continue;
        }
        
        // Check if this looks like a resume directory (email format)
        if (entry.name.includes('@') && entry.name.includes('.com')) {
          // This is a resume directory, scan for DOCX files
          const subDirFiles = await scanForDocxFiles(fullPath);
          resumeFiles.push(...subDirFiles);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return resumeFiles;
}

async function scanForDocxFiles(dirPath) {
  const docxFiles = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isFile() && entry.name.endsWith('.docx')) {
        docxFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning for DOCX files in ${dirPath}:`, error.message);
  }
  
  return docxFiles;
}

function getLatestResumesByPerson(allFiles) {
  const personResumes = {};
  
  for (const filePath of allFiles) {
    const filename = path.basename(filePath);
    const personId = getPersonIdentifier(filename);
    const fileDate = extractDateFromFilename(filename);
    
    if (!personResumes[personId] || fileDate > personResumes[personId].date) {
      personResumes[personId] = {
        filePath: filePath,
        filename: filename,
        date: fileDate
      };
    }
  }
  
  // Return only the latest file for each person
  return Object.values(personResumes).map(resume => resume.filePath);
}

function parseResumeText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const resume = {
    personalInfo: {},
    professionalSummary: '',
    education: [],
    experience: [],
    skills: [],
    certifications: '',
    professionalMemberships: '',
    securityClearance: ''
  };
  
  let currentSection = '';
  let currentExperience = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse personal information
    if (line.includes('First Name:')) {
      resume.personalInfo.firstName = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Middle Name:')) {
      resume.personalInfo.middleName = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Last Name:')) {
      resume.personalInfo.lastName = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Email:')) {
      resume.personalInfo.email = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Phone:')) {
      resume.personalInfo.phone = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Total Years of Relevant Experience:')) {
      resume.personalInfo.yearsOfExperience = parseInt(line.split(':')[1]?.trim()) || 0;
    }
    
    // Parse sections
    else if (line === 'PROFESSIONAL SUMMARY:') {
      currentSection = 'professionalSummary';
    } else if (line === 'EDUCATION:') {
      currentSection = 'education';
    } else if (line === 'RELEVANT EXPERIENCE:') {
      currentSection = 'experience';
    } else if (line === 'CERTIFICATIONS/TRAINING:') {
      currentSection = 'certifications';
    } else if (line === 'PROFESSIONAL MEMBERSHIPS:') {
      currentSection = 'professionalMemberships';
    } else if (line === 'SECURITY CLEARANCE:') {
      currentSection = 'securityClearance';
    }
    
    // Parse content based on current section
    else if (currentSection === 'professionalSummary' && line.length > 0) {
      resume.professionalSummary += line + ' ';
    }
    else if (currentSection === 'education' && line.length > 0) {
      resume.education.push(line);
    }
    else if (currentSection === 'experience' && line.length > 0) {
      // Check if this looks like a job title (no comma, not empty)
      if (!line.includes(',') && !line.includes('(') && line.length > 0 && !line.includes('Designed') && !line.includes('Developed') && !line.includes('Provided') && !line.includes('Worked') && !line.includes('Design') && !line.includes('Update') && !line.includes('Develop')) {
        // This might be a job title, check next line for company
        if (i + 1 < lines.length && lines[i + 1].includes(',')) {
          currentExperience = {
            title: line,
            company: lines[i + 1].split(',')[0].trim(),
            location: lines[i + 1].split(',')[1]?.trim() || '',
            duration: '',
            responsibilities: []
          };
          i++; // Skip the company line in next iteration
        } else {
          // Single line job entry
          currentExperience = {
            title: line,
            company: '',
            location: '',
            duration: '',
            responsibilities: []
          };
        }
        resume.experience.push(currentExperience);
      } else if (currentExperience && line.includes('to')) {
        // This might be duration
        currentExperience.duration = line;
      } else if (currentExperience && (line.startsWith('Designed') || line.startsWith('Developed') || line.startsWith('Provided') || line.startsWith('Worked') || line.startsWith('Design') || line.startsWith('Update') || line.startsWith('Develop'))) {
        // This is a responsibility
        currentExperience.responsibilities.push(line);
      }
    }
    else if (currentSection === 'certifications' && line.length > 0) {
      resume.certifications = line;
    }
    else if (currentSection === 'professionalMemberships' && line.length > 0) {
      resume.professionalMemberships = line;
    }
    else if (currentSection === 'securityClearance' && line.length > 0) {
      resume.securityClearance = line;
    }
  }
  
  // Parse skills if they exist
  const skillsMatch = text.match(/Skills:\s*(.+?)(?=\n\n|$)/s);
  if (skillsMatch) {
    const skillsText = skillsMatch[1];
    resume.skills = skillsText.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
  }
  
  // Clean up professional summary
  resume.professionalSummary = resume.professionalSummary.trim();
  
  return resume;
}

async function readDocxFile(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    // Parse the resume text
    const structuredData = parseResumeText(text);
    
    // Create the final document structure
    const document = {
      filename: path.basename(filePath),
      originalText: text,
      ...structuredData,
      _metadata: {
        filePath: filePath,
        fileName: path.basename(filePath),
        processedAt: new Date()
      },
    };
    
    return document;
  } catch (error) {
    console.error(`Error reading DOCX file ${filePath}:`, error.message);
    return null;
  }
}

async function insertResumeData(collection, resumeData, filePath) {
  try {
    const result = await collection.insertOne(resumeData);
    console.log(
      `✓ Inserted ${filePath} with ID: ${result.insertedId}`
    );
    return true;
  } catch (error) {
    console.error(`✗ Failed to insert ${filePath}:`, error.message);
    return false;
  }
}

async function exportResumeData(filePath, outputDir = './exported_resumes') {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    const resumeData = await readDocxFile(filePath);
    if (!resumeData) {
      console.error(`✗ Failed to process ${filePath}`);
      return false;
    }
    
    // Create a clean filename for export
    const baseName = path.basename(filePath, '.docx');
    const exportFileName = `${baseName}_processed.json`;
    const exportPath = path.join(outputDir, exportFileName);
    
    // Write the processed data to a new JSON file
    await fs.writeFile(exportPath, JSON.stringify(resumeData, null, 2), 'utf8');
    
    console.log(`✓ Exported ${filePath} to ${exportPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to export ${filePath}:`, error.message);
    return false;
  }
}

async function exportAllResumes(outputDir = './exported_resumes') {
  try {
    console.log('Scanning for resume directories...');
    const currentDir = process.cwd();
    const allDocxFiles = await scanResumeDirectories(currentDir);
    
    if (allDocxFiles.length === 0) {
      console.log('No DOCX resume files found in resume directories');
      return;
    }
    
    console.log(`Found ${allDocxFiles.length} total DOCX resume files`);
    
    // Get only the latest resume for each person
    const latestResumes = getLatestResumesByPerson(allDocxFiles);
    console.log(`Processing ${latestResumes.length} latest resumes (one per person)`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const filePath of latestResumes) {
      console.log(`Processing: ${path.basename(filePath)}`);
      
      const success = await exportResumeData(filePath, outputDir);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log('\n--- Export Summary ---');
    console.log(`Total files found: ${allDocxFiles.length}`);
    console.log(`Latest resumes processed: ${latestResumes.length}`);
    console.log(`Successfully exported: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Export directory: ${path.resolve(outputDir)}`);
    
  } catch (error) {
    console.error('Error during export:', error.message);
  }
}

async function insertAllResumesToMongoDB() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    // Use a database and collection
    const db = client.db('workdemos');
    const collection = db.collection('resumes');
    
    console.log('Scanning for resume directories...');
    const currentDir = process.cwd();
    const allDocxFiles = await scanResumeDirectories(currentDir);
    
    if (allDocxFiles.length === 0) {
      console.log('No DOCX resume files found in resume directories');
      return;
    }
    
    console.log(`Found ${allDocxFiles.length} total DOCX resume files`);
    
    // Get only the latest resume for each person
    const latestResumes = getLatestResumesByPerson(allDocxFiles);
    console.log(`Processing ${latestResumes.length} latest resumes (one per person)`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const filePath of latestResumes) {
      console.log(`Processing: ${path.basename(filePath)}`);
      
      const resumeData = await readDocxFile(filePath);
      if (resumeData) {
        const success = await insertResumeData(collection, resumeData, filePath);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    }
    
    console.log('\n--- MongoDB Insert Summary ---');
    console.log(`Total files found: ${allDocxFiles.length}`);
    console.log(`Latest resumes processed: ${latestResumes.length}`);
    console.log(`Successfully inserted: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

async function displayResumeSummary(filePath) {
  try {
    const resumeData = await readDocxFile(filePath);
    if (!resumeData) {
      console.error(`Failed to process ${filePath}`);
      return;
    }
    
    console.log('\n--- Resume Summary ---');
    console.log(`File: ${resumeData._metadata?.fileName || 'Unknown'}`);
    console.log(`Processed: ${resumeData._metadata?.processedAt || 'Unknown'}`);
    console.log(`Name: ${resumeData.personalInfo?.firstName || ''} ${resumeData.personalInfo?.lastName || ''}`);
    console.log(`Email: ${resumeData.personalInfo?.email || 'N/A'}`);
    console.log(`Experience: ${resumeData.personalInfo?.yearsOfExperience || 0} years`);
    console.log(`Skills: ${resumeData.skills?.length || 0} skills listed`);
    console.log(`Experience Entries: ${resumeData.experience?.length || 0}`);
    console.log(`Education Entries: ${resumeData.education?.length || 0}`);
    
    if (resumeData.professionalSummary) {
      console.log(`Professional Summary: ${resumeData.professionalSummary.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.error('Error displaying summary:', error.message);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'export':
      const outputDir = args[1] || './exported_resumes';
      await exportAllResumes(outputDir);
      break;
      
    case 'mongodb':
      await insertAllResumesToMongoDB();
      break;
      
    case 'summary':
      const filePath = args[1];
      if (!filePath) {
        console.error('Please provide a file path for summary');
        console.log('Usage: node resume_export2.js summary <filepath>');
        return;
      }
      await displayResumeSummary(filePath);
      break;
      
    case 'process':
      const singleFilePath = args[1];
      const singleOutputDir = args[2] || './exported_resumes';
      if (!singleFilePath) {
        console.error('Please provide a file path to process');
        console.log('Usage: node resume_export2.js process <filepath> [outputdir]');
        return;
      }
      await exportResumeData(singleFilePath, singleOutputDir);
      break;
      
    default:
      console.log('Resume Export Tool');
      console.log('');
      console.log('Usage:');
      console.log('  node resume_export2.js export [outputdir]     - Export all DOCX files in resume directories');
      console.log('  node resume_export2.js mongodb               - Insert all resumes to MongoDB');
      console.log('  node resume_export2.js process <filepath> [outputdir] - Process a single file');
      console.log('  node resume_export2.js summary <filepath>     - Display summary of a single file');
      console.log('');
      console.log('Examples:');
      console.log('  node resume_export2.js export');
      console.log('  node resume_export2.js export ./my_exports');
      console.log('  node resume_export2.js mongodb');
      console.log('  node resume_export2.js process ./path/to/resume.docx');
      console.log('  node resume_export2.js summary ./path/to/resume.docx');
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  scanResumeDirectories,
  scanForDocxFiles,
  extractDateFromFilename,
  getPersonIdentifier,
  getLatestResumesByPerson,
  parseResumeText,
  readDocxFile,
  exportResumeData,
  exportAllResumes,
  insertAllResumesToMongoDB,
  displayResumeSummary
};
