import XLSX from 'xlsx';
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

// MongoDB credentials from environment variables
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

// Generate Gemini embedding for text
async function generateGeminiEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const result = await embeddingModel.embedContent(text.trim());
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating Gemini embedding:', error.message);
    return [];
  }
}

// Generate multiple embeddings for different aspects of job data
async function generateJobEmbeddings(jobData) {
  try {
    // Create different text chunks for specialized embeddings
    const titleText = jobData.jobTitle || '';
    const summaryText = jobData.jobSummary || '';
    const requirementsText = jobData.requirements || '';
    const dutiesText = jobData.duties || '';
    
    // Combined text for general search
    const combinedText = [
      titleText,
      summaryText,
      requirementsText,
      dutiesText,
      jobData.qualifications || '',
      jobData.department || '',
      jobData.location || '',
      jobData.jobType || ''
    ].filter(Boolean).join(' ');

    // Generate embeddings in parallel for efficiency
    const [
      titleEmbedding,
      summaryEmbedding,
      requirementsEmbedding,
      dutiesEmbedding,
      combinedEmbedding
    ] = await Promise.all([
      titleText ? generateGeminiEmbedding(titleText) : [],
      summaryText ? generateGeminiEmbedding(summaryText) : [],
      requirementsText ? generateGeminiEmbedding(requirementsText) : [],
      dutiesText ? generateGeminiEmbedding(dutiesText) : [],
      combinedText ? generateGeminiEmbedding(combinedText) : []
    ]);

    return {
      titleEmbedding,
      summaryEmbedding,
      requirementsEmbedding,
      dutiesEmbedding,
      combinedEmbedding
    };
  } catch (error) {
    console.error('Error generating job embeddings:', error.message);
    return {
      titleEmbedding: [],
      summaryEmbedding: [],
      requirementsEmbedding: [],
      dutiesEmbedding: [],
      combinedEmbedding: []
    };
  }
}

// Use Gemini AI to analyze and suggest optimal text chunking strategy
async function analyzeTextChunkingStrategy(sampleData, dataType) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
    Analyze this ${dataType} data structure and recommend the optimal way to chunk the text for vector search embeddings.
    
    Sample data structure:
    ${JSON.stringify(sampleData[0], null, 2)}
    
    Please provide:
    1. Recommended text chunks (specific field combinations that should be embedded together)
    2. Description of what each chunk represents
    3. Optimization notes for vector search performance
    
    Consider:
    - Semantic coherence (related information should be together)
    - Search relevance (what users typically search for)
    - Token limits and embedding costs
    - Search accuracy and precision
    
    Return your response as a JSON object with:
    {
      "recommendedChunks": ["chunk1", "chunk2", ...],
      "chunkDescriptions": ["description1", "description2", ...],
      "optimizationNotes": ["note1", "note2", ...]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const parsed = JSON.parse(text);
      return {
        recommendedChunks: parsed.recommendedChunks || [],
        chunkDescriptions: parsed.chunkDescriptions || [],
        optimizationNotes: parsed.optimizationNotes || []
      };
    } catch (parseError) {
      console.warn('Failed to parse Gemini response as JSON, using fallback strategy');
      return getFallbackChunkingStrategy(dataType);
    }
  } catch (error) {
    console.error('Error analyzing text chunking strategy:', error.message);
    return getFallbackChunkingStrategy(dataType);
  }
}

function getFallbackChunkingStrategy(dataType) {
  if (dataType === 'jobs') {
    return {
      recommendedChunks: ['title', 'summary', 'requirements', 'duties', 'combined'],
      chunkDescriptions: [
        'Job title only',
        'Job summary and description', 
        'Requirements and qualifications',
        'Job duties and responsibilities',
        'All job information combined'
      ],
      optimizationNotes: [
        'Separate chunks allow for more targeted searches',
        'Combined chunk provides general semantic search',
        'Consider search patterns when choosing chunk strategy'
      ]
    };
  } else {
    return {
      recommendedChunks: ['name', 'summary', 'skills', 'experience', 'education', 'combined'],
      chunkDescriptions: [
        'Candidate name',
        'Professional summary',
        'Skills and competencies',
        'Work experience',
        'Education and training',
        'All resume information combined'
      ],
      optimizationNotes: [
        'Separate chunks allow for more targeted searches',
        'Combined chunk provides general semantic search',
        'Consider search patterns when choosing chunk strategy'
      ]
    };
  }
}

