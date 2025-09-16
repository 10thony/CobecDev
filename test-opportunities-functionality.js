// Test script for opportunities functionality
// This script demonstrates how to use the opportunities mutations and queries

const { ConvexHttpClient } = require("convex/browser");

// Initialize Convex client (you'll need to replace with your actual deployment URL)
const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://your-deployment.convex.cloud");

// Sample data from texasLeadsTierOne.json (updated structure)
const sampleOpportunitiesData = [
  {
    "opportunityType": "Public Sector",
    "opportunityTitle": "I-30 Canyon Reconstruction (I-35 East to I-45) — Dallas District",
    "contractID": null,
    "issuingBody": {
      "name": "Texas Department of Transportation - Dallas District",
      "level": "State"
    },
    "location": {
      "city": "Dallas",
      "county": "Dallas County",
      "region": "Dallas–Fort Worth"
    },
    "status": "Budgeted for FY2026",
    "estimatedValueUSD": 426000000,
    "keyDates": {
      "publishedDate": "2025-08-01",
      "bidDeadline": null,
      "projectedStartDate": "2026-01-01"
    },
    "source": {
      "documentName": "TxDOT Projects - I-30 Canyon project page",
      "url": "https://www.txdot.gov/texasclearlanes/projects.html"
    },
    "summary": "Major interstate reconstruction through central Dallas identified in TxDOT Dallas district project list. Large multi-year construction program; procurement expected via TxDOT lettings; prime contractors sought for heavy highway construction and associated civil works."
  },
  {
    "opportunityType": "Public Sector",
    "opportunityTitle": "Houston Airport System — Terminal B Redevelopment (IAH) / Aviation CIP Line Item",
    "contractID": "A-000764",
    "issuingBody": {
      "name": "City of Houston — Aviation Division",
      "level": "City"
    },
    "location": {
      "city": "Houston",
      "county": "Harris",
      "region": "Houston"
    },
    "status": "Budgeted for FY2026",
    "estimatedValueUSD": null,
    "keyDates": {
      "publishedDate": "2024-11-01",
      "bidDeadline": null,
      "projectedStartDate": "2026-01-01"
    },
    "source": {
      "documentName": "City of Houston Capital Project Profiles — Aviation (IAH Terminal B Redevelopment A-000764)",
      "url": "https://www.houstontx.gov/cip/25cipproposed/Capital_Project.pdf"
    },
    "summary": "Terminal B redevelopment listed in Houston's aviation CIP. Major airport works typically require prime contractors for civil/architectural/MEP and specialty trade subcontractors (installations, glazing, wayfinding)."
  },
  {
    "opportunityType": "Public Sector",
    "opportunityTitle": "Dallas Digital Kiosk Program — City-Sponsored Pilot & Procurement",
    "contractID": null,
    "issuingBody": {
      "name": "City of Dallas — Office of Procurement / Innovation Initiatives",
      "level": "City"
    },
    "location": {
      "city": "Dallas",
      "county": "Dallas",
      "region": "Dallas–Fort Worth"
    },
    "status": "In Planning Phase",
    "estimatedValueUSD": null,
    "keyDates": {
      "publishedDate": "2025-06-01",
      "bidDeadline": null,
      "projectedStartDate": "2026-07-01"
    },
    "source": {
      "documentName": "City of Dallas memorandum and procurement notices (digital kiosk references)",
      "url": "https://dallascityhall.com/government/citymanager/Documents/FY24-25%20Memos/Memorandum%20Packet.pdf"
    },
    "summary": "City memos reference a proposed digital kiosk program; procurement expected for hardware, installation, connectivity, and ongoing O&M — a target for digital infrastructure/subcontracting."
  }
];

