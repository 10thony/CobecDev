#!/usr/bin/env node

/**
 * Test script for the Embedding Regeneration Agent
 * This script tests individual components without running the full regeneration process
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  EmbeddingRegenerationAgent, 
  EnvironmentValidator, 
  Logger 
} from './embedding-regeneration-agent.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local or .env
function loadEnvironmentVariables() {
  const envPaths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
  ];
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            process.env[key] = value;
          }
        }
      }
      
      console.log(`Loaded environment variables from: ${envPath}`);
      break;
    }
  }
}

// Load environment variables before any other operations
loadEnvironmentVariables();

// Test configuration
const TEST_CONFIG = {
  LOG_LEVEL: 'DEBUG',
  TEST_MODE: true
};

// Test queries for semantic search validation
const TEST_QUERIES = [
  {
    text: "who can build apps for the iphone",
    expectedSkills: ["iOS", "Swift", "iPhone", "mobile development"]
  },
  {
    text: "experienced React developer",
    expectedSkills: ["React", "JavaScript", "frontend", "web development"]
  }
];

async function testEnvironmentValidation() {
  console.log('\n🔍 Testing Environment Validation...');
  
  try {
    const isValid = EnvironmentValidator.validate();
    console.log('✅ Environment validation passed');
    return true;
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    return false;
  }
}

async function testAgentInitialization() {
  console.log('\n🚀 Testing Agent Initialization...');
  
  try {
    const agent = new EmbeddingRegenerationAgent();
    await agent.initialize();
    console.log('✅ Agent initialization passed');
    return agent;
  } catch (error) {
    console.error('❌ Agent initialization failed:', error.message);
    return null;
  }
}

async function testPreRegenerationAssessment(agent) {
  console.log('\n📊 Testing Pre-Regeneration Assessment...');
  
  try {
    const assessment = await agent.runPreRegenerationAssessment();
    console.log('✅ Assessment completed successfully');
    console.log('📈 Assessment Results:');
    console.log(`   • Resumes: ${assessment.resumes.total} total, ${assessment.resumes.needsUpdate} need updates`);
    console.log(`   • Job Postings: ${assessment.jobpostings.total} total, ${assessment.jobpostings.needsUpdate} need updates`);
    console.log(`   • Total: ${assessment.total.total} documents, ${assessment.total.needsUpdate} need updates`);
    return assessment;
  } catch (error) {
    console.error('❌ Assessment failed:', error.message);
    return null;
  }
}

async function testSkillTaxonomyBuilding(agent) {
  console.log('\n🏗️ Testing Skill Taxonomy Building...');
  
  try {
    const skillTaxonomy = await agent.buildSkillTaxonomy();
    console.log('✅ Skill taxonomy built successfully');
    console.log('📚 Taxonomy Results:');
    console.log(`   • Total Skills: ${skillTaxonomy.totalSkills || 'N/A'}`);
    console.log(`   • Categories: ${Object.keys(skillTaxonomy.categories || {}).length}`);
    console.log(`   • Cross References: ${skillTaxonomy.crossReferences || 'N/A'}`);
    return skillTaxonomy;
  } catch (error) {
    console.error('❌ Skill taxonomy building failed:', error.message);
    return null;
  }
}

async function testValidationEngine(agent) {
  console.log('\n🔍 Testing Validation Engine...');
  
  try {
    // Test embedding validation
    const resumesValidation = await agent.validationEngine.validateEmbeddings('resumes');
    const jobpostingsValidation = await agent.validationEngine.validateEmbeddings('jobpostings');
    
    console.log('✅ Validation completed successfully');
    console.log('📊 Validation Results:');
    console.log(`   • Resumes: ${resumesValidation.valid}/${resumesValidation.total} valid (${resumesValidation.averageConfidence.toFixed(2)} avg confidence)`);
    console.log(`   • Job Postings: ${jobpostingsValidation.valid}/${jobpostingsValidation.total} valid (${jobpostingsValidation.averageConfidence.toFixed(2)} avg confidence)`);
    
    return { resumes: resumesValidation, jobpostings: jobpostingsValidation };
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return null;
  }
}

async function testSemanticSearch(agent) {
  console.log('\n🔍 Testing Semantic Search...');
  
  try {
    const searchTestResults = await agent.testSemanticSearch();
    console.log('✅ Semantic search testing completed');
    console.log('🔍 Search Test Results:');
    console.log(`   • Total Queries: ${searchTestResults.overall.totalQueries}`);
    console.log(`   • Successful Queries: ${searchTestResults.overall.successfulQueries}`);
    
    // Test specific queries
    for (const query of TEST_QUERIES) {
      console.log(`\n   Query: "${query.text}"`);
      console.log(`   Expected Skills: ${query.expectedSkills.join(', ')}`);
      
      try {
        const resumesResults = await agent.validationEngine.testSemanticSearch('resumes', [query]);
        const jobpostingsResults = await agent.validationEngine.testSemanticSearch('jobpostings', [query]);
        
        if (resumesResults[0] && !resumesResults[0].error) {
          console.log(`   ✅ Resumes: ${resumesResults[0].results.length} results, top similarity: ${resumesResults[0].topResultSimilarity.toFixed(3)}`);
        } else {
          console.log(`   ❌ Resumes: ${resumesResults[0]?.error || 'No results'}`);
        }
        
        if (jobpostingsResults[0] && !jobpostingsResults[0].error) {
          console.log(`   ✅ Job Postings: ${jobpostingsResults[0].results.length} results, top similarity: ${jobpostingsResults[0].topResultSimilarity.toFixed(3)}`);
        } else {
          console.log(`   ❌ Job Postings: ${jobpostingsResults[0]?.error || 'No results'}`);
        }
      } catch (error) {
        console.log(`   ❌ Search failed: ${error.message}`);
      }
    }
    
    return searchTestResults;
  } catch (error) {
    console.error('❌ Semantic search testing failed:', error.message);
    return null;
  }
}

async function testDocumentAnalyzer(agent) {
  console.log('\n📄 Testing Document Analyzer...');
  
  try {
    // Test collection analysis
    const resumesAnalysis = await agent.documentAnalyzer.analyzeCollection('resumes');
    const jobpostingsAnalysis = await agent.documentAnalyzer.analyzeCollection('jobpostings');
    
    console.log('✅ Document analysis completed');
    console.log('📊 Analysis Results:');
    console.log(`   • Resumes: ${resumesAnalysis.total} total, ${resumesAnalysis.needsUpdate} need updates`);
    console.log(`   • Job Postings: ${jobpostingsAnalysis.total} total, ${jobpostingsAnalysis.needsUpdate} need updates`);
    
    // Test getting documents for update
    const resumesForUpdate = await agent.documentAnalyzer.getDocumentsForUpdate('resumes', 5);
    const jobpostingsForUpdate = await agent.documentAnalyzer.getDocumentsForUpdate('jobpostings', 5);
    
    console.log(`   • Resumes for update: ${resumesForUpdate.length} documents`);
    console.log(`   • Job Postings for update: ${jobpostingsForUpdate.length} documents`);
    
    return { resumes: resumesAnalysis, jobpostings: jobpostingsAnalysis };
  } catch (error) {
    console.error('❌ Document analysis failed:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🧪 Starting Embedding Regeneration Agent Tests');
  console.log('================================================\n');
  
  const results = {
    environmentValidation: false,
    agentInitialization: false,
    preRegenerationAssessment: false,
    skillTaxonomyBuilding: false,
    validationEngine: false,
    semanticSearch: false,
    documentAnalyzer: false
  };
  
  try {
    // Test 1: Environment Validation
    results.environmentValidation = await testEnvironmentValidation();
    if (!results.environmentValidation) {
      console.log('\n⚠️  Environment validation failed. Please check your environment variables.');
      return results;
    }
    
    // Test 2: Agent Initialization
    const agent = await testAgentInitialization();
    results.agentInitialization = agent !== null;
    if (!results.agentInitialization) {
      console.log('\n⚠️  Agent initialization failed. Please check your Convex connection.');
      return results;
    }
    
    // Test 3: Pre-Regeneration Assessment
    const assessment = await testPreRegenerationAssessment(agent);
    results.preRegenerationAssessment = assessment !== null;
    
    // Test 4: Skill Taxonomy Building
    const skillTaxonomy = await testSkillTaxonomyBuilding(agent);
    results.skillTaxonomyBuilding = skillTaxonomy !== null;
    
    // Test 5: Validation Engine
    const validationResults = await testValidationEngine(agent);
    results.validationEngine = validationResults !== null;
    
    // Test 6: Semantic Search
    const searchResults = await testSemanticSearch(agent);
    results.semanticSearch = searchResults !== null;
    
    // Test 7: Document Analyzer
    const analysisResults = await testDocumentAnalyzer(agent);
    results.documentAnalyzer = analysisResults !== null;
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  }
  
  // Print test summary
  console.log('\n📋 Test Summary');
  console.log('================');
  console.log(`Environment Validation: ${results.environmentValidation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Agent Initialization: ${results.agentInitialization ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Pre-Regeneration Assessment: ${results.preRegenerationAssessment ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Skill Taxonomy Building: ${results.skillTaxonomyBuilding ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Validation Engine: ${results.validationEngine ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Semantic Search: ${results.semanticSearch ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Document Analyzer: ${results.documentAnalyzer ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The agent is ready for use.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above before using the agent.');
  }
  
  return results;
}

// CLI interface
async function main() {
  try {
    const results = await runAllTests();
    
    // Exit with appropriate code
    const allPassed = Object.values(results).every(Boolean);
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  runAllTests,
  testEnvironmentValidation,
  testAgentInitialization,
  testPreRegenerationAssessment,
  testSkillTaxonomyBuilding,
  testValidationEngine,
  testSemanticSearch,
  testDocumentAnalyzer
};
