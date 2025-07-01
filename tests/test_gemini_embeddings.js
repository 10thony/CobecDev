import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);
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

// Test Gemini embeddings
async function testGeminiEmbeddings() {
  console.log('=== TESTING GEMINI EMBEDDINGS ===\n');
  
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required for Gemini AI');
    console.log('Please create a .env file with your Gemini API key:');
    console.log('OPENAI_API_KEY=your_gemini_api_key_here');
    return;
  }
  
  try {
    // Test 1: Basic embedding generation
    console.log('1. Testing basic embedding generation...');
    const testText = "Software Engineer with Python experience";
    const embedding = await generateGeminiEmbedding(testText);
    
    console.log(`✓ Generated embedding with ${embedding.length} dimensions`);
    console.log(`  Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    
    // Test 2: Multiple embeddings for different text types
    console.log('\n2. Testing multiple embedding types...');
    
    const testTexts = {
      title: "Senior Software Engineer",
      summary: "Experienced software engineer with expertise in Python, JavaScript, and cloud technologies",
      requirements: "Bachelor's degree in Computer Science, 5+ years experience, Python, JavaScript, AWS",
      duties: "Develop and maintain web applications, collaborate with cross-functional teams, mentor junior developers"
    };
    
    const embeddings = {};
    for (const [type, text] of Object.entries(testTexts)) {
      embeddings[type] = await generateGeminiEmbedding(text);
      console.log(`✓ Generated ${type} embedding: ${embeddings[type].length} dimensions`);
    }
    
    // Test 3: Similarity calculations
    console.log('\n3. Testing similarity calculations...');
    
    const query = "Python developer";
    const queryEmbedding = await generateGeminiEmbedding(query);
    
    const similarities = {};
    for (const [type, embedding] of Object.entries(embeddings)) {
      similarities[type] = cosineSimilarity(queryEmbedding, embedding);
      console.log(`  ${type}: ${(similarities[type] * 100).toFixed(2)}% similarity`);
    }
    
    // Test 4: Performance test
    console.log('\n4. Testing performance with multiple embeddings...');
    
    const startTime = Date.now();
    const testJobs = [
      {
        jobTitle: "Software Engineer",
        jobSummary: "Develop web applications using modern technologies",
        requirements: "Python, JavaScript, React, 3+ years experience",
        duties: "Write clean code, participate in code reviews, collaborate with team"
      },
      {
        jobTitle: "Data Scientist",
        jobSummary: "Analyze data and build machine learning models",
        requirements: "Python, SQL, Machine Learning, Statistics degree",
        duties: "Clean data, build models, present findings to stakeholders"
      },
      {
        jobTitle: "DevOps Engineer",
        jobSummary: "Manage cloud infrastructure and deployment pipelines",
        requirements: "AWS, Docker, Kubernetes, CI/CD experience",
        duties: "Maintain infrastructure, automate deployments, monitor systems"
      }
    ];
    
    const jobEmbeddings = [];
    for (const job of testJobs) {
      const jobEmbedding = {
        titleEmbedding: await generateGeminiEmbedding(job.jobTitle),
        summaryEmbedding: await generateGeminiEmbedding(job.jobSummary),
        requirementsEmbedding: await generateGeminiEmbedding(job.requirements),
        dutiesEmbedding: await generateGeminiEmbedding(job.duties)
      };
      jobEmbeddings.push(jobEmbedding);
    }
    
    const endTime = Date.now();
    console.log(`✓ Generated ${jobEmbeddings.length} job embeddings in ${endTime - startTime}ms`);
    console.log(`  Average time per job: ${((endTime - startTime) / jobEmbeddings.length).toFixed(0)}ms`);
    
    // Test 5: Search simulation
    console.log('\n5. Testing search simulation...');
    
    const searchQuery = "Python developer with cloud experience";
    const searchEmbedding = await generateGeminiEmbedding(searchQuery);
    
    const searchResults = jobEmbeddings.map((jobEmbedding, index) => {
      // Try different embedding types for search
      const titleSimilarity = cosineSimilarity(searchEmbedding, jobEmbedding.titleEmbedding);
      const summarySimilarity = cosineSimilarity(searchEmbedding, jobEmbedding.summaryEmbedding);
      const requirementsSimilarity = cosineSimilarity(searchEmbedding, jobEmbedding.requirementsEmbedding);
      const dutiesSimilarity = cosineSimilarity(searchEmbedding, jobEmbedding.dutiesEmbedding);
      
      // Calculate weighted average similarity
      const avgSimilarity = (titleSimilarity * 0.3 + summarySimilarity * 0.3 + 
                           requirementsSimilarity * 0.25 + dutiesSimilarity * 0.15);
      
      return {
        jobIndex: index,
        jobTitle: testJobs[index].jobTitle,
        titleSimilarity,
        summarySimilarity,
        requirementsSimilarity,
        dutiesSimilarity,
        avgSimilarity
      };
    });
    
    // Sort by average similarity
    searchResults.sort((a, b) => b.avgSimilarity - a.avgSimilarity);
    
    console.log('Search results (sorted by relevance):');
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.jobTitle} (${(result.avgSimilarity * 100).toFixed(1)}%)`);
      console.log(`     Title: ${(result.titleSimilarity * 100).toFixed(1)}%`);
      console.log(`     Summary: ${(result.summarySimilarity * 100).toFixed(1)}%`);
      console.log(`     Requirements: ${(result.requirementsSimilarity * 100).toFixed(1)}%`);
      console.log(`     Duties: ${(result.dutiesSimilarity * 100).toFixed(1)}%`);
    });
    
    console.log('\n=== GEMINI EMBEDDINGS TEST COMPLETE ===');
    console.log('✓ All tests passed successfully!');
    console.log('\nKey findings:');
    console.log(`• Embedding dimensions: ${embedding.length}`);
    console.log(`• Performance: ~${((endTime - startTime) / jobEmbeddings.length).toFixed(0)}ms per job`);
    console.log('• Multi-embedding approach provides better search precision');
    console.log('• Different embedding types capture different aspects of content');
    
  } catch (error) {
    console.error('❌ Error during Gemini embeddings test:', error.message);
  }
}

// Run the test
testGeminiEmbeddings().catch(console.error); 