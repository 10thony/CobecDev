#!/usr/bin/env bun
/**
 * extract-source-urls.ts
 * Extracts all unique source URLs from leads for review
 * 
 * Usage:
 *   bun run scripts/extract-source-urls.ts
 * 
 * Environment Variables:
 *   CONVEX_URL or VITE_CONVEX_URL - Your Convex deployment URL (required)
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";

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

async function main() {
  console.log(`🔗 Connecting to Convex at: ${CONVEX_URL}`);
  console.log("📊 Fetching all source URLs from leads...\n");

  try {
    // Use the lighter getAllSourceUrls query instead
    console.log("⏳ Querying database (this may take a moment)...");
    
    const startTime = Date.now();
    const urls = await client.query(api.leads.getAllSourceUrls, {});
    const queryTime = Date.now() - startTime;

    if (!urls || urls.length === 0) {
      console.log("⚠️  No source URLs found in leads");
      return;
    }

    console.log(`✅ Found ${urls.length} unique source URLs (query took ${queryTime}ms)\n`);
    
    // Sort URLs for easier review
    urls.sort();

    // Output JSON first (most important) - write to console immediately
    console.log("=".repeat(80));
    console.log("SOURCE URLS (stringified list):");
    console.log("=".repeat(80));
    console.log(JSON.stringify(urls, null, 2));
    console.log("=".repeat(80));
    
    // Also output as a simple newline-separated list for easy copy-paste
    console.log("\n📋 Simple list (one per line):");
    console.log("-".repeat(80));
    for (const url of urls) {
      console.log(url);
    }
    console.log("-".repeat(80));

    // Group by domain for easier analysis (do this last since it's less critical)
    console.log("\n🌐 URLs grouped by domain:");
    console.log("-".repeat(80));
    const domainMap = new Map<string, string[]>();
    urls.forEach(url => {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        if (!domainMap.has(domain)) {
          domainMap.set(domain, []);
        }
        domainMap.get(domain)!.push(url);
      } catch (e) {
        // Invalid URL, skip
      }
    });

    const sortedDomains = Array.from(domainMap.entries()).sort((a, b) => b[1].length - a[1].length);
    for (const [domain, domainUrls] of sortedDomains) {
      console.log(`\n${domain} (${domainUrls.length} URLs):`);
      for (const url of domainUrls) {
        console.log(`  - ${url}`);
      }
    }

  } catch (error) {
    console.error("❌ Error fetching source URLs:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

main();
