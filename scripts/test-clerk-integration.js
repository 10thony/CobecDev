const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");

// Test script for Clerk User Integration
async function testClerkIntegration() {
  console.log('🧪 Testing Clerk User Integration...\n');

  try {
    // Initialize Convex client
    const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "http://localhost:8000");
    
    console.log('1. Testing getClerkUsers function...');
    
    // Test the getClerkUsers function
    const users = await client.query(api.cobecAdmins.getClerkUsers);
    
    if (users && Array.isArray(users)) {
      console.log(`✅ Successfully fetched ${users.length} users from Clerk`);
      
      if (users.length > 0) {
        console.log('\n📋 Sample users:');
        users.slice(0, 3).forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.fullName} (${user.email}) - ID: ${user.id}`);
        });
        
        if (users.length > 3) {
          console.log(`  ... and ${users.length - 3} more users`);
        }
      }
    } else {
      console.log('❌ Unexpected response format from getClerkUsers');
    }
    
    console.log('\n2. Testing admin permission check...');
    
    // Test admin permission (this should fail without proper auth)
    try {
      await client.query(api.cobecAdmins.getAllCobecAdmins);
      console.log('✅ Admin permission check passed');
    } catch (error) {
      console.log('⚠️  Admin permission check failed (expected for non-admin users)');
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n🎉 Clerk User Integration test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Navigate to the KFC Points Manager');
    console.log('3. Click "Manage Cobec Admins" (if you have admin access)');
    console.log('4. You should see a dropdown with all Clerk users');
    console.log('5. Select a user to auto-fill their details');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure CLERK_SECRET_KEY is set in your environment');
    console.log('2. Verify your Clerk application is properly configured');
    console.log('3. Check that Convex is running: npx convex dev');
    console.log('4. Ensure you have admin permissions in the system');
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testClerkIntegration();
}

module.exports = { testClerkIntegration }; 