import { MongoClient, ServerApiVersion } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// Initialize Gemini AI for embeddings
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

// Generate Gemini embedding for text
async function generateGeminiEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const result = await embeddingModel.embedContent(text.trim());
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating Gemini embedding:', error.message);
    return [];
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

// Generate multi-embeddings for job postings
async function generateJobMultiEmbeddings(job) {
  try {
    const embeddings = {};
    
    // Generate separate embeddings for different job components
    if (job.jobTitle) {
      embeddings.titleEmbedding = await generateGeminiEmbedding(job.jobTitle);
    }
    
    if (job.jobSummary) {
      embeddings.summaryEmbedding = await generateGeminiEmbedding(job.jobSummary);
    }
    
    if (job.requirements) {
      embeddings.requirementsEmbedding = await generateGeminiEmbedding(job.requirements);
    }
    
    if (job.duties) {
      embeddings.dutiesEmbedding = await generateGeminiEmbedding(job.duties);
    }
    
    if (job.qualifications) {
      embeddings.qualificationsEmbedding = await generateGeminiEmbedding(job.qualifications);
    }
    
    // Create searchable text for combined embedding
    const searchableText = [
      job.jobTitle || '',
      job.jobSummary || '',
      job.duties || '',
      job.requirements || '',
      job.qualifications || '',
      job.department || '',
      job.location || '',
      job.jobType || ''
    ].filter(Boolean).join(' ');
    
    if (searchableText.trim()) {
      embeddings.combinedEmbedding = await generateGeminiEmbedding(searchableText);
    }
    
    return {
      embeddings,
      searchableText
    };
  } catch (error) {
    console.error('Error generating job multi-embeddings:', error);
    return { embeddings: {}, searchableText: '' };
  }
}

// Generate multi-embeddings for resumes
async function generateResumeMultiEmbeddings(resume) {
  try {
    const embeddings = {};
    
    // Generate separate embeddings for different resume components
    if (resume.professionalSummary) {
      embeddings.summaryEmbedding = await generateGeminiEmbedding(resume.professionalSummary);
    }
    
    if (resume.skills && Array.isArray(resume.skills) && resume.skills.length > 0) {
      embeddings.skillsEmbedding = await generateGeminiEmbedding(resume.skills.join(' '));
    }
    
    if (resume.experience && Array.isArray(resume.experience) && resume.experience.length > 0) {
      const experienceText = resume.experience.map(exp => 
        `${exp.title || ''} ${exp.company || ''} ${(exp.responsibilities || []).join(' ')}`
      ).join(' ');
      embeddings.experienceEmbedding = await generateGeminiEmbedding(experienceText);
    }
    
    if (resume.education && Array.isArray(resume.education) && resume.education.length > 0) {
      embeddings.educationEmbedding = await generateGeminiEmbedding(resume.education.join(' '));
    }
    
    // Create searchable text for combined embedding
    const searchableText = [
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
    ].filter(Boolean).join(' ');
    
    if (searchableText.trim()) {
      embeddings.combinedEmbedding = await generateGeminiEmbedding(searchableText);
    }
    
    return {
      embeddings,
      searchableText
    };
  } catch (error) {
    console.error('Error generating resume multi-embeddings:', error);
    return { embeddings: {}, searchableText: '' };
  }
}

