const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Local MongoDB configuration
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

// Build local connection string
let uri;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  uri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

async function testLocalMongoDB() {
  let client;
  
  try {
    console.log('🔍 Testing Local MongoDB Connection...\n');
    console.log('📋 Connection Details:');
    console.log(`  • Host: ${MONGODB_HOST}`);
    console.log(`  • Port: ${MONGODB_PORT}`);
    console.log(`  • Database: ${MONGODB_DATABASE}`);
    if (MONGODB_USERNAME) {
      console.log(`  • Username: ${MONGODB_USERNAME}`);
      console.log(`  • Password: ${MONGODB_PASSWORD ? '***' + MONGODB_PASSWORD.slice(-4) : 'NOT SET'}`);
    } else {
      console.log(`  • Authentication: None (local development)`);
    }
    console.log(`  • URI: ${uri.replace(MONGODB_PASSWORD || '', '***')}\n`);
    
    // Create MongoDB client with local configuration (no SSL/TLS needed)
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // No SSL/TLS for local MongoDB
      // No serverApi version needed for local MongoDB
    });
    
    console.log('🔌 Attempting to connect...');
    await client.connect();
    console.log('✅ Connected to Local MongoDB successfully!');
    
    const db = client.db(MONGODB_DATABASE);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Database "${MONGODB_DATABASE}" contains ${collections.length} collections:`);
    
    if (collections.length > 0) {
      collections.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.name}`);
      });
    } else {
      console.log('  No collections found (database is empty)');
    }
    
    // Test specific collections if they exist
    const testCollections = ['jobpostings', 'resumes', 'employees', 'kfcpoints', 'cobecadmins'];
    
    console.log('\n🔍 Testing Collection Access:');
    for (const collectionName of testCollections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`  ✅ ${collectionName}: ${count} documents`);
        
        // Show sample data for non-empty collections
        if (count > 0) {
          const sample = await collection.findOne();
          if (sample) {
            const keys = Object.keys(sample).slice(0, 5); // Show first 5 keys
            console.log(`     Sample fields: ${keys.join(', ')}${keys.length < Object.keys(sample).length ? '...' : ''}`);
          }
        }
      } catch (error) {
        console.log(`  ❌ ${collectionName}: Error - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Local MongoDB connection test completed successfully!');
    console.log('✅ You can now use local MongoDB instead of Atlas');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Make sure MongoDB is running locally');
    console.log('2. Check if MongoDB is listening on the correct port');
    console.log('3. Verify your connection string in .env.local');
    console.log('4. Try running: mongod --version (to check if MongoDB is installed)');
    console.log('5. Check MongoDB logs for any errors');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB might not be running. Start it with:');
      console.log('   • Windows: Start MongoDB service or run mongod');
      console.log('   • macOS/Linux: brew services start mongodb-community or sudo systemctl start mongod');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Connection closed');
    }
  }
}

testLocalMongoDB().catch(console.error);
