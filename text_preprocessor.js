const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB connection
const MONGODB_USERNAME = 'adminuser';
const MONGODB_PASSWORD = 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// Text cleaning and normalization functions
function cleanText(text) {
  if (!text || text === 'N/A') return '';
  
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s\-.,;:!?()]/g, '') // Remove special characters except basic punctuation
    .trim();
}

function extractSkills(text) {
  if (!text) return [];
  
  // Common technical skills patterns
  const skillPatterns = [
    /\b(?:JavaScript|Python|Java|C\+\+|C#|Ruby|PHP|Go|Rust|Swift|Kotlin|TypeScript)\b/gi,
    /\b(?:React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|Laravel|ASP\.NET)\b/gi,
    /\b(?:MongoDB|PostgreSQL|MySQL|SQLite|Redis|Elasticsearch|DynamoDB)\b/gi,
    /\b(?:AWS|Azure|GCP|Docker|Kubernetes|Jenkins|Git|GitHub|GitLab)\b/gi,
    /\b(?:HTML|CSS|SASS|LESS|Bootstrap|Tailwind|jQuery|Webpack|Babel)\b/gi,
    /\b(?:Machine Learning|AI|Data Science|Analytics|Statistics|R|TensorFlow|PyTorch)\b/gi,
    /\b(?:Project Management|Agile|Scrum|Kanban|JIRA|Confluence|Slack)\b/gi,
    /\b(?:Salesforce|SAP|Oracle|Microsoft Office|Excel|PowerPoint|Word)\b/gi
  ];
  
  const skills = new Set();
  skillPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => skills.add(match.toLowerCase()));
    }
  });
  
  return Array.from(skills);
}

function createJobSearchableText(job) {
  const fields = [
    job.jobTitle,
    job.jobSummary,
    job.duties,
    job.requirements,
    job.qualifications,
    job.education,
    job.location,
    job.jobType
  ];
  
  const combinedText = fields
    .filter(field => field && field !== 'N/A')
    .map(cleanText)
    .join(' ');
  
  const skills = extractSkills(combinedText);
  
  return {
    searchableText: combinedText,
    extractedSkills: skills,
    metadata: {
      jobTitle: job.jobTitle,
      location: job.location,
      jobType: job.jobType,
      department: job.department,
      experienceRequired: job.experienceRequired,
      educationRequired: job.educationRequired
    }
  };
}

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
    resume.securityClearance
  ];
  
  const combinedText = fields
    .filter(field => field && field !== 'N/A')
    .map(cleanText)
    .join(' ');
  
  const skills = extractSkills(combinedText);
  
  return {
    searchableText: combinedText,
    extractedSkills: skills,
    metadata: {
      name: `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim(),
      email: resume.personalInfo?.email,
      yearsOfExperience: resume.personalInfo?.yearsOfExperience,
      securityClearance: resume.securityClearance
    }
  };
}

async function preprocessCollections() {
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
    
    // Preprocess job postings
    console.log('\n=== PREPROCESSING JOB POSTINGS ===');
    const jobpostingsCollection = db.collection('jobpostings');
    const jobs = await jobpostingsCollection.find({}).toArray();
    
    let processedJobs = 0;
    for (const job of jobs) {
      const processed = createJobSearchableText(job);
      
      // Update the document with processed text
      await jobpostingsCollection.updateOne(
        { _id: job._id },
        { 
          $set: {
            searchableText: processed.searchableText,
            extractedSkills: processed.extractedSkills,
            processedMetadata: processed.metadata,
            processedAt: new Date()
          }
        }
      );
      
      processedJobs++;
      if (processedJobs % 10 === 0) {
        console.log(`Processed ${processedJobs}/${jobs.length} job postings`);
      }
    }
    
    console.log(`✓ Processed ${processedJobs} job postings`);
    
    // Preprocess resumes
    console.log('\n=== PREPROCESSING RESUMES ===');
    const resumesCollection = db.collection('resumes');
    const resumes = await resumesCollection.find({}).toArray();
    
    let processedResumes = 0;
    for (const resume of resumes) {
      const processed = createResumeSearchableText(resume);
      
      // Update the document with processed text
      await resumesCollection.updateOne(
        { _id: resume._id },
        { 
          $set: {
            searchableText: processed.searchableText,
            extractedSkills: processed.extractedSkills,
            processedMetadata: processed.metadata,
            processedAt: new Date()
          }
        }
      );
      
      processedResumes++;
      if (processedResumes % 10 === 0) {
        console.log(`Processed ${processedResumes}/${resumes.length} resumes`);
      }
    }
    
    console.log(`✓ Processed ${processedResumes} resumes`);
    
    // Display sample processed data
    console.log('\n=== SAMPLE PROCESSED DATA ===');
    
    const sampleJob = await jobpostingsCollection.findOne({ searchableText: { $exists: true } });
    if (sampleJob) {
      console.log('\nSample Processed Job:');
      console.log('Title:', sampleJob.jobTitle);
      console.log('Searchable Text Length:', sampleJob.searchableText?.length || 0);
      console.log('Extracted Skills:', sampleJob.extractedSkills?.slice(0, 5));
      console.log('Text Preview:', sampleJob.searchableText?.substring(0, 200) + '...');
    }
    
    const sampleResume = await resumesCollection.findOne({ searchableText: { $exists: true } });
    if (sampleResume) {
      console.log('\nSample Processed Resume:');
      console.log('Name:', sampleResume.processedMetadata?.name);
      console.log('Searchable Text Length:', sampleResume.searchableText?.length || 0);
      console.log('Extracted Skills:', sampleResume.extractedSkills?.slice(0, 5));
      console.log('Text Preview:', sampleResume.searchableText?.substring(0, 200) + '...');
    }
    
    console.log('\n=== PREPROCESSING COMPLETE ===');
    console.log('✓ All documents have been processed and are ready for embedding generation');
    
  } catch (error) {
    console.error('Error preprocessing collections:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

// Export functions for use in other scripts
module.exports = {
  cleanText,
  extractSkills,
  createJobSearchableText,
  createResumeSearchableText,
  preprocessCollections
};

// Run preprocessing if this file is executed directly
if (require.main === module) {
  preprocessCollections().catch(console.error);
} 