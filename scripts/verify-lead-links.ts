#!/usr/bin/env bun
/**
 * verify-lead-links.ts
 * Runs the Lead Link Verifier Workflow to verify and improve lead source URLs
 * 
 * Usage:
 *   bun run scripts/verify-lead-links.ts [options]
 * 
 * Options:
 *   --batch-size <n>    Number of leads per batch (default: 10)
 *   --max-batches <n>   Maximum batches to process (default: unlimited)
 *   --order <order>     Processing order: "newest_first" or "oldest_first" (default: newest_first)
 *   --test              Run a quick test on 5 leads without full workflow
 *   --single <id>       Verify a single lead by ID
 *   --status <id>       Check status of a verification job
 *   --help              Show this help message
 * 
 * Environment Variables:
 *   CONVEX_URL or VITE_CONVEX_URL - Your Convex deployment URL (required)
 * 
 * Examples:
 *   bun run scripts/verify-lead-links.ts --test
 *   bun run scripts/verify-lead-links.ts --batch-size 20 --max-batches 5
 *   bun run scripts/verify-lead-links.ts --single j975vw7qz7x8h3n9h0j5k4m6n8p
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL environment variable is required");
  console.error("   Set it in your .env.local file or export it:");
  console.error("   export CONVEX_URL='http://127.0.0.1:3210'");
  console.error("   or");
  console.error("   export CONVEX_URL='https://your-deployment.convex.cloud'");
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

// Parse command line arguments
function parseArgs(): {
  batchSize: number;
  maxBatches?: number;
  order: "newest_first" | "oldest_first";
  test: boolean;
  single?: string;
  status?: string;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    batchSize: 10,
    maxBatches: undefined as number | undefined,
    order: "newest_first" as "newest_first" | "oldest_first",
    test: false,
    single: undefined as string | undefined,
    status: undefined as string | undefined,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--test") {
      result.test = true;
    } else if (arg === "--batch-size" && args[i + 1]) {
      result.batchSize = parseInt(args[++i], 10);
    } else if (arg === "--max-batches" && args[i + 1]) {
      result.maxBatches = parseInt(args[++i], 10);
    } else if (arg === "--order" && args[i + 1]) {
      const order = args[++i];
      if (order === "newest_first" || order === "oldest_first") {
        result.order = order;
      }
    } else if (arg === "--single" && args[i + 1]) {
      result.single = args[++i];
    } else if (arg === "--status" && args[i + 1]) {
      result.status = args[++i];
    }
  }

  return result;
}

function showHelp() {
  console.log(`
Lead Link Verifier - Verify and improve lead source URLs

Usage:
  bun run scripts/verify-lead-links.ts [options]

Options:
  --batch-size <n>    Number of leads per batch (default: 10)
  --max-batches <n>   Maximum batches to process (default: unlimited)
  --order <order>     Processing order: "newest_first" or "oldest_first" (default: newest_first)
  --test              Run a quick test on 5 leads without full workflow
  --single <id>       Verify a single lead by ID
  --status <id>       Check status of a verification job
  --help              Show this help message

Examples:
  # Run a quick test on 5 leads
  bun run scripts/verify-lead-links.ts --test

  # Verify leads in batches of 20, max 5 batches
  bun run scripts/verify-lead-links.ts --batch-size 20 --max-batches 5

  # Verify a single lead
  bun run scripts/verify-lead-links.ts --single j975vw7qz7x8h3n9h0j5k4m6n8p

  # Check job status
  bun run scripts/verify-lead-links.ts --status j975vw7qz7x8h3n9h0j5k4m6n8p
  `);
}

async function checkJobStatus(jobId: string) {
  console.log(`📊 Checking status of job: ${jobId}\n`);

  try {
    const stats = await client.query(api.leadLinkVerifierQueries.getVerificationJobStats, {
      jobId: jobId as Id<"leadLinkVerificationJobs">,
    });

    if (!stats) {
      console.error("❌ Job not found");
      return;
    }

    const { job, stats: jobStats } = stats;

    console.log("=".repeat(60));
    console.log("JOB STATUS");
    console.log("=".repeat(60));
    console.log(`Status: ${job.status}`);
    console.log(`Batch Size: ${job.batchSize}`);
    console.log(`Processing Order: ${job.processingOrder}`);
    console.log(`Current Task: ${job.currentTask || "N/A"}`);
    console.log(`Current Batch: ${job.currentBatch || 0}`);
    console.log("");
    console.log("PROGRESS:");
    console.log(`  Total Leads: ${job.totalLeads}`);
    console.log(`  Processed: ${job.processedCount}`);
    console.log(`  Updated: ${job.updatedCount}`);
    console.log(`  Skipped: ${job.skippedCount}`);
    console.log(`  Failed: ${job.failedCount}`);
    console.log("");
    console.log("DETAILED STATS:");
    console.log(`  Results Recorded: ${jobStats.total}`);
    console.log(`  Avg Duration: ${jobStats.averageDurationMs}ms per lead`);
    console.log(`  Avg Quality Improvement: ${(jobStats.averageQualityImprovement * 100).toFixed(1)}%`);
    console.log("");
    console.log("TIMING:");
    console.log(`  Started: ${new Date(job.startedAt).toISOString()}`);
    console.log(`  Last Activity: ${new Date(job.lastActivityAt).toISOString()}`);
    if (job.completedAt) {
      console.log(`  Completed: ${new Date(job.completedAt).toISOString()}`);
    }
    console.log("=".repeat(60));

    if (job.lastError) {
      console.log(`\n⚠️  Last Error: ${job.lastError}`);
    }

  } catch (error) {
    console.error("❌ Error checking job status:", error);
  }
}

async function verifySingleLead(leadId: string) {
  console.log(`🔍 Verifying single lead: ${leadId}\n`);

  try {
    const result = await client.action(api.leadLinkVerifierActions.verifySingleLead, {
      leadId: leadId as Id<"leads">,
    });

    console.log("=".repeat(60));
    console.log("VERIFICATION RESULT");
    console.log("=".repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Result: ${result.result}`);
    console.log(`Original URL: ${result.originalUrl}`);
    if (result.newUrl) {
      console.log(`New URL: ${result.newUrl}`);
    }
    console.log(`Reasoning: ${result.reasoning}`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Error verifying lead:", error);
  }
}

async function runTest(batchSize: number, order: "newest_first" | "oldest_first") {
  console.log(`🧪 Running test verification on ${batchSize} leads...\n`);

  try {
    const result = await client.action(api.leadLinkVerifierWorkflow.testVerification, {
      batchSize,
      order,
    });

    console.log("=".repeat(80));
    console.log("TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Success: ${result.success}`);
    console.log(`Leads Tested: ${result.results.length}\n`);

    for (const r of result.results) {
      console.log("-".repeat(80));
      console.log(`Lead ID: ${r.leadId}`);
      console.log(`Title: ${r.title}`);
      console.log(`Result: ${r.result}`);
      console.log(`Original URL: ${r.originalUrl}`);
      if (r.newUrl) {
        console.log(`New URL: ${r.newUrl}`);
      }
      console.log(`Reasoning: ${r.reasoning}`);
    }

    console.log("=".repeat(80));

    // Summary
    const updated = result.results.filter((r) => r.result === "updated").length;
    const skipped = result.results.filter((r) => r.result === "skipped").length;
    const failed = result.results.filter((r) => r.result === "failed").length;
    const noChange = result.results.filter((r) => r.result === "no_change").length;

    console.log("\nSUMMARY:");
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped (good URLs): ${skipped}`);
    console.log(`  No Change: ${noChange}`);
    console.log(`  Failed: ${failed}`);

  } catch (error) {
    console.error("❌ Error running test:", error);
  }
}

async function startFullVerification(
  batchSize: number,
  maxBatches: number | undefined,
  order: "newest_first" | "oldest_first"
) {
  console.log("🚀 Starting full verification workflow...\n");
  console.log(`  Batch Size: ${batchSize}`);
  console.log(`  Max Batches: ${maxBatches || "unlimited"}`);
  console.log(`  Order: ${order}`);
  console.log("");

  try {
    const result = await client.action(api.leadLinkVerifierWorkflow.startVerification, {
      batchSize,
      maxBatches,
      order,
      startedBy: "cli_script",
    });

    console.log("=".repeat(60));
    console.log("WORKFLOW STARTED");
    console.log("=".repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Job ID: ${result.jobId}`);
    console.log(`Message: ${result.message}`);
    console.log("=".repeat(60));

    console.log("\n📌 To check progress, run:");
    console.log(`   bun run scripts/verify-lead-links.ts --status ${result.jobId}`);

    // Start polling for status
    console.log("\n⏳ Monitoring progress (press Ctrl+C to stop monitoring)...\n");

    let lastStatus = "";
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds

      const stats = await client.query(api.leadLinkVerifierQueries.getVerificationJobStats, {
        jobId: result.jobId,
      });

      if (!stats) {
        console.log("❌ Job not found");
        break;
      }

      const { job } = stats;
      const currentStatus = `[${job.status}] Batch ${job.currentBatch || 0}: ${job.processedCount}/${job.totalLeads} processed (${job.updatedCount} updated, ${job.skippedCount} skipped, ${job.failedCount} failed)`;

      if (currentStatus !== lastStatus) {
        console.log(currentStatus);
        lastStatus = currentStatus;
      }

      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        console.log("\n✅ Workflow finished!");
        break;
      }
    }

  } catch (error) {
    console.error("❌ Error starting verification:", error);
  }
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  console.log(`🔗 Connecting to Convex at: ${CONVEX_URL}\n`);

  if (args.status) {
    await checkJobStatus(args.status);
  } else if (args.single) {
    await verifySingleLead(args.single);
  } else if (args.test) {
    await runTest(args.batchSize, args.order);
  } else {
    await startFullVerification(args.batchSize, args.maxBatches, args.order);
  }

  // Close the client
  await client.close();
}

main().catch(console.error);
