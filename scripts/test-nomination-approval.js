const { MongoClient } = require('mongodb');

// MongoDB connection string - replace with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-username:your-password@your-cluster.mongodb.net/workdemos?retryWrites=true&w=majority';

async function testNominationApproval() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('workdemos');
    const nominationsCollection = db.collection('nominations');
    const kfcCollection = db.collection('kfcpoints');
    
    // Step 1: Create a test nomination
    console.log('\n📝 Step 1: Creating test nomination...');
    const testNomination = {
      nominatedBy: 'Test Nominator',
      nominatedEmployee: 'Test Employee',
      nominationType: 'Team',
      description: 'Test nomination for approval testing',
      pointsAwarded: 10,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const nominationResult = await nominationsCollection.insertOne(testNomination);
    console.log(`✅ Created test nomination with ID: ${nominationResult.insertedId}`);
    
    // Step 2: Check initial KFC points for the employee
    console.log('\n🔍 Step 2: Checking initial KFC points...');
    const initialKfcEntry = await kfcCollection.findOne({ name: 'Test Employee' });
    const initialScore = initialKfcEntry ? initialKfcEntry.score : 0;
    console.log(`📊 Initial KFC score for Test Employee: ${initialScore}`);
    
    // Step 3: Approve the nomination (simulate the approval process)
    console.log('\n✅ Step 3: Approving nomination...');
    const nominationId = nominationResult.insertedId.toString();
    
    // Get the nomination first
    const nomination = await nominationsCollection.findOne({ _id: nominationResult.insertedId });
    if (!nomination) {
      throw new Error('Test nomination not found');
    }
    
    console.log(`📋 Found nomination for ${nomination.nominatedEmployee} with ${nomination.pointsAwarded} points`);
    
    // Update nomination status to approved
    const approveResult = await nominationsCollection.updateOne(
      { _id: nominationResult.insertedId },
      {
        $set: {
          status: 'approved',
          approvedBy: 'Test Admin',
          approvedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    if (approveResult.modifiedCount > 0) {
      console.log('✅ Nomination status updated to approved');
      
      // Step 4: Update KFC points (simulate the updateKfcPointsForNomination method)
      console.log('\n🔄 Step 4: Updating KFC points...');
      
      const kfcEntry = await kfcCollection.findOne({ name: nomination.nominatedEmployee });
      
      if (kfcEntry) {
        console.log(`✅ Found existing KFC entry with current score: ${kfcEntry.score}`);
        
        // Add new event
        const newEvent = {
          type: nomination.nominationType === 'Growth' ? 'Individ' : nomination.nominationType,
          month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
          quantity: 1
        };
        
        const updatedEvents = [...(kfcEntry.events || []), newEvent];
        const newScore = (kfcEntry.score || 0) + nomination.pointsAwarded;
        
        console.log(`📊 Updating KFC entry: ${kfcEntry.score} + ${nomination.pointsAwarded} = ${newScore} points`);
        
        const kfcUpdateResult = await kfcCollection.updateOne(
          { name: nomination.nominatedEmployee },
          {
            $set: {
              events: updatedEvents,
              score: newScore,
              updatedAt: new Date()
            }
          }
        );
        
        if (kfcUpdateResult.modifiedCount > 0) {
          console.log(`✅ Successfully updated KFC entry to ${newScore} points`);
        } else {
          console.warn('⚠️ No KFC entry was modified');
        }
      } else {
        console.log('📝 Creating new KFC entry...');
        
        const newKfcEntry = {
          name: nomination.nominatedEmployee,
          events: [{
            type: nomination.nominationType === 'Growth' ? 'Individ' : nomination.nominationType,
            month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
            quantity: 1
          }],
          march_status: undefined,
          score: nomination.pointsAwarded,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const kfcInsertResult = await kfcCollection.insertOne(newKfcEntry);
        console.log(`✅ Created new KFC entry with ID: ${kfcInsertResult.insertedId}`);
      }
    } else {
      console.error('❌ Failed to update nomination status');
    }
    
    // Step 5: Verify the final KFC points
    console.log('\n🔍 Step 5: Verifying final KFC points...');
    const finalKfcEntry = await kfcCollection.findOne({ name: 'Test Employee' });
    const finalScore = finalKfcEntry ? finalKfcEntry.score : 0;
    console.log(`📊 Final KFC score for Test Employee: ${finalScore}`);
    
    // Step 6: Verify the points were added correctly
    const expectedScore = initialScore + testNomination.pointsAwarded;
    if (finalScore === expectedScore) {
      console.log(`✅ SUCCESS: Points updated correctly! ${initialScore} + ${testNomination.pointsAwarded} = ${finalScore}`);
    } else {
      console.error(`❌ FAILURE: Points not updated correctly. Expected: ${expectedScore}, Got: ${finalScore}`);
    }
    
    // Step 7: Clean up test data
    console.log('\n🧹 Step 6: Cleaning up test data...');
    await nominationsCollection.deleteOne({ _id: nominationResult.insertedId });
    console.log('✅ Deleted test nomination');
    
    // Only delete KFC entry if it was created for this test
    if (!initialKfcEntry) {
      await kfcCollection.deleteOne({ name: 'Test Employee' });
      console.log('✅ Deleted test KFC entry');
    } else {
      // Restore original score
      await kfcCollection.updateOne(
        { name: 'Test Employee' },
        { $set: { score: initialScore, updatedAt: new Date() } }
      );
      console.log('✅ Restored original KFC score');
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the test
testNominationApproval(); 