// Function to read and parse Excel file
async function readExcelFile(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jobListings = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${jobListings.length} job listings in Excel file`);
    
    // Analyze the first few samples to determine optimal chunking strategy
    const sampleData = jobListings.slice(0, 3);
    console.log('Analyzing data structure for optimal chunking strategy...');
    const chunkingStrategy = await analyzeTextChunkingStrategy(sampleData, 'jobs');
    
    console.log('Recommended chunking strategy:');
    chunkingStrategy.recommendedChunks.forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk}: ${chunkingStrategy.chunkDescriptions[index]}`);
    });
    
    console.log('Optimization notes:');
    chunkingStrategy.optimizationNotes.forEach(note => {
      console.log(`  • ${note}`);
    });
    
    // Transform the data for MongoDB insertion with optimized structure
    const transformedJobs = [];
    
    for (let i = 0; i < jobListings.length; i++) {
      const job = jobListings[i];
      
      // Create the base job data structure
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
        
        // Create searchable text chunks for different embedding types
        searchableText: {
          title: job['Job Title'] || '',
          summary: job['Job Summary'] || '',
          requirements: job['Requirements'] || '',
          duties: job['Duties'] || '',
          combined: [
            job['Job Title'] || '',
            job['Job Summary'] || '',
            job['Requirements'] || '',
            job['Duties'] || '',
            job['Qualifications'] || '',
            job['Department'] || '',
            job['Location'] || '',
            job['Job Type'] || ''
          ].filter(Boolean).join(' ')
        },
        
        // Embeddings will be generated and added here
        embeddings: {
          titleEmbedding: [],
          summaryEmbedding: [],
          requirementsEmbedding: [],
          dutiesEmbedding: [],
          combinedEmbedding: []
        },
        
        // Metadata
        _metadata: {
          originalIndex: i,
          importedAt: new Date(),
          sourceFile: filePath,
          dataType: 'job_posting',
          chunkingStrategy: chunkingStrategy.recommendedChunks,
          embeddingModel: 'gemini-embedding-001'
        }
      };
      
      transformedJobs.push(jobData);
    }
    
    return transformedJobs;
  } catch (error) {
    console.error('Error reading Excel file:', error.message);
    throw error;
  }
}

// Function to insert job data into MongoDB with embeddings
async function insertJobData(collection, jobData, index) {
  try {
    console.log(`Processing job ${index + 1}: ${jobData.jobTitle}`);
    
    // Generate embeddings for this job
    console.log(`  Generating embeddings...`);
    const embeddings = await generateJobEmbeddings(jobData);
    
    // Update job data with embeddings
    jobData.embeddings = embeddings;
    jobData.embeddingGeneratedAt = new Date();
    
    // Insert into MongoDB
    const result = await collection.insertOne(jobData);
    console.log(`✓ Inserted job ${index + 1}: ${jobData.jobTitle} with ID: ${result.insertedId}`);
    
    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return true;
  } catch (error) {
    console.error(`✗ Failed to insert job ${index + 1}: ${jobData.jobTitle}`, error.message);
    return false;
  }
}

