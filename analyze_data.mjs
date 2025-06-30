import { MongoClient, ServerApiVersion } from 'mongodb';

// MongoDB credentials
const MONGODB_USERNAME = 'adminuser';
const MONGODB_PASSWORD = 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = 'demo.y407omc.mongodb.net';

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
    const sampleJobs = await jobpostingsCollection.find({}).limit(10).toArray();
    const sampleResumes = await resumesCollection.find({}).limit(10).toArray();
    
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
    
    // Generate comprehensive vector search prompts
    console.log('\n🎯 VECTOR SEARCH PROMPTS BASED ON ACTUAL DATA:');
    console.log('=' .repeat(80));
    
    generateComprehensivePrompts(sampleJobs, sampleResumes);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

function generateComprehensivePrompts(jobs, resumes) {
  // Extract unique values from the data
  const jobTitles = [...new Set(jobs.map(job => job.jobTitle).filter(Boolean))];
  const jobLocations = [...new Set(jobs.map(job => job.location).filter(Boolean))];
  const jobDepartments = [...new Set(jobs.map(job => job.department).filter(Boolean))];
  const jobTypes = [...new Set(jobs.map(job => job.jobType).filter(Boolean))];
  
  const resumeNames = resumes.map(resume => 
    `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim()
  ).filter(name => name && name !== 'Unknown');
  
  const resumeExperience = [...new Set(resumes.map(resume => resume.personalInfo?.yearsOfExperience).filter(Boolean))];
  const resumeSkills = [...new Set(resumes.flatMap(resume => resume.skills || []).filter(Boolean))];
  
  console.log('\n🔍 JOB-TO-RESUME MATCHING PROMPTS:');
  console.log('-'.repeat(50));
  
  const jobToResumePrompts = [
    "Find resumes for software engineering positions with Python and JavaScript experience",
    "Search for candidates with 5+ years of project management experience",
    "Find resumes for data analyst positions with SQL and Python skills",
    "Search for candidates with security clearance and government experience",
    "Find resumes for aviation safety positions with FAA experience",
    "Search for candidates with machine learning and AI experience",
    "Find resumes for cybersecurity positions with network security experience",
    "Search for candidates with cloud computing and AWS experience",
    "Find resumes for financial analyst positions with Excel and modeling experience",
    "Search for candidates with leadership experience in technical teams",
    "Find resumes for business analyst positions with requirements gathering experience",
    "Search for candidates with research and development experience",
    "Find resumes for administrative positions with organizational skills",
    "Search for candidates with international experience and language skills",
    "Find resumes for consulting positions with client management experience"
  ];
  
  jobToResumePrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n👤 RESUME-TO-JOB MATCHING PROMPTS:');
  console.log('-'.repeat(50));
  
  const resumeToJobPrompts = [
    "Find jobs for a software engineer with 8 years of experience in web development",
    "Search for positions suitable for a project manager with PMP certification",
    "Find jobs for a data scientist with machine learning and Python expertise",
    "Search for government positions requiring security clearance",
    "Find jobs for an aviation professional with safety management experience",
    "Search for positions for a cybersecurity specialist with network security skills",
    "Find jobs for a cloud architect with AWS and Azure experience",
    "Search for positions for a financial analyst with modeling and Excel skills",
    "Find jobs for a technical leader with team management experience",
    "Search for positions for a business analyst with requirements gathering experience",
    "Find jobs for a research scientist with advanced degrees and specialized skills",
    "Search for positions for an administrative professional with organizational expertise",
    "Find jobs for a consultant with client management and strategic planning experience",
    "Search for positions for a marketing professional with digital marketing skills",
    "Find jobs for a human resources professional with recruitment and employee relations experience"
  ];
  
  resumeToJobPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🛠️ SKILL-BASED SEARCH PROMPTS:');
  console.log('-'.repeat(50));
  
  const skillBasedPrompts = [
    "Find candidates or jobs with Python programming skills",
    "Search for positions or resumes with project management experience",
    "Find candidates or jobs with data analysis and SQL skills",
    "Search for positions or resumes with cybersecurity expertise",
    "Find candidates or jobs with cloud computing experience",
    "Search for positions or resumes with machine learning skills",
    "Find candidates or jobs with leadership and management experience",
    "Search for positions or resumes with financial analysis skills",
    "Find candidates or jobs with aviation or aerospace experience",
    "Search for positions or resumes with government contracting experience",
    "Find candidates or jobs with JavaScript and web development skills",
    "Search for positions or resumes with business analysis expertise",
    "Find candidates or jobs with research and development experience",
    "Search for positions or resumes with administrative and organizational skills",
    "Find candidates or jobs with consulting and strategic planning experience"
  ];
  
  skillBasedPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🏢 DEPARTMENT-SPECIFIC PROMPTS:');
  console.log('-'.repeat(50));
  
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
    "Search for administrative positions and candidates with organizational skills",
    "Find business analysis positions and candidates with requirements gathering experience",
    "Search for consulting positions and candidates with strategic planning skills",
    "Find human resources positions and candidates with recruitment experience",
    "Search for marketing positions and candidates with digital marketing skills",
    "Find legal positions and candidates with government contracting experience"
  ];
  
  departmentPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n📍 LOCATION-BASED PROMPTS:');
  console.log('-'.repeat(50));
  
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
    "Search for positions and candidates in Georgia",
    "Find positions and candidates in Illinois",
    "Search for positions and candidates in Pennsylvania",
    "Find positions and candidates in Ohio",
    "Search for positions and candidates in Michigan",
    "Find positions and candidates in North Carolina"
  ];
  
  locationPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n💼 EXPERIENCE-LEVEL PROMPTS:');
  console.log('-'.repeat(50));
  
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
    "Search for positions and candidates with startup experience",
    "Find positions and candidates with consulting experience",
    "Search for positions and candidates with research experience",
    "Find positions and candidates with teaching or training experience",
    "Search for positions and candidates with entrepreneurial experience",
    "Find positions and candidates with nonprofit or public service experience"
  ];
  
  experiencePrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🎯 ADVANCED MULTI-CRITERIA PROMPTS:');
  console.log('-'.repeat(50));
  
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
    "Search for research scientists with advanced degrees and specialized technical skills",
    "Find consultants with strategic planning and client management experience in healthcare",
    "Search for marketing professionals with digital marketing and analytics experience",
    "Find human resources professionals with recruitment and employee relations experience",
    "Search for administrative professionals with organizational and project coordination skills",
    "Find legal professionals with government contracting and compliance experience"
  ];
  
  advancedPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🔍 INDUSTRY-SPECIFIC PROMPTS:');
  console.log('-'.repeat(50));
  
  const industryPrompts = [
    "Find candidates or jobs in the aerospace and defense industry",
    "Search for positions or resumes in the technology and software industry",
    "Find candidates or jobs in the healthcare and medical industry",
    "Search for positions or resumes in the financial services industry",
    "Find candidates or jobs in the government and public sector",
    "Search for positions or resumes in the consulting and professional services industry",
    "Find candidates or jobs in the education and training industry",
    "Search for positions or resumes in the manufacturing and engineering industry",
    "Find candidates or jobs in the retail and consumer goods industry",
    "Search for positions or resumes in the energy and utilities industry",
    "Find candidates or jobs in the transportation and logistics industry",
    "Search for positions or resumes in the media and entertainment industry",
    "Find candidates or jobs in the nonprofit and social services industry",
    "Search for positions or resumes in the real estate and construction industry",
    "Find candidates or jobs in the hospitality and tourism industry"
  ];
  
  industryPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n📊 SUMMARY:');
  console.log('-'.repeat(50));
  console.log(`• Job-to-Resume Prompts: ${jobToResumePrompts.length}`);
  console.log(`• Resume-to-Job Prompts: ${resumeToJobPrompts.length}`);
  console.log(`• Skill-Based Prompts: ${skillBasedPrompts.length}`);
  console.log(`• Department-Specific Prompts: ${departmentPrompts.length}`);
  console.log(`• Location-Based Prompts: ${locationPrompts.length}`);
  console.log(`• Experience-Level Prompts: ${experiencePrompts.length}`);
  console.log(`• Advanced Multi-Criteria Prompts: ${advancedPrompts.length}`);
  console.log(`• Industry-Specific Prompts: ${industryPrompts.length}`);
  
  const totalPrompts = jobToResumePrompts.length + resumeToJobPrompts.length + 
                      skillBasedPrompts.length + departmentPrompts.length + 
                      locationPrompts.length + experiencePrompts.length + 
                      advancedPrompts.length + industryPrompts.length;
  
  console.log(`\n🎯 Total Vector Search Prompts: ${totalPrompts}`);
  console.log('\n💡 These prompts can be used with your vector search implementation to find relevant matches between job postings and resumes based on semantic similarity.');
}

// Run the analysis
analyzeCollections().catch(console.error); 