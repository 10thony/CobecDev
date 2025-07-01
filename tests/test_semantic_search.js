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

// Mock OpenAI embedding function (you'll need to replace this with actual OpenAI call)
async function generateQueryEmbedding(text) {
  // This is a mock - in production, you'd call OpenAI's embedding API
  // For now, we'll create a simple hash-based embedding for testing
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(1536).fill(0);
  
  words.forEach((word, index) => {
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const position = Math.abs(hash) % 1536;
    embedding[position] = (embedding[position] + 1) / (index + 1);
  });
  
  return embedding;
}

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

async function testSemanticSearch() {
  let client;
  
  try {
    console.log('🔍 Testing Semantic Vector Search...\n');
    
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
    
    // Test query
    const query = "developers with ios development experience";
    console.log(`🔍 Testing query: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    console.log('✅ Generated query embedding');
    
    // Get all resumes
    const resumes = await resumesCollection.find({}).toArray();
    console.log(`📊 Found ${resumes.length} resumes in database`);
    
    // Helper function to create searchable text from resume data
    const createResumeSearchableText = (resume) => {
      const fields = [
        resume.professionalSummary || '',
        resume.skills ? (Array.isArray(resume.skills) ? resume.skills.join(' ') : resume.skills) : '',
        resume.education ? (Array.isArray(resume.education) ? resume.education.join(' ') : resume.education) : '',
        resume.certifications || '',
        resume.securityClearance || '',
        resume.personalInfo ? `${resume.personalInfo.firstName || ''} ${resume.personalInfo.lastName || ''}`.trim() : '',
        resume.experience ? (Array.isArray(resume.experience) ? 
          resume.experience.map((exp) => 
            `${exp.title || ''} ${exp.company || ''} ${(exp.responsibilities || []).join(' ')}`
          ).join(' ') : resume.experience) : '',
        resume.originalText || ''
      ];
      
      return fields.filter(Boolean).join(' ');
    };
    
    // Calculate similarities by generating embeddings on-the-fly
    const similarities = [];
    
    console.log('🔄 Processing resumes...');
    let processedCount = 0;
    
    for (const resume of resumes) {
      try {
        // Create searchable text from resume data
        const searchableText = createResumeSearchableText(resume);
        
        if (searchableText.trim()) {
          // Generate embedding for this resume
          const resumeEmbedding = await generateQueryEmbedding(searchableText);
          
          // Calculate similarity
          const similarity = cosineSimilarity(queryEmbedding, resumeEmbedding);
          
          similarities.push({
            resume: resume,
            similarity: similarity,
            searchableText: searchableText.substring(0, 200) + '...'
          });
        }
        
        processedCount++;
        if (processedCount % 20 === 0) {
          console.log(`   Processed ${processedCount}/${resumes.length} resumes...`);
        }
        
      } catch (error) {
        console.error(`Error processing resume ${resume._id}:`, error.message);
        continue;
      }
    }
    
    console.log(`✅ Processed ${processedCount} resumes`);
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Show top results
    const topResults = similarities.slice(0, 10);
    
    console.log(`\n🏆 Top 10 Results for "${query}":`);
    console.log('='.repeat(80));
    
    topResults.forEach((item, index) => {
      const name = item.resume.personalInfo?.firstName && item.resume.personalInfo?.lastName 
        ? `${item.resume.personalInfo.firstName} ${item.resume.personalInfo.lastName}`
        : item.resume.filename || 'Unknown';
      
      console.log(`\n${index + 1}. ${name}`);
      console.log(`   Similarity: ${(item.similarity * 100).toFixed(2)}%`);
      console.log(`   Email: ${item.resume.personalInfo?.email || 'N/A'}`);
      
      if (item.resume.skills && Array.isArray(item.resume.skills)) {
        const iosSkills = item.resume.skills.filter(skill => 
          skill.toLowerCase().includes('ios') || 
          skill.toLowerCase().includes('swift') || 
          skill.toLowerCase().includes('objective') ||
          skill.toLowerCase().includes('xcode') ||
          skill.toLowerCase().includes('iphone') ||
          skill.toLowerCase().includes('ipad') ||
          skill.toLowerCase().includes('apple')
        );
        
        if (iosSkills.length > 0) {
          console.log(`   iOS Skills: ${iosSkills.join(', ')}`);
        }
      }
      
      console.log(`   Text Preview: ${item.searchableText}`);
    });
    
    // Check if any iOS-related resumes were found
    const iosRelatedResults = topResults.filter(item => {
      const text = item.searchableText.toLowerCase();
      return text.includes('ios') || text.includes('swift') || text.includes('objective') || 
             text.includes('xcode') || text.includes('iphone') || text.includes('ipad') || 
             text.includes('apple');
    });
    
    console.log(`\n📱 Found ${iosRelatedResults.length} iOS-related results in top 10`);
    
    if (iosRelatedResults.length === 0) {
      console.log('\n⚠️  No iOS-related results found in top 10. This might indicate:');
      console.log('   1. The mock embedding function needs improvement');
      console.log('   2. The similarity threshold is too high');
      console.log('   3. The resume data structure needs adjustment');
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

testSemanticSearch().catch(console.error); 