// Function to get all job postings from the database
async function getAllJobPostings() {
  let client;
  
  try {
    console.log('Connecting to MongoDB to retrieve all job postings...');
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('workdemos');
    const collection = db.collection('jobpostings');
    
    console.log('Retrieving all job postings...');
    const documents = await collection.find({}).toArray();
    
    console.log(`✓ Retrieved ${documents.length} job postings from database`);
    return documents;
    
  } catch (error) {
    console.error('Error retrieving job postings:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Function to search job postings by criteria
async function searchJobPostings(searchCriteria) {
  let client;
  
  try {
    console.log('Connecting to MongoDB to search job postings...');
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('workdemos');
    const collection = db.collection('jobpostings');
    
    // Build search query
    const query = {};
    
    if (searchCriteria.jobTitle) {
      query.jobTitle = { $regex: searchCriteria.jobTitle, $options: 'i' };
    }
    
    if (searchCriteria.location) {
      query.location = { $regex: searchCriteria.location, $options: 'i' };
    }
    
    if (searchCriteria.jobType) {
      query.jobType = { $regex: searchCriteria.jobType, $options: 'i' };
    }
    
    if (searchCriteria.department) {
      query.department = { $regex: searchCriteria.department, $options: 'i' };
    }
    
    console.log('Searching job postings with criteria:', searchCriteria);
    const documents = await collection.find(query).toArray();
    
    console.log(`✓ Found ${documents.length} matching job postings`);
    return documents;
    
  } catch (error) {
    console.error('Error searching job postings:', error.message);
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
    const allJobs = await getAllJobPostings();
    console.log('\n--- Retrieved Job Postings ---');
    console.log(`Total job postings: ${allJobs.length}`);
    
    // Display first few job postings as example
    allJobs.slice(0, 3).forEach((job, index) => {
      console.log(`\nJob Posting ${index + 1}:`);
      console.log(`  Title: ${job.jobTitle}`);
      console.log(`  Location: ${job.location}`);
      console.log(`  Salary: ${job.salary}`);
      console.log(`  Job Type: ${job.jobType}`);
      console.log(`  Department: ${job.department}`);
      console.log(`  Open Date: ${job.openDate}`);
      console.log(`  Close Date: ${job.closeDate}`);
      console.log(`  Imported: ${job._metadata?.importedAt || 'Unknown'}`);
      console.log(`  Embeddings: ${job.embeddings ? Object.keys(job.embeddings).length : 0} types generated`);
    });
    
    // Example search
    console.log('\n--- Example Search ---');
    const searchResults = await searchJobPostings({ location: 'Washington' });
    console.log(`Found ${searchResults.length} jobs in Washington`);
    
    return allJobs;
  } catch (error) {
    console.error('Error in example usage:', error.message);
  }
}

// Utility to create the vector search index for jobpostings if it doesn't exist
async function ensureJobPostingsVectorIndex(db) {
  const collection = db.collection('jobpostings');
  const indexName = 'jobpostings_vector_index';

  // Load index definition from vector_search_indexes.json
  const indexConfig = JSON.parse(fs.readFileSync('vector_search_indexes.json', 'utf-8'));
  const definition = indexConfig.jobpostings_collection_index.definition;

  // Create the proper index structure with mappings
  const indexDefinition = {
    mappings: {
      dynamic: true,
      fields: definition.fields
    }
  };

  // Try to create the index using the correct Node.js syntax
  try {
    const result = await collection.createSearchIndex({
      name: indexName,
      definition: indexDefinition
    });
    console.log(`✓ Created vector search index '${indexName}'.`);
  } catch (err) {
    // Check if the error indicates the index already exists
    if (err.message && (err.message.includes('already exists') || err.message.includes('IndexAlreadyExists'))) {
      console.log(`✓ Vector search index '${indexName}' already exists.`);
    } else {
      console.error(`✗ Failed to create vector search index '${indexName}':`, err.message);
      // Don't throw the error, just log it and continue
      console.log('Continuing without vector search index...');
    }
  }
}

// Main function to import Excel data to MongoDB with Gemini embeddings
async function main() {
  let client;
  
  try {
    console.log('=== GEMINI-POWERED JOB POSTINGS IMPORT ===\n');
    
    // Check for Gemini API key
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('❌ GOOGLE_AI_API_KEY environment variable is required for Gemini AI');
      console.log('Please create a .env file with your Gemini API key:');
      console.log('GOOGLE_AI_API_KEY=your_gemini_api_key_here');
      return;
    }
    
    console.log('Connecting to MongoDB...');
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('workdemos');
    const collection = db.collection('jobpostings');
    
    // Ensure vector search index exists before inserting documents
    await ensureJobPostingsVectorIndex(db);
    
    // Check if collection already has data
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`Collection 'jobpostings' already contains ${existingCount} documents`);
      console.log('Do you want to clear the collection and re-import? (y/n)');
      // For now, we'll proceed with import (you can modify this behavior)
    }
    
    console.log('Reading Excel file...');
    const excelFilePath = 'usajobs_data_formatted.xlsx';
    const jobListings = await readExcelFile(excelFilePath);
    
    if (jobListings.length === 0) {
      console.log('No job listings found in Excel file');
      return;
    }
    
    console.log(`Processing ${jobListings.length} job listings with Gemini embeddings...`);
    console.log('This may take several minutes due to embedding generation...\n');
    
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
      
      // Progress update
      if ((i + 1) % 10 === 0) {
        console.log(`\n--- Progress: ${i + 1}/${jobListings.length} jobs processed ---`);
        console.log(`Success: ${successCount}, Failed: ${failCount}\n`);
      }
    }
    
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total job listings processed: ${jobListings.length}`);
    console.log(`Successfully inserted: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    // Display some statistics
    const totalInCollection = await collection.countDocuments();
    console.log(`Total documents in 'jobpostings' collection: ${totalInCollection}`);
    
    // Check embedding statistics
    const jobsWithEmbeddings = await collection.countDocuments({
      'embeddings.combinedEmbedding': { $exists: true, $ne: [] }
    });
    console.log(`Jobs with embeddings: ${jobsWithEmbeddings}`);
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Set up MongoDB Atlas Vector Search indexes for the new embedding structure');
    console.log('2. Update vector search functions to use the new multi-embedding approach');
    console.log('3. Test the enhanced search capabilities');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Export functions for potential reuse
export {
  readExcelFile,
  insertJobData,
  getAllJobPostings,
  searchJobPostings,
  exampleUsage,
  generateJobEmbeddings,
  analyzeTextChunkingStrategy
};

// Run the script if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] === new URL(import.meta.url).pathname ||
                     process.argv[1].endsWith('mongodb_jobpostings_gemini.js');

if (isMainModule) {
  console.log('Starting Gemini-powered MongoDB job postings import...');
  main().catch(console.error);
}