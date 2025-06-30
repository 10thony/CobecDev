const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

async function analyzeCollections() {
  let client;
  
  try {
    console.log('🔍 Analyzing MongoDB Collections for Vector Search Prompts...\n');
    
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
    
    // Get sample data from both collections
    const sampleJobs = await jobpostingsCollection.find({}).limit(10).toArray();
    const sampleResumes = await resumesCollection.find({}).limit(10).toArray();
    
    console.log(`📊 Found ${sampleJobs.length} sample job postings and ${sampleResumes.length} sample resumes\n`);
    
    // Analyze job postings
    console.log('🏢 JOB POSTINGS ANALYSIS:');
    console.log('=' .repeat(50));
    
    const jobTitles = sampleJobs.map(job => job.jobTitle).filter(Boolean);
    const jobLocations = sampleJobs.map(job => job.location).filter(Boolean);
    const jobDepartments = sampleJobs.map(job => job.department).filter(Boolean);
    const jobTypes = sampleJobs.map(job => job.jobType).filter(Boolean);
    
    console.log(`📋 Job Titles Found: ${jobTitles.length}`);
    console.log(`📍 Locations Found: ${jobLocations.length}`);
    console.log(`🏛️ Departments Found: ${jobDepartments.length}`);
    console.log(`💼 Job Types Found: ${jobTypes.length}\n`);
    
    // Show unique values
    console.log('📋 Unique Job Titles:');
    [...new Set(jobTitles)].slice(0, 10).forEach(title => console.log(`  • ${title}`));
    
    console.log('\n📍 Unique Locations:');
    [...new Set(jobLocations)].slice(0, 10).forEach(location => console.log(`  • ${location}`));
    
    console.log('\n🏛️ Unique Departments:');
    [...new Set(jobDepartments)].slice(0, 10).forEach(dept => console.log(`  • ${dept}`));
    
    console.log('\n💼 Unique Job Types:');
    [...new Set(jobTypes)].slice(0, 10).forEach(type => console.log(`  • ${type}`));
    
    // Analyze resumes
    console.log('\n\n👤 RESUMES ANALYSIS:');
    console.log('=' .repeat(50));
    
    const resumeNames = sampleResumes.map(resume => 
      `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim()
    ).filter(Boolean);
    
    const resumeExperience = sampleResumes.map(resume => resume.personalInfo?.yearsOfExperience).filter(Boolean);
    const resumeSkills = sampleResumes.flatMap(resume => resume.skills || []).filter(Boolean);
    const resumeSummaries = sampleResumes.map(resume => resume.professionalSummary).filter(Boolean);
    
    console.log(`👤 Resume Names Found: ${resumeNames.length}`);
    console.log(`📈 Experience Levels: ${resumeExperience.length}`);
    console.log(`🛠️ Skills Found: ${resumeSkills.length}`);
    console.log(`📝 Professional Summaries: ${resumeSummaries.length}\n`);
    
    // Show unique values
    console.log('👤 Sample Resume Names:');
    [...new Set(resumeNames)].slice(0, 10).forEach(name => console.log(`  • ${name}`));
    
    console.log('\n📈 Experience Levels:');
    [...new Set(resumeExperience)].slice(0, 10).forEach(exp => console.log(`  • ${exp} years`));
    
    console.log('\n🛠️ Sample Skills:');
    [...new Set(resumeSkills)].slice(0, 15).forEach(skill => console.log(`  • ${skill}`));
    
    // Generate vector search prompts
    console.log('\n\n🎯 VECTOR SEARCH PROMPTS:');
    console.log('=' .repeat(50));
    
    generateVectorSearchPrompts(sampleJobs, sampleResumes);
    
  } catch (error) {
    console.error('❌ Error analyzing collections:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

function generateVectorSearchPrompts(jobs, resumes) {
  console.log('\n🔍 JOB-TO-RESUME MATCHING PROMPTS:');
  console.log('-'.repeat(40));
  
  // Job-specific prompts
  const jobPrompts = [
    "Find resumes for software engineering positions with Python and JavaScript experience",
    "Search for candidates with 5+ years of project management experience",
    "Find resumes for data analyst positions with SQL and Python skills",
    "Search for candidates with security clearance and government experience",
    "Find resumes for aviation safety positions with FAA experience",
    "Search for candidates with machine learning and AI experience",
    "Find resumes for cybersecurity positions with network security experience",
    "Search for candidates with cloud computing and AWS experience",
    "Find resumes for financial analyst positions with Excel and modeling experience",
    "Search for candidates with leadership experience in technical teams"
  ];
  
  jobPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n👤 RESUME-TO-JOB MATCHING PROMPTS:');
  console.log('-'.repeat(40));
  
  // Resume-specific prompts
  const resumePrompts = [
    "Find jobs for a software engineer with 8 years of experience in web development",
    "Search for positions suitable for a project manager with PMP certification",
    "Find jobs for a data scientist with machine learning and Python expertise",
    "Search for government positions requiring security clearance",
    "Find jobs for an aviation professional with safety management experience",
    "Search for positions for a cybersecurity specialist with network security skills",
    "Find jobs for a cloud architect with AWS and Azure experience",
    "Search for positions for a financial analyst with modeling and Excel skills",
    "Find jobs for a technical leader with team management experience",
    "Search for positions for a business analyst with requirements gathering experience"
  ];
  
  resumePrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🎯 SKILL-BASED SEARCH PROMPTS:');
  console.log('-'.repeat(40));
  
  // Skill-based prompts
  const skillPrompts = [
    "Find candidates or jobs with Python programming skills",
    "Search for positions or resumes with project management experience",
    "Find candidates or jobs with data analysis and SQL skills",
    "Search for positions or resumes with cybersecurity expertise",
    "Find candidates or jobs with cloud computing experience",
    "Search for positions or resumes with machine learning skills",
    "Find candidates or jobs with leadership and management experience",
    "Search for positions or resumes with financial analysis skills",
    "Find candidates or jobs with aviation or aerospace experience",
    "Search for positions or resumes with government contracting experience"
  ];
  
  skillPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🏢 DEPARTMENT-SPECIFIC PROMPTS:');
  console.log('-'.repeat(40));
  
  // Department-specific prompts
  const departmentPrompts = [
    "Find IT positions and candidates in the Department of Defense",
    "Search for aviation safety positions and qualified candidates",
    "Find cybersecurity positions and candidates with security clearance",
    "Search for data science positions and candidates with analytical skills",
    "Find project management positions and candidates with PMP certification",
    "Search for financial analysis positions and candidates with modeling experience",
    "Find engineering positions and candidates with technical expertise",
    "Search for leadership positions and candidates with management experience",
    "Find research positions and candidates with advanced degrees",
    "Search for administrative positions and candidates with organizational skills"
  ];
  
  departmentPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n📍 LOCATION-BASED PROMPTS:');
  console.log('-'.repeat(40));
  
  // Location-based prompts
  const locationPrompts = [
    "Find remote positions and candidates willing to work remotely",
    "Search for positions and candidates in Washington DC area",
    "Find positions and candidates in California",
    "Search for positions and candidates in Texas",
    "Find positions and candidates in Virginia",
    "Search for positions and candidates in Maryland",
    "Find positions and candidates in New York",
    "Search for positions and candidates in Florida",
    "Find positions and candidates in Colorado",
    "Search for positions and candidates in Georgia"
  ];
  
  locationPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n💼 EXPERIENCE-LEVEL PROMPTS:');
  console.log('-'.repeat(40));
  
  // Experience-level prompts
  const experiencePrompts = [
    "Find entry-level positions and recent graduates",
    "Search for mid-level positions and candidates with 3-5 years experience",
    "Find senior-level positions and candidates with 8+ years experience",
    "Search for executive positions and candidates with leadership experience",
    "Find positions and candidates with specific certifications",
    "Search for positions and candidates with advanced degrees",
    "Find positions and candidates with government experience",
    "Search for positions and candidates with industry-specific experience",
    "Find positions and candidates with international experience",
    "Search for positions and candidates with startup experience"
  ];
  
  experiencePrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🎯 ADVANCED SEARCH PROMPTS:');
  console.log('-'.repeat(40));
  
  // Advanced multi-criteria prompts
  const advancedPrompts = [
    "Find senior software engineers with Python experience and security clearance for remote positions",
    "Search for project managers with PMP certification and government contracting experience in DC area",
    "Find data scientists with machine learning expertise and PhD for research positions",
    "Search for cybersecurity specialists with network security skills and 5+ years experience",
    "Find aviation safety professionals with FAA experience and leadership skills",
    "Search for financial analysts with modeling experience and advanced Excel skills",
    "Find cloud architects with AWS/Azure experience and team leadership for enterprise positions",
    "Search for business analysts with requirements gathering and government experience",
    "Find technical leaders with software development and team management experience",
    "Search for research scientists with advanced degrees and specialized technical skills"
  ];
  
  advancedPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n📊 SUMMARY:');
  console.log('-'.repeat(40));
  console.log(`• Total Job Prompts: ${jobPrompts.length}`);
  console.log(`• Total Resume Prompts: ${resumePrompts.length}`);
  console.log(`• Total Skill Prompts: ${skillPrompts.length}`);
  console.log(`• Total Department Prompts: ${departmentPrompts.length}`);
  console.log(`• Total Location Prompts: ${locationPrompts.length}`);
  console.log(`• Total Experience Prompts: ${experiencePrompts.length}`);
  console.log(`• Total Advanced Prompts: ${advancedPrompts.length}`);
  console.log(`\n🎯 Total Vector Search Prompts: ${jobPrompts.length + resumePrompts.length + skillPrompts.length + departmentPrompts.length + locationPrompts.length + experiencePrompts.length + advancedPrompts.length}`);
}

// Run the analysis
if (require.main === module) {
  analyzeCollections().catch(console.error);
}

module.exports = { analyzeCollections }; 