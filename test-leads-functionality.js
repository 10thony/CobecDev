// Test script for leads functionality
// This script demonstrates how to use the leads mutations and queries

const { ConvexHttpClient } = require("convex/browser");

// Initialize Convex client (you'll need to replace with your actual deployment URL)
const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://your-deployment.convex.cloud");

// Sample data from texasLeadsTierOne.json
const sampleLeadsData = [
  {
    "name": "Texas Comptroller — State Purchasing (Statewide Procurement Division)",
    "url": "https://comptroller.texas.gov/purchasing/",
    "level": "State",
    "updateFrequency": "daily/continuous (solicitations published regularly)",
    "keywordDateFilteringAvailable": true
  },
  {
    "name": "TxDOT — Statewide Transportation Improvement Program (STIP) 2025-2028",
    "url": "https://www.txdot.gov/projects/planning/stip/stip-2025-2028.html",
    "level": "State",
    "updateFrequency": "quarterly (STIP revisions typically Feb/May/Aug/Nov)",
    "keywordDateFilteringAvailable": false
  },
  {
    "name": "City of Dallas — Procurement (Bonfire portal) & CIP",
    "url": "https://dallascityhall.com/departments/procurement/Pages/default.aspx",
    "level": "City",
    "updateFrequency": "continuous (solicitations posted as issued)",
    "keywordDateFilteringAvailable": true
  }
];

async function testLeadsFunctionality() {
  try {
    console.log("🧪 Testing Leads Functionality...\n");

    // Test 1: Import leads from JSON data
    console.log("1. Testing bulk import of leads...");
    const importResult = await client.action("leadsActions:importLeadsFromJson", {
      leadsData: sampleLeadsData,
      sourceFile: "texasLeadsTierOne.json"
    });
    console.log("✅ Import successful:", importResult);
    console.log(`   Imported ${importResult.importedCount} leads\n`);

    // Test 2: Get all leads
    console.log("2. Testing get all leads...");
    const allLeads = await client.query("leads:getAllLeads", {});
    console.log("✅ Retrieved all leads:", allLeads.length, "leads found\n");

    // Test 3: Get leads by level
    console.log("3. Testing get leads by level (State)...");
    const stateLeads = await client.query("leads:getLeadsByLevel", { level: "State" });
    console.log("✅ State leads:", stateLeads.length, "found\n");

    // Test 4: Get active leads
    console.log("4. Testing get active leads...");
    const activeLeads = await client.query("leads:getActiveLeads", {});
    console.log("✅ Active leads:", activeLeads.length, "found\n");

    // Test 5: Search leads
    console.log("5. Testing search leads (searching for 'Dallas')...");
    const searchResults = await client.query("leads:searchLeads", { searchTerm: "Dallas" });
    console.log("✅ Search results:", searchResults.length, "leads found\n");

    // Test 6: Get leads with filtering capability
    console.log("6. Testing get leads with keyword/date filtering...");
    const filteringLeads = await client.query("leads:getLeadsWithFiltering", {});
    console.log("✅ Leads with filtering:", filteringLeads.length, "found\n");

    // Test 7: Get leads statistics
    console.log("7. Testing get leads statistics...");
    const stats = await client.query("leads:getLeadsStats", {});
    console.log("✅ Statistics:", JSON.stringify(stats, null, 2), "\n");

    // Test 8: Get leads by filters
    console.log("8. Testing get leads by multiple filters...");
    const filteredLeads = await client.query("leads:getLeadsByFilters", {
      level: "State",
      isActive: true
    });
    console.log("✅ Filtered leads:", filteredLeads.length, "found\n");

    // Test 9: Update a lead
    if (allLeads.length > 0) {
      console.log("9. Testing update lead...");
      const firstLead = allLeads[0];
      const updateResult = await client.mutation("leads:updateLead", {
        id: firstLead._id,
        description: "Updated description for testing"
      });
      console.log("✅ Lead updated successfully\n");
    }

    // Test 10: Export leads
    console.log("10. Testing export leads...");
    const exportResult = await client.action("leadsActions:exportLeads", {
      format: "json"
    });
    console.log("✅ Export successful:", exportResult.count, "leads exported\n");

    // Test 11: Get analytics
    console.log("11. Testing get analytics...");
    const analytics = await client.action("leadsActions:getLeadsAnalytics", {});
    console.log("✅ Analytics:", JSON.stringify(analytics, null, 2), "\n");

    console.log("🎉 All tests completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testLeadsFunctionality();
}

module.exports = { testLeadsFunctionality, sampleLeadsData };
