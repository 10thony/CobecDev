// Test script to verify cobecadmins collection setup
const { getMongoClient } = require('./src/lib/mongoClient.ts');

async function testCobecadminsSetup() {
  try {
    console.log('🔄 Testing cobecadmins collection setup...');
    
    const client = await getMongoClient();
    const db = client.getDatabase('workdemos');
    
    // Test listCollections
    console.log('📋 Testing listCollections...');
    const collections = await db.listCollections();
    console.log('Available collections:', collections.map(col => col.name));
    
    // Test cobecadmins collection
    console.log('👥 Testing cobecadmins collection...');
    const cobecadminsCollection = db.collection('cobecadmins');
    
    // Test inserting a sample admin
    const sampleAdmin = {
      clerkuserid: 'test_user_123',
      name: 'Test Admin',
      email: 'test@example.com',
      role: 'admin',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    console.log('➕ Inserting sample admin...');
    const result = await cobecadminsCollection.insertOne(sampleAdmin);
    console.log('✅ Sample admin inserted:', result);
    
    // Test finding the admin
    console.log('🔍 Finding sample admin...');
    const foundAdmin = await cobecadminsCollection.findOne({ clerkuserid: 'test_user_123' });
    console.log('✅ Found admin:', foundAdmin);
    
    // Test finding all admins
    console.log('📊 Finding all admins...');
    const allAdmins = await cobecadminsCollection.findToArray({});
    console.log('✅ All admins:', allAdmins);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCobecadminsSetup(); 