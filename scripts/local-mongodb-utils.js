const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Local MongoDB configuration
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

// Build local connection string
function getLocalMongoUri() {
  if (MONGODB_USERNAME && MONGODB_PASSWORD) {
    return `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
  } else {
    return `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
  }
}

// Create MongoDB client with local configuration
function createLocalMongoClient() {
  const uri = getLocalMongoUri();
  
  return new MongoClient(uri, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    maxPoolSize: 1,
    minPoolSize: 0,
    maxIdleTimeMS: 30000,
    // No SSL/TLS for local MongoDB
    // No serverApi version needed for local MongoDB
  });
}

// Test connection and return client
async function connectToLocalMongo() {
  const client = createLocalMongoClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to Local MongoDB');
    return client;
  } catch (error) {
    console.error('❌ Failed to connect to Local MongoDB:', error.message);
    throw error;
  }
}

// Get database instance
async function getLocalDatabase() {
  const client = await connectToLocalMongo();
  return client.db(MONGODB_DATABASE);
}

// Close connection
async function closeConnection(client) {
  if (client) {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

// Utility functions for common operations
const localMongoUtils = {
  // Connection management
  getLocalMongoUri,
  createLocalMongoClient,
  connectToLocalMongo,
  getLocalDatabase,
  closeConnection,
  
  // Configuration info
  getConfig: () => ({
    host: MONGODB_HOST,
    port: MONGODB_PORT,
    database: MONGODB_DATABASE,
    username: MONGODB_USERNAME,
    hasAuth: !!(MONGODB_USERNAME && MONGODB_PASSWORD),
    uri: getLocalMongoUri().replace(MONGODB_PASSWORD || '', '***')
  }),
  
  // Test connection
  testConnection: async () => {
    let client;
    try {
      client = await connectToLocalMongo();
      const db = client.db(MONGODB_DATABASE);
      const collections = await db.listCollections().toArray();
      
      console.log('✅ Local MongoDB connection test successful!');
      console.log(`📊 Database "${MONGODB_DATABASE}" contains ${collections.length} collections`);
      
      return { success: true, collections: collections.length };
    } catch (error) {
      console.error('❌ Local MongoDB connection test failed:', error.message);
      return { success: false, error: error.message };
    } finally {
      await closeConnection(client);
    }
  },
  
  // Get collection info
  getCollectionInfo: async (collectionName) => {
    let client;
    try {
      client = await connectToLocalMongo();
      const db = client.db(MONGODB_DATABASE);
      const collection = db.collection(collectionName);
      
      const count = await collection.countDocuments();
      const sample = count > 0 ? await collection.findOne() : null;
      
      return {
        name: collectionName,
        documentCount: count,
        sampleFields: sample ? Object.keys(sample).slice(0, 10) : [],
        hasData: count > 0
      };
    } catch (error) {
      console.error(`❌ Error getting info for collection ${collectionName}:`, error.message);
      return { name: collectionName, error: error.message };
    } finally {
      await closeConnection(client);
    }
  },
  
  // List all collections
  listCollections: async () => {
    let client;
    try {
      client = await connectToLocalMongo();
      const db = client.db(MONGODB_DATABASE);
      const collections = await db.listCollections().toArray();
      
      return collections.map(col => ({
        name: col.name,
        type: col.type || 'collection'
      }));
    } catch (error) {
      console.error('❌ Error listing collections:', error.message);
      return [];
    } finally {
      await closeConnection(client);
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = localMongoUtils;
}

// If run directly, show configuration and test connection
if (require.main === module) {
  console.log('🔧 Local MongoDB Utilities\n');
  
  const config = localMongoUtils.getConfig();
  console.log('📋 Current Configuration:');
  console.log(`  • Host: ${config.host}`);
  console.log(`  • Port: ${config.port}`);
  console.log(`  • Database: ${config.database}`);
  console.log(`  • Authentication: ${config.hasAuth ? 'Yes' : 'No'}`);
  if (config.hasAuth) {
    console.log(`  • Username: ${config.username}`);
  }
  console.log(`  • URI: ${config.uri}\n`);
  
  // Test connection
  console.log('🧪 Testing connection...');
  localMongoUtils.testConnection()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Local MongoDB is ready to use!');
      } else {
        console.log('\n❌ Local MongoDB connection failed');
      }
    })
    .catch(console.error);
}

module.exports = localMongoUtils;