async function testOpportunitiesFunctionality() {
  try {
    console.log("🧪 Testing Opportunities Functionality...\n");

    // Test 1: Import opportunities from JSON data
    console.log("1. Testing bulk import of opportunities...");
    const importResult = await client.action("opportunitiesActions:importOpportunitiesFromJson", {
      opportunitiesData: sampleOpportunitiesData,
      sourceFile: "texasLeadsTierOne.json"
    });
    console.log("✅ Import successful:", importResult);
    console.log(`   Imported ${importResult.importedCount} opportunities\n`);

    // Test 2: Get all opportunities
    console.log("2. Testing get all opportunities...");
    const allOpportunities = await client.query("opportunities:getAllOpportunities", {});
    console.log("✅ Retrieved all opportunities:", allOpportunities.length, "opportunities found\n");

    // Test 3: Get opportunities by type
    console.log("3. Testing get opportunities by type (Public Sector)...");
    const publicSectorOpportunities = await client.query("opportunities:getOpportunitiesByType", { 
      opportunityType: "Public Sector" 
    });
    console.log("✅ Public Sector opportunities:", publicSectorOpportunities.length, "found\n");

    // Test 4: Get opportunities by issuing level
    console.log("4. Testing get opportunities by issuing level (State)...");
    const stateOpportunities = await client.query("opportunities:getOpportunitiesByIssuingLevel", { 
      level: "State" 
    });
    console.log("✅ State opportunities:", stateOpportunities.length, "found\n");

    // Test 5: Get opportunities by region
    console.log("5. Testing get opportunities by region (Dallas–Fort Worth)...");
    const dfwOpportunities = await client.query("opportunities:getOpportunitiesByRegion", { 
      region: "Dallas–Fort Worth" 
    });
    console.log("✅ DFW opportunities:", dfwOpportunities.length, "found\n");

    // Test 6: Get opportunities by status
    console.log("6. Testing get opportunities by status (Budgeted for FY2026)...");
    const budgetedOpportunities = await client.query("opportunities:getOpportunitiesByStatus", { 
      status: "Budgeted for FY2026" 
    });
    console.log("✅ Budgeted opportunities:", budgetedOpportunities.length, "found\n");

    // Test 7: Get opportunities by category
    console.log("7. Testing get opportunities by category...");
    const transportationOpportunities = await client.query("opportunities:getOpportunitiesByCategory", { 
      category: "Transportation" 
    });
    console.log("✅ Transportation opportunities:", transportationOpportunities.length, "found\n");

    // Test 8: Get active opportunities
    console.log("8. Testing get active opportunities...");
    const activeOpportunities = await client.query("opportunities:getActiveOpportunities", {});
    console.log("✅ Active opportunities:", activeOpportunities.length, "found\n");

    // Test 9: Search opportunities
    console.log("9. Testing search opportunities (searching for 'Dallas')...");
    const searchResults = await client.query("opportunities:searchOpportunities", { 
      searchTerm: "Dallas" 
    });
    console.log("✅ Search results:", searchResults.length, "opportunities found\n");

    // Test 10: Get opportunities by value range
    console.log("10. Testing get opportunities by value range ($100M - $500M)...");
    const valueRangeOpportunities = await client.query("opportunities:getOpportunitiesByValueRange", {
      minValue: 100000000,
      maxValue: 500000000
    });
    console.log("✅ Value range opportunities:", valueRangeOpportunities.length, "found\n");

    // Test 11: Get opportunities statistics
    console.log("11. Testing get opportunities statistics...");
    const stats = await client.query("opportunities:getOpportunitiesStats", {});
    console.log("✅ Statistics:", JSON.stringify(stats, null, 2), "\n");

    // Test 12: Get opportunities by multiple filters
    console.log("12. Testing get opportunities by multiple filters...");
    const filteredOpportunities = await client.query("opportunities:getOpportunitiesByFilters", {
      opportunityType: "Public Sector",
      issuingLevel: "State",
      isActive: true
    });
    console.log("✅ Filtered opportunities:", filteredOpportunities.length, "found\n");

    // Test 13: Update an opportunity
    if (allOpportunities.length > 0) {
      console.log("13. Testing update opportunity...");
      const firstOpportunity = allOpportunities[0];
      const updateResult = await client.mutation("opportunities:updateOpportunity", {
        id: firstOpportunity._id,
        category: "Updated Transportation"
      });
      console.log("✅ Opportunity updated successfully\n");
    }

    // Test 14: Export opportunities
    console.log("14. Testing export opportunities...");
    const exportResult = await client.action("opportunitiesActions:exportOpportunities", {
      format: "json"
    });
    console.log("✅ Export successful:", exportResult.count, "opportunities exported\n");

    // Test 15: Get analytics
    console.log("15. Testing get analytics...");
    const analytics = await client.action("opportunitiesActions:getOpportunitiesAnalytics", {});
    console.log("✅ Analytics:", JSON.stringify(analytics, null, 2), "\n");

    // Test 16: Advanced search
    console.log("16. Testing advanced search...");
    const advancedSearch = await client.action("opportunitiesActions:searchOpportunitiesAdvanced", {
      searchTerm: "construction",
      filters: {
        opportunityType: "Public Sector",
        region: "Dallas–Fort Worth"
      },
      limit: 5
    });
    console.log("✅ Advanced search results:", advancedSearch.results.length, "opportunities found\n");

    // Test 17: Get opportunities by value range with breakdown
    console.log("17. Testing get opportunities by value range with breakdown...");
    const valueBreakdown = await client.action("opportunitiesActions:getOpportunitiesByValueRange", {
      minValue: 0,
      maxValue: 1000000000,
      includeBreakdown: true
    });
    console.log("✅ Value breakdown:", JSON.stringify(valueBreakdown.breakdown, null, 2), "\n");

    console.log("🎉 All tests completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testOpportunitiesFunctionality();
}

module.exports = { testOpportunitiesFunctionality, sampleOpportunitiesData };
