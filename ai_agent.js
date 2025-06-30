const readline = require('readline');
const { aiAgentSearch, displaySearchResults } = require('./vector_search');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Simple form-based search interface
async function formBasedSearch() {
  console.log('\n=== AI JOB MATCHING AGENT ===');
  console.log('Form-Based Search Interface\n');
  
  try {
    // Get search query
    const query = await askQuestion('Enter your search query (e.g., "software engineer", "project manager", "aviation safety"): ');
    
    // Get search type
    const searchType = await askQuestion('Search type (jobs/resumes/both): ').then(answer => answer.toLowerCase());
    
    // Get result limit
    const limit = await askQuestion('Number of results (1-20): ').then(answer => parseInt(answer) || 5);
    
    console.log('\nSearching... Please wait...\n');
    
    // Perform search
    const results = await aiAgentSearch(query, searchType, limit);
    
    // Display results
    if (results.jobs && results.jobs.length > 0) {
      displaySearchResults(results.jobs, 'jobs');
    }
    
    if (results.resumes && results.resumes.length > 0) {
      displaySearchResults(results.resumes, 'resumes');
    }
    
    if ((!results.jobs || results.jobs.length === 0) && (!results.resumes || results.resumes.length === 0)) {
      console.log('\nNo results found. Try a different search query.');
    }
    
  } catch (error) {
    console.error('Error in form-based search:', error.message);
  }
}

// Chatbot-like interface
async function chatbotInterface() {
  console.log('\n=== AI JOB MATCHING CHATBOT ===');
  console.log('Type "quit" to exit, "help" for commands\n');
  
  console.log('🤖 Hello! I\'m your AI job matching assistant. I can help you find:');
  console.log('   • Jobs that match your skills and experience');
  console.log('   • Candidates that match job requirements');
  console.log('   • Career opportunities based on your profile');
  console.log('   • Skills and qualifications for specific roles\n');
  
  while (true) {
    try {
      const userInput = await askQuestion('You: ');
      
      if (userInput.toLowerCase() === 'quit' || userInput.toLowerCase() === 'exit') {
        console.log('🤖 Goodbye! Have a great day!');
        break;
      }
      
      if (userInput.toLowerCase() === 'help') {
        showHelp();
        continue;
      }
      
      if (userInput.toLowerCase() === 'clear') {
        console.clear();
        continue;
      }
      
      // Process the query
      console.log('🤖 Searching for matches...\n');
      
      const results = await aiAgentSearch(userInput, 'both', 3);
      
      // Display results in a conversational way
      if (results.jobs && results.jobs.length > 0) {
        console.log('🤖 Here are some relevant job opportunities:');
        results.jobs.forEach((job, index) => {
          console.log(`\n${index + 1}. ${job.jobTitle} (${(job.similarity * 100).toFixed(1)}% match)`);
          console.log(`   📍 ${job.location} | ${job.jobType}`);
          console.log(`   💼 ${job.jobSummary?.substring(0, 80)}...`);
        });
      }
      
      if (results.resumes && results.resumes.length > 0) {
        console.log('\n🤖 Here are some matching candidates:');
        results.resumes.forEach((resume, index) => {
          console.log(`\n${index + 1}. ${resume.processedMetadata?.name || 'Unknown'} (${(resume.similarity * 100).toFixed(1)}% match)`);
          console.log(`   📧 ${resume.processedMetadata?.email || 'N/A'}`);
          console.log(`   ⏰ ${resume.processedMetadata?.yearsOfExperience || 'N/A'} years experience`);
          console.log(`   📝 ${resume.professionalSummary?.substring(0, 80)}...`);
        });
      }
      
      if ((!results.jobs || results.jobs.length === 0) && (!results.resumes || results.resumes.length === 0)) {
        console.log('🤖 I couldn\'t find any exact matches for your query. Try:');
        console.log('   • Using different keywords');
        console.log('   • Being more specific about skills or roles');
        console.log('   • Searching for broader terms');
      }
      
      console.log('\n' + '─'.repeat(50) + '\n');
      
    } catch (error) {
      console.error('🤖 Sorry, I encountered an error:', error.message);
      console.log('Try rephrasing your query or type "help" for assistance.\n');
    }
  }
}

