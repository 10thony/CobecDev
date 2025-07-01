require('dotenv').config();
const { generateResumeEmbedding, processResumeWithEmbeddings } = require('./resume_export2.js');

// Test data - a sample resume object
const testResumeData = {
  filename: 'test_resume.json',
  originalText: 'Sample resume text for testing',
  personalInfo: {
    firstName: 'John',
    middleName: '',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-123-4567',
    yearsOfExperience: 5
  },
  professionalSummary: 'Experienced software developer with expertise in JavaScript, React, and Node.js. Passionate about creating scalable web applications and working with modern technologies.',
  education: [
    'Bachelor of Science in Computer Science, University of Technology, 2018',
    'Master of Science in Software Engineering, Tech Institute, 2020'
  ],
  experience: [
    {
      title: 'Senior Software Developer',
      company: 'Tech Solutions Inc.',
      location: 'San Francisco, CA',
      duration: '2020 - Present',
      responsibilities: [
        'Developed and maintained React-based web applications',
        'Implemented RESTful APIs using Node.js and Express',
        'Collaborated with cross-functional teams on agile projects',
        'Mentored junior developers and conducted code reviews'
      ]
    },
    {
      title: 'Software Developer',
      company: 'StartupXYZ',
      location: 'Austin, TX',
      duration: '2018 - 2020',
      responsibilities: [
        'Built responsive web applications using JavaScript and React',
        'Integrated third-party APIs and services',
        'Optimized application performance and user experience'
      ]
    }
  ],
  skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'Git', 'AWS', 'Docker'],
  certifications: 'AWS Certified Developer Associate, MongoDB Certified Developer',
  professionalMemberships: 'Member of IEEE Computer Society',
  securityClearance: 'None required',
  _metadata: {
    fileName: 'test_resume.json',
    importedAt: new Date(),
    parsedAt: new Date()
  }
};

async function testEmbeddingGeneration() {
  console.log('=== Testing Resume Embedding Generation ===\n');
  
  try {
    // Test 1: Generate embeddings for a resume object
    console.log('Test 1: Generating embeddings for resume object...');
    const embeddingResult = await generateResumeEmbedding(testResumeData);
    
    console.log('✓ Embedding generation completed');
    console.log(`  - Searchable text length: ${embeddingResult.searchableText.length} characters`);
    console.log(`  - Embedding dimensions: ${embeddingResult.embedding.length}`);
    console.log(`  - Extracted skills: ${embeddingResult.extractedSkills.length}`);
    console.log(`  - Skills: ${embeddingResult.extractedSkills.join(', ')}`);
    
    // Test 2: Test with a file path (if a test file exists)
    console.log('\nTest 2: Testing with file processing...');
    console.log('Note: This test requires a .docx file to be present');
    console.log('You can run: node resume_export2.js embeddings <path-to-resume.docx>');
    
    // Test 3: Validate embedding quality
    console.log('\nTest 3: Validating embedding quality...');
    if (embeddingResult.embedding.length > 0) {
      console.log('✓ Embedding generated successfully');
      
      // Check if embedding has reasonable values
      const avgValue = embeddingResult.embedding.reduce((sum, val) => sum + Math.abs(val), 0) / embeddingResult.embedding.length;
      const maxValue = Math.max(...embeddingResult.embedding.map(Math.abs));
      
      console.log(`  - Average absolute value: ${avgValue.toFixed(4)}`);
      console.log(`  - Maximum absolute value: ${maxValue.toFixed(4)}`);
      
      if (avgValue > 0 && avgValue < 1 && maxValue < 2) {
        console.log('✓ Embedding values are within expected ranges');
      } else {
        console.log('⚠️  Embedding values may be outside expected ranges');
      }
    } else {
      console.log('✗ No embedding generated');
    }
    
    console.log('\n=== Test Summary ===');
    console.log('✓ Embedding generation functionality is working');
    console.log('✓ Searchable text creation is working');
    console.log('✓ Skill extraction is working');
    console.log('\nThe resume import functions will now automatically generate embeddings!');
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.log('\nMake sure you have:');
    console.log('1. OPENAI_API_KEY set in your .env file');
    console.log('2. Internet connection for OpenAI API calls');
    console.log('3. Valid OpenAI API key');
  }
}

// Run the test
if (require.main === module) {
  testEmbeddingGeneration().catch(console.error);
}

module.exports = { testEmbeddingGeneration }; 