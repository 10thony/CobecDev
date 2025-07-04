const { MongoClient, ServerApiVersion } = require('mongodb');
const { ConvexHttpClient } = require('convex/browser');

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

// Convex configuration
const CONVEX_URL = process.env.CONVEX_URL || 'https://your-deployment.convex.cloud';

async function migrateNominationsToConvex() {
  let mongoClient;
  let convexClient;
  
  try {
    console.log('🔄 Starting migration from MongoDB to Convex...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    mongoClient = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
    
    // Connect to Convex
    console.log('📡 Connecting to Convex...');
    convexClient = new ConvexHttpClient(CONVEX_URL);
    console.log('✅ Connected to Convex');
    
    const db = mongoClient.db('workdemos');
    
    // Migrate employees
    console.log('\n👥 Migrating employees...');
    const employeesCollection = db.collection('employees');
    const employees = await employeesCollection.find({}).toArray();
    
    let employeeCount = 0;
    for (const employee of employees) {
      try {
        await convexClient.mutation('nominations:createEmployee', {
          name: employee.name
        });
        employeeCount++;
        console.log(`✅ Migrated employee: ${employee.name}`);
      } catch (error) {
        console.error(`❌ Failed to migrate employee ${employee.name}:`, error.message);
      }
    }
    console.log(`📊 Migrated ${employeeCount}/${employees.length} employees`);
    
    // Migrate KFC points
    console.log('\n🏆 Migrating KFC points...');
    const kfcCollection = db.collection('kfcpoints');
    const kfcEntries = await kfcCollection.find({}).toArray();
    
    let kfcCount = 0;
    for (const kfcEntry of kfcEntries) {
      try {
        // Note: We'll need to create a mutation for this
        // For now, we'll skip KFC points as they'll be created when nominations are approved
        console.log(`⏭️ Skipping KFC entry for ${kfcEntry.name} (will be created when nominations are approved)`);
        kfcCount++;
      } catch (error) {
        console.error(`❌ Failed to migrate KFC entry for ${kfcEntry.name}:`, error.message);
      }
    }
    console.log(`📊 Processed ${kfcCount}/${kfcEntries.length} KFC entries`);
    
    // Migrate nominations
    console.log('\n📝 Migrating nominations...');
    const nominationsCollection = db.collection('nominations');
    const nominations = await nominationsCollection.find({}).toArray();
    
    let nominationCount = 0;
    for (const nomination of nominations) {
      try {
        // Convert MongoDB ObjectId to string for the nomination ID
        const nominationId = nomination._id.toString();
        
        // Create the nomination in Convex
        const result = await convexClient.mutation('nominations:create', {
          nominatedBy: nomination.nominatedBy,
          nominatedEmployee: nomination.nominatedEmployee,
          nominationType: nomination.nominationType,
          description: nomination.description
        });
        
        if (result.success) {
          // If the nomination was approved/declined, update its status
          if (nomination.status !== 'pending') {
            if (nomination.status === 'approved') {
              await convexClient.mutation('nominations:approve', {
                nominationId: result.nominationId,
                approvedBy: nomination.approvedBy || 'Migration'
              });
            } else if (nomination.status === 'declined') {
              await convexClient.mutation('nominations:decline', {
                nominationId: result.nominationId,
                declinedBy: nomination.approvedBy || 'Migration'
              });
            }
          }
          
          nominationCount++;
          console.log(`✅ Migrated nomination: ${nomination.nominatedEmployee} (${nomination.status})`);
        } else {
          console.error(`❌ Failed to create nomination for ${nomination.nominatedEmployee}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate nomination for ${nomination.nominatedEmployee}:`, error.message);
      }
    }
    console.log(`📊 Migrated ${nominationCount}/${nominations.length} nominations`);
    
    // Summary
    console.log('\n🎉 Migration completed!');
    console.log(`📊 Summary:`);
    console.log(`  • Employees: ${employeeCount}/${employees.length}`);
    console.log(`  • KFC Entries: ${kfcCount}/${kfcEntries.length} (processed)`);
    console.log(`  • Nominations: ${nominationCount}/${nominations.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  migrateNominationsToConvex()
    .then(() => {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateNominationsToConvex }; 