// Show help information
function showHelp() {
  console.log('\n🤖 Available Commands:');
  console.log('   • "help" - Show this help message');
  console.log('   • "quit" or "exit" - Exit the chatbot');
  console.log('   • "clear" - Clear the screen');
  console.log('\n🤖 Example Queries:');
  console.log('   • "Find software engineering jobs"');
  console.log('   • "Looking for project managers with 5+ years experience"');
  console.log('   • "Aviation safety inspector positions"');
  console.log('   • "Candidates with Python and machine learning skills"');
  console.log('   • "Senior developers in Washington DC"');
  console.log('   • "Entry level positions for recent graduates"');
  console.log('\n');
}

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main menu
async function showMainMenu() {
  console.log('\n=== AI JOB MATCHING SYSTEM ===');
  console.log('Choose an interface:');
  console.log('1. Form-Based Search (Structured)');
  console.log('2. Chatbot Interface (Conversational)');
  console.log('3. Exit');
  
  const choice = await askQuestion('\nEnter your choice (1-3): ');
  
  switch (choice) {
    case '1':
      await formBasedSearch();
      break;
    case '2':
      await chatbotInterface();
      break;
    case '3':
      console.log('Goodbye!');
      rl.close();
      return;
    default:
      console.log('Invalid choice. Please try again.');
      await showMainMenu();
      return;
  }
  
  // Ask if user wants to continue
  const continueChoice = await askQuestion('\nWould you like to try another search? (y/n): ');
  if (continueChoice.toLowerCase() === 'y' || continueChoice.toLowerCase() === 'yes') {
    await showMainMenu();
  } else {
    console.log('Thank you for using the AI Job Matching System!');
    rl.close();
  }
}

// Advanced search with filters
async function advancedSearch() {
  console.log('\n=== ADVANCED SEARCH ===');
  
  try {
    const query = await askQuestion('Search query: ');
    const location = await askQuestion('Location filter (optional): ');
    const experienceLevel = await askQuestion('Experience level (entry/mid/senior, optional): ');
    const jobType = await askQuestion('Job type (full-time/part-time/contract, optional): ');
    
    console.log('\nPerforming advanced search...\n');
    
    // Perform search
    const results = await aiAgentSearch(query, 'both', 10);
    
    // Apply filters
    let filteredJobs = results.jobs || [];
    let filteredResumes = results.resumes || [];
    
    if (location) {
      filteredJobs = filteredJobs.filter(job => 
        job.location?.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    if (experienceLevel) {
      filteredResumes = filteredResumes.filter(resume => {
        const years = resume.processedMetadata?.yearsOfExperience || 0;
        switch (experienceLevel.toLowerCase()) {
          case 'entry': return years <= 2;
          case 'mid': return years > 2 && years <= 7;
          case 'senior': return years > 7;
          default: return true;
        }
      });
    }
    
    if (jobType) {
      filteredJobs = filteredJobs.filter(job => 
        job.jobType?.toLowerCase().includes(jobType.toLowerCase())
      );
    }
    
    // Display filtered results
    if (filteredJobs.length > 0) {
      console.log(`Found ${filteredJobs.length} matching jobs:`);
      displaySearchResults(filteredJobs, 'jobs');
    }
    
    if (filteredResumes.length > 0) {
      console.log(`Found ${filteredResumes.length} matching candidates:`);
      displaySearchResults(filteredResumes, 'resumes');
    }
    
    if (filteredJobs.length === 0 && filteredResumes.length === 0) {
      console.log('No results found with the specified filters.');
    }
    
  } catch (error) {
    console.error('Error in advanced search:', error.message);
  }
}

// Export functions
module.exports = {
  formBasedSearch,
  chatbotInterface,
  advancedSearch,
  showMainMenu
};

// Run the main menu if this file is executed directly
if (require.main === module) {
  showMainMenu().catch(console.error);
} 