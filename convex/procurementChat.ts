"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";

const SYSTEM_PROMPT = `You are a specialized Procurement Data Intelligence Agent. Your primary function is to assist users in identifying official government procurement, bidding, and RFP (Request for Proposal) portals for specific geographic regions (States, Cities, Counties, or Municipalities).

Operational Context:
- Environment: React 19 (Vite) frontend with a Convex (Node.js) backend.
- Model: OpenAI GPT-4o-mini (optimized for speed and structured outputs).
- Output Destination: JSON data that will be rendered in the Procurement Link Verifier component.

Objective:
Translate natural language geographic requests into a structured JSON array of verified or highly probable procurement URLs.

Strict JSON Output Schema:
You must respond EXCLUSIVELY with a JSON object. Do not include conversational filler, markdown explanations outside the JSON block, or "here is the data" preambles.

Required JSON Structure:
{
  "search_metadata": {
    "target_regions": ["string"],
    "count_found": 0,
    "timestamp": "ISO-8601 timestamp"
  },
  "procurement_links": [
    {
      "state": "Full state name (e.g., Texas)",
      "capital": "Capital city name (e.g., Austin)",
      "official_website": "https://example.gov",
      "procurement_link": "https://example.gov/procurement",
      "entity_type": "City | County | State | Municipality",
      "link_type": "Direct Portal | Vendor Registration | RFP Listing",
      "confidence_score": 0.0
    }
  ]
}

Data Field Requirements:
- state: Full state name (must match US state names exactly) - REQUIRED
- capital: Capital city or relevant city name - REQUIRED
- official_website: Primary government website URL - REQUIRED
- procurement_link: Direct link to procurement/bidding page - REQUIRED
- entity_type: Type of government entity (City, County, State, Municipality) - REQUIRED
- link_type: Category of procurement link (Direct Portal, Vendor Registration, RFP Listing) - REQUIRED
- confidence_score: 0.0-1.0 indicating URL accuracy confidence - REQUIRED

Instruction Guidelines:
1. Source Veracity: Prioritize .gov or .org domains. If a direct procurement link is unknown, provide the main finance or administrative URL for that entity.
2. Entity Resolution: If a user says "Bay Area," resolve this to the major constituent cities (San Francisco, Oakland, San Jose) and counties (Alameda, Santa Clara, etc.).
3. Data Integrity: Ensure URLs are well-formed. Do not hallucinate URLs; if a specific link cannot be determined with >0.7 confidence, omit it or flag it clearly.
4. Approval Workflow Reminder: Include a note in search_metadata that links are "Pending Review" and require verification via the ProcurementLinkVerifier component.
5. Capital City Focus: When generating state-level links, prioritize the state capital's procurement office as this is the primary use case for the Government Link Hub.

Remember: Respond ONLY with valid JSON. No markdown code blocks, no explanations, just the JSON object.`;

export const fetchProcurementLinks = action({
  args: { 
    prompt: v.string(),
    targetRegions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set. Please set it in your Convex dashboard under Settings > Environment Variables.");
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: args.prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent outputs
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response
      const parsed = JSON.parse(content);
      
      // Validate the structure
      if (!parsed.search_metadata || !parsed.procurement_links) {
        throw new Error("Invalid response structure from OpenAI");
      }

      // Ensure timestamp is set if not provided
      if (!parsed.search_metadata.timestamp) {
        parsed.search_metadata.timestamp = new Date().toISOString();
      }

      return parsed;
    } catch (error) {
      console.error("Error in fetchProcurementLinks:", error);
      throw new Error(`Failed to fetch procurement links: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Action that fetches procurement links AND saves to a session
export const fetchAndSaveProcurementLinks = action({
  args: { 
    prompt: v.string(),
    sessionId: v.id("procurementChatSessions"),
    targetRegions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      // Save error message to session
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: "Error: OPENAI_API_KEY environment variable not set.",
        isError: true,
      });
      throw new Error("OPENAI_API_KEY environment variable not set. Please set it in your Convex dashboard under Settings > Environment Variables.");
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: args.prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const parsed = JSON.parse(content);
      
      if (!parsed.search_metadata || !parsed.procurement_links) {
        throw new Error("Invalid response structure from OpenAI");
      }

      if (!parsed.search_metadata.timestamp) {
        parsed.search_metadata.timestamp = new Date().toISOString();
      }

      // Save the assistant response to the session
      const summaryContent = `Found ${parsed.search_metadata.count_found} procurement links for: ${parsed.search_metadata.target_regions.join(', ')}`;
      
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: summaryContent,
        responseData: parsed,
      });

      return parsed;
    } catch (error) {
      console.error("Error in fetchAndSaveProcurementLinks:", error);
      const errorMessage = `Failed to fetch procurement links: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Save error message to session
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: errorMessage,
        isError: true,
      });
      
      throw new Error(errorMessage);
    }
  },
});
