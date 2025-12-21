import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Default system prompt - used if no prompt exists in the database
export const DEFAULT_SYSTEM_PROMPT = `You are a specialized Procurement Data Intelligence Agent. Your primary function is to assist users in identifying official government procurement, bidding, and RFP (Request for Proposal) portals for specific geographic regions (States, Cities, Counties, or Municipalities).

Operational Context:
- Environment: React 19 (Vite) frontend with a Convex (Node.js) backend.
- Model: OpenAI GPT-5-mini (optimized for speed and structured outputs).
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
- capital: The ACTUAL city name that matches the URL domain - REQUIRED. This must be the city whose government website the link belongs to, NOT just the state capital.
- official_website: Primary government website URL - REQUIRED
- procurement_link: Direct link to procurement/bidding page - REQUIRED
- entity_type: Type of government entity (City, County, State, Municipality) - REQUIRED
- link_type: Category of procurement link (Direct Portal, Vendor Registration, RFP Listing) - REQUIRED
- confidence_score: 0.0-1.0 indicating URL accuracy confidence - REQUIRED

CRITICAL CITY-URL MATCHING RULES:
1. URL City Parsing: Extract the city name from the URL domain (e.g., "orlando.gov" → "Orlando", "cityofsanantonio.gov" → "San Antonio").

2. City Field Validation: The "capital" field MUST reflect the actual city from the URL, not the state's capital city:
   - If the URL domain contains a city name that differs from the state capital, use the city from the URL
   - If parsing fails or the URL is a state-level domain (e.g., "colorado.gov"), default to the state capital

3. For STATE-LEVEL links (entity_type: "State"):
   - If the link is for the entire state (e.g., state.gov domains), the "capital" field should be the state capital city name
   - Clearly indicate entity_type as "State"

4. For CITY-LEVEL links (entity_type: "City"):
   - The "capital" field MUST be the actual city name parsed from the URL
   - If the URL domain contains a city name that is NOT the state capital, update the "capital" field to match the URL

5. URL Pattern Examples for City Extraction:
   - "{cityname}.gov" → Use cityname
   - "cityof{cityname}.gov" → Use cityname
   - "{cityname}gov.org" → Use cityname
   - "{cityname}-{state}.gov" → Use cityname
   - For unrecognized patterns, use contextual clues from the URL path or subdomain

Instruction Guidelines:
1. Source Veracity: Prioritize .gov or .org domains. If a direct procurement link is unknown, provide the main finance or administrative URL for that entity.
2. Entity Resolution: If a user says "Bay Area," resolve this to the major constituent cities (San Francisco, Oakland, San Jose) and counties (Alameda, Santa Clara, etc.).
3. Data Integrity: Ensure URLs are well-formed. Do not hallucinate URLs; if a specific link cannot be determined with >0.7 confidence, omit it or flag it clearly.
4. Approval Workflow Reminder: Include a note in search_metadata that links are "Pending Review" and require verification via the ProcurementLinkVerifier component.
5. URL-City Validation: Before returning a link, verify that the city name in the "capital" field matches the city name parsed from the URL domain. If they don't match, correct the city name to match the URL.

Remember: Respond ONLY with valid JSON. No markdown code blocks, no explanations, just the JSON object.`;

// Get all system prompts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const prompts = await ctx.db
      .query("procurementChatSystemPrompts")
      .order("desc")
      .collect();
    return prompts;
  },
});

// Get the primary/active system prompt
export const getPrimary = query({
  args: {},
  handler: async (ctx) => {
    const primary = await ctx.db
      .query("procurementChatSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    return primary;
  },
});

// Internal query for getting the primary prompt (for use in actions)
export const getPrimaryInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const primary = await ctx.db
      .query("procurementChatSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    return primary;
  },
});

// Get a single prompt by ID
export const get = query({
  args: { id: v.id("procurementChatSystemPrompts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new system prompt
export const create = mutation({
  args: {
    systemPromptText: v.string(),
    isPrimarySystemPrompt: v.boolean(),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // If this is being set as primary, unset any existing primary
    if (args.isPrimarySystemPrompt) {
      const existingPrimary = await ctx.db
        .query("procurementChatSystemPrompts")
        .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
        .first();
      
      if (existingPrimary) {
        await ctx.db.patch(existingPrimary._id, {
          isPrimarySystemPrompt: false,
          updatedAt: now,
        });
      }
    }
    
    const id = await ctx.db.insert("procurementChatSystemPrompts", {
      systemPromptText: args.systemPromptText,
      isPrimarySystemPrompt: args.isPrimarySystemPrompt,
      title: args.title,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
    
    return id;
  },
});

// Update an existing system prompt
export const update = mutation({
  args: {
    id: v.id("procurementChatSystemPrompts"),
    systemPromptText: v.optional(v.string()),
    isPrimarySystemPrompt: v.optional(v.boolean()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { id, ...updates } = args;
    
    // If setting as primary, unset any existing primary
    if (updates.isPrimarySystemPrompt) {
      const existingPrimary = await ctx.db
        .query("procurementChatSystemPrompts")
        .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
        .first();
      
      if (existingPrimary && existingPrimary._id !== id) {
        await ctx.db.patch(existingPrimary._id, {
          isPrimarySystemPrompt: false,
          updatedAt: now,
        });
      }
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });
    
    return id;
  },
});

// Delete a system prompt
export const remove = mutation({
  args: { id: v.id("procurementChatSystemPrompts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Set a prompt as the primary prompt
export const setPrimary = mutation({
  args: { id: v.id("procurementChatSystemPrompts") },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Unset any existing primary
    const existingPrimary = await ctx.db
      .query("procurementChatSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    
    if (existingPrimary) {
      await ctx.db.patch(existingPrimary._id, {
        isPrimarySystemPrompt: false,
        updatedAt: now,
      });
    }
    
    // Set the new primary
    await ctx.db.patch(args.id, {
      isPrimarySystemPrompt: true,
      updatedAt: now,
    });
    
    return args.id;
  },
});

// Initialize with default prompt if none exists
export const initializeDefault = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("procurementChatSystemPrompts")
      .first();
    
    if (existing) {
      return { created: false, id: existing._id };
    }
    
    const now = Date.now();
    const id = await ctx.db.insert("procurementChatSystemPrompts", {
      systemPromptText: DEFAULT_SYSTEM_PROMPT,
      isPrimarySystemPrompt: true,
      title: "Default Procurement Agent Prompt",
      description: "The default system prompt for the Procurement Data Intelligence Agent. Optimized for finding government procurement portals with accurate URL-city matching.",
      createdAt: now,
      updatedAt: now,
    });
    
    return { created: true, id };
  },
});
