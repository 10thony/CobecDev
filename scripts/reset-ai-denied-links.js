/**
 * Script to reset all AI-denied procurement links back to pending status
 * 
 * This script calls the resetAiDeniedLinks mutation to restore links that were
 * incorrectly denied due to errors (e.g., Chrome not installed).
 * 
 * Usage:
 *   node scripts/reset-ai-denied-links.js
 * 
 * Requires:
 *   - VITE_CONVEX_URL or CONVEX_URL environment variable
 *   - Or run via Convex dashboard directly
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
// Try .env.local first (higher priority), then .env
const envLocalPath = path.join(__dirname, "..", ".env.local");
const envPath = path.join(__dirname, "..", ".env");

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
if (existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false }); // Don't override .env.local values
}

// Also try loading from default locations
dotenv.config();

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: VITE_CONVEX_URL or CONVEX_URL environment variable is not set.");
  console.error("\n📁 Checked for environment files:");
  console.error(`   ${existsSync(envLocalPath) ? '✓' : '✗'} .env.local`);
  console.error(`   ${existsSync(envPath) ? '✓' : '✗'} .env`);
  console.error("\n💡 Solutions:");
  console.error("   1. Create a .env.local file in the project root with:");
  console.error("      VITE_CONVEX_URL=https://your-deployment.convex.cloud");
  console.error("   2. Or set it as an environment variable:");
  console.error("      export VITE_CONVEX_URL='https://your-deployment.convex.cloud'");
  console.error("\n📋 Alternatively, run this migration directly from the Convex dashboard:");
  console.error("   1. Go to Functions > procurementUrls:resetAiDeniedLinks");
  console.error("   2. Run with args: { confirm: true }");
  process.exit(1);
}

async function resetAiDeniedLinks() {
  console.log("🔄 Connecting to Convex...");
  console.log(`   Using URL: ${CONVEX_URL ? CONVEX_URL.substring(0, 30) + '...' : 'NOT SET'}`);
  const client = new ConvexClient(CONVEX_URL);

  try {
    console.log("🔍 Finding AI-denied links...");
    
    // First, let's check how many links are affected
    const stats = await client.query(api.procurementUrls.getStats, {});
    console.log(`📊 Current stats:`, stats);

    // Get all URLs to see how many are AI-denied or have failed AI review
    const allUrls = await client.query(api.procurementUrls.list, {});
    const aiDeniedCount = allUrls.filter(
      (url) => 
        (url.verifiedBy === "GPT-5-Mini-Agent" && url.status === "denied") ||
        url.aiReviewStatus === "failed"
    ).length;

    console.log(`\n📋 Found ${aiDeniedCount} links with AI-denied status or failed AI review`);
    
    if (aiDeniedCount === 0) {
      console.log("✅ No AI-denied links found. Nothing to reset.");
      return;
    }

    console.log("\n⚠️  WARNING: This will reset all AI-denied links back to pending status.");
    console.log("   This action cannot be undone, but you can re-run the AI agent later.");
    
    // In a real scenario, you might want to add a confirmation prompt
    // For now, we'll proceed with confirm: true
    
    console.log("\n🚀 Resetting AI-denied links...");
    const result = await client.mutation(api.procurementUrls.resetAiDeniedLinks, {
      confirm: true,
    });

    console.log(`\n✅ ${result.message}`);
    console.log(`   Reset ${result.reset} links back to pending status.`);
    
    // Show updated stats
    const newStats = await client.query(api.procurementUrls.getStats, {});
    console.log(`\n📊 Updated stats:`, newStats);
    
  } catch (error) {
    console.error("❌ Error resetting AI-denied links:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

// Run the migration
resetAiDeniedLinks()
  .then(() => {
    console.log("\n✨ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    process.exit(1);
  });

