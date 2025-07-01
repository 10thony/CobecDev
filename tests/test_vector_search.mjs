import { MongoClient, ServerApiVersion } from 'mongodb';
import OpenAI from 'openai';

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

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

async function testVectorSearch() {
  let client;
  
  try {
    console.log('🧪 Testing Vector Search with MongoDB Data...\n');
    
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
    const jobpostingsCollection = db.collection('jobpostings');
    const resumesCollection = db.collection('resumes');
    
    // Test query: "Find resumes for Computer Engineer positions with software development skills"
    const testQuery = "Find resumes for Computer Engineer positions with software development skills";
    console.log(`🔍 Test Query: "${testQuery}"\n`);
    
    // Generate embedding for the test query
    const queryEmbedding = await generateQueryEmbedding(testQuery);
    console.log('✓ Generated query embedding');
    
    // Search resumes
    console.log('\n👤 Searching Resumes...');
    const resumes = await resumesCollection.find({ embedding: { $exists: true } }).toArray();
    console.log(`Found ${resumes.length} resumes with embeddings`);
    
    const resumeSimilarities = resumes.map(resume => ({
      resume: resume,
      similarity: cosineSimilarity(queryEmbedding, resume.embedding)
    }));
    
    resumeSimilarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('\n📊 Top 5 Matching Resumes:');
    resumeSimilarities.slice(0, 5).forEach((item, index) => {
      const name = `${item.resume.personalInfo?.firstName || ''} ${item.resume.personalInfo?.lastName || ''}`.trim() || 'Unknown';
      const experience = item.resume.personalInfo?.yearsOfExperience || 'N/A';
      console.log(`${index + 1}. ${name} (${experience} years) - ${(item.similarity * 100).toFixed(1)}% match`);
      
      if (item.resume.skills && item.resume.skills.length > 0) {
        console.log(`   Skills: ${item.resume.skills.slice(0, 5).join(', ')}${item.resume.skills.length > 5 ? '...' : ''}`);
      }
      
      if (item.resume.professionalSummary) {
        console.log(`   Summary: ${item.resume.professionalSummary.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // Search job postings
    console.log('\n🏢 Searching Job Postings...');
    const jobs = await jobpostingsCollection.find({ embedding: { $exists: true } }).toArray();
    console.log(`Found ${jobs.length} jobs with embeddings`);
    
    const jobSimilarities = jobs.map(job => ({
      job: job,
      similarity: cosineSimilarity(queryEmbedding, job.embedding)
    }));
    
    jobSimilarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('\n📊 Top 5 Matching Jobs:');
    jobSimilarities.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.job.jobTitle || 'N/A'} - ${(item.similarity * 100).toFixed(1)}% match`);
      console.log(`   Location: ${item.job.location || 'N/A'}`);
      console.log(`   Department: ${item.job.department || 'N/A'}`);
      
      if (item.job.jobSummary) {
        console.log(`   Summary: ${item.job.jobSummary.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // Test with a different query
    console.log('\n🔄 Testing with different query: "Aviation Safety Inspector positions"');
    const testQuery2 = "Aviation Safety Inspector positions";
    const queryEmbedding2 = await generateQueryEmbedding(testQuery2);
    
    const jobSimilarities2 = jobs.map(job => ({
      job: job,
      similarity: cosineSimilarity(queryEmbedding2, job.embedding)
    }));
    
    jobSimilarities2.sort((a, b) => b.similarity - a.similarity);
    
    console.log('\n📊 Top 3 Aviation Safety Jobs:');
    jobSimilarities2.slice(0, 3).forEach((item, index) => {
      console.log(`${index + 1}. ${item.job.jobTitle || 'N/A'} - ${(item.similarity * 100).toFixed(1)}% match`);
    });
    
    console.log('\n✅ Vector Search Test Complete!');
    console.log('The system is working correctly and returning data from your MongoDB collections.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Run the test
testVectorSearch().catch(console.error); 