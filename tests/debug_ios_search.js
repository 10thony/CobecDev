import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

async function debugIOSSearch() {
  let client;
  
  try {
    console.log('🔍 Debugging iOS Developer Search Issue...\n');
    
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('workdemos');
    const resumesCollection = db.collection('resumes');
    
    // 1. Check total resumes and how many have embeddings
    const totalResumes = await resumesCollection.countDocuments();
    const resumesWithEmbeddings = await resumesCollection.countDocuments({ embedding: { $exists: true } });
    
    console.log(`📊 Resume Statistics:`);
    console.log(`  • Total resumes: ${totalResumes}`);
    console.log(`  • Resumes with embeddings: ${resumesWithEmbeddings}`);
    console.log(`  • Resumes missing embeddings: ${totalResumes - resumesWithEmbeddings}\n`);
    
    // 2. Search for iOS-related resumes
    console.log('🔍 Searching for iOS-related resumes...');
    
    // Search by various iOS-related terms
    const iosTerms = ['ios', 'swift', 'objective-c', 'xcode', 'iphone', 'ipad', 'apple', 'mobile development'];
    
    for (const term of iosTerms) {
      const iosResumes = await resumesCollection.find({
        $or: [
          { 'searchableText': { $regex: term, $options: 'i' } },
          { 'originalText': { $regex: term, $options: 'i' } },
          { 'skills': { $regex: term, $options: 'i' } },
          { 'professionalSummary': { $regex: term, $options: 'i' } }
        ]
      }).toArray();
      
      if (iosResumes.length > 0) {
        console.log(`\n📱 Found ${iosResumes.length} resumes containing "${term}":`);
        iosResumes.forEach((resume, index) => {
          const name = resume.personalInfo?.firstName && resume.personalInfo?.lastName 
            ? `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}`
            : resume.filename || 'Unknown';
          const hasEmbedding = resume.embedding && Array.isArray(resume.embedding);
          console.log(`  ${index + 1}. ${name} - Has embedding: ${hasEmbedding ? '✅' : '❌'}`);
          
          if (hasEmbedding) {
            console.log(`     Embedding length: ${resume.embedding.length}`);
          }
        });
      }
    }
    
    // 3. Check a few sample resumes for embedding quality
    console.log('\n🔍 Checking sample resumes for embedding quality...');
    const sampleResumes = await resumesCollection.find({}).limit(5).toArray();
    
    sampleResumes.forEach((resume, index) => {
      const name = resume.personalInfo?.firstName && resume.personalInfo?.lastName 
        ? `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}`
        : resume.filename || 'Unknown';
      
      console.log(`\n${index + 1}. ${name}:`);
      console.log(`   Has embedding: ${resume.embedding && Array.isArray(resume.embedding) ? '✅' : '❌'}`);
      console.log(`   Has searchableText: ${resume.searchableText ? '✅' : '❌'}`);
      console.log(`   Has skills: ${resume.skills && Array.isArray(resume.skills) ? '✅' : '❌'}`);
      
      if (resume.searchableText) {
        console.log(`   SearchableText length: ${resume.searchableText.length}`);
        console.log(`   SearchableText preview: ${resume.searchableText.substring(0, 200)}...`);
      }
      
      if (resume.skills && Array.isArray(resume.skills)) {
        console.log(`   Skills: ${resume.skills.slice(0, 5).join(', ')}...`);
      }
    });
    
    // 4. Test the actual search query
    console.log('\n🔍 Testing search query: "developers with ios development experience"');
    
    // Get all resumes with embeddings
    const resumesWithEmbeddingsList = await resumesCollection.find({ 
      embedding: { $exists: true } 
    }).toArray();
    
    console.log(`Found ${resumesWithEmbeddingsList.length} resumes with embeddings to test against`);
    
    // For now, let's just check if any of these resumes contain iOS-related content
    const iosRelatedResumes = resumesWithEmbeddingsList.filter(resume => {
      const text = (resume.searchableText || resume.originalText || '').toLowerCase();
      return iosTerms.some(term => text.includes(term.toLowerCase()));
    });
    
    console.log(`Found ${iosRelatedResumes.length} resumes with embeddings that contain iOS-related terms`);
    
    if (iosRelatedResumes.length > 0) {
      console.log('\n📱 iOS-related resumes with embeddings:');
      iosRelatedResumes.forEach((resume, index) => {
        const name = resume.personalInfo?.firstName && resume.personalInfo?.lastName 
          ? `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}`
          : resume.filename || 'Unknown';
        console.log(`  ${index + 1}. ${name}`);
        console.log(`     Embedding length: ${resume.embedding.length}`);
        if (resume.searchableText) {
          console.log(`     Text preview: ${resume.searchableText.substring(0, 150)}...`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

debugIOSSearch().catch(console.error); 