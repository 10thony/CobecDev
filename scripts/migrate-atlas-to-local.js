const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Source: Atlas MongoDB (old configuration)
const ATLAS_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const ATLAS_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const ATLAS_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';
const ATLAS_DATABASE = 'workdemos';

// Destination: Local MongoDB (new configuration)
const LOCAL_HOST = process.env.MONGODB_HOST || 'localhost';
const LOCAL_PORT = process.env.MONGODB_PORT || '27017';
const LOCAL_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const LOCAL_USERNAME = process.env.MONGODB_USERNAME;
const LOCAL_PASSWORD = process.env.MONGODB_PASSWORD;

// Build connection strings
const atlasUri = `mongodb+srv://${ATLAS_USERNAME}:${encodeURIComponent(ATLAS_PASSWORD)}@${ATLAS_CLUSTER}/${ATLAS_DATABASE}?retryWrites=true&w=majority`;

let localUri;
if (LOCAL_USERNAME && LOCAL_PASSWORD) {
  localUri = `mongodb://${LOCAL_USERNAME}:${encodeURIComponent(LOCAL_PASSWORD)}@${LOCAL_HOST}:${LOCAL_PORT}/${LOCAL_DATABASE}`;
} else {
  localUri = `mongodb://${LOCAL_HOST}:${LOCAL_PORT}/${LOCAL_DATABASE}`;
}

async function migrateAtlasToLocal() {
  let atlasClient, localClient;
  
  try {
    console.log('🔄 Migrating MongoDB Atlas to Local MongoDB...\n');
    
    console.log('📋 Migration Details:');
    console.log(`  • Source: Atlas (${ATLAS_CLUSTER})`);
    console.log(`  • Destination: Local (${LOCAL_HOST}:${LOCAL_PORT})`);
    console.log(`  • Database: ${LOCAL_DATABASE}\n`);
    
    // Connect to Atlas (source)
    console.log('🔌 Connecting to Atlas MongoDB...');
    atlasClient = new MongoClient(atlasUri, {
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    await atlasClient.connect();
    console.log('✅ Connected to Atlas MongoDB');
    
    // Connect to Local MongoDB (destination)
    console.log('🔌 Connecting to Local MongoDB...');
    localClient = new MongoClient(localUri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    await localClient.connect();
    console.log('✅ Connected to Local MongoDB');
    
    const atlasDb = atlasClient.db(ATLAS_DATABASE);
    const localDb = localClient.db(LOCAL_DATABASE);
    
    // Get all collections from Atlas
    const collections = await atlasDb.listCollections().toArray();
    console.log(`\n📊 Found ${collections.length} collections in Atlas:`);
    collections.forEach((collection, index) => {
      console.log(`  ${index + 1}. ${collection.name}`);
    });
    
    // Migrate each collection
    let totalDocuments = 0;
    let totalCollections = 0;
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`\n🔄 Migrating collection: ${collectionName}`);
      
      try {
        const sourceCollection = atlasDb.collection(collectionName);
        const destCollection = localDb.collection(collectionName);
        
        // Get document count
        const docCount = await sourceCollection.countDocuments();
        console.log(`  📄 Found ${docCount} documents`);
        
        if (docCount === 0) {
          console.log(`  ⏭️  Skipping empty collection`);
          continue;
        }
        
        // Drop existing collection if it exists
        try {
          await destCollection.drop();
          console.log(`  🗑️  Dropped existing local collection`);
        } catch (error) {
          // Collection doesn't exist, which is fine
        }
        
        // Create new collection
        await localDb.createCollection(collectionName);
        console.log(`  ✅ Created local collection`);
        
        // Migrate documents in batches
        const batchSize = 1000;
        let migratedCount = 0;
        
        for (let skip = 0; skip < docCount; skip += batchSize) {
          const documents = await sourceCollection.find({}).skip(skip).limit(batchSize).toArray();
          
          if (documents.length > 0) {
            // Convert ObjectIds to strings for local MongoDB compatibility
            const processedDocs = documents.map(doc => {
              const processed = { ...doc };
              if (processed._id && typeof processed._id === 'object' && processed._id.toString) {
                processed._id = processed._id.toString();
              }
              return processed;
            });
            
            await destCollection.insertMany(processedDocs);
            migratedCount += documents.length;
            
            const progress = Math.round((migratedCount / docCount) * 100);
            console.log(`  📤 Migrated ${migratedCount}/${docCount} documents (${progress}%)`);
          }
        }
        
        console.log(`  ✅ Successfully migrated ${collectionName}`);
        totalDocuments += docCount;
        totalCollections++;
        
      } catch (error) {
        console.error(`  ❌ Error migrating ${collectionName}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`  • Collections migrated: ${totalCollections}/${collections.length}`);
    console.log(`  • Total documents migrated: ${totalDocuments}`);
    
    // Verify migration
    console.log(`\n🔍 Verifying migration...`);
    const localCollections = await localDb.listCollections().toArray();
    console.log(`  • Local database now contains ${localCollections.length} collections`);
    
    for (const collectionInfo of localCollections) {
      const collectionName = collectionInfo.name;
      const localCollection = localDb.collection(collectionName);
      const localCount = await localCollection.countDocuments();
      console.log(`  • ${collectionName}: ${localCount} documents`);
    }
    
    console.log(`\n✅ Migration verification completed!`);
    console.log(`\n⚠️  Next Steps:`);
    console.log(`1. Test your application with local MongoDB`);
    console.log(`2. Update your .env.local file to remove Atlas variables`);
    console.log(`3. Remove or comment out Atlas-related code`);
    console.log(`4. Consider backing up your local MongoDB data`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Make sure both Atlas and Local MongoDB are accessible');
    console.log('2. Check your network connection to Atlas');
    console.log('3. Verify local MongoDB is running and accessible');
    console.log('4. Check your environment variables in .env.local');
  } finally {
    if (atlasClient) {
      await atlasClient.close();
      console.log('\n🔌 Atlas connection closed');
    }
    if (localClient) {
      await localClient.close();
      console.log('🔌 Local connection closed');
    }
  }
}

migrateAtlasToLocal().catch(console.error);
