require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const OpenAI = require('openai');

// MongoDB connection
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate embedding for search query
async function generateQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query.trim(),
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error.message);
    throw error;
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
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

// Search for similar job postings based on query
async function searchSimilarJobs(query, limit = 10) {
  let client;
  
  try {
    console.log(`Searching for jobs similar to: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    const db = client.db('workdemos');
    const jobpostingsCollection = db.collection('jobpostings');
    
    // Get all job postings with embeddings
    const jobs = await jobpostingsCollection.find({
      embedding: { $exists: true }
    }).toArray();
    
    // Calculate similarities
    const similarities = jobs.map(job => ({
      job: job,
      similarity: cosineSimilarity(queryEmbedding, job.embedding)
    }));
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top results
    return similarities.slice(0, limit).map(item => ({
      ...item.job,
      similarity: item.similarity
    }));
    
  } catch (error) {
    console.error('Error searching similar jobs:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Search for similar resumes based on query
async function searchSimilarResumes(query, limit = 10) {
  let client;
  
  try {
    console.log(`Searching for resumes similar to: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    const db = client.db('workdemos');
    const resumesCollection = db.collection('resumes');
    
    // Get all resumes with embeddings
    const resumes = await resumesCollection.find({
      embedding: { $exists: true }
    }).toArray();
    
    // Calculate similarities
    const similarities = resumes.map(resume => ({
      resume: resume,
      similarity: cosineSimilarity(queryEmbedding, resume.embedding)
    }));
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top results
    return similarities.slice(0, limit).map(item => ({
      ...item.resume,
      similarity: item.similarity
    }));
    
  } catch (error) {
    console.error('Error searching similar resumes:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Find best job matches for a resume
async function findJobsForResume(resumeId, limit = 10) {
  let client;
  
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    const db = client.db('workdemos');
    const resumesCollection = db.collection('resumes');
    const jobpostingsCollection = db.collection('jobpostings');
    
    // Get the resume
    const resume = await resumesCollection.findOne({ _id: resumeId });
    if (!resume || !resume.embedding) {
      throw new Error('Resume not found or no embedding available');
    }
    
    console.log(`Finding jobs for resume: ${resume.processedMetadata?.name || 'Unknown'}`);
    
    // Get all job postings with embeddings
    const jobs = await jobpostingsCollection.find({
      embedding: { $exists: true }
    }).toArray();
    
    // Calculate similarities
    const similarities = jobs.map(job => ({
      job: job,
      similarity: cosineSimilarity(resume.embedding, job.embedding)
    }));
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top results
    return similarities.slice(0, limit).map(item => ({
      ...item.job,
      similarity: item.similarity
    }));
    
  } catch (error) {
    console.error('Error finding jobs for resume:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Find best resume matches for a job
async function findResumesForJob(jobId, limit = 10) {
  let client;
  
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    const db = client.db('workdemos');
    const resumesCollection = db.collection('resumes');
    const jobpostingsCollection = db.collection('jobpostings');
    
    // Get the job
    const job = await jobpostingsCollection.findOne({ _id: jobId });
    if (!job || !job.embedding) {
      throw new Error('Job not found or no embedding available');
    }
    
    console.log(`Finding resumes for job: ${job.jobTitle}`);
    
    // Get all resumes with embeddings
    const resumes = await resumesCollection.find({
      embedding: { $exists: true }
    }).toArray();
    
    // Calculate similarities
    const similarities = resumes.map(resume => ({
      resume: resume,
      similarity: cosineSimilarity(job.embedding, resume.embedding)
    }));
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top results
    return similarities.slice(0, limit).map(item => ({
      ...item.resume,
      similarity: item.similarity
    }));
    
  } catch (error) {
    console.error('Error finding resumes for job:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// AI Agent function for natural language queries
async function aiAgentSearch(query, searchType = 'both', limit = 5) {
  try {
    console.log(`AI Agent Search: "${query}" (Type: ${searchType})`);
    
    const results = {};
    
    if (searchType === 'jobs' || searchType === 'both') {
      results.jobs = await searchSimilarJobs(query, limit);
    }
    
    if (searchType === 'resumes' || searchType === 'both') {
      results.resumes = await searchSimilarResumes(query, limit);
    }
    
    return results;
    
  } catch (error) {
    console.error('Error in AI agent search:', error.message);
    throw error;
  }
}

// Display search results in a formatted way
function displaySearchResults(results, type) {
  console.log(`\n=== ${type.toUpperCase()} SEARCH RESULTS ===`);
  
  if (type === 'jobs') {
    results.forEach((job, index) => {
      console.log(`\n${index + 1}. ${job.jobTitle} (Similarity: ${(job.similarity * 100).toFixed(1)}%)`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Type: ${job.jobType}`);
      console.log(`   Summary: ${job.jobSummary?.substring(0, 100)}...`);
    });
  } else if (type === 'resumes') {
    results.forEach((resume, index) => {
      console.log(`\n${index + 1}. ${resume.processedMetadata?.name || 'Unknown'} (Similarity: ${(resume.similarity * 100).toFixed(1)}%)`);
      console.log(`   Email: ${resume.processedMetadata?.email || 'N/A'}`);
      console.log(`   Experience: ${resume.processedMetadata?.yearsOfExperience || 'N/A'} years`);
      console.log(`   Summary: ${resume.professionalSummary?.substring(0, 100)}...`);
    });
  }
}

// Test function to demonstrate vector search
async function testVectorSearch() {
  try {
    console.log('=== VECTOR SEARCH TEST ===\n');
    
    // Test 1: Search for jobs by query
    console.log('1. Searching for "software engineer" jobs...');
    const jobResults = await searchSimilarJobs('software engineer', 3);
    displaySearchResults(jobResults, 'jobs');
    
    // Test 2: Search for resumes by query
    console.log('\n2. Searching for "project manager" resumes...');
    const resumeResults = await searchSimilarResumes('project manager', 3);
    displaySearchResults(resumeResults, 'resumes');
    
    // Test 3: AI Agent search
    console.log('\n3. AI Agent search for "aviation safety"...');
    const aiResults = await aiAgentSearch('aviation safety', 'both', 2);
    
    if (aiResults.jobs) {
      displaySearchResults(aiResults.jobs, 'jobs');
    }
    if (aiResults.resumes) {
      displaySearchResults(aiResults.resumes, 'resumes');
    }
    
    console.log('\n=== VECTOR SEARCH TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error in vector search test:', error.message);
  }
}

// Export functions for use in other scripts
module.exports = {
  generateQueryEmbedding,
  cosineSimilarity,
  searchSimilarJobs,
  searchSimilarResumes,
  findJobsForResume,
  findResumesForJob,
  aiAgentSearch,
  displaySearchResults,
  testVectorSearch
};

// Run test if this file is executed directly
if (require.main === module) {
  testVectorSearch().catch(console.error);
} 