"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { MongoClient, ServerApiVersion } from "mongodb";
import OpenAI from "openai";
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helper function to recursively convert all ObjectId fields to strings
function convertMongoDocument(doc: any): any {
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
    const newDoc: any = {};
    for (const [key, value] of Object.entries(doc)) {
      newDoc[key] = convertMongoDocument(value);
    }
    return newDoc;
  }

  // Otherwise, return as is
  return doc;
}

// Generate embedding for search query
async function generateQueryEmbedding(query: string) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query.trim(),
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Get all job postings from MongoDB
export const getAllJobPostings = action({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const jobsCollection = db.collection('jobpostings');
      
      const jobs = await jobsCollection.find({}).toArray();
      console.log(`Retrieved ${jobs.length} job postings from MongoDB`);
      
      return jobs.map(convertMongoDocument);
      
    } catch (error) {
      console.error('Error getting all job postings:', error);
      throw new Error(`Failed to get job postings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Get all resumes from MongoDB
export const getAllResumes = action({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const resumesCollection = db.collection('resumes');
      
      const resumes = await resumesCollection.find({}).toArray();
      console.log(`Retrieved ${resumes.length} resumes from MongoDB`);
      
      return resumes.map(convertMongoDocument);
      
    } catch (error) {
      console.error('Error getting all resumes:', error);
      throw new Error(`Failed to get resumes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Search job postings with criteria
export const searchJobPostings = action({
  args: {
    jobTitle: v.optional(v.string()),
    location: v.optional(v.string()),
    jobType: v.optional(v.string()),
    department: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const jobsCollection = db.collection('jobpostings');
      
      // Build search query
      const searchQuery: any = {};
      if (args.jobTitle) {
        searchQuery.jobTitle = { $regex: args.jobTitle, $options: 'i' };
      }
      if (args.location) {
        searchQuery.location = { $regex: args.location, $options: 'i' };
      }
      if (args.jobType) {
        searchQuery.jobType = { $regex: args.jobType, $options: 'i' };
      }
      if (args.department) {
        searchQuery.department = { $regex: args.department, $options: 'i' };
      }
      
      const jobs = await jobsCollection.find(searchQuery).toArray();
      console.log(`Found ${jobs.length} job postings matching search criteria`);
      
      return jobs.map(convertMongoDocument);
      
    } catch (error) {
      console.error('Error searching job postings:', error);
      throw new Error(`Failed to search job postings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Helper to generate embedding for a given text
async function generateEmbeddingForText(text: string): Promise<number[]> {
  if (!text || !text.trim()) return [];
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.trim(),
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

// Import Excel data to MongoDB
export const importExcelData = action({
  args: {
    fileName: v.string(),
    fileData: v.string(), // base64 encoded file data
  },
  returns: v.object({
    successCount: v.number(),
    failCount: v.number(),
  }),
  handler: async (ctx, args) => {
    let client;
    
    try {
      // Decode base64 data
      const buffer = Buffer.from(args.fileData, 'base64');
      
      // Read Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jobListings = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`Processing ${jobListings.length} job listings from Excel file`);
      
      // Connect to MongoDB
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const jobsCollection = db.collection('jobpostings');
      
      let successCount = 0;
      let failCount = 0;
      
      // Transform and insert data
      for (let i = 0; i < jobListings.length; i++) {
        const job: any = jobListings[i];
        
        try {
          const jobData = {
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
              originalIndex: i,
              importedAt: new Date(),
              sourceFile: args.fileName,
              dataType: 'job_posting'
            }
          };
          
          const insertResult = await jobsCollection.insertOne(jobData);
          successCount++;

          // Generate embedding for the job's searchable text
          const fields = [
            jobData.jobTitle,
            jobData.jobSummary,
            jobData.duties,
            jobData.requirements,
            jobData.qualifications,
            jobData.education,
            jobData.location,
            jobData.jobType
          ];
          const combinedText = fields.filter(f => f && f !== 'N/A').join(' ');
          const embedding = await generateEmbeddingForText(combinedText);
          await jobsCollection.updateOne(
            { _id: insertResult.insertedId },
            { $set: { embedding: embedding, searchableText: combinedText } }
          );
        } catch (error) {
          console.error(`Failed to insert job ${i + 1}:`, error);
          failCount++;
        }
      }
      
      console.log(`Import completed: ${successCount} successful, ${failCount} failed`);
      return { successCount, failCount };
      
    } catch (error) {
      console.error('Error importing Excel data:', error);
      throw new Error(`Failed to import Excel data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Import JSON data to MongoDB
export const importJsonData = action({
  args: {
    fileName: v.string(),
    fileData: v.string(), // base64 encoded file data
  },
  returns: v.object({
    successCount: v.number(),
    failCount: v.number(),
  }),
  handler: async (ctx, args) => {
    let client;
    
    try {
      // Decode base64 data
      const buffer = Buffer.from(args.fileData, 'base64');
      const content = buffer.toString('utf-8');
      const jsonData = JSON.parse(content);
      
      // Connect to MongoDB
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const resumesCollection = db.collection('resumes');
      
      // Parse the resume text if it exists
      let structuredData: any = {};
      if (jsonData.text) {
        structuredData = parseResumeText(jsonData.text);
      }
      
      // Create the final document structure
      const document = {
        filename: jsonData.filename || args.fileName,
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
          fileName: args.fileName,
          importedAt: new Date(),
          parsedAt: new Date()
        },
      };
      
      await resumesCollection.insertOne(document);
      console.log(`Successfully imported ${args.fileName}`);

      // Generate embedding for the resume's searchable text
      const fields = [
        document.professionalSummary,
        (document.skills || []).join(' '),
        (document.education || []).join(' '),
        document.certifications,
        document.securityClearance,
        document.personalInfo ? `${document.personalInfo.firstName || ''} ${document.personalInfo.lastName || ''}`.trim() : '',
        (document.experience || []).map((exp: any) => `${exp.title} ${exp.company} ${(exp.responsibilities || []).join(' ')}`).join(' ')
      ];
      const combinedText = fields.filter(Boolean).join(' ');
      const embedding = await generateEmbeddingForText(combinedText);
      await resumesCollection.updateOne(
        { filename: document.filename },
        { $set: { embedding: embedding, searchableText: combinedText } }
      );

      return { successCount: 1, failCount: 0 };
      
    } catch (error) {
      console.error('Error importing JSON data:', error);
      throw new Error(`Failed to import JSON data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Import Office Open XML documents (docx) to MongoDB
export const importOfficeDocument = action({
  args: {
    fileName: v.string(),
    fileData: v.string(), // base64 encoded file data
  },
  returns: v.object({
    successCount: v.number(),
    failCount: v.number(),
  }),
  handler: async (ctx, args) => {
    let client;
    
    try {
      // Validate file type
      if (!args.fileName.toLowerCase().endsWith('.docx')) {
        throw new Error('Only .docx files are supported for Office Open XML import');
      }

      // Decode base64 data
      const buffer = Buffer.from(args.fileData, 'base64');
      
      // Extract text from the document using mammoth
      const result = await mammoth.extractRawText({ buffer });
      const extractedText = result.value;
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text content could be extracted from the document');
      }

      console.log(`Extracted ${extractedText.length} characters from ${args.fileName}`);
      
      // Parse the extracted text using AI
      const structuredData = await parseResumeWithAI(extractedText);
      
      // Connect to MongoDB
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const resumesCollection = db.collection('resumes');
      
      // Create the final document structure matching the template
      const document = {
        filename: args.fileName,
        originalText: extractedText,
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
        certifications: structuredData.certifications || 'n/a',
        professionalMemberships: structuredData.professionalMemberships || 'n/a',
        securityClearance: structuredData.securityClearance || 'n/a',
        _metadata: {
          fileName: args.fileName,
          importedAt: new Date(),
          parsedAt: new Date()
        },
        extractedSkills: structuredData.skills || [],
        processedAt: new Date().toISOString(),
        processedMetadata: {
          sourceFile: args.fileName,
          extractionMethod: 'mammoth + AI',
          textLength: extractedText.length
        },
        searchableText: structuredData.professionalSummary || extractedText.substring(0, 500),
        embedding: []
      };
      
      await resumesCollection.insertOne(document);
      console.log(`Successfully imported ${args.fileName} with AI parsing`);

      // Generate embedding for the resume's searchable text
      const fields = [
        document.professionalSummary,
        (document.skills || []).join(' '),
        (document.education || []).join(' '),
        document.certifications,
        document.securityClearance,
        document.personalInfo ? `${document.personalInfo.firstName || ''} ${document.personalInfo.lastName || ''}`.trim() : '',
        (document.experience || []).map((exp: any) => `${exp.title} ${exp.company} ${(exp.responsibilities || []).join(' ')}`).join(' ')
      ];
      const combinedText = fields.filter(Boolean).join(' ');
      const embedding = await generateEmbeddingForText(combinedText);
      await resumesCollection.updateOne(
        { filename: document.filename },
        { $set: { embedding: embedding, searchableText: combinedText } }
      );

      return { successCount: 1, failCount: 0 };
      
    } catch (error) {
      console.error('Error importing Office document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('Only .docx files are supported')) {
        throw new Error('This file type is not supported. Please upload a .docx file.');
      } else if (errorMessage.includes('No text content could be extracted')) {
        throw new Error('Unable to extract text from this document. The file may be corrupted or password-protected.');
      } else if (errorMessage.includes('Failed to import JSON data')) {
        throw new Error('The document format was unable to be processed. Please ensure it is a valid .docx file.');
      } else {
        throw new Error(`Failed to process document: ${errorMessage}`);
      }
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Clear all data from MongoDB
export const clearAllData = action({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        ssl: true,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      
      // Clear both collections
      const jobsResult = await db.collection('jobpostings').deleteMany({});
      const resumesResult = await db.collection('resumes').deleteMany({});
      
      console.log(`Cleared ${jobsResult.deletedCount} job postings and ${resumesResult.deletedCount} resumes`);
      
      return `Successfully cleared all data: ${jobsResult.deletedCount} job postings and ${resumesResult.deletedCount} resumes removed`;
      
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Helper function to parse resume text
function parseResumeText(text: string): any {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const resume: any = {
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
        resume.experience.push(currentExperience);
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
  resume.professionalSummary = resume.professionalSummary.trim();
  
  return resume;
}

// Parse resume text using AI for better extraction
async function parseResumeWithAI(text: string): Promise<any> {
  try {
    const prompt = `Please parse the following resume text and extract structured information. Return the result as a JSON object with the following structure:

{
  "personalInfo": {
    "firstName": "string",
    "middleName": "string", 
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "yearsOfExperience": number
  },
  "professionalSummary": "string",
  "education": ["string"],
  "experience": [
    {
      "title": "string",
      "company": "string", 
      "location": "string",
      "duration": "string",
      "responsibilities": ["string"]
    }
  ],
  "skills": ["string"],
  "certifications": "string",
  "professionalMemberships": "string",
  "securityClearance": "string"
}

Resume text:
${text}

Please extract all available information and return only the JSON object. If a field is not found, use empty string for strings, empty array for arrays, and 0 for numbers.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a resume parsing assistant. Extract structured information from resume text and return it as JSON."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    return parsedData;

  } catch (error) {
    console.error('Error parsing resume with AI:', error);
    // Fallback to basic parsing if AI fails
    return parseResumeText(text);
  }
}

// Search resumes in MongoDB
export const searchResumesInMongo = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let client;
    
    try {
      console.log(`Searching resumes for: "${args.query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      
      // Connect to MongoDB with serverless-optimized settings
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const resumesCollection = db.collection('resumes');
      
      // Get all resumes (since we need to calculate similarity manually)
      const resumes = await resumesCollection.find({}).toArray();
      
      console.log(`Found ${resumes.length} resumes in database`);
      
      // Calculate similarities for resumes with embeddings
      const similarities = resumes
        .filter(resume => resume.embedding && Array.isArray(resume.embedding))
        .map(resume => ({
          resume: resume,
          similarity: cosineSimilarity(queryEmbedding, resume.embedding)
        }));
      
      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Return top results
      const limit = args.limit || 10;
      const results = similarities.slice(0, limit).map(item => ({
        ...convertMongoDocument(item.resume),
        similarity: item.similarity
      }));
      
      console.log(`Returning ${results.length} matching resumes`);
      return results;
      
    } catch (error) {
      console.error('Error searching resumes:', error);
      throw new Error(`Failed to search resumes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Search job postings in MongoDB
export const searchJobsInMongo = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let client;
    
    try {
      console.log(`Searching jobs for: "${args.query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      
      // Connect to MongoDB with serverless-optimized settings
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const jobsCollection = db.collection('jobpostings');
      
      // Get all job postings
      const jobs = await jobsCollection.find({}).toArray();
      
      console.log(`Found ${jobs.length} jobs in database`);
      
      // Calculate similarities for jobs with embeddings
      const similarities = jobs
        .filter(job => job.embedding && Array.isArray(job.embedding))
        .map(job => ({
          job: job,
          similarity: cosineSimilarity(queryEmbedding, job.embedding)
        }));
      
      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Return top results
      const limit = args.limit || 10;
      const results = similarities.slice(0, limit).map(item => ({
        ...convertMongoDocument(item.job),
        similarity: item.similarity
      }));
      
      console.log(`Returning ${results.length} matching jobs`);
      return results;
      
    } catch (error) {
      console.error('Error searching jobs:', error);
      throw new Error(`Failed to search jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
}); 