const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env');

async function setupEnv() {
  console.log('Setting up environment variables for AI chat...\n');

  // Check if .env file exists
  if (fs.existsSync(envPath)) {
    const answer = await question('A .env file already exists. Do you want to overwrite it? (y/n): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  // Get OpenAI API key
  const openaiKey = await question('Enter your OpenAI API key (or press Enter to skip): ');
  
  // Get Anthropic API key
  const anthropicKey = await question('Enter your Anthropic API key (or press Enter to skip): ');

  // Get Clerk Secret Key
  const clerkSecretKey = await question('Enter your Clerk Secret Key (required for admin management): ');
  
  // Get Clerk Frontend API URL
  const clerkFrontendUrl = await question('Enter your Clerk Frontend API URL (e.g., https://your-app.clerk.accounts.dev): ');

  // Create .env content
  let envContent = '';
  
  if (openaiKey) {
    envContent += `OPENAI_API_KEY=${openaiKey}\n`;
    envContent += `VITE_OPENAI_API_KEY=${openaiKey}\n`;
  }
  
  if (anthropicKey) {
    envContent += `ANTHROPIC_API_KEY=${anthropicKey}\n`;
  }

  if (clerkSecretKey) {
    envContent += `CLERK_SECRET_KEY=${clerkSecretKey}\n`;
  }

  if (clerkFrontendUrl) {
    envContent += `VITE_CLERK_FRONTEND_API_URL=${clerkFrontendUrl}\n`;
  }

  // Write to .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\nEnvironment variables have been set up!');
  console.log('- OPENAI_API_KEY: for server-side usage');
  console.log('- VITE_OPENAI_API_KEY: for client-side usage');
  console.log('Make sure to restart your development server for the changes to take effect.');
  
  rl.close();
}

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

setupEnv().catch(console.error); 