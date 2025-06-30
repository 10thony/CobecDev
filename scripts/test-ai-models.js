#!/usr/bin/env node

/**
 * AI Model Test Runner
 * 
 * This script provides an easy way to run tests for all AI models.
 * 
 * USAGE:
 * 1. First, edit the API keys in convex/aiModels.test.ts
 * 2. Run this script: node scripts/test-ai-models.js
 * 
 * The script will:
 * - Run individual tests for each model
 * - Run a batch test of all models
 * - Provide a summary of results
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🤖 AI Model Test Runner');
console.log('='.repeat(50));

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
try {
  require(packageJsonPath);
} catch (error) {
  console.error('❌ Error: Please run this script from the project root directory');
  process.exit(1);
}

console.log('📋 Instructions:');
console.log('1. Edit the API keys in convex/aiModels.test.ts');
console.log('2. Make sure your Convex development environment is running');
console.log('3. This script will test all AI models with your configured keys');
console.log('');

// Check if test file exists
const testFilePath = path.join(process.cwd(), 'convex', 'aiModels.test.ts');
try {
  require('fs').accessSync(testFilePath);
} catch (error) {
  console.error('❌ Error: convex/aiModels.test.ts not found');
  process.exit(1);
}

console.log('✅ Test file found');
console.log('');

// Run the tests
console.log('🚀 Running AI model tests...');
console.log('');

try {
  // Run the tests using npm test with the specific test file
  const command = 'npm test convex/aiModels.test.ts';
  console.log(`Executing: ${command}`);
  console.log('');
  
  execSync(command, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('');
  console.log('✅ All tests completed!');
  
} catch (error) {
  console.log('');
  console.log('❌ Some tests failed. Check the output above for details.');
  console.log('');
  console.log('💡 Tips:');
  console.log('- Make sure your API keys are correctly set in convex/aiModels.test.ts');
  console.log('- Check that your Convex development environment is running');
  console.log('- Verify your API keys have sufficient quota/credits');
  console.log('- Some models may require specific access permissions');
  
  process.exit(1);
}

console.log('');
console.log('📊 Test Summary:');
console.log('- Individual model tests: Check output above');
console.log('- Batch test: Tests all models in sequence');
console.log('- Utility tests: Validates configuration');
console.log('');
console.log('🎉 Done!'); 