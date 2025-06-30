import { MongoClient, ServerApiVersion } from 'mongodb';
import OpenAI from 'openai';

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

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

async function checkAndGenerateEmbeddings() {
  let client;
  
  try {
    console.log('🔍 Checking MongoDB collections for embeddings...\n');
    
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
    const jobsWithEmbeddings = await jobpostingsCollection.countDocuments({ embedding: { $exists: true } });
    const totalJobs = await jobpostingsCollection.countDocuments({});
    
    console.log(`📊 Job Postings:`);
    console.log(`  • Total: ${totalJobs}`);
    console.log(`  • With embeddings: ${jobsWithEmbeddings}`);
    console.log(`  • Missing embeddings: ${totalJobs - jobsWithEmbeddings}`);
    
    // Check resumes
    const resumesWithEmbeddings = await resumesCollection.countDocuments({ embedding: { $exists: true } });
    const totalResumes = await resumesCollection.countDocuments({});
    
    console.log(`\n📊 Resumes:`);
    console.log(`  • Total: ${totalResumes}`);
    console.log(`  • With embeddings: ${resumesWithEmbeddings}`);
    console.log(`  • Missing embeddings: ${totalResumes - resumesWithEmbeddings}`);
    
    // Generate embeddings for job postings if needed
    if (jobsWithEmbeddings < totalJobs) {
      console.log('\n🔄 Generating embeddings for job postings...');
      
      const jobsWithoutEmbeddings = await jobpostingsCollection.find({ 
        embedding: { $exists: false } 
      }).toArray();
      
      for (let i = 0; i < jobsWithoutEmbeddings.length; i++) {
        const job = jobsWithoutEmbeddings[i];
        
        // Create searchable text from job data
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
          try {
            const embedding = await generateEmbedding(searchableText);
            
            await jobpostingsCollection.updateOne(
              { _id: job._id },
              { 
                $set: { 
                  embedding: embedding,
                  searchableText: searchableText
                } 
              }
            );
            
            console.log(`✓ Generated embedding for job: ${job.jobTitle || 'Unknown'} (${i + 1}/${jobsWithoutEmbeddings.length})`);
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error(`✗ Failed to generate embedding for job: ${job.jobTitle || 'Unknown'}`, error.message);
          }
        }
      }
    }
    
    // Generate embeddings for resumes if needed
    if (resumesWithEmbeddings < totalResumes) {
      console.log('\n🔄 Generating embeddings for resumes...');
      
      const resumesWithoutEmbeddings = await resumesCollection.find({ 
        embedding: { $exists: false } 
      }).toArray();
      
      for (let i = 0; i < resumesWithoutEmbeddings.length; i++) {
        const resume = resumesWithoutEmbeddings[i];
        
        // Create searchable text from resume data
        const searchableText = [
          resume.professionalSummary || '',
          resume.skills ? resume.skills.join(' ') : '',
          resume.education ? resume.education.join(' ') : '',
          resume.certifications || '',
          resume.securityClearance || '',
          resume.personalInfo ? `${resume.personalInfo.firstName || ''} ${resume.personalInfo.lastName || ''}`.trim() : '',
          resume.experience ? resume.experience.map(exp => `${exp.title} ${exp.company} ${exp.responsibilities?.join(' ')}`).join(' ') : ''
        ].filter(Boolean).join(' ');
        
        if (searchableText.trim()) {
          try {
            const embedding = await generateEmbedding(searchableText);
            
            await resumesCollection.updateOne(
              { _id: resume._id },
              { 
                $set: { 
                  embedding: embedding,
                  searchableText: searchableText
                } 
              }
            );
            
            const name = `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim() || 'Unknown';
            console.log(`✓ Generated embedding for resume: ${name} (${i + 1}/${resumesWithoutEmbeddings.length})`);
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error(`✗ Failed to generate embedding for resume: ${resume.personalInfo?.firstName || 'Unknown'}`, error.message);
          }
        }
      }
    }
    
    // Final check
    const finalJobsWithEmbeddings = await jobpostingsCollection.countDocuments({ embedding: { $exists: true } });
    const finalResumesWithEmbeddings = await resumesCollection.countDocuments({ embedding: { $exists: true } });
    
    console.log('\n✅ Final Status:');
    console.log(`  • Job postings with embeddings: ${finalJobsWithEmbeddings}/${totalJobs}`);
    console.log(`  • Resumes with embeddings: ${finalResumesWithEmbeddings}/${totalResumes}`);
    
    if (finalJobsWithEmbeddings > 0 && finalResumesWithEmbeddings > 0) {
      console.log('\n🎉 Vector search is now ready to use!');
      console.log('You can now use the updated ChatComponent to search through your MongoDB data.');
    } else {
      console.log('\n⚠️  Some embeddings are still missing. Please check the errors above.');
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
checkAndGenerateEmbeddings().catch(console.error); 