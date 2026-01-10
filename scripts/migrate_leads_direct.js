#!/usr/bin/env node
/**
 * Direct migration script for leads data from Cloud to Local Convex instance.
 * This bypasses the export/import process and directly queries and transfers data.
 * 
 * Usage:
 *   bun scripts/migrate_leads_direct.js
 * 
 * Requires:
 *   - CONVEX_CLOUD_URL (Cloud instance, e.g., https://keen-ant-543.convex.cloud)
 *     OR VITE_CONVEX_URL (will be used if CONVEX_CLOUD_URL not set)
 *   - CONVEX_SELF_HOSTED_URL (Local instance, e.g., http://127.0.0.1:3210)
 *   - CONVEX_SELF_HOSTED_ADMIN_KEY (optional, for local instance authentication)
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from both .env and .env.local
const envLocalPath = path.join(__dirname, "..", ".env.local");
const envPath = path.join(__dirname, "..", ".env");

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
if (existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}
dotenv.config();

// Use CONVEX_CLOUD_URL if set, otherwise fall back to VITE_CONVEX_URL
// This allows using a different URL for cloud migration vs frontend dev
const CLOUD_URL = process.env.CONVEX_CLOUD_URL || process.env.VITE_CONVEX_URL;
const LOCAL_URL = process.env.CONVEX_SELF_HOSTED_URL;
const ADMIN_KEY = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;

// Batch size for bulk imports (to avoid mutation size limits)
const BATCH_SIZE = 50;

/**
 * Clean lead data by removing Convex system fields
 */
function cleanLeadForImport(lead) {
  const cleaned = { ...lead };
  
  // Remove Convex system fields that shouldn't be imported
  delete cleaned._id;
  delete cleaned._creationTime;
  
  return cleaned;
}

/**
 * Migrate all leads from Cloud to Local
 */
async function migrateLeads() {
  console.log("🚀 Starting direct leads migration...");
  console.log(`   Cloud: ${CLOUD_URL || "NOT SET"}`);
  console.log(`   Local: ${LOCAL_URL || "NOT SET"}\n`);

  if (!CLOUD_URL || !LOCAL_URL) {
    console.error("❌ Error: Missing required environment variables.");
    console.error(`   CLOUD_URL: ${CLOUD_URL ? "✓" : "✗"}`);
    console.error(`   LOCAL_URL: ${LOCAL_URL ? "✓" : "✗"}`);
    console.error("\n💡 Make sure .env.local contains:");
    console.error("   CONVEX_CLOUD_URL=https://keen-ant-543.convex.cloud (or set VITE_CONVEX_URL)");
    console.error("   CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210");
    process.exit(1);
  }

  // Validate that URLs are different
  if (CLOUD_URL === LOCAL_URL) {
    console.error("❌ Error: Cloud and Local URLs are the same!");
    console.error(`   Both are set to: ${CLOUD_URL}`);
    console.error("\n💡 This script migrates FROM cloud TO local.");
    console.error("   Make sure .env.local has:");
    console.error("   CONVEX_CLOUD_URL=https://keen-ant-543.convex.cloud");
    console.error("   CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210");
    process.exit(1);
  }

  // Initialize clients
  const cloudClient = new ConvexClient(CLOUD_URL);
  const localClient = new ConvexClient(LOCAL_URL);

  try {
    // Step 1: Fetch all leads from Cloud
    console.log("--- Step 1: Fetching leads from Cloud ---");
    console.log("  Querying getAllLeads from cloud...");
    
    const cloudLeads = await cloudClient.query(api.leads.getAllLeads, {});
    
    if (!Array.isArray(cloudLeads)) {
      console.error(`  ❌ Unexpected response type: ${typeof cloudLeads}`);
      console.error(`  Response:`, cloudLeads);
      process.exit(1);
    }

    const totalLeads = cloudLeads.length;
    console.log(`  ✓ Found ${totalLeads} leads in cloud`);

    if (totalLeads === 0) {
      console.log("  ⚠ No leads to migrate.");
      return;
    }

    // Step 2: Clean leads data
    console.log(`\n--- Step 2: Preparing leads for import ---`);
    const cleanedLeads = cloudLeads.map(cleanLeadForImport);
    console.log(`  ✓ Cleaned ${cleanedLeads.length} leads`);

    // Step 3: Import leads to Local in batches
    console.log(`\n--- Step 3: Importing leads to Local (batch size: ${BATCH_SIZE}) ---`);

    let totalImported = 0;
    const totalBatches = Math.ceil(totalLeads / BATCH_SIZE);

    for (let batchNum = 0; batchNum < totalLeads; batchNum += BATCH_SIZE) {
      const batch = cleanedLeads.slice(batchNum, batchNum + BATCH_SIZE);
      const batchIndex = Math.floor(batchNum / BATCH_SIZE) + 1;

      process.stdout.write(`  Importing batch ${batchIndex}/${totalBatches} (${batch.length} leads)... `);

      try {
        const result = await localClient.mutation(api.leads.bulkCreateLeads, {
          leads: batch,
          sourceFile: "cloud_migration",
        });

        if (Array.isArray(result)) {
          const importedCount = result.length;
          totalImported += importedCount;
          console.log(`✓ (${importedCount} imported)`);
        } else {
          console.log(`⚠ Unexpected result:`, result);
        }
      } catch (error) {
        console.log(`❌ FAILED`);
        console.error(`     Error in batch ${batchIndex}:`, error.message);
        // Continue with next batch
      }

      // Small delay to avoid overwhelming the local instance
      if (batchNum + BATCH_SIZE < totalLeads) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`\n--- Migration Summary ---`);
    console.log(`  Total leads in cloud: ${totalLeads}`);
    console.log(`  Total leads imported: ${totalImported}`);

    if (totalImported === totalLeads) {
      console.log(`\n✅ Migration completed successfully!`);
      return true;
    } else {
      console.log(`\n⚠ Warning: Only ${totalImported} of ${totalLeads} leads were imported.`);
      return false;
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  } finally {
    // Close clients
    cloudClient.close();
    localClient.close();
  }
}

/**
 * Verify leads were imported correctly
 */
async function verifyLocalLeads() {
  console.log(`\n--- Verification: Checking Local Instance ---`);
  console.log("  Querying getAllLeads from local...");

  const localClient = new ConvexClient(LOCAL_URL);
  
  try {
    const localLeads = await localClient.query(api.leads.getAllLeads, {});

    if (Array.isArray(localLeads)) {
      console.log(`  ✓ Found ${localLeads.length} leads in local instance`);
    } else {
      console.log(`  ⚠ Unexpected response:`, localLeads);
    }
  } catch (error) {
    console.error("  ⚠ Could not verify local leads:", error.message);
  } finally {
    localClient.close();
  }
}

// Run migration
migrateLeads()
  .then((success) => {
    if (success) {
      return verifyLocalLeads();
    }
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
