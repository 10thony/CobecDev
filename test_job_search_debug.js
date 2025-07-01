// Debug script to investigate why job postings aren't being returned
// Test case: "who would be good at leading a team of engineers" with 50% threshold

import { MongoClient, ServerApiVersion } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Gemini AI for embeddings
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

// Generate embedding for search query using Gemini
async function generateQueryEmbedding(query) {
  try {
    if (!query || query.trim().length === 0) {
      throw new Error('Empty query provided for embedding');
    }

    const result = await embeddingModel.embedContent(query.trim());
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating query embedding:', error);
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

async function debugJobSearch() {
  let client;
  
  try {
    console.log('🔍 Debugging Job Search Issue');
    console.log('Query: "who would be good at leading a team of engineers"');
    console.log('Threshold: 50% (0.5)');
    console.log('');
    
    // Generate embedding for the query
    const query = "who would be good at leading a team of engineers";
    const queryEmbedding = await generateQueryEmbedding(query);
    const minSimilarity = 0.5; // 50% threshold
    
    console.log('✓ Generated query embedding');
    console.log(`✓ Query embedding length: ${queryEmbedding.length}`);
    console.log(`✓ Minimum similarity threshold: ${minSimilarity}`);
    console.log('');
    
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
      retryWrites: true,
      retryReads: true,
      tls: true,
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('workdemos');
    const jobsCollection = db.collection('jobpostings');
    const resumesCollection = db.collection('resumes');
    
    // Check total documents in collections
    const totalJobs = await jobsCollection.countDocuments({});
    const totalResumes = await resumesCollection.countDocuments({});
    
    console.log(`📊 Database Statistics:`);
    console.log(`   Total jobs: ${totalJobs}`);
    console.log(`   Total resumes: ${totalResumes}`);
    console.log('');
    
    // Check jobs with embeddings
    const jobsWithEmbeddings = await jobsCollection.countDocuments({ 
      "embeddings.combinedEmbedding": { $exists: true, $ne: [] } 
    });
    
    const resumesWithEmbeddings = await resumesCollection.countDocuments({ 
      embedding: { $exists: true, $ne: [] } 
    });
    
    console.log(`📊 Documents with Embeddings:`);
    console.log(`   Jobs with embeddings: ${jobsWithEmbeddings}`);
    console.log(`   Resumes with embeddings: ${resumesWithEmbeddings}`);
    console.log('');
    
    if (jobsWithEmbeddings === 0) {
      console.log('❌ PROBLEM FOUND: No jobs have embeddings!');
      console.log('   This explains why no job results are returned.');
      console.log('');
      
      // Check a few sample jobs to see their structure
      const sampleJobs = await jobsCollection.find({}).limit(3).toArray();
      console.log('📋 Sample Job Documents:');
      sampleJobs.forEach((job, index) => {
        console.log(`   Job ${index + 1}:`);
        console.log(`     Title: ${job.jobTitle || 'N/A'}`);
        console.log(`     Has embedding: ${!!job.embedding}`);
        console.log(`     Has embeddings (multi): ${!!job.embeddings}`);
        console.log(`     Embedding type: ${typeof job.embedding}`);
        console.log(`     Embedding length: ${Array.isArray(job.embedding) ? job.embedding.length : 'N/A'}`);
        console.log(`     Has searchableText: ${!!job.searchableText}`);
        if (job.embeddings) {
          console.log(`     Multi-embeddings keys: ${Object.keys(job.embeddings).join(', ')}`);
        }
        console.log('');
      });
      
      return;
    }
    
    // Get all jobs with embeddings
    const jobs = await jobsCollection.find({ 
      "embeddings.combinedEmbedding": { $exists: true, $ne: [] } 
    }).toArray();
    
    console.log(`🔍 Analyzing ${jobs.length} jobs with embeddings...`);
    console.log('');
    
    // Calculate similarities for all jobs
    const jobSimilarities = jobs
      .filter(job => job.embeddings?.combinedEmbedding && Array.isArray(job.embeddings.combinedEmbedding))
      .map(job => {
        const similarity = cosineSimilarity(queryEmbedding, job.embeddings.combinedEmbedding);
        return {
          job: job,
          similarity: similarity
        };
      })
      .sort((a, b) => b.similarity - a.similarity);
    
    console.log(`📊 Job Similarity Analysis:`);
    console.log(`   Total jobs analyzed: ${jobSimilarities.length}`);
    console.log(`   Highest similarity: ${(jobSimilarities[0]?.similarity * 100).toFixed(1)}%`);
    console.log(`   Lowest similarity: ${(jobSimilarities[jobSimilarities.length - 1]?.similarity * 100).toFixed(1)}%`);
    console.log(`   Average similarity: ${(jobSimilarities.reduce((sum, item) => sum + item.similarity, 0) / jobSimilarities.length * 100).toFixed(1)}%`);
    console.log('');
    
    // Check how many jobs meet the threshold
    const jobsAboveThreshold = jobSimilarities.filter(item => item.similarity >= minSimilarity);
    
    console.log(`📊 Jobs Meeting ${(minSimilarity * 100).toFixed(0)}% Threshold:`);
    console.log(`   Jobs above threshold: ${jobsAboveThreshold.length}`);
    console.log(`   Jobs below threshold: ${jobSimilarities.length - jobsAboveThreshold.length}`);
    console.log('');
    
    if (jobsAboveThreshold.length === 0) {
      console.log('❌ PROBLEM FOUND: No jobs meet the similarity threshold!');
      console.log('   This explains why no job results are returned.');
      console.log('');
      
      // Show top 5 jobs anyway to see what the similarities look like
      console.log('📋 Top 5 Job Matches (Below Threshold):');
      jobSimilarities.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.job.jobTitle || 'N/A'} - ${(item.similarity * 100).toFixed(1)}%`);
        console.log(`      Location: ${item.job.location || 'N/A'}`);
        console.log(`      Department: ${item.job.department || 'N/A'}`);
        if (item.job.jobSummary) {
          console.log(`      Summary: ${item.job.jobSummary.substring(0, 100)}...`);
        }
        console.log('');
      });
    } else {
      console.log('✅ Jobs found above threshold!');
      console.log('');
      
      console.log('📋 Top 5 Job Matches (Above Threshold):');
      jobsAboveThreshold.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.job.jobTitle || 'N/A'} - ${(item.similarity * 100).toFixed(1)}%`);
        console.log(`      Location: ${item.job.location || 'N/A'}`);
        console.log(`      Department: ${item.job.department || 'N/A'}`);
        if (item.job.jobSummary) {
          console.log(`      Summary: ${item.job.jobSummary.substring(0, 100)}...`);
        }
        console.log('');
      });
    }
    
    // Now test resume search for comparison
    console.log('🔄 Testing Resume Search for Comparison...');
    console.log('');
    
    const resumes = await resumesCollection.find({ 
      embedding: { $exists: true, $ne: [] } 
    }).toArray();
    
    const resumeSimilarities = resumes
      .filter(resume => resume.embedding && Array.isArray(resume.embedding))
      .map(resume => {
        const similarity = cosineSimilarity(queryEmbedding, resume.embedding);
        return {
          resume: resume,
          similarity: similarity
        };
      })
      .sort((a, b) => b.similarity - a.similarity);
    
    const resumesAboveThreshold = resumeSimilarities.filter(item => item.similarity >= minSimilarity);
    
    console.log(`📊 Resume Similarity Analysis:`);
    console.log(`   Total resumes analyzed: ${resumeSimilarities.length}`);
    console.log(`   Resumes above threshold: ${resumesAboveThreshold.length}`);
    console.log(`   Highest similarity: ${(resumeSimilarities[0]?.similarity * 100).toFixed(1)}%`);
    console.log('');
    
    if (resumesAboveThreshold.length > 0) {
      console.log('📋 Top 3 Resume Matches (Above Threshold):');
      resumesAboveThreshold.slice(0, 3).forEach((item, index) => {
        const name = item.resume.processedMetadata?.name || 'Unknown';
        console.log(`   ${index + 1}. ${name} - ${(item.similarity * 100).toFixed(1)}%`);
        console.log(`      Email: ${item.resume.processedMetadata?.email || 'N/A'}`);
        if (item.resume.professionalSummary) {
          console.log(`      Summary: ${item.resume.professionalSummary.substring(0, 100)}...`);
        }
        console.log('');
      });
    }
    
    // Summary
    console.log('📋 SUMMARY:');
    console.log(`   Jobs above ${(minSimilarity * 100).toFixed(0)}% threshold: ${jobsAboveThreshold.length}`);
    console.log(`   Resumes above ${(minSimilarity * 100).toFixed(0)}% threshold: ${resumesAboveThreshold.length}`);
    
    if (jobsAboveThreshold.length === 0 && resumesAboveThreshold.length > 0) {
      console.log('   ❌ ISSUE CONFIRMED: Only resumes are being returned because no jobs meet the threshold');
      console.log('   💡 SUGGESTION: Try lowering the similarity threshold or check job embeddings');
    } else if (jobsAboveThreshold.length > 0) {
      console.log('   ✅ Jobs are available above threshold - check frontend logic');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the debug
debugJobSearch().catch(console.error); 