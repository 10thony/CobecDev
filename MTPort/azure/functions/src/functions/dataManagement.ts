import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { cosmosDbService } from '../services/cosmosDbService';
import { aiService } from '../services/aiService';
import { createSharePointService } from '../services/sharePointService';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const { action, data, accessToken } = req.body;

    switch (action) {
      case 'uploadFile':
        await handleFileUpload(context, req, accessToken);
        break;
      
      case 'getAllData':
        await handleGetAllData(context);
        break;
      
      case 'searchData':
        await handleSearchData(context, data);
        break;
      
      case 'clearData':
        await handleClearData(context);
        break;
      
      case 'getDataSummary':
        await handleGetDataSummary(context);
        break;
      
      default:
        context.res = {
          status: 400,
          body: {
            error: 'Invalid action specified'
          }
        };
    }

  } catch (error) {
    console.error('Data management error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

async function handleFileUpload(context: Context, req: HttpRequest, accessToken: string): Promise<void> {
  try {
    const { file, fileName, fileType, contentType, library } = req.body;
    
    if (!file || !fileName || !contentType) {
      context.res = {
        status: 400,
        body: {
          error: 'Missing required fields: file, fileName, contentType'
        }
      };
      return;
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(file, 'base64');
    
    // Upload to SharePoint first
    const sharePointService = createSharePointService(accessToken);
    const uploadResult = await sharePointService.uploadToDocumentLibrary(
      fileBuffer,
      fileName,
      library || 'Documents'
    );

    if (!uploadResult.success) {
      context.res = {
        status: 500,
        body: {
          error: 'Failed to upload file to SharePoint',
          message: uploadResult.message
        }
      };
      return;
    }

    // Process file content based on type
    let processedData: any[] = [];
    let errors: string[] = [];

    try {
      switch (fileType.toLowerCase()) {
        case 'pdf':
          const pdfData = await pdfParse(fileBuffer);
          processedData = await processPdfContent(pdfData.text, contentType);
          break;
        
        case 'docx':
          const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
          processedData = await processDocxContent(docxData.value, contentType);
          break;
        
        case 'xlsx':
        case 'xls':
          const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
          processedData = await processExcelContent(workbook, contentType);
          break;
        
        case 'json':
          const jsonData = JSON.parse(fileBuffer.toString());
          processedData = await processJsonContent(jsonData, contentType);
          break;
        
        default:
          errors.push(`Unsupported file type: ${fileType}`);
      }
    } catch (processingError) {
      errors.push(`File processing error: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
    }

    // Save processed data to Cosmos DB
    let savedCount = 0;
    for (const item of processedData) {
      try {
        if (contentType === 'job') {
          await cosmosDbService.createJobPosting(item);
        } else if (contentType === 'resume') {
          await cosmosDbService.createResume(item);
        }
        savedCount++;
      } catch (saveError) {
        errors.push(`Failed to save item: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        fileId: uploadResult.fileId,
        webUrl: uploadResult.webUrl,
        message: `File uploaded and processed successfully`,
        processedCount: savedCount,
        errors: errors.length > 0 ? errors : undefined
      }
    };

  } catch (error) {
    console.error('File upload error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'File upload failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleGetAllData(context: Context): Promise<void> {
  try {
    const [jobs, resumes] = await Promise.all([
      cosmosDbService.getAllJobPostings(),
      cosmosDbService.getAllResumes()
    ]);

    context.res = {
      status: 200,
      body: {
        jobs,
        resumes,
        totalJobs: jobs.length,
        totalResumes: resumes.length
      }
    };

  } catch (error) {
    console.error('Get all data error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to retrieve data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleSearchData(context: Context, data: any): Promise<void> {
  try {
    const { query, type, filters } = data;
    
    let jobs: any[] = [];
    let resumes: any[] = [];

    if (type === 'jobs' || type === 'both') {
      jobs = await cosmosDbService.searchJobPostings(query, filters);
    }

    if (type === 'resumes' || type === 'both') {
      resumes = await cosmosDbService.searchResumes(query, filters);
    }

    context.res = {
      status: 200,
      body: {
        jobs,
        resumes,
        totalResults: jobs.length + resumes.length
      }
    };

  } catch (error) {
    console.error('Search data error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleClearData(context: Context): Promise<void> {
  try {
    await cosmosDbService.clearAllData();

    context.res = {
      status: 200,
      body: {
        success: true,
        message: 'All data cleared successfully'
      }
    };

  } catch (error) {
    console.error('Clear data error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to clear data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleGetDataSummary(context: Context): Promise<void> {
  try {
    const summary = await cosmosDbService.getDataSummary();

    context.res = {
      status: 200,
      body: summary
    };

  } catch (error) {
    console.error('Get data summary error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to get data summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// File processing functions
async function processPdfContent(text: string, contentType: string): Promise<any[]> {
  const processed = await aiService.processDocument(text);
  
  if (contentType === 'resume') {
    // Parse resume from PDF text
    return [parseResumeFromText(text, processed)];
  } else {
    // Parse job posting from PDF text
    return [parseJobFromText(text, processed)];
  }
}

async function processDocxContent(text: string, contentType: string): Promise<any[]> {
  const processed = await aiService.processDocument(text);
  
  if (contentType === 'resume') {
    return [parseResumeFromText(text, processed)];
  } else {
    return [parseJobFromText(text, processed)];
  }
}

async function processExcelContent(workbook: any, contentType: string): Promise<any[]> {
  const results: any[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    for (const row of jsonData) {
      if (contentType === 'job') {
        results.push(parseJobFromExcelRow(row));
      } else if (contentType === 'resume') {
        results.push(parseResumeFromExcelRow(row));
      }
    }
  }
  
  return results;
}

async function processJsonContent(data: any, contentType: string): Promise<any[]> {
  if (Array.isArray(data)) {
    return data.map(item => contentType === 'job' ? parseJobFromJson(item) : parseResumeFromJson(item));
  } else {
    return [contentType === 'job' ? parseJobFromJson(data) : parseResumeFromJson(data)];
  }
}

// Parsing helper functions
function parseResumeFromText(text: string, processed: any): any {
  // Simple resume parsing logic
  const lines = text.split('\n').filter(line => line.trim());
  
  return {
    filename: 'parsed-resume.txt',
    originalText: text,
    personalInfo: {
      firstName: extractFirstName(lines),
      middleName: '',
      lastName: extractLastName(lines),
      email: extractEmail(text),
      phone: extractPhone(text),
      yearsOfExperience: extractYearsOfExperience(text)
    },
    professionalSummary: extractProfessionalSummary(lines),
    education: extractEducation(lines),
    experience: extractExperience(lines),
    skills: processed.extractedSkills,
    certifications: '',
    professionalMemberships: '',
    securityClearance: '',
    searchableText: processed.searchableText,
    extractedSkills: processed.extractedSkills,
    embedding: processed.embedding
  };
}

function parseJobFromText(text: string, processed: any): any {
  // Simple job parsing logic
  const lines = text.split('\n').filter(line => line.trim());
  
  return {
    jobTitle: extractJobTitle(lines),
    location: extractLocation(lines),
    salary: extractSalary(text),
    openDate: new Date().toISOString(),
    closeDate: '',
    jobLink: '',
    jobType: 'Full-time',
    jobSummary: extractJobSummary(lines),
    duties: extractDuties(lines),
    requirements: extractRequirements(lines),
    qualifications: extractQualifications(lines),
    education: extractEducationRequirements(lines),
    howToApply: '',
    additionalInformation: '',
    department: extractDepartment(lines),
    seriesGrade: '',
    travelRequired: '',
    workSchedule: '',
    securityClearance: '',
    experienceRequired: '',
    educationRequired: '',
    applicationDeadline: '',
    contactInfo: '',
    searchableText: processed.searchableText,
    extractedSkills: processed.extractedSkills,
    embedding: processed.embedding
  };
}

// Extraction helper functions (simplified implementations)
function extractFirstName(lines: string[]): string {
  return lines[0]?.split(' ')[0] || '';
}

function extractLastName(lines: string[]): string {
  return lines[0]?.split(' ').slice(-1)[0] || '';
}

function extractEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : '';
}

function extractPhone(text: string): string {
  const phoneRegex = /(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;
  const match = text.match(phoneRegex);
  return match ? match[0] : '';
}

function extractYearsOfExperience(text: string): number {
  const expRegex = /(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?experience/i;
  const match = text.match(expRegex);
  return match ? parseInt(match[1]) : 0;
}

function extractProfessionalSummary(lines: string[]): string {
  // Find summary section
  const summaryIndex = lines.findIndex(line => 
    line.toLowerCase().includes('summary') || line.toLowerCase().includes('objective')
  );
  return summaryIndex >= 0 ? lines[summaryIndex + 1] || '' : '';
}

function extractEducation(lines: string[]): string[] {
  const educationIndex = lines.findIndex(line => 
    line.toLowerCase().includes('education')
  );
  if (educationIndex >= 0) {
    return lines.slice(educationIndex + 1, educationIndex + 5).filter(line => line.trim());
  }
  return [];
}

function extractExperience(lines: string[]): any[] {
  // Simplified experience extraction
  return [];
}

function extractJobTitle(lines: string[]): string {
  return lines[0] || '';
}

function extractLocation(lines: string[]): string {
  const locationLine = lines.find(line => 
    line.toLowerCase().includes('location') || line.toLowerCase().includes('city')
  );
  return locationLine || '';
}

function extractSalary(text: string): string {
  const salaryRegex = /\$[\d,]+(?:-\$[\d,]+)?/;
  const match = text.match(salaryRegex);
  return match ? match[0] : '';
}

function extractJobSummary(lines: string[]): string {
  return lines.slice(1, 3).join(' ') || '';
}

function extractDuties(lines: string[]): string {
  return '';
}

function extractRequirements(lines: string[]): string {
  return '';
}

function extractQualifications(lines: string[]): string {
  return '';
}

function extractEducationRequirements(lines: string[]): string {
  return '';
}

function extractDepartment(lines: string[]): string {
  return '';
}

function parseJobFromExcelRow(row: any): any {
  return {
    jobTitle: row.jobTitle || row.title || '',
    location: row.location || '',
    salary: row.salary || '',
    openDate: row.openDate || new Date().toISOString(),
    closeDate: row.closeDate || '',
    jobLink: row.jobLink || row.link || '',
    jobType: row.jobType || 'Full-time',
    jobSummary: row.jobSummary || row.summary || '',
    duties: row.duties || '',
    requirements: row.requirements || '',
    qualifications: row.qualifications || '',
    education: row.education || '',
    howToApply: row.howToApply || '',
    additionalInformation: row.additionalInformation || '',
    department: row.department || '',
    seriesGrade: row.seriesGrade || '',
    travelRequired: row.travelRequired || '',
    workSchedule: row.workSchedule || '',
    securityClearance: row.securityClearance || '',
    experienceRequired: row.experienceRequired || '',
    educationRequired: row.educationRequired || '',
    applicationDeadline: row.applicationDeadline || '',
    contactInfo: row.contactInfo || ''
  };
}

function parseResumeFromExcelRow(row: any): any {
  return {
    filename: row.filename || 'excel-resume.xlsx',
    originalText: '',
    personalInfo: {
      firstName: row.firstName || '',
      middleName: row.middleName || '',
      lastName: row.lastName || '',
      email: row.email || '',
      phone: row.phone || '',
      yearsOfExperience: row.yearsOfExperience || 0
    },
    professionalSummary: row.professionalSummary || row.summary || '',
    education: row.education ? [row.education] : [],
    experience: [],
    skills: row.skills ? row.skills.split(',').map((s: string) => s.trim()) : [],
    certifications: row.certifications || '',
    professionalMemberships: row.professionalMemberships || '',
    securityClearance: row.securityClearance || ''
  };
}

function parseJobFromJson(data: any): any {
  return data;
}

function parseResumeFromJson(data: any): any {
  return data;
}

export default httpTrigger; 