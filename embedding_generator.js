require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const OpenAI = require('openai');

// MongoDB connection
const MONGODB_USERNAME = 'adminuser';
const MONGODB_PASSWORD = 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate embedding for text
async function generateEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Empty text provided for embedding');
    }
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.trim(),
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

// Generate embeddings for job postings
async function generateJobEmbeddings() {
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
    const jobpostingsCollection = db.collection('jobpostings');
    
    // Get all job postings that have searchable text but no embeddings
    const jobs = await jobpostingsCollection.find({
      searchableText: { $exists: true },
      embedding: { $exists: false }
    }).toArray();
    
    console.log(`Found ${jobs.length} job postings to process for embeddings`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const job of jobs) {
      try {
        console.log(`Processing job ${processedCount + 1}/${jobs.length}: ${job.jobTitle}`);
        
        // Generate embedding for the searchable text
        const embedding = await generateEmbedding(job.searchableText);
        
        // Update the document with the embedding
        await jobpostingsCollection.updateOne(
          { _id: job._id },
          { 
            $set: {
              embedding: embedding,
              embeddingGeneratedAt: new Date()
            }
          }
        );
        
        processedCount++;
        console.log(`✓ Generated embedding for: ${job.jobTitle}`);
        
        // Rate limiting - OpenAI has rate limits
        await delay(100); // 100ms delay between requests
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error processing job ${job.jobTitle}:`, error.message);
        
        // Continue with next job even if one fails
        continue;
      }
    }
    
    console.log(`\n=== JOB EMBEDDINGS COMPLETE ===`);
    console.log(`Successfully processed: ${processedCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error generating job embeddings:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Generate embeddings for resumes
async function generateResumeEmbeddings() {
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
    const resumesCollection = db.collection('resumes');
    
    // Get all resumes that have searchable text but no embeddings
    const resumes = await resumesCollection.find({
      searchableText: { $exists: true },
      embedding: { $exists: false }
    }).toArray();
    
    console.log(`Found ${resumes.length} resumes to process for embeddings`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const resume of resumes) {
      try {
        console.log(`Processing resume ${processedCount + 1}/${resumes.length}: ${resume.processedMetadata?.name || 'Unknown'}`);
        
        // Generate embedding for the searchable text
        const embedding = await generateEmbedding(resume.searchableText);
        
        // Update the document with the embedding
        await resumesCollection.updateOne(
          { _id: resume._id },
          { 
            $set: {
              embedding: embedding,
              embeddingGeneratedAt: new Date()
            }
          }
        );
        
        processedCount++;
        console.log(`✓ Generated embedding for: ${resume.processedMetadata?.name || 'Unknown'}`);
        
        // Rate limiting - OpenAI has rate limits
        await delay(100); // 100ms delay between requests
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error processing resume ${resume.processedMetadata?.name || 'Unknown'}:`, error.message);
        
        // Continue with next resume even if one fails
        continue;
      }
    }
    
    console.log(`\n=== RESUME EMBEDDINGS COMPLETE ===`);
    console.log(`Successfully processed: ${processedCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error generating resume embeddings:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Generate embeddings for both collections
async function generateAllEmbeddings() {
  console.log('=== GENERATING EMBEDDINGS FOR VECTOR SEARCH ===\n');
  
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('Please create a .env file with your OpenAI API key:');
    console.log('OPENAI_API_KEY=your_openai_api_key_here');
    return;
  }
  
  try {
    // Generate job embeddings
    console.log('1. Generating job posting embeddings...');
    await generateJobEmbeddings();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Generate resume embeddings
    console.log('2. Generating resume embeddings...');
    await generateResumeEmbeddings();
    
    console.log('\n=== ALL EMBEDDINGS GENERATED ===');
    console.log('✓ Vector search is now ready to use!');
    console.log('\nNext steps:');
    console.log('1. Set up MongoDB Atlas Vector Search indexes');
    console.log('2. Run the vector search script to test functionality');
    console.log('3. Implement the AI agent interface');
    
  } catch (error) {
    console.error('Error in embedding generation:', error.message);
  }
}

// Export functions for use in other scripts
module.exports = {
  generateEmbedding,
  generateJobEmbeddings,
  generateResumeEmbeddings,
  generateAllEmbeddings
};

// Run embedding generation if this file is executed directly
if (require.main === module) {
  generateAllEmbeddings().catch(console.error);
} 