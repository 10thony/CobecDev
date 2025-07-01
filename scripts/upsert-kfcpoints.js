import fs from 'fs';
import path from 'path';
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Configure dotenv
dotenv.config({ path: '.env.local' });

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB credentials from environment variables
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function readKfcPointsData() {
  try {
    const filePath = path.join(__dirname, '..', 'kfcpoints.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading kfcpoints.json:', error.message);
    throw error;
  }
}

async function upsertKfcPoints() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
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
    const kfcPointsCollection = db.collection('kfcpoints');
    const employeesCollection = db.collection('employees');
    
    // Read KFC points data
    console.log('📖 Reading KFC points data...');
    const kfcPointsData = await readKfcPointsData();
    console.log(`Found ${kfcPointsData.length} KFC entries`);
    
    // Extract unique employee names for the employees collection
    const employeeNames = [...new Set(kfcPointsData.map(entry => entry.name))];
    
    // Upsert employees collection
    console.log('👥 Upserting employees collection...');
    for (const name of employeeNames) {
      await employeesCollection.updateOne(
        { name: name },
        { 
          $set: { 
            name: name,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    }
    console.log(`✅ Upserted ${employeeNames.length} employees`);
    
    // Upsert KFC points collection
    console.log('🏆 Upserting KFC points collection...');
    let successCount = 0;
    let failCount = 0;
    
    for (const entry of kfcPointsData) {
      try {
        // Add metadata
        const kfcEntry = {
          ...entry,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await kfcPointsCollection.updateOne(
          { name: entry.name },
          { $set: kfcEntry },
          { upsert: true }
        );
        
        successCount++;
        console.log(`✅ Upserted: ${entry.name} (Score: ${entry.score})`);
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to upsert ${entry.name}:`, error.message);
      }
    }
    
    // Get final counts
    const finalKfcCount = await kfcPointsCollection.countDocuments();
    const finalEmployeeCount = await employeesCollection.countDocuments();
    
    console.log('\n📊 Summary:');
    console.log(`KFC Points Collection:`);
    console.log(`  • Successfully upserted: ${successCount}`);
    console.log(`  • Failed: ${failCount}`);
    console.log(`  • Total documents in collection: ${finalKfcCount}`);
    console.log(`\nEmployees Collection:`);
    console.log(`  • Total employees: ${finalEmployeeCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the script
upsertKfcPoints().catch(console.error); 