async function checkAndGenerateMultiEmbeddings() {
  let client;
  
  try {
    console.log('🔍 Checking MongoDB collections for multi-embeddings...\n');
    
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
    
    // Check job postings
    const jobsWithMultiEmbeddings = await jobpostingsCollection.countDocuments({ "embeddings.combinedEmbedding": { $exists: true } });
    const jobsWithSimpleEmbeddings = await jobpostingsCollection.countDocuments({ embedding: { $exists: true } });
    const totalJobs = await jobpostingsCollection.countDocuments({});
    
    console.log(`📊 Job Postings:`);
    console.log(`  • Total: ${totalJobs}`);
    console.log(`  • With multi-embeddings: ${jobsWithMultiEmbeddings}`);
    console.log(`  • With simple embeddings: ${jobsWithSimpleEmbeddings}`);
    console.log(`  • Missing multi-embeddings: ${totalJobs - jobsWithMultiEmbeddings}`);
    
    // Check resumes
    const resumesWithMultiEmbeddings = await resumesCollection.countDocuments({ "embeddings.combinedEmbedding": { $exists: true } });
    const resumesWithSimpleEmbeddings = await resumesCollection.countDocuments({ embedding: { $exists: true } });
    const totalResumes = await resumesCollection.countDocuments({});
    
    console.log(`\n📊 Resumes:`);
    console.log(`  • Total: ${totalResumes}`);
    console.log(`  • With multi-embeddings: ${resumesWithMultiEmbeddings}`);
    console.log(`  • With simple embeddings: ${resumesWithSimpleEmbeddings}`);
    console.log(`  • Missing multi-embeddings: ${totalResumes - resumesWithMultiEmbeddings}`);
    
    // Generate multi-embeddings for job postings
    if (jobsWithMultiEmbeddings < totalJobs) {
      console.log('\n🔄 Generating multi-embeddings for job postings...');
      
      const jobsWithoutMultiEmbeddings = await jobpostingsCollection.find({ 
        "embeddings.combinedEmbedding": { $exists: false } 
      }).toArray();
      
      for (let i = 0; i < jobsWithoutMultiEmbeddings.length; i++) {
        const job = jobsWithoutMultiEmbeddings[i];
        
        try {
          const { embeddings, searchableText } = await generateJobMultiEmbeddings(job);
          
          if (embeddings.combinedEmbedding && embeddings.combinedEmbedding.length > 0) {
            await jobpostingsCollection.updateOne(
              { _id: job._id },
              { 
                $set: { 
                  embeddings: embeddings,
                  searchableText: searchableText,
                  embeddingGeneratedAt: new Date()
                },
                $unset: { embedding: "" } // Remove old single embedding
              }
            );
            
            console.log(`✓ Generated multi-embeddings for job: ${job.jobTitle || 'Unknown'} (${i + 1}/${jobsWithoutMultiEmbeddings.length})`);
            console.log(`  Components: ${Object.keys(embeddings).join(', ')}`);
          } else {
            console.log(`⚠️  Skipped job: ${job.jobTitle || 'Unknown'} - no valid text content`);
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`✗ Failed to generate multi-embeddings for job: ${job.jobTitle || 'Unknown'}`, error.message);
        }
      }
    }
    
    // Generate multi-embeddings for resumes
    if (resumesWithMultiEmbeddings < totalResumes) {
      console.log('\n🔄 Generating multi-embeddings for resumes...');
      
      const resumesWithoutMultiEmbeddings = await resumesCollection.find({ 
        "embeddings.combinedEmbedding": { $exists: false } 
      }).toArray();
      
      for (let i = 0; i < resumesWithoutMultiEmbeddings.length; i++) {
        const resume = resumesWithoutMultiEmbeddings[i];
        
        try {
          const { embeddings, searchableText } = await generateResumeMultiEmbeddings(resume);
          
          if (embeddings.combinedEmbedding && embeddings.combinedEmbedding.length > 0) {
            await resumesCollection.updateOne(
              { _id: resume._id },
              { 
                $set: { 
                  embeddings: embeddings,
                  searchableText: searchableText,
                  embeddingGeneratedAt: new Date()
                },
                $unset: { embedding: "" } // Remove old single embedding
              }
            );
            
            const name = `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim() || 'Unknown';
            console.log(`✓ Generated multi-embeddings for resume: ${name} (${i + 1}/${resumesWithoutMultiEmbeddings.length})`);
            console.log(`  Components: ${Object.keys(embeddings).join(', ')}`);
          } else {
            const name = `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim() || 'Unknown';
            console.log(`⚠️  Skipped resume: ${name} - no valid text content`);
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          const name = `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim() || 'Unknown';
          console.error(`✗ Failed to generate multi-embeddings for resume: ${name}`, error.message);
        }
      }
    }
    
    // Final check
    const finalJobsWithMultiEmbeddings = await jobpostingsCollection.countDocuments({ "embeddings.combinedEmbedding": { $exists: true } });
    const finalResumesWithMultiEmbeddings = await resumesCollection.countDocuments({ "embeddings.combinedEmbedding": { $exists: true } });
    
    console.log('\n✅ Final Status:');
    console.log(`  • Job postings with multi-embeddings: ${finalJobsWithMultiEmbeddings}/${totalJobs}`);
    console.log(`  • Resumes with multi-embeddings: ${finalResumesWithMultiEmbeddings}/${totalResumes}`);
    
    if (finalJobsWithMultiEmbeddings > 0 && finalResumesWithMultiEmbeddings > 0) {
      console.log('\n🎉 Multi-embedding vector search is now ready to use!');
      console.log('Benefits of multi-embeddings:');
      console.log('• Better semantic understanding of different content types');
      console.log('• More precise matching for specific job requirements');
      console.log('• Improved search accuracy for technical skills');
      console.log('• Enhanced cross-matching between jobs and resumes');
    } else {
      console.log('\n⚠️  Some multi-embeddings are still missing. Please check the errors above.');
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

// Run the check and generation
checkAndGenerateMultiEmbeddings().catch(console.error); 