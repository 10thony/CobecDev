const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// MongoDB credentials from environment variables
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let uri;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  uri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

async function addCobecAdmin() {
  let client;
  
  try {
    console.log('🔧 Adding Cobec Admin to MongoDB...\n');
    
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // No SSL/TLS needed for local MongoDB
      // No serverApi version needed for local MongoDB
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('workdemos');
    const cobecadminsCollection = db.collection('cobecadmins');
    
    // Check if collection exists, if not create it
    const collections = await db.listCollections({ name: 'cobecadmins' }).toArray();
    if (collections.length === 0) {
      console.log('📝 Creating cobecadmins collection...');
      await db.createCollection('cobecadmins');
      console.log('✅ cobecadmins collection created');
    }
    
    // Add a test admin user
    const testAdmin = {
      clerkUserId: 'user_test_admin_123', // Replace with actual Clerk user ID
      name: 'Test Admin User',
      email: 'testadmin@example.com',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if admin already exists
    const existingAdmin = await cobecadminsCollection.findOne({ 
      clerkUserId: testAdmin.clerkUserId 
    });
    
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists:', existingAdmin);
    } else {
      const result = await cobecadminsCollection.insertOne(testAdmin);
      console.log('✅ Added cobec admin:', result.insertedId);
      console.log('📋 Admin details:', testAdmin);
    }
    
    // List all admins
    const allAdmins = await cobecadminsCollection.find({}).toArray();
    console.log(`\n📊 Total cobec admins: ${allAdmins.length}`);
    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.clerkUserId})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Instructions for usage
console.log('📋 COBEC ADMIN SETUP INSTRUCTIONS:');
console.log('====================================');
console.log('1. Replace the clerkUserId in this script with your actual Clerk user ID');
console.log('2. Run this script to add yourself as a cobec admin');
console.log('3. You can find your Clerk user ID in the browser console or Clerk dashboard');
console.log('4. After running this script, you will have full access to KFC Management features\n');

addCobecAdmin(); 