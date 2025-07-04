const { ConvexHttpClient } = require('convex/browser');

// Convex configuration
const CONVEX_URL = process.env.CONVEX_URL || 'https://keen-ant-543.convex.cloud';

const testEmployees = [
  'John Smith',
  'Jane Doe',
  'Mike Johnson',
  'Sarah Wilson',
  'David Brown',
  'Emily Davis',
  'Robert Miller',
  'Lisa Garcia',
  'James Rodriguez',
  'Maria Martinez'
];

async function addTestEmployees() {
  let convexClient;
  
  try {
    console.log('👥 Adding test employees to Convex...\n');
    
    // Connect to Convex
    console.log('📡 Connecting to Convex...');
    convexClient = new ConvexHttpClient(CONVEX_URL);
    console.log('✅ Connected to Convex');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const employeeName of testEmployees) {
      try {
        const result = await convexClient.mutation('nominations:createEmployee', {
          name: employeeName
        });
        
        if (result.success) {
          successCount++;
          console.log(`✅ Added employee: ${employeeName}`);
        } else {
          failCount++;
          console.error(`❌ Failed to add employee ${employeeName}:`, result.error);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Error adding employee ${employeeName}:`, error.message);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  • Successfully added: ${successCount} employees`);
    console.log(`  • Failed: ${failCount} employees`);
    console.log(`  • Total processed: ${testEmployees.length} employees`);
    
    if (successCount > 0) {
      console.log('\n🎉 Test employees added successfully!');
      console.log('You can now test the nominations functionality.');
    }
    
  } catch (error) {
    console.error('❌ Failed to add test employees:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  addTestEmployees()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addTestEmployees }; 