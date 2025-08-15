const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env.local');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupLocalMongoDB() {
  console.log('🔧 Local MongoDB Setup for AJAI\n');
  console.log('This script will help you configure local MongoDB connection.\n');

  // Check if .env.local file exists
  if (fs.existsSync(envPath)) {
    const answer = await question('A .env.local file already exists. Do you want to update it for local MongoDB? (y/n): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('📋 Local MongoDB Setup Instructions:\n');
  console.log('1. Make sure MongoDB is running locally on your machine');
  console.log('2. Default port is usually 27017');
  console.log('3. You can create a local user or use default authentication');
  console.log('4. Database name will be "workdemos" (as used in your current setup)\n');

  // Get local MongoDB configuration
  const host = await question('Enter MongoDB host (default: localhost): ') || 'localhost';
  const port = await question('Enter MongoDB port (default: 27017): ') || '27017';
  const database = await question('Enter database name (default: workdemos): ') || 'workdemos';
  const username = await question('Enter MongoDB username (or press Enter if no authentication): ');
  const password = await question('Enter MongoDB password (or press Enter if no authentication): ');
  
  // Get other required environment variables
  const convexUrl = await question('Enter your Convex URL (from convex dashboard): ');
  const clerkKey = await question('Enter your Clerk Publishable Key (optional, press Enter to skip): ');
  const openaiKey = await question('Enter your OpenAI API Key (optional, press Enter to skip): ');

  // Create .env.local content
  let envContent = '';
  
  // MongoDB local configuration
  envContent += `MONGODB_HOST=${host}\n`;
  envContent += `MONGODB_PORT=${port}\n`;
  envContent += `MONGODB_DATABASE=${database}\n`;
  
  if (username && password) {
    envContent += `MONGODB_USERNAME=${username}\n`;
    envContent += `MONGODB_PASSWORD=${password}\n`;
  }
  
  // Other environment variables
  if (convexUrl) {
    envContent += `VITE_CONVEX_URL=${convexUrl}\n`;
  }
  
  if (clerkKey) {
    envContent += `VITE_CLERK_PUBLISHABLE_KEY=${clerkKey}\n`;
  }
  
  if (openaiKey) {
    envContent += `OPENAI_API_KEY=${openaiKey}\n`;
  }

  // Write to .env.local
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env.local file updated successfully!');
    console.log('\n📋 New MongoDB Configuration:');
    console.log(`  • Host: ${host}`);
    console.log(`  • Port: ${port}`);
    console.log(`  • Database: ${database}`);
    if (username) {
      console.log(`  • Username: ${username}`);
      console.log(`  • Password: ${'*'.repeat(password.length)}`);
    } else {
      console.log(`  • Authentication: None (local development)`);
    }
    
    console.log('\n🔗 Local MongoDB Connection String:');
    if (username && password) {
      console.log(`mongodb://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`);
    } else {
      console.log(`mongodb://${host}:${port}/${database}`);
    }
    
    console.log('\n⚠️  Next Steps:');
    console.log('1. Make sure MongoDB is running locally');
    console.log('2. Run: npm run test-local-mongodb (to test connection)');
    console.log('3. Update your application code to use local connection strings');
    
  } catch (error) {
    console.error('❌ Error writing .env.local file:', error.message);
  }

  rl.close();
}

setupLocalMongoDB().catch(console.error);
