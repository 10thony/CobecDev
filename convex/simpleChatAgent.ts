"use node";

import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

// System prompt for procurement assistance
const PROCUREMENT_SYSTEM_PROMPT = `You are a helpful Procurement Data Intelligence Agent. 
Your role is to assist users in identifying government procurement, bidding, and RFP portals.

Keep your responses clear and helpful. When users ask about procurement links:
- Provide helpful guidance about finding official government procurement portals
- Suggest common URL patterns for .gov sites
- Remind users to verify links before use

Be conversational and helpful. Do not output JSON unless specifically asked.`;

// Simple agent without tools for MVP
export const simpleChatAgent = new Agent(components.agent, {
  name: "Procurement Chat Assistant",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: PROCUREMENT_SYSTEM_PROMPT,
  // No tools for MVP - just plain chat
});
