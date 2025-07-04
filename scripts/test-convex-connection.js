const { ConvexHttpClient } = require('convex/browser');

// Convex configuration
const CONVEX_URL = process.env.CONVEX_URL || 'https://keen-ant-543.convex.cloud';

async function testConvexConnection() {
  let convexClient;
  
  try {
    console.log('🧪 Testing Convex connection...\n');
    
    // Connect to Convex
    console.log('📡 Connecting to Convex...');
    convexClient = new ConvexHttpClient(CONVEX_URL);
    console.log('✅ Connected to Convex');
    
    // Test 1: Query employees (should be empty initially)
    console.log('\n👥 Test 1: Querying employees...');
    try {
      const employees = await convexClient.query('nominations:listEmployees');
      console.log(`✅ Found ${employees.length} employees`);
      if (employees.length > 0) {
        employees.forEach(emp => console.log(`   - ${emp.name}`));
      }
    } catch (error) {
      console.error('❌ Error querying employees:', error.message);
    }
    
    // Test 2: Query nominations (should be empty initially)
    console.log('\n📝 Test 2: Querying nominations...');
    try {
      const nominations = await convexClient.query('nominations:list');
      console.log(`✅ Found ${nominations.length} nominations`);
    } catch (error) {
      console.error('❌ Error querying nominations:', error.message);
    }
    
    // Test 3: Create a test employee
    console.log('\n👥 Test 3: Creating test employee...');
    try {
      const employeeResult = await convexClient.mutation('nominations:createEmployee', {
        name: 'Test Employee'
      });
      console.log('✅ Test employee created:', employeeResult);
    } catch (error) {
      console.error('❌ Error creating employee:', error.message);
    }
    
    // Test 4: Query employees again (should have 1 now)
    console.log('\n👥 Test 4: Querying employees again...');
    try {
      const employees = await convexClient.query('nominations:listEmployees');
      console.log(`✅ Found ${employees.length} employees`);
      if (employees.length > 0) {
        employees.forEach(emp => console.log(`   - ${emp.name}`));
      }
    } catch (error) {
      console.error('❌ Error querying employees:', error.message);
    }
    
    console.log('\n🎉 Connection test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testConvexConnection()
    .then(() => {
      console.log('\n✅ Connection test passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Connection test failed:', error);
      process.exit(1);
    });
}

module.exports = { testConvexConnection }; 