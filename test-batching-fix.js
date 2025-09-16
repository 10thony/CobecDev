#!/usr/bin/env node

/**
 * Test script to verify that the batching fixes resolve the byte limit errors
 * This script tests the data management functions that were causing issues
 */

const { ConvexHttpClient } = require("convex/browser");

// Initialize Convex client
const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://keen-ant-543.convex.cloud");

async function testDataManagementFunctions() {
  console.log("🧪 Testing data management functions with batching fixes...\n");

  try {
    // Test 1: getLightweightDataSummary (should work without byte limit errors)
    console.log("1. Testing getLightweightDataSummary...");
    const lightweightSummary = await client.query("dataManagement:getLightweightDataSummary", {});
    console.log("✅ getLightweightDataSummary success:");
    console.log(`   - Total Jobs: ${lightweightSummary.pagination?.totalJobs || "Unknown"}`);
    console.log(`   - Total Resumes: ${lightweightSummary.pagination?.totalResumes || "Unknown"}`);
    console.log(`   - Total Employees: ${lightweightSummary.pagination?.totalEmployees || "Unknown"}`);
    console.log(`   - Total KFC Points: ${lightweightSummary.pagination?.totalKfcPoints || "Unknown"}`);
    console.log(`   - Note: ${lightweightSummary.note || "No note"}\n`);

    // Test 2: getDataSummary with small page size
    console.log("2. Testing getDataSummary with small page size...");
    const dataSummary = await client.query("dataManagement:getDataSummary", {
      pageSize: 10,
      page: 0
    });
    console.log("✅ getDataSummary success:");
    console.log(`   - Total Jobs: ${dataSummary.pagination?.totalJobs || "Unknown"}`);
    console.log(`   - Total Resumes: ${dataSummary.pagination?.totalResumes || "Unknown"}`);
    console.log(`   - Recent Jobs: ${dataSummary.recentJobs?.length || 0}`);
    console.log(`   - Recent Resumes: ${dataSummary.recentResumes?.length || 0}\n`);

    // Test 3: getAllJobPostings with small limit
    console.log("3. Testing getAllJobPostings with small limit...");
    const jobPostings = await client.query("dataManagement:getAllJobPostings", {
      limit: 10,
      offset: 0
    });
    console.log("✅ getAllJobPostings success:");
    console.log(`   - Jobs returned: ${jobPostings.jobs?.length || 0}`);
    console.log(`   - Total available: ${jobPostings.total || 0}`);
    console.log(`   - Has more: ${jobPostings.hasMore || false}\n`);

    // Test 4: getAllResumes with small limit
    console.log("4. Testing getAllResumes with small limit...");
    const resumes = await client.query("dataManagement:getAllResumes", {
      limit: 10,
      offset: 0
    });
    console.log("✅ getAllResumes success:");
    console.log(`   - Resumes returned: ${resumes.resumes?.length || 0}`);
    console.log(`   - Total available: ${resumes.total || 0}`);
    console.log(`   - Has more: ${resumes.hasMore || false}\n`);

    // Test 5: searchJobPostings with small limit
    console.log("5. Testing searchJobPostings with small limit...");
    const searchJobs = await client.query("dataManagement:searchJobPostings", {
      query: "engineer",
      limit: 5
    });
    console.log("✅ searchJobPostings success:");
    console.log(`   - Search results: ${searchJobs.length || 0}\n`);

    // Test 6: searchResumes with small limit
    console.log("6. Testing searchResumes with small limit...");
    const searchResumes = await client.query("dataManagement:searchResumes", {
      query: "developer",
      limit: 5
    });
    console.log("✅ searchResumes success:");
    console.log(`   - Search results: ${searchResumes.length || 0}\n`);

    console.log("🎉 All tests passed! The batching fixes have resolved the byte limit errors.");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    
    if (error.message.includes("Too many bytes read")) {
      console.error("   This indicates the batching fix needs further refinement.");
    } else if (error.message.includes("Not Authorized")) {
      console.error("   Please run 'npx convex dev' to authenticate with your Convex project.");
    } else {
      console.error("   Unexpected error occurred.");
    }
    
    process.exit(1);
  }
}

// Run the tests
testDataManagementFunctions().catch(console.error);
