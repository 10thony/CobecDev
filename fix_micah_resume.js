import { MongoClient, ServerApiVersion } from 'mongodb';
import OpenAI from 'openai';

// MongoDB connection
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Extract skills from text
function extractSkillsFromText(text) {
  const commonSkills = [
    // Programming Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'go', 'rust', 'typescript',
    // Web Technologies
    'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
    // Mobile Development
    'ios', 'android', 'react native', 'flutter', 'xamarin', 'swift', 'objective-c',
    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
    // Data Science & AI
    'machine learning', 'ai', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
    // Other Technical Skills
    'linux', 'unix', 'windows', 'agile', 'scrum', 'project management', 'cybersecurity',
    // Domain Specific
    'aviation', 'safety', 'faa', 'government', 'security clearance'
  ];
  
  const textLower = text.toLowerCase();
  const foundSkills = commonSkills.filter(skill => 
    textLower.includes(skill.toLowerCase())
  );
  
  return foundSkills;
}

// Create comprehensive searchable text from resume data
function createComprehensiveSearchableText(resume) {
  const fields = [];
  
  // Add personal info
  if (resume.personalInfo) {
    const { firstName, lastName, email, phone, yearsOfExperience, professionalSummary } = resume.personalInfo;
    fields.push(`${firstName || ''} ${lastName || ''}`.trim());
    fields.push(email || '');
    fields.push(phone || '');
    fields.push(professionalSummary || '');
    if (yearsOfExperience) {
      fields.push(`${yearsOfExperience} years of experience`);
    }
  }
  
  // Add professional summary
  if (resume.professionalSummary) {
    fields.push(resume.professionalSummary);
  }
  
  // Add experience entries
  if (resume.experience && Array.isArray(resume.experience)) {
    resume.experience.forEach(exp => {
      fields.push(exp.title || '');
      fields.push(exp.company || '');
      if (exp.responsibilities && Array.isArray(exp.responsibilities)) {
        fields.push(exp.responsibilities.join(' '));
      }
      if (exp.description) {
        fields.push(exp.description);
      }
    });
  }
  
  // Add education
  if (resume.education && Array.isArray(resume.education)) {
    resume.education.forEach(edu => {
      fields.push(edu.degree || '');
      fields.push(edu.school || '');
      fields.push(edu.field || '');
    });
  }
  
  // Add skills
  if (resume.skills && Array.isArray(resume.skills)) {
    fields.push(resume.skills.join(' '));
  }
  
  // Add extracted skills
  if (resume.extractedSkills && Array.isArray(resume.extractedSkills)) {
    fields.push(resume.extractedSkills.join(' '));
  }
  
  // Add certifications
  if (resume.certifications && resume.certifications !== 'n/a') {
    fields.push(resume.certifications);
  }
  
  // Add professional memberships
  if (resume.professionalMemberships && resume.professionalMemberships !== 'n/a') {
    fields.push(resume.professionalMemberships);
  }
  
  // Add security clearance
  if (resume.securityClearance && resume.securityClearance !== 'n/a') {
    fields.push(resume.securityClearance);
  }
  
  // Add original text as fallback (but limit length to avoid token limits)
  if (resume.originalText) {
    const limitedText = resume.originalText.length > 2000 
      ? resume.originalText.substring(0, 2000) + '...'
      : resume.originalText;
    fields.push(limitedText);
  }
  
  // Combine all fields and clean up
  const combinedText = fields
    .filter(field => field && field !== 'N/A' && field !== 'n/a' && field.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  return combinedText;
}

async function fixMicahResume() {
  let client;
  
  try {
    console.log('🔧 Fixing Micah\'s resume data...');
    
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
    console.log(`Current searchableText length: ${micahResume.searchableText?.length || 0}`);
    console.log(`Current embedding status: ${micahResume.embedding ? 'Has embedding' : 'No embedding'}`);
    
    // Create comprehensive searchable text
    const comprehensiveText = createComprehensiveSearchableText(micahResume);
    console.log(`\n📝 Generated comprehensive searchable text (${comprehensiveText.length} characters)`);
    console.log('Preview:', comprehensiveText.substring(0, 300) + '...');
    
    // Extract skills from the comprehensive text
    const extractedSkills = extractSkillsFromText(comprehensiveText);
    console.log(`\n🔍 Extracted skills: ${extractedSkills.join(', ')}`);
    
    if (!comprehensiveText.trim()) {
      console.log('❌ No searchable text could be generated');
      return;
    }
    
    // Generate new embedding
    console.log('\n🔄 Generating new embedding...');
    const newEmbedding = await generateEmbedding(comprehensiveText);
    console.log(`✓ Generated new embedding (${newEmbedding.length} dimensions)`);
    
    // Update the document with comprehensive data
    const updateResult = await resumesCollection.updateOne(
      { _id: micahResume._id },
      { 
        $set: {
          searchableText: comprehensiveText,
          embedding: newEmbedding,
          extractedSkills: extractedSkills,
          processedMetadata: {
            ...micahResume.processedMetadata,
            comprehensiveTextLength: comprehensiveText.length,
            extractedSkillsCount: extractedSkills.length,
            lastUpdated: new Date().toISOString(),
            updateReason: 'Enhanced searchable text and embedding generation'
          },
          embeddingGeneratedAt: new Date(),
          lastEnhanced: new Date()
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('\n✅ Successfully updated Micah\'s resume with enhanced data');
      console.log(`Modified count: ${updateResult.modifiedCount}`);
      
      // Verify the update
      const updatedResume = await resumesCollection.findOne({ _id: micahResume._id });
      console.log(`\n📊 Verification:`);
      console.log(`- New searchableText length: ${updatedResume.searchableText?.length || 0}`);
      console.log(`- New embedding dimensions: ${updatedResume.embedding?.length || 0}`);
      console.log(`- Extracted skills: ${updatedResume.extractedSkills?.join(', ') || 'None'}`);
      
      // Test search functionality
      console.log('\n🧪 Testing search functionality...');
      const testQuery = "find candidates with ios development experience";
      const testEmbedding = await generateEmbedding(testQuery);
      const similarity = cosineSimilarity(testEmbedding, updatedResume.embedding);
      console.log(`Similarity score for "${testQuery}": ${(similarity * 100).toFixed(1)}%`);
      
      if (similarity > 0.3) {
        console.log('✅ Resume should now appear in iOS development searches');
      } else {
        console.log('⚠️  Similarity score is still low - may need further optimization');
      }
      
    } else {
      console.log('❌ Failed to update resume');
    }
    
  } catch (error) {
    console.error('❌ Error fixing Micah\'s resume:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
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

// Run the fix
if (import.meta.url === `file://${process.argv[1]}`) {
  fixMicahResume().catch(console.error);
}

export {
  fixMicahResume,
  createComprehensiveSearchableText,
  extractSkillsFromText,
  cosineSimilarity
}; 