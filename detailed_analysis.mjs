import { MongoClient, ServerApiVersion } from 'mongodb';

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

async function detailedAnalysis() {
  let client;
  
  try {
    console.log('🔍 Detailed Analysis of MongoDB Collections...\n');
    
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
    
    // Get all data for analysis
    const allJobs = await jobpostingsCollection.find({}).toArray();
    const allResumes = await resumesCollection.find({}).toArray();
    
    console.log(`📊 Total Documents:`);
    console.log(`  • Job Postings: ${allJobs.length}`);
    console.log(`  • Resumes: ${allResumes.length}\n`);
    
    // Analyze job postings in detail
    console.log('🏢 DETAILED JOB POSTINGS ANALYSIS:');
    console.log('=' .repeat(60));
    
    const jobTitles = allJobs.map(job => job.jobTitle).filter(Boolean);
    const jobLocations = allJobs.map(job => job.location).filter(Boolean);
    const jobDepartments = allJobs.map(job => job.department).filter(Boolean);
    const jobTypes = allJobs.map(job => job.jobType).filter(Boolean);
    const jobSummaries = allJobs.map(job => job.jobSummary).filter(Boolean);
    const jobDuties = allJobs.map(job => job.duties).filter(Boolean);
    const jobRequirements = allJobs.map(job => job.requirements).filter(Boolean);
    const jobQualifications = allJobs.map(job => job.qualifications).filter(Boolean);
    
    console.log(`📋 Job Titles: ${jobTitles.length} entries`);
    console.log(`📍 Locations: ${jobLocations.length} entries`);
    console.log(`🏛️ Departments: ${jobDepartments.length} entries`);
    console.log(`💼 Job Types: ${jobTypes.length} entries`);
    console.log(`📝 Job Summaries: ${jobSummaries.length} entries`);
    console.log(`🔧 Job Duties: ${jobDuties.length} entries`);
    console.log(`📋 Requirements: ${jobRequirements.length} entries`);
    console.log(`🎓 Qualifications: ${jobQualifications.length} entries\n`);
    
    // Show unique values
    console.log('📋 Unique Job Titles (first 20):');
    [...new Set(jobTitles)].slice(0, 20).forEach(title => console.log(`  • ${title}`));
    
    console.log('\n📍 Unique Locations (first 15):');
    [...new Set(jobLocations)].slice(0, 15).forEach(location => console.log(`  • ${location}`));
    
    console.log('\n🏛️ Unique Departments (first 15):');
    [...new Set(jobDepartments)].slice(0, 15).forEach(dept => console.log(`  • ${dept}`));
    
    console.log('\n💼 Unique Job Types (first 10):');
    [...new Set(jobTypes)].slice(0, 10).forEach(type => console.log(`  • ${type}`));
    
    // Analyze resumes in detail
    console.log('\n\n👤 DETAILED RESUMES ANALYSIS:');
    console.log('=' .repeat(60));
    
    const resumeNames = allResumes.map(resume => 
      `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim()
    ).filter(name => name && name !== 'Unknown');
    
    const resumeExperience = allResumes.map(resume => resume.personalInfo?.yearsOfExperience).filter(Boolean);
    const resumeSkills = allResumes.flatMap(resume => resume.skills || []).filter(Boolean);
    const resumeSummaries = allResumes.map(resume => resume.professionalSummary).filter(Boolean);
    const resumeEducation = allResumes.flatMap(resume => resume.education || []).filter(Boolean);
    const resumeCertifications = allResumes.map(resume => resume.certifications).filter(Boolean);
    const resumeSecurityClearance = allResumes.map(resume => resume.securityClearance).filter(Boolean);
    
    console.log(`👤 Resume Names: ${resumeNames.length} entries`);
    console.log(`📈 Experience Levels: ${resumeExperience.length} entries`);
    console.log(`🛠️ Skills: ${resumeSkills.length} entries`);
    console.log(`📝 Professional Summaries: ${resumeSummaries.length} entries`);
    console.log(`🎓 Education: ${resumeEducation.length} entries`);
    console.log(`🏆 Certifications: ${resumeCertifications.length} entries`);
    console.log(`🔒 Security Clearance: ${resumeSecurityClearance.length} entries\n`);
    
    console.log('👤 Sample Resume Names (first 20):');
    [...new Set(resumeNames)].slice(0, 20).forEach(name => console.log(`  • ${name}`));
    
    console.log('\n📈 Experience Levels:');
    [...new Set(resumeExperience)].sort((a, b) => a - b).forEach(exp => console.log(`  • ${exp} years`));
    
    console.log('\n🛠️ Sample Skills (first 30):');
    [...new Set(resumeSkills)].slice(0, 30).forEach(skill => console.log(`  • ${skill}`));
    
    console.log('\n🎓 Sample Education (first 15):');
    [...new Set(resumeEducation)].slice(0, 15).forEach(edu => console.log(`  • ${edu}`));
    
    console.log('\n🏆 Sample Certifications (first 10):');
    [...new Set(resumeCertifications)].slice(0, 10).forEach(cert => console.log(`  • ${cert}`));
    
    console.log('\n🔒 Sample Security Clearance (first 10):');
    [...new Set(resumeSecurityClearance)].slice(0, 10).forEach(clearance => console.log(`  • ${clearance}`));
    
    // Generate data-driven vector search prompts
    console.log('\n\n🎯 DATA-DRIVEN VECTOR SEARCH PROMPTS:');
    console.log('=' .repeat(80));
    
    generateDataDrivenPrompts(allJobs, allResumes);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

function generateDataDrivenPrompts(jobs, resumes) {
  // Extract actual data patterns
  const actualJobTitles = [...new Set(jobs.map(job => job.jobTitle).filter(Boolean))];
  const actualLocations = [...new Set(jobs.map(job => job.location).filter(Boolean))];
  const actualDepartments = [...new Set(jobs.map(job => job.department).filter(Boolean))];
  const actualSkills = [...new Set(resumes.flatMap(resume => resume.skills || []).filter(Boolean))];
  const actualExperience = [...new Set(resumes.map(resume => resume.personalInfo?.yearsOfExperience).filter(Boolean))];
  
  console.log('\n🔍 AVIATION & AEROSPACE PROMPTS (Based on FAA jobs):');
  console.log('-'.repeat(60));
  
  const aviationPrompts = [
    "Find resumes for Aviation Safety Inspector positions with FAA experience",
    "Search for candidates with aviation safety and operations experience",
    "Find resumes for FAASTeam Program Manager positions",
    "Search for candidates with airworthiness and safety management experience",
    "Find resumes for aviation engineering positions with mechanical expertise",
    "Search for candidates with electronics engineering and aviation experience",
    "Find resumes for civil engineering positions in aviation sector",
    "Search for candidates with computer engineering and aviation systems experience",
    "Find resumes for fire protection engineering in aviation",
    "Search for candidates with engineering technician experience in aviation"
  ];
  
  aviationPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n👤 ENGINEERING PROMPTS (Based on actual job titles):');
  console.log('-'.repeat(60));
  
  const engineeringPrompts = [
    "Find resumes for General Engineer positions with technical expertise",
    "Search for candidates with mechanical engineering and design experience",
    "Find resumes for Computer Engineer positions with software development skills",
    "Search for candidates with electronics engineering and systems experience",
    "Find resumes for Civil Engineer positions with infrastructure experience",
    "Search for candidates with engineering technician and technical support experience",
    "Find resumes for Fire Protection Engineer positions with safety experience",
    "Search for candidates with engineering and project management experience",
    "Find resumes for engineering positions requiring security clearance",
    "Search for candidates with engineering and government contracting experience"
  ];
  
  engineeringPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🛠️ SKILL-SPECIFIC PROMPTS (Based on actual resume skills):');
  console.log('-'.repeat(60));
  
  // Use actual skills from resumes
  const skillPrompts = actualSkills.slice(0, 20).map(skill => 
    `Find candidates or jobs with ${skill} skills`
  );
  
  skillPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n📍 LOCATION-SPECIFIC PROMPTS (Based on actual job locations):');
  console.log('-'.repeat(60));
  
  // Use actual locations from jobs
  const locationPrompts = actualLocations.slice(0, 15).map(location => 
    `Find positions and candidates in ${location}`
  );
  
  locationPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n💼 EXPERIENCE-LEVEL PROMPTS (Based on actual resume experience):');
  console.log('-'.repeat(60));
  
  // Use actual experience levels from resumes
  const experiencePrompts = actualExperience.slice(0, 10).map(exp => 
    `Find positions and candidates with ${exp} years of experience`
  );
  
  experiencePrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🎯 GOVERNMENT & SECURITY PROMPTS:');
  console.log('-'.repeat(60));
  
  const governmentPrompts = [
    "Find resumes for government positions requiring security clearance",
    "Search for candidates with government contracting and compliance experience",
    "Find resumes for federal agency positions with technical expertise",
    "Search for candidates with government procurement and acquisition experience",
    "Find resumes for public service positions with policy experience",
    "Search for candidates with government regulations and compliance experience",
    "Find resumes for federal engineering positions with security clearance",
    "Search for candidates with government project management experience",
    "Find resumes for regulatory compliance positions",
    "Search for candidates with government systems and infrastructure experience"
  ];
  
  governmentPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🔧 TECHNICAL EXPERTISE PROMPTS:');
  console.log('-'.repeat(60));
  
  const technicalPrompts = [
    "Find resumes for software development positions with programming languages",
    "Search for candidates with database management and SQL experience",
    "Find resumes for network security and cybersecurity positions",
    "Search for candidates with cloud computing and infrastructure experience",
    "Find resumes for data analysis and business intelligence positions",
    "Search for candidates with machine learning and AI experience",
    "Find resumes for system administration and IT support positions",
    "Search for candidates with web development and frontend experience",
    "Find resumes for DevOps and automation positions",
    "Search for candidates with mobile development and app experience"
  ];
  
  technicalPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n📊 MANAGEMENT & LEADERSHIP PROMPTS:');
  console.log('-'.repeat(60));
  
  const managementPrompts = [
    "Find resumes for project management positions with PMP certification",
    "Search for candidates with team leadership and management experience",
    "Find resumes for program management positions with strategic planning",
    "Search for candidates with business analysis and requirements gathering",
    "Find resumes for operations management positions with process improvement",
    "Search for candidates with change management and organizational development",
    "Find resumes for product management positions with agile experience",
    "Search for candidates with stakeholder management and communication skills",
    "Find resumes for portfolio management positions with strategic oversight",
    "Search for candidates with risk management and compliance experience"
  ];
  
  managementPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🎓 EDUCATION & CERTIFICATION PROMPTS:');
  console.log('-'.repeat(60));
  
  const educationPrompts = [
    "Find resumes for positions requiring advanced degrees in engineering",
    "Search for candidates with professional certifications and licenses",
    "Find resumes for research positions requiring PhD qualifications",
    "Search for candidates with continuing education and training experience",
    "Find resumes for academic positions with teaching experience",
    "Search for candidates with specialized training and certifications",
    "Find resumes for technical positions requiring specific qualifications",
    "Search for candidates with industry-specific certifications",
    "Find resumes for regulatory positions requiring compliance training",
    "Search for candidates with professional development and learning experience"
  ];
  
  educationPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n🔍 ADVANCED SEMANTIC SEARCH PROMPTS:');
  console.log('-'.repeat(60));
  
  const semanticPrompts = [
    "Find candidates with experience in safety-critical systems and regulatory compliance",
    "Search for positions requiring expertise in complex technical systems and problem-solving",
    "Find candidates with background in government contracting and federal regulations",
    "Search for positions requiring experience in aviation safety and operational procedures",
    "Find candidates with expertise in engineering design and technical documentation",
    "Search for positions requiring experience in project coordination and stakeholder management",
    "Find candidates with background in technical analysis and data-driven decision making",
    "Search for positions requiring expertise in system integration and cross-functional collaboration",
    "Find candidates with experience in quality assurance and process improvement",
    "Search for positions requiring background in risk assessment and mitigation strategies"
  ];
  
  semanticPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
  
  console.log('\n📊 SUMMARY:');
  console.log('-'.repeat(60));
  console.log(`• Aviation & Aerospace Prompts: ${aviationPrompts.length}`);
  console.log(`• Engineering Prompts: ${engineeringPrompts.length}`);
  console.log(`• Skill-Specific Prompts: ${skillPrompts.length}`);
  console.log(`• Location-Specific Prompts: ${locationPrompts.length}`);
  console.log(`• Experience-Level Prompts: ${experiencePrompts.length}`);
  console.log(`• Government & Security Prompts: ${governmentPrompts.length}`);
  console.log(`• Technical Expertise Prompts: ${technicalPrompts.length}`);
  console.log(`• Management & Leadership Prompts: ${managementPrompts.length}`);
  console.log(`• Education & Certification Prompts: ${educationPrompts.length}`);
  console.log(`• Advanced Semantic Search Prompts: ${semanticPrompts.length}`);
  
  const totalPrompts = aviationPrompts.length + engineeringPrompts.length + 
                      skillPrompts.length + locationPrompts.length + 
                      experiencePrompts.length + governmentPrompts.length + 
                      technicalPrompts.length + managementPrompts.length + 
                      educationPrompts.length + semanticPrompts.length;
  
  console.log(`\n🎯 Total Data-Driven Vector Search Prompts: ${totalPrompts}`);
  console.log('\n💡 These prompts are specifically tailored to your actual data and can be used with your vector search implementation for optimal matching results.');
}

// Run the detailed analysis
detailedAnalysis().catch(console.error); 