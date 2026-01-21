/**
 * Script to remove duplicate system prompts
 * Groups prompts by exact title match or same state in title
 * Keeps only the prompt with the largest character count in each group
 * 
 * Run with: npx tsx scripts/remove-duplicate-system-prompts.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Get Convex URL from environment or use default
const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: VITE_CONVEX_URL or CONVEX_URL environment variable not set");
  console.log("Please set your Convex URL:");
  console.log("  export VITE_CONVEX_URL=https://your-deployment.convex.cloud");
  process.exit(1);
}

async function removeDuplicates() {
  const client = new ConvexHttpClient(CONVEX_URL);
  
  try {
    console.log("🔍 Analyzing system prompts for duplicates...");
    console.log("");
    
    const result = await client.mutation(api.chatSystemPrompts.removeDuplicateSystemPrompts, {});
    
    console.log("📊 Results:");
    console.log(`   Total prompts analyzed: ${result.totalPrompts}`);
    console.log(`   Groups found: ${result.groupsFound}`);
    console.log(`   Prompts deleted: ${result.promptsDeleted}`);
    console.log("");
    
    if (result.groupsFound === 0) {
      console.log("✅ No duplicate groups found. All prompts are unique.");
    } else {
      console.log("📋 Group Details:");
      result.groups.forEach((group, index) => {
        console.log(`\n   Group ${index + 1}: ${group.groupKey}`);
        console.log(`   - Prompts in group: ${group.promptsInGroup}`);
        console.log(`   - Kept prompt ID: ${group.keptPromptId}`);
        console.log(`   - Deleted prompt IDs: ${group.deletedPromptIds.join(", ")}`);
      });
      
      if (result.promptsDeleted > 0) {
        console.log("");
        console.log(`✅ Successfully removed ${result.promptsDeleted} duplicate prompt${result.promptsDeleted > 1 ? 's' : ''}.`);
      }
    }
  } catch (error) {
    console.error("❌ Error removing duplicates:", error);
    process.exit(1);
  }
}

removeDuplicates();
