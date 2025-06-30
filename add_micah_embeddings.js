import { MongoClient, ServerApiVersion } from 'mongodb';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB credentials
const MONGODB_USERNAME = 'adminuser';
const MONGODB_PASSWORD = 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

// Initialize OpenAI for embeddings
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

// Create searchable text from resume data
function createResumeSearchableText(resume) {
  // Combine experience entries
  const experienceText = resume.experience?.map(exp => {
    return `${exp.title} at ${exp.company}: ${exp.responsibilities?.join(' ')}`;
  }).join(' ') || '';
  
  // Combine education entries
  const educationText = resume.education?.join(' ') || '';
  
  // Combine skills
  const skillsText = resume.skills?.join(' ') || '';
  
  const fields = [
    resume.professionalSummary,
    experienceText,
    educationText,
    skillsText,
    resume.certifications,
    resume.professionalMemberships,
    resume.securityClearance,
    resume.originalText // Include original text as fallback
  ];
  
  const combinedText = fields
    .filter(field => field && field !== 'N/A' && field !== 'n/a')
    .join(' ');
  
  return combinedText;
}

async function addMicahEmbeddings() {
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
    
    // Find Micah's resume by filename
    const micahResume = await resumesCollection.findOne({
      filename: 'MicahKimel_Resume.docx'
    });
    
    if (!micahResume) {
      console.log('❌ Micah\'s resume not found in database');
      return;
    }
    
    console.log(`✓ Found Micah's resume: ${micahResume.filename}`);
    console.log(`Current embedding status: ${micahResume.embedding ? 'Has embedding' : 'No embedding'}`);
    
    // Create searchable text
    const searchableText = createResumeSearchableText(micahResume);
    console.log(`Generated searchable text (${searchableText.length} characters)`);
    console.log('Preview:', searchableText.substring(0, 200) + '...');
    
    if (!searchableText.trim()) {
      console.log('❌ No searchable text could be generated');
      return;
    }
    
    // Generate embedding
    console.log('🔄 Generating embedding...');
    const embedding = await generateEmbedding(searchableText);
    console.log(`✓ Generated embedding (${embedding.length} dimensions)`);
    
    // Update the document
    const result = await resumesCollection.updateOne(
      { _id: micahResume._id },
      { 
        $set: {
          embedding: embedding,
          searchableText: searchableText,
          embeddingGeneratedAt: new Date()
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Successfully updated Micah\'s resume with embedding');
      
      // Verify the update
      const updatedResume = await resumesCollection.findOne({ _id: micahResume._id });
      console.log(`Verification - Has embedding: ${updatedResume.embedding ? 'Yes' : 'No'}`);
      console.log(`Verification - Searchable text length: ${updatedResume.searchableText?.length || 0}`);
    } else {
      console.log('❌ Failed to update resume');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the script
addMicahEmbeddings().catch(console.error); 