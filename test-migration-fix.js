#!/usr/bin/env node
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://localhost:8000';
const convex = new ConvexHttpClient(CONVEX_URL);

async function testMigrationFix() {
  console.log('🧪 Testing Migration Script Fixes...');
  console.log(`Convex URL: ${CONVEX_URL}`);
  
  try {
    // Test 1: Check if API endpoints exist
    console.log('\n1️⃣ Testing API endpoint availability...');
    
    // Test kfcData.list
    try {
      const kfcResult = await convex.query(api.kfcData.list);
      console.log('✅ kfcData.list: Available');
    } catch (error) {
      console.error('❌ kfcData.list: Failed -', error.message);
    }
    
    // Test cobecAdmins.list
    try {
      const adminResult = await convex.query(api.cobecAdmins.list);
      console.log('✅ cobecAdmins.list: Available');
    } catch (error) {
      console.error('❌ cobecAdmins.list: Failed -', error.message);
    }
    
    // Test employees.list
    try {
      const empResult = await convex.query(api.employees.list);
      console.log('✅ employees.list: Available');
    } catch (error) {
      console.error('❌ employees.list: Failed -', error.message);
    }
    
    // Test 2: Check schema compatibility
    console.log('\n2️⃣ Testing schema compatibility...');
    
    // Test kfcData.insert with sample data
    try {
      const testKfcData = {
        name: "Test User",
        events: [{ type: "Team", month: "JAN" }],
        march_status: null,
        score: 10,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const kfcId = await convex.mutation(api.kfcData.insert, testKfcData);
      console.log('✅ kfcData.insert: Schema compatible');
      
      // Clean up test data
      await convex.mutation(api.kfcData.deleteKfcEntry, { name: "Test User" });
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ kfcData.insert: Schema incompatible -', error.message);
    }
    
    // Test cobecAdmins.insert with sample data
    try {
      const testAdminData = {
        clerkUserId: "test_user_123",
        name: "Test Admin",
        email: "test@example.com",
        role: "admin",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const adminId = await convex.mutation(api.cobecAdmins.insert, testAdminData);
      console.log('✅ cobecAdmins.insert: Schema compatible');
      
      // Clean up test data
      await convex.mutation(api.cobecAdmins.deleteByClerkUserId, { clerkUserId: "test_user_123" });
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ cobecAdmins.insert: Schema incompatible -', error.message);
    }
    
    // Test employees.insert with sample data
    try {
      const testEmpData = {
        name: "Test Employee",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const empId = await convex.mutation(api.employees.insert, testEmpData);
      console.log('✅ employees.insert: Schema compatible');
      
      // Clean up test data
      await convex.mutation(api.employees.delete, { name: "Test Employee" });
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ employees.insert: Schema incompatible -', error.message);
    }
    
    console.log('\n🎉 Migration script fix test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if delete functions exist, if not create them
async function checkAndCreateDeleteFunctions() {
  console.log('\n🔍 Checking for required delete functions...');
  
  // Check if deleteByClerkUserId exists in cobecAdmins
  try {
    await convex.mutation(api.cobecAdmins.deleteByClerkUserId, { clerkUserId: "test" });
  } catch (error) {
    if (error.message.includes('deleteByClerkUserId')) {
      console.log('⚠️  deleteByClerkUserId function missing - creating...');
      // This would need to be added to the actual cobecAdmins.ts file
    }
  }
  
  // Check if delete function exists in employees
  try {
    await convex.mutation(api.employees.delete, { name: "test" });
  } catch (error) {
    if (error.message.includes('delete')) {
      console.log('⚠️  delete function missing - creating...');
      // This would need to be added to the actual employees.ts file
    }
  }
}

testMigrationFix();
