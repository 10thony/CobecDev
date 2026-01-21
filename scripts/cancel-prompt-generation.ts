/**
 * Quick script to cancel running prompt generation
 * Run with: npx tsx scripts/cancel-prompt-generation.ts
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

async function cancelGeneration() {
  const client = new ConvexHttpClient(CONVEX_URL);
  
  try {
    console.log("Cancelling prompt generation...");
    await client.mutation(api.chatSystemPrompts.setPromptGenerationCancelled, {
      cancelled: true,
    });
    console.log("✅ Cancellation flag set. The action will stop at the next state.");
    console.log("Note: The current state being processed will finish, then it will stop.");
  } catch (error) {
    console.error("Error cancelling generation:", error);
    process.exit(1);
  }
}

cancelGeneration();
