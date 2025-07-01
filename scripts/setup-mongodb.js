const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env.local');

async function setupMongoDB() {
  console.log('🔧 MongoDB Atlas Setup for AJAI\n');
  console.log('This script will help you configure MongoDB Atlas connection.\n');

  // Check if .env.local file exists
  if (fs.existsSync(envPath)) {
    const answer = await question('A .env.local file already exists. Do you want to update it? (y/n): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('📋 MongoDB Atlas Setup Instructions:\n');
  console.log('1. Go to https://cloud.mongodb.com');
  console.log('2. Create a new cluster (or use existing)');
  console.log('3. Create a database user with read/write permissions');
  console.log('4. Get your connection string from the cluster');
  console.log('5. Add your IP address to the Network Access whitelist\n');

  // Get MongoDB credentials
  const username = await question('Enter MongoDB username: ');
  const password = await question('Enter MongoDB password: ');
  const cluster = await question('Enter MongoDB cluster URL (e.g., demo.y407omc.mongodb.net): ');
  
  // Get other required environment variables
  const convexUrl = await question('Enter your Convex URL (from convex dashboard): ');
  const clerkKey = await question('Enter your Clerk Publishable Key (optional, press Enter to skip): ');
  const openaiKey = await question('Enter your OpenAI API Key (optional, press Enter to skip): ');

  // Create .env.local content
  let envContent = '';
  
  if (username && password && cluster) {
    envContent += `MONGODB_USERNAME=${username}\n`;
    envContent += `MONGODB_PASSWORD=${password}\n`;
    envContent += `MONGODB_CLUSTER=${cluster}\n`;
  }
  
  if (convexUrl) {
    envContent += `VITE_CONVEX_URL=${convexUrl}\n`;
  }
  
  if (clerkKey) {
    envContent += `VITE_CLERK_PUBLISHABLE_KEY=${clerkKey}\n`;
  }
  
  if (openaiKey) {
    envContent += `OPENAI_API_KEY=${openaiKey}\n`;
  }

  // Write to .env.local file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Environment variables have been set up!');
  console.log('\n📁 Created/Updated: .env.local');
  console.log('\n🔑 Configured variables:');
  if (username && password && cluster) {
    console.log('- MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_CLUSTER');
  }
  if (convexUrl) console.log('- VITE_CONVEX_URL');
  if (clerkKey) console.log('- VITE_CLERK_PUBLISHABLE_KEY');
  if (openaiKey) console.log('- OPENAI_API_KEY');
  
  console.log('\n🚀 Next steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Test the connection by visiting the Data Management page');
  console.log('3. If you still get errors, check your MongoDB Atlas network access settings');
  
  rl.close();
}

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

setupMongoDB().catch(console.error); 