const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

async function testConnection() {
  let client;
  
  try {
    console.log('🔍 Testing MongoDB Connection...\n');
    
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB successfully!');
    
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
      const name = `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim() || 'Unknown';
      const experience = resume.personalInfo?.yearsOfExperience || 'N/A';
      console.log(`  ${index + 1}. ${name} - ${experience} years experience`);
    });
    
    // Generate vector search prompts based on actual data
    console.log('\n🎯 VECTOR SEARCH PROMPTS BASED ON ACTUAL DATA:');
    console.log('=' .repeat(60));
    
    generatePromptsFromData(sampleJobs, sampleResumes);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

function generatePromptsFromData(jobs, resumes) {
  console.log('\n🔍 JOB-TO-RESUME MATCHING PROMPTS:');
  console.log('-'.repeat(40));
  
  jobs.forEach((job, index) => {
    if (job.jobTitle && job.department) {
      console.log(`${index + 1}. Find resumes for ${job.jobTitle} positions in ${job.department}`);
    }
  });
  
  console.log('\n👤 RESUME-TO-JOB MATCHING PROMPTS:');
  console.log('-'.repeat(40));
  
  resumes.forEach((resume, index) => {
    const name = `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim();
    const experience = resume.personalInfo?.yearsOfExperience || 'N/A';
    if (name !== 'Unknown') {
      console.log(`${index + 1}. Find jobs for ${name} with ${experience} years of experience`);
    }
  });
  
  console.log('\n🛠️ SKILL-BASED SEARCH PROMPTS:');
  console.log('-'.repeat(40));
  
  const allSkills = resumes.flatMap(resume => resume.skills || []).filter(Boolean);
  const uniqueSkills = [...new Set(allSkills)].slice(0, 10);
  
  uniqueSkills.forEach((skill, index) => {
    console.log(`${index + 1}. Find candidates or jobs with ${skill} skills`);
  });
  
  console.log('\n📍 LOCATION-BASED PROMPTS:');
  console.log('-'.repeat(40));
  
  const locations = jobs.map(job => job.location).filter(Boolean);
  const uniqueLocations = [...new Set(locations)].slice(0, 5);
  
  uniqueLocations.forEach((location, index) => {
    console.log(`${index + 1}. Find positions and candidates in ${location}`);
  });
  
  console.log('\n💼 EXPERIENCE-LEVEL PROMPTS:');
  console.log('-'.repeat(40));
  
  const experienceLevels = resumes.map(resume => resume.personalInfo?.yearsOfExperience).filter(Boolean);
  const uniqueExperience = [...new Set(experienceLevels)].slice(0, 5);
  
  uniqueExperience.forEach((exp, index) => {
    console.log(`${index + 1}. Find positions and candidates with ${exp} years of experience`);
  });
  
  console.log('\n🎯 ADVANCED MULTI-CRITERIA PROMPTS:');
  console.log('-'.repeat(40));
  
  console.log('1. Find senior software engineers with Python experience and security clearance');
  console.log('2. Search for project managers with government contracting experience in DC area');
  console.log('3. Find data scientists with machine learning expertise and advanced degrees');
  console.log('4. Search for cybersecurity specialists with network security and 5+ years experience');
  console.log('5. Find aviation safety professionals with FAA experience and leadership skills');
  console.log('6. Search for financial analysts with modeling experience and Excel expertise');
  console.log('7. Find cloud architects with AWS/Azure experience for enterprise positions');
  console.log('8. Search for business analysts with requirements gathering and government experience');
  console.log('9. Find technical leaders with software development and team management experience');
  console.log('10. Search for research scientists with advanced degrees and specialized technical skills');
}

testConnection().catch(console.error); 