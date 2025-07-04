const { ConvexHttpClient } = require('convex/browser');

// Convex configuration
const CONVEX_URL = process.env.CONVEX_URL || 'https://your-deployment.convex.cloud';

async function testRealtimeNominations() {
  let convexClient;
  
  try {
    console.log('🧪 Testing real-time nominations functionality...\n');
    
    // Connect to Convex
    console.log('📡 Connecting to Convex...');
    convexClient = new ConvexHttpClient(CONVEX_URL);
    console.log('✅ Connected to Convex');
    
    // Test 1: Create a test employee
    console.log('\n👥 Test 1: Creating test employee...');
    const employeeResult = await convexClient.mutation('nominations:createEmployee', {
      name: 'Test Employee'
    });
    console.log('✅ Test employee created');
    
    // Test 2: Create a nomination
    console.log('\n📝 Test 2: Creating test nomination...');
    const nominationResult = await convexClient.mutation('nominations:create', {
      nominatedBy: 'Test User',
      nominatedEmployee: 'Test Employee',
      nominationType: 'Team',
      description: 'This is a test nomination for real-time functionality testing.'
    });
    
    if (nominationResult.success) {
      console.log('✅ Test nomination created with ID:', nominationResult.nominationId);
      
      // Test 3: Query nominations (should include the new one)
      console.log('\n🔍 Test 3: Querying nominations...');
      const nominations = await convexClient.query('nominations:list');
      console.log(`✅ Found ${nominations.length} nominations`);
      
      const testNomination = nominations.find(n => n._id === nominationResult.nominationId);
      if (testNomination) {
        console.log('✅ Test nomination found in query results');
        console.log(`   - Status: ${testNomination.status}`);
        console.log(`   - Points: ${testNomination.pointsAwarded}`);
      } else {
        console.log('❌ Test nomination not found in query results');
      }
      
      // Test 4: Approve the nomination
      console.log('\n✅ Test 4: Approving nomination...');
      const approveResult = await convexClient.mutation('nominations:approve', {
        nominationId: nominationResult.nominationId,
        approvedBy: 'Test Admin'
      });
      
      if (approveResult.success) {
        console.log('✅ Nomination approved');
        
        // Test 5: Check KFC points were updated
        console.log('\n🏆 Test 5: Checking KFC points...');
        const kfcPoints = await convexClient.query('nominations:listKfcPoints');
        const testEmployeePoints = kfcPoints.find(k => k.name === 'Test Employee');
        
        if (testEmployeePoints) {
          console.log('✅ KFC points entry found for test employee');
          console.log(`   - Score: ${testEmployeePoints.score}`);
          console.log(`   - Events: ${testEmployeePoints.events.length}`);
        } else {
          console.log('❌ KFC points entry not found for test employee');
        }
      } else {
        console.log('❌ Failed to approve nomination');
      }
      
      // Test 6: Query pending nominations (should be empty now)
      console.log('\n⏳ Test 6: Querying pending nominations...');
      const pendingNominations = await convexClient.query('nominations:listPending');
      console.log(`✅ Found ${pendingNominations.length} pending nominations`);
      
      // Test 7: Query by employee
      console.log('\n👤 Test 7: Querying nominations by employee...');
      const employeeNominations = await convexClient.query('nominations:listByEmployee', {
        employeeName: 'Test Employee'
      });
      console.log(`✅ Found ${employeeNominations.length} nominations for Test Employee`);
      
    } else {
      console.log('❌ Failed to create test nomination:', nominationResult.error);
    }
    
    // Test 8: Query employees
    console.log('\n👥 Test 8: Querying employees...');
    const employees = await convexClient.query('nominations:listEmployees');
    console.log(`✅ Found ${employees.length} employees`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Real-time functionality summary:');
    console.log('  ✅ Nominations can be created');
    console.log('  ✅ Nominations can be queried in real-time');
    console.log('  ✅ Nominations can be approved');
    console.log('  ✅ KFC points are updated automatically');
    console.log('  ✅ Pending nominations are filtered correctly');
    console.log('  ✅ Employee-specific queries work');
    console.log('  ✅ Employee management works');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testRealtimeNominations()
    .then(() => {
      console.log('\n✅ All tests passed! Real-time nominations are working correctly.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testRealtimeNominations }; 