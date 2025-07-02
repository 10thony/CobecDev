import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// MongoDB credentials from environment variables
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

async function setupNominations() {
  let client;
  
  try {
    console.log('🔧 Setting up Nominations Collection in MongoDB...\n');
    
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
    
    // Check if nominations collection exists, if not create it
    const collections = await db.listCollections({ name: 'nominations' }).toArray();
    if (collections.length === 0) {
      console.log('📝 Creating nominations collection...');
      await db.createCollection('nominations');
      console.log('✅ nominations collection created');
    } else {
      console.log('✅ nominations collection already exists');
    }
    
    // Create indexes for better performance
    const nominationsCollection = db.collection('nominations');
    
    console.log('📊 Creating indexes...');
    
    // Index on status for filtering pending nominations
    await nominationsCollection.createIndex({ status: 1 });
    console.log('✅ Created index on status');
    
    // Index on createdAt for sorting
    await nominationsCollection.createIndex({ createdAt: -1 });
    console.log('✅ Created index on createdAt');
    
    // Index on nominatedEmployee for quick lookups
    await nominationsCollection.createIndex({ nominatedEmployee: 1 });
    console.log('✅ Created index on nominatedEmployee');
    
    // Compound index for status and createdAt
    await nominationsCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✅ Created compound index on status and createdAt');
    
    // Get collection stats
    const stats = await nominationsCollection.stats();
    console.log(`📊 Collection Statistics:`);
    console.log(`  • Total documents: ${stats.count}`);
    console.log(`  • Storage size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  • Indexes: ${stats.nindexes}`);
    
    // Sample nomination structure
    const sampleNomination = {
      nominatedBy: "John Doe",
      nominatedEmployee: "Jane Smith",
      nominationType: "Team",
      description: "Jane demonstrated excellent teamwork during the project launch, helping coordinate efforts across multiple departments.",
      pointsAwarded: 10,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('\n📋 Sample nomination structure:');
    console.log(JSON.stringify(sampleNomination, null, 2));
    
    console.log('\n🎉 Nominations collection setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. The nominations collection is ready to accept new nominations');
    console.log('2. Nominations will be created with "pending" status by default');
    console.log('3. Admins can approve/decline nominations through the UI');
    console.log('4. Approved nominations will automatically update KFC points');
    
  } catch (error) {
    console.error('\n❌ Error setting up nominations collection:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Run the setup
setupNominations().catch(console.error); 