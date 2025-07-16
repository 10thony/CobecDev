const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

async function testMongoKfcData() {
  let client;
  
  try {
    console.log('🧪 Testing MongoDB KFC data access...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
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
    
    // Test 1: Check employees collection
    console.log('\n👥 Test 1: Checking employees collection...');
    const employeesCollection = db.collection('employees');
    const employees = await employeesCollection.find({}).toArray();
    console.log(`✅ Found ${employees.length} employees`);
    if (employees.length > 0) {
      employees.slice(0, 5).forEach(emp => console.log(`   - ${emp.name}`));
      if (employees.length > 5) console.log(`   ... and ${employees.length - 5} more`);
    }
    
    // Test 2: Check kfcpoints collection
    console.log('\n🏆 Test 2: Checking kfcpoints collection...');
    const kfcCollection = db.collection('kfcpoints');
    const kfcEntries = await kfcCollection.find({}).toArray();
    console.log(`✅ Found ${kfcEntries.length} KFC entries`);
    if (kfcEntries.length > 0) {
      kfcEntries.slice(0, 5).forEach(kfc => console.log(`   - ${kfc.name}: ${kfc.score} points`));
      if (kfcEntries.length > 5) console.log(`   ... and ${kfcEntries.length - 5} more`);
    }
    
    // Test 3: Check nominations collection
    console.log('\n📝 Test 3: Checking nominations collection...');
    const nominationsCollection = db.collection('nominations');
    const nominations = await nominationsCollection.find({}).toArray();
    console.log(`✅ Found ${nominations.length} nominations`);
    if (nominations.length > 0) {
      nominations.slice(0, 5).forEach(nom => {
        console.log(`   - ${nom.nominatedEmployee} (${nom.status || 'pending'}) by ${nom.nominatedBy}`);
      });
      if (nominations.length > 5) console.log(`   ... and ${nominations.length - 5} more`);
    }
    
    // Test 4: Check database status
    console.log('\n📊 Test 4: Database status...');
    const [employeeCount, kfcCount, nominationCount] = await Promise.all([
      employeesCollection.countDocuments(),
      kfcCollection.countDocuments(),
      nominationsCollection.countDocuments()
    ]);
    
    console.log(`📈 Database Summary:`);
    console.log(`   • Employees: ${employeeCount}`);
    console.log(`   • KFC Entries: ${kfcCount}`);
    console.log(`   • Nominations: ${nominationCount}`);
    
    console.log('\n🎉 MongoDB KFC data test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testMongoKfcData()
    .then(() => {
      console.log('\n✅ MongoDB KFC data test passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ MongoDB KFC data test failed:', error);
      process.exit(1);
    });
}

module.exports = { testMongoKfcData }; 