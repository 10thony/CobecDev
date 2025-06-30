// Client-side data service
// Handles Excel file imports and JSON data processing in the browser

import * as XLSX from 'xlsx';
import { 
  getMongoClient, 
  insertJobData, 
  insertJsonData, 
  JobPosting, 
  Resume,
  resetDatabaseConnection
} from './mongoClient';

// Function to read and parse Excel file in the browser
export async function readExcelFile(file: File): Promise<JobPosting[]> {
  try {
    console.log(`Reading Excel file: ${file.name}`);
    
    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jobListings = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${jobListings.length} job listings in Excel file`);
    
    // Transform the data for storage
    const transformedJobs: JobPosting[] = jobListings.map((job: any, index: number) => {
      return {
        jobTitle: job['Job Title'] || 'N/A',
        location: job['Location'] || 'N/A',
        salary: job['Salary'] || 'N/A',
        openDate: job['Open Date'] || 'N/A',
        closeDate: job['Close Date'] || 'N/A',
        jobLink: job['Job Link'] || 'N/A',
        jobType: job['Job Type'] || 'N/A',
        jobSummary: job['Job Summary'] || 'N/A',
        duties: job['Duties'] || 'N/A',
        requirements: job['Requirements'] || 'N/A',
        qualifications: job['Qualifications'] || 'N/A',
        education: job['Education'] || 'N/A',
        howToApply: job['How To Apply'] || 'N/A',
        additionalInformation: job['Additional Information'] || 'N/A',
        department: job['Department'] || 'N/A',
        seriesGrade: job['Series/Grade'] || 'N/A',
        travelRequired: job['Travel Required'] || 'N/A',
        workSchedule: job['Work Schedule'] || 'N/A',
        securityClearance: job['Security Clearance'] || 'N/A',
        experienceRequired: job['Experience Required'] || 'N/A',
        educationRequired: job['Education Required'] || 'N/A',
        applicationDeadline: job['Application Deadline'] || 'N/A',
        contactInfo: job['Contact Info'] || 'N/A',
        _metadata: {
          originalIndex: index,
          importedAt: new Date(),
          sourceFile: file.name,
          dataType: 'job_posting'
        }
      };
    });
    
    return transformedJobs;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
}

// Function to parse resume text
export function parseResumeText(text: string): Partial<Resume> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const resume: Partial<Resume> = {
    personalInfo: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      yearsOfExperience: 0
    },
    professionalSummary: '',
    education: [],
    experience: [],
    skills: [],
    certifications: '',
    professionalMemberships: '',
    securityClearance: ''
  };
  
  let currentSection = '';
  let currentExperience: any = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse personal information
    if (line.includes('First Name:')) {
      resume.personalInfo!.firstName = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Middle Name:')) {
      resume.personalInfo!.middleName = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Last Name:')) {
      resume.personalInfo!.lastName = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Email:')) {
      resume.personalInfo!.email = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Phone:')) {
      resume.personalInfo!.phone = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Total Years of Relevant Experience:')) {
      resume.personalInfo!.yearsOfExperience = parseInt(line.split(':')[1]?.trim()) || 0;
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
      resume.education!.push(line);
    }
    else if (currentSection === 'experience' && line.length > 0) {
      // Check if this looks like a job title
      if (!line.includes(',') && !line.includes('(') && line.length > 0 && 
          !line.includes('Designed') && !line.includes('Developed') && 
          !line.includes('Provided') && !line.includes('Worked') && 
          !line.includes('Design') && !line.includes('Update') && 
          !line.includes('Develop')) {
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
        resume.experience!.push(currentExperience);
      } else if (currentExperience && line.includes('to')) {
        // This might be duration
        currentExperience.duration = line;
      } else if (currentExperience && (line.startsWith('Designed') || 
                line.startsWith('Developed') || line.startsWith('Provided') || 
                line.startsWith('Worked') || line.startsWith('Design') || 
                line.startsWith('Update') || line.startsWith('Develop'))) {
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
  resume.professionalSummary = resume.professionalSummary!.trim();
  
  return resume;
}

// Function to read JSON file
export async function readJsonFile(file: File): Promise<Resume | null> {
  try {
    const content = await file.text();
    const jsonData = JSON.parse(content);
    
    // Parse the resume text if it exists
    let structuredData: Partial<Resume> = {};
    if (jsonData.text) {
      structuredData = parseResumeText(jsonData.text);
    }
    
    // Create the final document structure
    const document: Resume = {
      filename: jsonData.filename || file.name,
      originalText: jsonData.text || '',
      personalInfo: structuredData.personalInfo || {
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        phone: '',
        yearsOfExperience: 0
      },
      professionalSummary: structuredData.professionalSummary || '',
      education: structuredData.education || [],
      experience: structuredData.experience || [],
      skills: structuredData.skills || [],
      certifications: structuredData.certifications || '',
      professionalMemberships: structuredData.professionalMemberships || '',
      securityClearance: structuredData.securityClearance || '',
      _metadata: {
        fileName: file.name,
        importedAt: new Date(),
        parsedAt: new Date()
      },
    };
    
    return document;
  } catch (error) {
    console.error(`Error reading JSON file ${file.name}:`, error);
    return null;
  }
}

// Function to import Excel data to client-side storage
export async function importExcelData(file: File): Promise<{ successCount: number; failCount: number }> {
  try {
    const client = await getMongoClient();
    const db = client.getDatabase('workdemos');
    const collection = db.collection('jobpostings');
    
    console.log('Reading Excel file...');
    const jobListings = await readExcelFile(file);
    
    if (jobListings.length === 0) {
      console.log('No job listings found in Excel file');
      return { successCount: 0, failCount: 0 };
    }
    
    console.log(`Processing ${jobListings.length} job listings...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < jobListings.length; i++) {
      const jobData = jobListings[i];
      const success = await insertJobData(collection, jobData, i);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Add a small delay to avoid overwhelming the storage
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    console.log('\n--- Import Summary ---');
    console.log(`Total job listings processed: ${jobListings.length}`);
    console.log(`Successfully inserted: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    return { successCount, failCount };
    
  } catch (error) {
    console.error('Error importing Excel data:', error);
    throw error;
  }
}

// Function to import JSON data to client-side storage
export async function importJsonData(file: File): Promise<{ successCount: number; failCount: number }> {
  try {
    const client = await getMongoClient();
    const db = client.getDatabase('workdemos');
    const collection = db.collection('resumes');
    
    console.log('Reading JSON file...');
    const jsonData = await readJsonFile(file);
    
    if (!jsonData) {
      console.log('Failed to parse JSON file');
      return { successCount: 0, failCount: 1 };
    }
    
    const success = await insertJsonData(collection, jsonData, file.name);
    
    if (success) {
      console.log(`✓ Successfully imported ${file.name}`);
      return { successCount: 1, failCount: 0 };
    } else {
      console.log(`✗ Failed to import ${file.name}`);
      return { successCount: 0, failCount: 1 };
    }
    
  } catch (error) {
    console.error('Error importing JSON data:', error);
    throw error;
  }
}

// Function to clear all data from storage
export async function clearAllData(): Promise<void> {
  try {
    // Reset the database connection
    await resetDatabaseConnection();
    
    // Delete the IndexedDB database
    const request = indexedDB.deleteDatabase('workdemos');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('✓ All data cleared');
        resolve();
      };
      request.onerror = () => {
        console.error('✗ Failed to clear data');
        reject(new Error(`Failed to delete database: ${request.error}`));
      };
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    throw new Error(`Failed to clear data: ${error}`);
  }
} 