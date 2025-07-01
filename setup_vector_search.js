const { preprocessCollections } = require('./text_preprocessor');
const { generateAllEmbeddings } = require('./tests/embedding_generator');
const { testVectorSearch } = require('./vector_search');
const { showMainMenu } = require('./ai_agent');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupVectorSearch() {
  console.log('=== VECTOR SEARCH SETUP WIZARD ===\n');
  
  console.log('This wizard will help you set up vector search for your job postings and resumes.');
  console.log('The process includes:');
  console.log('1. Text preprocessing and cleaning');
  console.log('2. Embedding generation using OpenAI');
  console.log('3. Vector search functionality testing');
  console.log('4. AI agent interface setup\n');
  
  // Check for OpenAI API key
  console.log('Step 1: OpenAI API Key Check');
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found in environment variables');
    console.log('Please create a .env file with your OpenAI API key:');
    console.log('OPENAI_API_KEY=your_openai_api_key_here');
    console.log('\nYou can get an API key from: https://platform.openai.com/api-keys\n');
    
    const apiKey = await askQuestion('Enter your OpenAI API key (or press Enter to skip): ');
    if (apiKey.trim()) {
      process.env.OPENAI_API_KEY = apiKey.trim();
      console.log('✓ API key set for this session');
    } else {
      console.log('⚠️  Skipping embedding generation. You can run this later with a valid API key.');
    }
  } else {
    console.log('✓ OPENAI_API_KEY found');
  }
  
  // Step 2: Text Preprocessing
  console.log('\nStep 2: Text Preprocessing');
  const preprocessChoice = await askQuestion('Run text preprocessing? (y/n): ');
  
  if (preprocessChoice.toLowerCase() === 'y' || preprocessChoice.toLowerCase() === 'yes') {
    console.log('\nRunning text preprocessing...');
    try {
      await preprocessCollections();
      console.log('✓ Text preprocessing completed');
    } catch (error) {
      console.error('❌ Error during text preprocessing:', error.message);
    }
  } else {
    console.log('⚠️  Skipping text preprocessing');
  }
  
  // Step 3: Embedding Generation
  if (process.env.OPENAI_API_KEY) {
    console.log('\nStep 3: Embedding Generation');
    const embedChoice = await askQuestion('Generate embeddings? (y/n): ');
    
    if (embedChoice.toLowerCase() === 'y' || embedChoice.toLowerCase() === 'yes') {
      console.log('\nGenerating embeddings...');
      console.log('This may take several minutes depending on the number of documents.');
      console.log('Cost: Approximately $0.0001 per 1K tokens\n');
      
      try {
        await generateAllEmbeddings();
        console.log('✓ Embedding generation completed');
      } catch (error) {
        console.error('❌ Error during embedding generation:', error.message);
      }
    } else {
      console.log('⚠️  Skipping embedding generation');
    }
  } else {
    console.log('\nStep 3: Embedding Generation');
    console.log('⚠️  Skipped - No OpenAI API key available');
  }
  
  // Step 4: Test Vector Search
  console.log('\nStep 4: Vector Search Testing');
  const testChoice = await askQuestion('Test vector search functionality? (y/n): ');
  
  if (testChoice.toLowerCase() === 'y' || testChoice.toLowerCase() === 'yes') {
    console.log('\nTesting vector search...');
    try {
      await testVectorSearch();
      console.log('✓ Vector search test completed');
    } catch (error) {
      console.error('❌ Error during vector search test:', error.message);
    }
  } else {
    console.log('⚠️  Skipping vector search test');
  }
  
  // Step 5: AI Agent Interface
  console.log('\nStep 5: AI Agent Interface');
  const agentChoice = await askQuestion('Launch AI agent interface? (y/n): ');
  
  if (agentChoice.toLowerCase() === 'y' || agentChoice.toLowerCase() === 'yes') {
    console.log('\nLaunching AI agent interface...\n');
    try {
      await showMainMenu();
    } catch (error) {
      console.error('❌ Error launching AI agent:', error.message);
    }
  } else {
    console.log('⚠️  Skipping AI agent interface');
  }
  
  // Summary
  console.log('\n=== SETUP SUMMARY ===');
  console.log('Vector search setup process completed!');
  console.log('\nNext steps:');
  console.log('1. Set up MongoDB Atlas Vector Search indexes (if using Atlas)');
  console.log('2. Run individual scripts as needed:');
  console.log('   • node text_preprocessor.js - Preprocess text');
  console.log('   • node embedding_generator.js - Generate embeddings');
  console.log('   • node vector_search.js - Test search functionality');
  console.log('   • node ai_agent.js - Launch AI agent interface');
  console.log('\n3. Integrate with your application');
  console.log('4. Customize search algorithms and scoring');
  
  rl.close();
}

// MongoDB Atlas Vector Search Setup Guide
function showAtlasSetupGuide() {
  console.log('\n=== MONGODB ATLAS VECTOR SEARCH SETUP ===');
  console.log('\nTo enable MongoDB Atlas Vector Search:');
  console.log('\n1. Go to MongoDB Atlas dashboard');
  console.log('2. Navigate to your cluster');
  console.log('3. Click on "Search" tab');
  console.log('4. Click "Create Search Index"');
  console.log('5. Choose "JSON Editor"');
  console.log('6. Use the following configuration:');
  
  console.log('\nFor jobpostings collection:');
  console.log(`
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "jobTitle": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "searchableText": {
        "type": "string"
      }
    }
  }
}
  `);
  
  console.log('\nFor resumes collection:');
  console.log(`
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "processedMetadata.name": {
        "type": "string"
      },
      "searchableText": {
        "type": "string"
      }
    }
  }
}
  `);
  
  console.log('\n7. Click "Create"');
  console.log('8. Wait for index to build (may take several minutes)');
  console.log('\nNote: Vector Search is only available on M10+ clusters');
}

// Export functions
module.exports = {
  setupVectorSearch,
  showAtlasSetupGuide
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupVectorSearch().catch(console.error);
} 