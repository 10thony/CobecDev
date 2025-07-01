import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

async function checkJobStructure() {
  let client;
  
  try {
    console.log('🔍 Checking Job Document Structure...\n');
    
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
    const jobsCollection = db.collection('jobpostings');
    
    // Get a few sample jobs
    const sampleJobs = await jobsCollection.find({}).limit(3).toArray();
    
    console.log(`📊 Found ${sampleJobs.length} sample jobs\n`);
    
    sampleJobs.forEach((job, index) => {
      console.log(`Job ${index + 1}:`);
      console.log(`  Title: ${job.jobTitle || 'N/A'}`);
      console.log(`  Location: ${job.location || 'N/A'}`);
      console.log(`  Department: ${job.department || 'N/A'}`);
      console.log(`  Has embedding: ${!!job.embedding}`);
      console.log(`  Has embeddings (multi): ${!!job.embeddings}`);
      console.log(`  Has searchableText: ${!!job.searchableText}`);
      
      if (job.embedding) {
        console.log(`  Embedding type: ${typeof job.embedding}`);
        console.log(`  Embedding length: ${Array.isArray(job.embedding) ? job.embedding.length : 'N/A'}`);
      }
      
      if (job.embeddings) {
        console.log(`  Embeddings keys: ${Object.keys(job.embeddings).join(', ')}`);
      }
      
      console.log(`  All fields: ${Object.keys(job).join(', ')}`);
      console.log('');
    });
    
    // Check embedding statistics
    const totalJobs = await jobsCollection.countDocuments({});
    const jobsWithSimpleEmbedding = await jobsCollection.countDocuments({ embedding: { $exists: true } });
    const jobsWithMultiEmbeddings = await jobsCollection.countDocuments({ embeddings: { $exists: true } });
    const jobsWithSearchableText = await jobsCollection.countDocuments({ searchableText: { $exists: true } });
    
    console.log('📊 Embedding Statistics:');
    console.log(`  Total jobs: ${totalJobs}`);
    console.log(`  Jobs with simple embedding: ${jobsWithSimpleEmbedding}`);
    console.log(`  Jobs with multi-embeddings: ${jobsWithMultiEmbeddings}`);
    console.log(`  Jobs with searchableText: ${jobsWithSearchableText}`);
    
  } catch (error) {
    console.error('❌ Error checking job structure:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkJobStructure().catch(console.error); 