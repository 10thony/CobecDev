const fs = require('fs').promises;
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// MongoDB credentials from environment variables
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let uri;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  uri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

const client = new MongoClient(uri, {
  connectTimeoutMS: 10000,
  socketTimeoutMS: 10000,
  maxPoolSize: 1,
  minPoolSize: 0,
  maxIdleTimeMS: 30000,
  // No SSL/TLS needed for local MongoDB
  // No serverApi version needed for local MongoDB
});

async function scanDirectory(dirPath) {
  const jsonFiles = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subDirFiles = await scanDirectory(fullPath);
        jsonFiles.push(...subDirFiles);
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.json') &&
        entry.name !== 'package.json' &&
        entry.name !== 'package-lock.json'
      ) {
        jsonFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return jsonFiles;
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

async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(content);
    
    // Parse the resume text if it exists
    let structuredData = {};
    if (jsonData.text) {
      structuredData = parseResumeText(jsonData.text);
    }
    
    // Create the final document structure
    const document = {
      filename: jsonData.filename || path.basename(filePath),
      originalText: jsonData.text || '',
      ...structuredData,
      _metadata: {
        filePath: filePath,
        fileName: path.basename(filePath),
        importedAt: new Date(),
        parsedAt: new Date()
      },
    };
    
    return document;
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error.message);
    return null;
  }
}

async function insertJsonData(collection, jsonData, filePath) {
  try {
    const result = await collection.insertOne(jsonData);
    console.log(
      `✓ Inserted ${filePath} with ID: ${result.insertedId}`
    );
    return true;
  } catch (error) {
    console.error(`✗ Failed to insert ${filePath}:`, error.message);
    return false;
  }
}

async function getAllJsonData() {
  let client;
  
  try {
    console.log('Connecting to MongoDB to retrieve all data...');
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    // Use the same database and collection
    const db = client.db('json_imports');
    const collection = db.collection('json_data');
    
    console.log('Retrieving all documents...');
    const documents = await collection.find({}).toArray();
    
    console.log(`✓ Retrieved ${documents.length} documents from database`);
    return documents;
    
  } catch (error) {
    console.error('Error retrieving data:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Example usage function
async function exampleUsage() {
  try {
    const allData = await getAllJsonData();
    console.log('\n--- Retrieved Data ---');
    console.log(`Total documents: ${allData.length}`);
    
    // Display first few documents as example
    allData.slice(0, 3).forEach((doc, index) => {
      console.log(`\nDocument ${index + 1}:`);
      console.log(`  File: ${doc._metadata?.fileName || 'Unknown'}`);
      console.log(`  Imported: ${doc._metadata?.importedAt || 'Unknown'}`);
      console.log(`  Name: ${doc.personalInfo?.firstName || ''} ${doc.personalInfo?.lastName || ''}`);
      console.log(`  Email: ${doc.personalInfo?.email || 'N/A'}`);
      console.log(`  Experience: ${doc.personalInfo?.yearsOfExperience || 0} years`);
      console.log(`  Skills: ${doc.skills?.length || 0} skills listed`);
      console.log(`  Experience Entries: ${doc.experience?.length || 0}`);
    });
    
    return allData;
  } catch (error) {
    console.error('Error in example usage:', error.message);
  }
}

async function main() {
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
    
    // Use a database and collection (you can modify these)
    const db = client.db('workdemos');
    const collection = db.collection('resumes');
    
    console.log('Scanning for JSON files...');
    const currentDir = process.cwd();
    const jsonFiles = await scanDirectory(currentDir);
    
    if (jsonFiles.length === 0) {
      console.log('No JSON files found (excluding package.json files)');
      return;
    }
    
    console.log(`Found ${jsonFiles.length} JSON files`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const filePath of jsonFiles) {
      console.log(`Processing: ${filePath}`);
      
      const jsonData = await readJsonFile(filePath);
      if (jsonData) {
        const success = await insertJsonData(collection, jsonData, filePath);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    }
    
    console.log('\n--- Summary ---');
    console.log(`Total files processed: ${jsonFiles.length}`);
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

// Run the script
main().catch(console.error);