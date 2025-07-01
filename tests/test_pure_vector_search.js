require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const OpenAI = require('openai');

// MongoDB connection
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate embedding for text
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.trim(),
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
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

// Test pure vector search
async function testPureVectorSearch() {
  let client;
  
  try {
    console.log('🧪 Testing Pure Vector Search (No Substring Matching)\n');
    
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
    
    // Test 1: Search for "developers with ios development experience"
    console.log('🔍 Test 1: "developers with ios development experience"');
    const query1 = "developers with ios development experience";
    const query1Embedding = await generateEmbedding(query1);
    
    // Get jobs with embeddings
    const jobs = await jobpostingsCollection.find({ embedding: { $exists: true } }).toArray();
    console.log(`Found ${jobs.length} jobs with embeddings`);
    
    // Calculate similarities using pure vector search
    const jobSimilarities = jobs
      .filter(job => job.embedding && Array.isArray(job.embedding))
      .map(job => ({
        job: job,
        similarity: cosineSimilarity(query1Embedding, job.embedding)
      }))
      .filter(item => item.similarity >= 0.3) // Minimum similarity threshold
      .sort((a, b) => b.similarity - a.similarity);
    
    console.log(`\n📊 Top 5 Job Matches (Pure Vector Search):`);
    jobSimilarities.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.job.jobTitle || 'N/A'} - ${(item.similarity * 100).toFixed(1)}% match`);
      console.log(`   Location: ${item.job.location || 'N/A'}`);
      console.log(`   Department: ${item.job.department || 'N/A'}`);
      
      // Check if the job actually contains "ios" (to verify no substring matching)
      const jobText = (item.job.searchableText || '').toLowerCase();
      const hasIOS = jobText.includes('ios');
      const hasBIOS = jobText.includes('bios');
      const hasPIOS = jobText.includes('pios');
      
      console.log(`   Contains "ios": ${hasIOS ? 'YES' : 'NO'}`);
      console.log(`   Contains "bios": ${hasBIOS ? 'YES' : 'NO'}`);
      console.log(`   Contains "pios": ${hasPIOS ? 'YES' : 'NO'}`);
      
      if (item.job.jobSummary) {
        console.log(`   Summary: ${item.job.jobSummary.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // Test 2: Search for "software engineer with python experience"
    console.log('🔍 Test 2: "software engineer with python experience"');
    const query2 = "software engineer with python experience";
    const query2Embedding = await generateEmbedding(query2);
    
    const jobSimilarities2 = jobs
      .filter(job => job.embedding && Array.isArray(job.embedding))
      .map(job => ({
        job: job,
        similarity: cosineSimilarity(query2Embedding, job.embedding)
      }))
      .filter(item => item.similarity >= 0.3)
      .sort((a, b) => b.similarity - a.similarity);
    
    console.log(`\n📊 Top 5 Job Matches for Python Query:`);
    jobSimilarities2.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.job.jobTitle || 'N/A'} - ${(item.similarity * 100).toFixed(1)}% match`);
      console.log(`   Location: ${item.job.location || 'N/A'}`);
      
      // Check for python-related terms
      const jobText = (item.job.searchableText || '').toLowerCase();
      const hasPython = jobText.includes('python');
      const hasSoftware = jobText.includes('software');
      const hasEngineer = jobText.includes('engineer');
      
      console.log(`   Contains "python": ${hasPython ? 'YES' : 'NO'}`);
      console.log(`   Contains "software": ${hasSoftware ? 'YES' : 'NO'}`);
      console.log(`   Contains "engineer": ${hasEngineer ? 'YES' : 'NO'}`);
      
      if (item.job.jobSummary) {
        console.log(`   Summary: ${item.job.jobSummary.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // Test 3: Resume search
    console.log('🔍 Test 3: Resume search for "experienced software developer"');
    const query3 = "experienced software developer";
    const query3Embedding = await generateEmbedding(query3);
    
    const resumes = await resumesCollection.find({ embedding: { $exists: true } }).toArray();
    console.log(`Found ${resumes.length} resumes with embeddings`);
    
    const resumeSimilarities = resumes
      .filter(resume => resume.embedding && Array.isArray(resume.embedding))
      .map(resume => ({
        resume: resume,
        similarity: cosineSimilarity(query3Embedding, resume.embedding)
      }))
      .filter(item => item.similarity >= 0.3)
      .sort((a, b) => b.similarity - a.similarity);
    
    console.log(`\n📊 Top 5 Resume Matches:`);
    resumeSimilarities.slice(0, 5).forEach((item, index) => {
      const name = `${item.resume.personalInfo?.firstName || ''} ${item.resume.personalInfo?.lastName || ''}`.trim() || 'Unknown';
      console.log(`${index + 1}. ${name} - ${(item.similarity * 100).toFixed(1)}% match`);
      console.log(`   Experience: ${item.resume.personalInfo?.yearsOfExperience || 'N/A'} years`);
      
      // Check for software-related terms
      const resumeText = (item.resume.searchableText || '').toLowerCase();
      const hasSoftware = resumeText.includes('software');
      const hasDeveloper = resumeText.includes('developer');
      const hasProgramming = resumeText.includes('programming');
      
      console.log(`   Contains "software": ${hasSoftware ? 'YES' : 'NO'}`);
      console.log(`   Contains "developer": ${hasDeveloper ? 'YES' : 'NO'}`);
      console.log(`   Contains "programming": ${hasProgramming ? 'YES' : 'NO'}`);
      
      if (item.resume.professionalSummary) {
        console.log(`   Summary: ${item.resume.professionalSummary.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    console.log('✅ Pure Vector Search Test Complete!');
    console.log('\n📋 Summary:');
    console.log('• Pure vector search uses semantic embeddings only');
    console.log('• No text-based substring matching');
    console.log('• Results are based on semantic similarity');
    console.log('• Higher quality matches without false positives from substring matching');
    
  } catch (error) {
    console.error('❌ Error in pure vector search test:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Run the test
testPureVectorSearch().catch(console.error); 