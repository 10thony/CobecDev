const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// MongoDB credentials from environment variables
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// Import the cobecadmins data from the JSON file
const cobecadminsData = require('../workdemos.cobecadmins.json');

async function loadCobecAdmins() {
  let client;
  
  try {
    console.log('🔧 Loading Cobec Admins from JSON to MongoDB...\n');
    
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
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
    
    console.log(`📄 Processing ${cobecadminsData.length} admin entries from JSON...`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const entry of cobecadminsData) {
      try {
        // Extract the clerkUserId from the nested _id structure
        const clerkUserId = entry._id?.clerkuserid || entry._id?.clerkUserId;
        
        if (!clerkUserId) {
          console.log('⚠️ Skipping entry with no clerkUserId:', entry);
          skipCount++;
          continue;
        }
        
        // Create the properly formatted admin entry
        const adminEntry = {
          clerkUserId: clerkUserId, // Use camelCase as expected by schema
          name: `Admin User ${clerkUserId.slice(-4)}`, // Generate a name from the ID
          email: `${clerkUserId}@example.com`, // Generate an email
          role: 'admin',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        // Check if admin already exists
        const existingAdmin = await cobecadminsCollection.findOne({ 
          clerkUserId: adminEntry.clerkUserId 
        });
        
        if (existingAdmin) {
          console.log(`⚠️ Admin already exists: ${adminEntry.clerkUserId}`);
          skipCount++;
        } else {
          const result = await cobecadminsCollection.insertOne(adminEntry);
          console.log(`✅ Added cobec admin: ${adminEntry.clerkUserId} (${result.insertedId})`);
          successCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing entry:`, entry, error.message);
        errorCount++;
      }
    }
    
    // List all admins
    const allAdmins = await cobecadminsCollection.find({}).toArray();
    console.log(`\n📊 Final Results:`);
    console.log(`✅ Successfully added: ${successCount}`);
    console.log(`⚠️ Skipped (already exists): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total cobec admins in database: ${allAdmins.length}`);
    
    console.log('\n📋 All cobec admins:');
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
console.log('📋 COBEC ADMINS LOADER:');
console.log('=======================');
console.log('This script will load cobecadmins from the JSON file into MongoDB');
console.log('It will convert the field names to match the Convex schema');
console.log('Make sure your .env.local file has the correct MongoDB credentials\n');

loadCobecAdmins(); 