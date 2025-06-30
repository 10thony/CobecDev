const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB connection
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// Generate mock embedding (1536 dimensions like OpenAI ada-002)
function generateMockEmbedding() {
  const embedding = [];
  for (let i = 0; i < 1536; i++) {
    embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
  }
  return embedding;
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

// Generate mock embeddings for demonstration
async function generateMockEmbeddings() {
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
    
    const db = client.db('workdemos');
    
    // Generate embeddings for job postings
    console.log('\n=== GENERATING MOCK EMBEDDINGS FOR JOB POSTINGS ===');
    const jobpostingsCollection = db.collection('jobpostings');
    const jobs = await jobpostingsCollection.find({
      searchableText: { $exists: true },
      embedding: { $exists: false }
    }).toArray();
    
    console.log(`Found ${jobs.length} job postings to process`);
    
    for (let i = 0; i < Math.min(10, jobs.length); i++) { // Process first 10 for demo
      const job = jobs[i];
      const mockEmbedding = generateMockEmbedding();
      
      await jobpostingsCollection.updateOne(
        { _id: job._id },
        { 
          $set: {
            embedding: mockEmbedding,
            embeddingGeneratedAt: new Date(),
            isMockEmbedding: true
          }
        }
      );
      
      console.log(`✓ Generated mock embedding for: ${job.jobTitle}`);
    }
    
    // Generate embeddings for resumes
    console.log('\n=== GENERATING MOCK EMBEDDINGS FOR RESUMES ===');
    const resumesCollection = db.collection('resumes');
    const resumes = await resumesCollection.find({
      searchableText: { $exists: true },
      embedding: { $exists: false }
    }).toArray();
    
    console.log(`Found ${resumes.length} resumes to process`);
    
    for (let i = 0; i < Math.min(10, resumes.length); i++) { // Process first 10 for demo
      const resume = resumes[i];
      const mockEmbedding = generateMockEmbedding();
      
      await resumesCollection.updateOne(
        { _id: resume._id },
        { 
          $set: {
            embedding: mockEmbedding,
            embeddingGeneratedAt: new Date(),
            isMockEmbedding: true
          }
        }
      );
      
      console.log(`✓ Generated mock embedding for: ${resume.processedMetadata?.name || 'Unknown'}`);
    }
    
    console.log('\n=== MOCK EMBEDDINGS GENERATED ===');
    console.log('✓ Demo embeddings created for vector search testing');
    
  } catch (error) {
    console.error('Error generating mock embeddings:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Demo vector search functionality
async function demoVectorSearch() {
  let client;
  
  try {
    console.log('\n=== DEMO VECTOR SEARCH ===');
    
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    const db = client.db('workdemos');
    
    // Get a sample job and resume for demonstration
    const jobpostingsCollection = db.collection('jobpostings');
    const resumesCollection = db.collection('resumes');
    
    const sampleJob = await jobpostingsCollection.findOne({ embedding: { $exists: true } });
    const sampleResume = await resumesCollection.findOne({ embedding: { $exists: true } });
    
    if (!sampleJob || !sampleResume) {
      console.log('No documents with embeddings found. Run generateMockEmbeddings() first.');
      return;
    }
    
    console.log('\n1. Sample Job:');
    console.log(`   Title: ${sampleJob.jobTitle}`);
    console.log(`   Location: ${sampleJob.location}`);
    console.log(`   Summary: ${sampleJob.jobSummary?.substring(0, 100)}...`);
    
    console.log('\n2. Sample Resume:');
    console.log(`   Name: ${sampleResume.processedMetadata?.name || 'Unknown'}`);
    console.log(`   Experience: ${sampleResume.processedMetadata?.yearsOfExperience || 'N/A'} years`);
    console.log(`   Summary: ${sampleResume.professionalSummary?.substring(0, 100)}...`);
    
    // Calculate similarity
    const similarity = cosineSimilarity(sampleJob.embedding, sampleResume.embedding);
    console.log(`\n3. Similarity Score: ${(similarity * 100).toFixed(1)}%`);
    
    // Find similar jobs for the resume
    console.log('\n4. Finding similar jobs for this resume...');
    const allJobs = await jobpostingsCollection.find({ embedding: { $exists: true } }).toArray();
    
    const jobSimilarities = allJobs.map(job => ({
      job: job,
      similarity: cosineSimilarity(sampleResume.embedding, job.embedding)
    }));
    
    jobSimilarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('Top 3 matching jobs:');
    jobSimilarities.slice(0, 3).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.job.jobTitle} (${(item.similarity * 100).toFixed(1)}% match)`);
    });
    
    // Find similar resumes for the job
    console.log('\n5. Finding similar resumes for this job...');
    const allResumes = await resumesCollection.find({ embedding: { $exists: true } }).toArray();
    
    const resumeSimilarities = allResumes.map(resume => ({
      resume: resume,
      similarity: cosineSimilarity(sampleJob.embedding, resume.embedding)
    }));
    
    resumeSimilarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('Top 3 matching resumes:');
    resumeSimilarities.slice(0, 3).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.resume.processedMetadata?.name || 'Unknown'} (${(item.similarity * 100).toFixed(1)}% match)`);
    });
    
    console.log('\n=== DEMO COMPLETE ===');
    console.log('This demonstrates how vector search would work with real embeddings.');
    console.log('For production use, replace mock embeddings with OpenAI embeddings.');
    
  } catch (error) {
    console.error('Error in demo vector search:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the demo
async function runDemo() {
  console.log('=== VECTOR SEARCH DEMO ===');
  console.log('This demo shows vector search functionality using mock embeddings.\n');
  
  await generateMockEmbeddings();
  await demoVectorSearch();
  
  console.log('\n=== NEXT STEPS ===');
  console.log('1. Get an OpenAI API key from https://platform.openai.com/api-keys');
  console.log('2. Create a .env file with: OPENAI_API_KEY=your_key_here');
  console.log('3. Run: node embedding_generator.js (for real embeddings)');
  console.log('4. Run: node ai_agent.js (for AI agent interface)');
}

// Export functions
module.exports = {
  generateMockEmbedding,
  cosineSimilarity,
  generateMockEmbeddings,
  demoVectorSearch,
  runDemo
};

// Run demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
} 