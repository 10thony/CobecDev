import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

async function testConnection() {
  let client;
  
  try {
    console.log('🔍 Testing MongoDB Connection...\n');
    console.log('📋 Connection Details:');
    console.log(`  • Username: ${MONGODB_USERNAME}`);
    console.log(`  • Cluster: ${MONGODB_CLUSTER}`);
    console.log(`  • Password: ${MONGODB_PASSWORD ? '***' + MONGODB_PASSWORD.slice(-4) : 'NOT SET'}`);
    console.log(`  • URI: ${uri.replace(MONGODB_PASSWORD, '***')}\n`);
    
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 30000, // Increased timeout
      socketTimeoutMS: 30000,  // Increased timeout
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      ssl: true,
    });
    
    console.log('🔌 Attempting to connect...');
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    const db = client.db('workdemos');
    const jobpostingsCollection = db.collection('jobpostings');
    const resumesCollection = db.collection('resumes');
    
    // Get counts
    const jobCount = await jobpostingsCollection.countDocuments();
    const resumeCount = await resumesCollection.countDocuments();
    
    console.log(`📊 Collection Statistics:`);
    console.log(`  • Job Postings: ${jobCount} documents`);
    console.log(`  • Resumes: ${resumeCount} documents\n`);
    
    // Get sample data
    const sampleJobs = await jobpostingsCollection.find({}).limit(3).toArray();
    const sampleResumes = await resumesCollection.find({}).limit(3).toArray();
    
    console.log('🏢 Sample Job Postings:');
    sampleJobs.forEach((job, index) => {
      console.log(`  ${index + 1}. ${job.jobTitle || 'N/A'} - ${job.location || 'N/A'} - ${job.department || 'N/A'}`);
    });
    
    console.log('\n👤 Sample Resumes:');
    sampleResumes.forEach((resume, index) => {
      const name = resume.personalInfo?.firstName && resume.personalInfo?.lastName 
        ? `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}`
        : resume.filename || 'N/A';
      console.log(`  ${index + 1}. ${name} - ${resume.personalInfo?.email || 'N/A'}`);
    });
    
    console.log('\n🎉 MongoDB connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed!');
    console.error('Error details:', error.message);
    
    if (error.message.includes('tlsv1 alert internal error')) {
      console.log('\n🔧 Troubleshooting SSL/TLS Issues:');
      console.log('1. Check if your MongoDB Atlas cluster is accessible');
      console.log('2. Verify your IP address is whitelisted in MongoDB Atlas');
      console.log('3. Check if your MongoDB credentials are still valid');
      console.log('4. Try updating your MongoDB driver version');
    }
    
    if (error.message.includes('authentication failed')) {
      console.log('\n🔧 Troubleshooting Authentication Issues:');
      console.log('1. Verify your MongoDB username and password');
      console.log('2. Check if your database user has the correct permissions');
      console.log('3. Ensure your database user is not locked or expired');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.log('\n🔧 Troubleshooting Network Issues:');
      console.log('1. Check your internet connection');
      console.log('2. Verify the cluster URL is correct');
      console.log('3. Check if MongoDB Atlas is experiencing downtime');
    }
    
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

testConnection().catch(console.error); 