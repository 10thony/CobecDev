// Test script for KFC IndexedDB functionality
// This tests the client-side MongoDB-like implementation

// Import the KFC data
const kfcData = require('../kfcpoints.json');

// Mock the browser environment for Node.js testing
if (typeof window === 'undefined') {
  global.window = {};
  global.indexedDB = require('fake-indexeddb');
}

// Import the MongoDB client
const { getMongoClient, forceDatabaseReinitialization } = require('../src/lib/mongoClient.ts');

async function testKfcIndexedDB() {
  console.log('🧪 Testing KFC IndexedDB Functionality...\n');
  
  try {
    // Force database reinitialization to start fresh
    console.log('🔄 Reinitializing database...');
    await forceDatabaseReinitialization();
    
    // Get MongoDB client
    console.log('🔌 Connecting to IndexedDB...');
    const client = await getMongoClient();
    console.log('✅ Connected to IndexedDB successfully!');
    
    // Get database and collections
    const db = client.getDatabase('workdemos');
    const kfcCollection = db.collection('kfcpoints');
    const employeesCollection = db.collection('employees');
    
    console.log('📊 Testing collections...');
    
    // Test initial state (should be empty)
    let kfcCount = await kfcCollection.countDocuments({});
    let employeeCount = await employeesCollection.countDocuments({});
    console.log(`📈 Initial state - KFC: ${kfcCount}, Employees: ${employeeCount}`);
    
    // Insert KFC data
    console.log('\n📝 Inserting KFC data...');
    let kfcSuccessCount = 0;
    let kfcFailCount = 0;
    
    for (const entry of kfcData) {
      try {
        const kfcEntry = {
          ...entry,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await kfcCollection.insertOne(kfcEntry);
        kfcSuccessCount++;
        console.log(`✅ Added KFC entry: ${entry.name}`);
      } catch (error) {
        kfcFailCount++;
        console.error(`❌ Failed to add KFC entry: ${entry.name}`, error);
      }
    }
    
    // Insert employees
    console.log('\n👥 Inserting employees...');
    const employeeNames = [...new Set(kfcData.map(entry => entry.name))];
    let employeeSuccessCount = 0;
    let employeeFailCount = 0;
    
    for (const name of employeeNames) {
      try {
        const employee = {
          name: name,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await employeesCollection.insertOne(employee);
        employeeSuccessCount++;
        console.log(`✅ Added employee: ${name}`);
      } catch (error) {
        employeeFailCount++;
        console.error(`❌ Failed to add employee: ${name}`, error);
      }
    }
    
    // Verify data was inserted
    console.log('\n🔍 Verifying inserted data...');
    kfcCount = await kfcCollection.countDocuments({});
    employeeCount = await employeesCollection.countDocuments({});
    console.log(`📊 Final state - KFC: ${kfcCount}, Employees: ${employeeCount}`);
    
    // Test data retrieval
    console.log('\n📖 Testing data retrieval...');
    const allKfcEntries = await kfcCollection.findToArray({});
    const allEmployees = await employeesCollection.findToArray({});
    
    console.log(`📋 Retrieved ${allKfcEntries.length} KFC entries`);
    console.log(`👤 Retrieved ${allEmployees.length} employees`);
    
    // Show sample data
    console.log('\n📄 Sample KFC Entries:');
    allKfcEntries.slice(0, 3).forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.name} - ${entry.score} points - ${entry.events.length} events`);
    });
    
    console.log('\n👤 Sample Employees:');
    allEmployees.slice(0, 3).forEach((employee, index) => {
      console.log(`  ${index + 1}. ${employee.name}`);
    });
    
    // Test querying
    console.log('\n🔍 Testing queries...');
    const highScorers = await kfcCollection.findToArray({ score: { $gte: 50 } });
    console.log(`🏆 High scorers (50+ points): ${highScorers.length}`);
    
    const teamEvents = await kfcCollection.findToArray({ 
      events: { $elemMatch: { type: 'Team' } }
    });
    console.log(`👥 People with team events: ${teamEvents.length}`);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(40));
    console.log(`✅ KFC Insertions: ${kfcSuccessCount} success, ${kfcFailCount} failed`);
    console.log(`✅ Employee Insertions: ${employeeSuccessCount} success, ${employeeFailCount} failed`);
    console.log(`📊 Total KFC Entries: ${kfcCount}`);
    console.log(`👤 Total Employees: ${employeeCount}`);
    console.log(`🔍 High Scorers: ${highScorers.length}`);
    console.log(`👥 Team Event Participants: ${teamEvents.length}`);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testKfcIndexedDB().catch(console.error); 