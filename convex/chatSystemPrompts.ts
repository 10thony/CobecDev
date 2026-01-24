import { query, mutation, internalQuery, action, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Pricing constants (in cents per 1K tokens) - updated with latest OpenAI pricing
interface ModelPricing {
  input: number;
  output: number;
}

const MODEL_PRICING: Record<string, Record<string, ModelPricing>> = {
  "openai": {
    "gpt-4o-mini": { input: 0.015, output: 0.060 }, // $0.15/1M in, $0.60/1M out (legacy pricing)
    "gpt-5-mini": { input: 0.025, output: 0.200 }, // $0.250/1M in, $2.000/1M out
    "gpt-5.2": { input: 0.175, output: 1.400 }, // $1.750/1M in, $14.000/1M out
    "gpt-5.2-pro": { input: 2.100, output: 16.800 }, // $21.00/1M in, $168.00/1M out
    "gpt-4o": { input: 0.250, output: 1.000 }, // $2.50/1M in, $10/1M out
    "gpt-4-turbo": { input: 1.000, output: 3.000 }, // $10/1M in, $30/1M out
  },
  "anthropic": {
    "claude-3-5-sonnet": { input: 0.300, output: 1.500 }, // $3/1M in, $15/1M out
    "claude-3-haiku": { input: 0.025, output: 0.125 }, // $0.25/1M in, $1.25/1M out
  },
};

// Default pricing for unknown models (gpt-5-mini pricing)
const DEFAULT_PRICING: ModelPricing = { input: 0.025, output: 0.200 };

// Calculate cost in cents
function calculateCost(tokens: number, pricePerK: number): number {
  return Math.round((tokens / 1000) * pricePerK * 100) / 100; // Round to 2 decimal cents
}

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
  args: {
    typeId: v.optional(v.id("chatSystemPromptTypes")), // Optional filter by type
  },
  handler: async (ctx, args) => {
    if (args.typeId) {
      return await ctx.db
        .query("chatSystemPrompts")
        .withIndex("by_type", (q) => q.eq("type", args.typeId!))
        .order("desc")
        .collect();
    }
    const prompts = await ctx.db
      .query("chatSystemPrompts")
      .order("desc")
      .collect();
    return prompts;
  },
});

// Get the primary/active system prompt for a specific type
export const getPrimary = query({
  args: {
    typeId: v.optional(v.id("chatSystemPromptTypes")), // Optional: get primary for specific type
  },
  handler: async (ctx, args) => {
    if (args.typeId) {
      return await ctx.db
        .query("chatSystemPrompts")
        .withIndex("by_type_primary", (q) => 
          q.eq("type", args.typeId!).eq("isPrimarySystemPrompt", true)
        )
        .first();
    }
    // Get any primary prompt if no type specified
    const primary = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    return primary;
  },
});

// Internal query for getting the primary prompt (for use in actions)
export const getPrimaryInternal = internalQuery({
  args: {
    typeId: v.optional(v.id("chatSystemPromptTypes")),
  },
  handler: async (ctx, args) => {
    if (args.typeId) {
      return await ctx.db
        .query("chatSystemPrompts")
        .withIndex("by_type_primary", (q) => 
          q.eq("type", args.typeId!).eq("isPrimarySystemPrompt", true)
        )
        .first();
    }
    const primary = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    return primary;
  },
});

// Get a single prompt by ID
export const get = query({
  args: { id: v.id("chatSystemPrompts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Internal query for getting a prompt by ID (for use in actions)
export const getByIdInternal = internalQuery({
  args: { id: v.id("chatSystemPrompts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get the full system prompt with all approved links included (for copying to clipboard)
 * This always includes the complete list of approved links, not summaries
 * For default prompts (no state name), includes both procurement links and lead source links
 */
export const getFullPromptWithLinks = query({
  args: {
    promptId: v.optional(v.id("chatSystemPrompts")), // Optional: specific prompt, otherwise uses primary
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Get the system prompt
    let prompt;
    if (args.promptId) {
      prompt = await ctx.db.get(args.promptId);
    } else {
      prompt = await ctx.db
        .query("chatSystemPrompts")
        .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
        .first();
    }
    
    if (!prompt) {
      return DEFAULT_SYSTEM_PROMPT;
    }
    
    let basePrompt = prompt.systemPromptText;
    
    // Check if this is a default prompt (no state name in title)
    const stateName = extractStateFromTitle(prompt.title);
    const isDefaultPrompt = !stateName;
    
    // Get approved procurement links
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    const approvedLinks: ApprovedLink[] = lookup?.approvedProcurementLinks || [];
    
    // For default prompts, get ALL links (procurement + lead source)
    // For state-specific prompts, only get procurement links (lead source links are already in the prompt)
    if (isDefaultPrompt) {
      // Get ALL approved procurement links (not from lookup, directly from DB for completeness)
      const allApprovedLinks = await ctx.db
        .query("procurementUrls")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .collect();
      
      const formattedProcurementLinks: ApprovedLink[] = allApprovedLinks.map((link) => ({
        state: link.state,
        capital: link.capital,
        officialWebsite: "",
        procurementLink: link.procurementLink,
        entityType: null,
        linkType: null,
        requiresRegistration: link.requiresRegistration ?? null,
      }));
      
      // Get ALL lead source links
      const allLeadSourceLinks = await getAllLeadSourceLinks(ctx);
      
      // Remove any existing sections
      basePrompt = removeExistingApprovedLinksSection(basePrompt);
      basePrompt = removeExistingLeadSourceLinksSection(basePrompt);
      
      // Format and inject procurement links
      if (formattedProcurementLinks.length > 0) {
        const procurementLinksSection = formatApprovedLinksForPromptFull(formattedProcurementLinks);
        basePrompt = injectApprovedLinksIntoPrompt(basePrompt, procurementLinksSection);
      }
      
      // Format and inject lead source links
      if (allLeadSourceLinks.length > 0) {
        const leadSourceLinksSection = formatLeadSourceLinksForDefaultPrompt(allLeadSourceLinks);
        basePrompt = injectLeadSourceLinksIntoPrompt(basePrompt, leadSourceLinksSection);
      }
    } else {
      // For state-specific prompts, only add procurement links if they're not already in the prompt
      // (The prompt should already have state-specific links from updateAllPromptsWithStateData)
      // But for copying, we'll use what's already in the prompt text
      // This ensures we copy exactly what's stored, including any state-specific lead source links
      return basePrompt;
    }
    
    return basePrompt;
  },
});

/**
 * Internal query version of getFullPromptWithLinks (to avoid circular type references)
 */
export const getFullPromptWithLinksInternal = internalQuery({
  args: {
    promptId: v.optional(v.id("chatSystemPrompts")),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Get the system prompt
    let prompt;
    if (args.promptId) {
      prompt = await ctx.db.get(args.promptId);
    } else {
      prompt = await ctx.db
        .query("chatSystemPrompts")
        .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
        .first();
    }
    
    if (!prompt) {
      return DEFAULT_SYSTEM_PROMPT;
    }
    
    let basePrompt = prompt.systemPromptText;
    
    // Check if this is a default prompt (no state name in title)
    const stateName = extractStateFromTitle(prompt.title);
    const isDefaultPrompt = !stateName;
    
    // For default prompts, get ALL links (procurement + lead source)
    // For state-specific prompts, return what's already in the prompt
    if (isDefaultPrompt) {
      // Get ALL approved procurement links
      const allApprovedLinks = await ctx.db
        .query("procurementUrls")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .collect();
      
      const formattedProcurementLinks: ApprovedLink[] = allApprovedLinks.map((link) => ({
        state: link.state,
        capital: link.capital,
        officialWebsite: "",
        procurementLink: link.procurementLink,
        entityType: null,
        linkType: null,
        requiresRegistration: link.requiresRegistration ?? null,
      }));
      
      // Get ALL lead source links
      const allLeadSourceLinks = await getAllLeadSourceLinks(ctx);
      
      // Remove any existing sections
      basePrompt = removeExistingApprovedLinksSection(basePrompt);
      basePrompt = removeExistingLeadSourceLinksSection(basePrompt);
      
      // Format and inject procurement links
      if (formattedProcurementLinks.length > 0) {
        const procurementLinksSection = formatApprovedLinksForPromptFull(formattedProcurementLinks);
        basePrompt = injectApprovedLinksIntoPrompt(basePrompt, procurementLinksSection);
      }
      
      // Format and inject lead source links
      if (allLeadSourceLinks.length > 0) {
        const leadSourceLinksSection = formatLeadSourceLinksForDefaultPrompt(allLeadSourceLinks);
        basePrompt = injectLeadSourceLinksIntoPrompt(basePrompt, leadSourceLinksSection);
      }
    }
    
    return basePrompt;
  },
});

/**
 * Action to get the full system prompt with all links (for copying to clipboard)
 * This wraps the internal query so it can be called from actions/handlers
 */
export const getFullPromptWithLinksAction = action({
  args: {
    promptId: v.optional(v.id("chatSystemPrompts")),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    return await ctx.runQuery(internal.chatSystemPrompts.getFullPromptWithLinksInternal, {
      promptId: args.promptId,
    });
  },
});

// Create a new system prompt
export const create = mutation({
  args: {
    systemPromptText: v.string(),
    isPrimarySystemPrompt: v.boolean(),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.id("chatSystemPromptTypes"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // If this is being set as primary, unset any existing primary for this type
    if (args.isPrimarySystemPrompt) {
      const existingPrimary = await ctx.db
        .query("chatSystemPrompts")
        .withIndex("by_type_primary", (q) => 
          q.eq("type", args.type).eq("isPrimarySystemPrompt", true)
        )
        .first();
      
      if (existingPrimary) {
        await ctx.db.patch(existingPrimary._id, {
          isPrimarySystemPrompt: false,
          updatedAt: now,
        });
      }
    }
    
    const id = await ctx.db.insert("chatSystemPrompts", {
      systemPromptText: args.systemPromptText,
      isPrimarySystemPrompt: args.isPrimarySystemPrompt,
      title: args.title,
      description: args.description,
      type: args.type,
      createdAt: now,
      updatedAt: now,
    });
    
    return id;
  },
});

// Update an existing system prompt
export const update = mutation({
  args: {
    id: v.id("chatSystemPrompts"),
    systemPromptText: v.optional(v.string()),
    isPrimarySystemPrompt: v.optional(v.boolean()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.id("chatSystemPromptTypes")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { id, ...updates } = args;
    
    const currentPrompt = await ctx.db.get(id);
    if (!currentPrompt) {
      throw new Error("Prompt not found");
    }
    
    const typeId = updates.type ?? currentPrompt.type;
    
    // If setting as primary, unset any existing primary for this type
    if (updates.isPrimarySystemPrompt) {
      const existingPrimary = await ctx.db
        .query("chatSystemPrompts")
        .withIndex("by_type_primary", (q) => 
          q.eq("type", typeId).eq("isPrimarySystemPrompt", true)
        )
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
  args: { id: v.id("chatSystemPrompts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Set a prompt as the primary prompt for its type
export const setPrimary = mutation({
  args: { id: v.id("chatSystemPrompts") },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const prompt = await ctx.db.get(args.id);
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    
    // Unset any existing primary for this type
    const existingPrimary = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_type_primary", (q) => 
        q.eq("type", prompt.type).eq("isPrimarySystemPrompt", true)
      )
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
  args: {
    typeId: v.optional(v.id("chatSystemPromptTypes")), // Optional: initialize for specific type
  },
  handler: async (ctx, args) => {
    // Get or create default type
    let typeId = args.typeId;
    if (!typeId) {
      // Get default type by querying directly
      const types = await ctx.db
        .query("chatSystemPromptTypes")
        .collect();
      const defaultType = types.find(t => t.isDefault) || types[0];
      
      if (!defaultType) {
        // Initialize types first - create them directly
        const now = Date.now();
        const defaultTypes = [
          { name: "basic", displayName: "Basic", description: "Default basic chat system prompt", isDefault: true, order: 0 },
          { name: "leads", displayName: "Leads", description: "System prompt for lead generation", isDefault: false, order: 1 },
          { name: "procurementHubs", displayName: "Procurement Hubs", description: "System prompt for procurement hub discovery", isDefault: false, order: 2 },
        ];
        
        for (const dt of defaultTypes) {
          await ctx.db.insert("chatSystemPromptTypes", {
            ...dt,
            createdAt: now,
            updatedAt: now,
          });
        }
        
        // Get the default type after creation
        const typesAfter = await ctx.db
          .query("chatSystemPromptTypes")
          .collect();
        const defaultTypeAfter = typesAfter.find(t => t.isDefault) || typesAfter[0];
        if (!defaultTypeAfter) {
          throw new Error("Failed to initialize default prompt type");
        }
        typeId = defaultTypeAfter._id;
      } else {
        typeId = defaultType._id;
      }
    }
    
    // Check if a primary prompt already exists for this type
    const existing = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_type_primary", (q) => 
        q.eq("type", typeId).eq("isPrimarySystemPrompt", true)
      )
      .first();
    
    if (existing) {
      return { created: false, id: existing._id };
    }
    
    const now = Date.now();
    const id = await ctx.db.insert("chatSystemPrompts", {
      systemPromptText: DEFAULT_SYSTEM_PROMPT,
      isPrimarySystemPrompt: true,
      title: "Default Procurement Agent Prompt",
      description: "The default system prompt for the Procurement Data Intelligence Agent. Optimized for finding government procurement portals with accurate URL-city matching.",
      type: typeId,
      createdAt: now,
      updatedAt: now,
    });
    
    return { created: true, id };
  },
});

// Type for approved links from lookup table
type ApprovedLink = {
  state: string;
  capital: string;
  officialWebsite: string;
  procurementLink: string;
  entityType: string | null;
  linkType: string | null;
  requiresRegistration: boolean | null;
};

/**
 * Estimate token count from text (approximate: 1 token ≈ 4 characters)
 * This is a rough approximation - actual tokenization varies
 */
function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  // This is conservative and works well for English text
  return Math.ceil(text.length / 4);
}

/**
 * Extract state name from prompt title using simple text matching
 * Returns state name if detected, null otherwise
 */
function extractStateFromTitle(title: string): string | null {
  if (!title) return null;
  
  const titleLower = title.toLowerCase();
  
  // Map of lowercase state names to their proper capitalized form
  // IMPORTANT: Order matters! Longer/more specific names must come first
  // to avoid false matches (e.g., "west virginia" before "virginia")
  const stateMap: Record<string, string> = {
    "district of columbia": "District of Columbia",
    "new hampshire": "New Hampshire",
    "new jersey": "New Jersey",
    "new mexico": "New Mexico",
    "new york": "New York",
    "north carolina": "North Carolina",
    "north dakota": "North Dakota",
    "south carolina": "South Carolina",
    "south dakota": "South Dakota",
    "west virginia": "West Virginia",
    "rhode island": "Rhode Island",
    "alabama": "Alabama",
    "alaska": "Alaska",
    "arizona": "Arizona",
    "arkansas": "Arkansas",
    "california": "California",
    "colorado": "Colorado",
    "connecticut": "Connecticut",
    "delaware": "Delaware",
    "florida": "Florida",
    "georgia": "Georgia",
    "hawaii": "Hawaii",
    "idaho": "Idaho",
    "illinois": "Illinois",
    "indiana": "Indiana",
    "iowa": "Iowa",
    "kansas": "Kansas",
    "kentucky": "Kentucky",
    "louisiana": "Louisiana",
    "maine": "Maine",
    "maryland": "Maryland",
    "massachusetts": "Massachusetts",
    "michigan": "Michigan",
    "minnesota": "Minnesota",
    "mississippi": "Mississippi",
    "missouri": "Missouri",
    "montana": "Montana",
    "nebraska": "Nebraska",
    "nevada": "Nevada",
    "ohio": "Ohio",
    "oklahoma": "Oklahoma",
    "oregon": "Oregon",
    "pennsylvania": "Pennsylvania",
    "tennessee": "Tennessee",
    "texas": "Texas",
    "utah": "Utah",
    "vermont": "Vermont",
    "virginia": "Virginia",
    "washington": "Washington",
    "wisconsin": "Wisconsin",
    "wyoming": "Wyoming"
  };
  
  // Check states in order (longer names first to avoid false matches)
  const stateKeys = Object.keys(stateMap).sort((a, b) => b.length - a.length);
  
  for (const stateKey of stateKeys) {
    if (titleLower.includes(stateKey)) {
      return stateMap[stateKey];
    }
  }
  
  return null;
}

/**
 * Format approved links into a readable section for the system prompt
 * Shows summary if more than 20 links (for runtime injection)
 */
function formatApprovedLinksForPrompt(links: ApprovedLink[]): string {
  if (links.length === 0) return "";
  
  // If we have many links, show summary only
  if (links.length > 20) {
    // Group by state and show summary
    const byState: Record<string, number> = {};
    for (const link of links) {
      byState[link.state] = (byState[link.state] || 0) + 1;
    }
    
    let formatted = "\n\n## ALREADY APPROVED PROCUREMENT LINKS\n";
    formatted += `We have ${links.length} approved procurement links across ${Object.keys(byState).length} states. `;
    formatted += "DO NOT suggest links that are already in our system.\n\n";
    formatted += "**States with approved links:**\n";
    
    // Sort states alphabetically
    const sortedStates = Object.keys(byState).sort();
    for (const state of sortedStates) {
      const count = byState[state];
      formatted += `- ${state}: ${count} link${count > 1 ? 's' : ''}\n`;
    }
    
    formatted += "\nCRITICAL: Before suggesting any procurement link, check if we already have it. ";
    formatted += "If the link already exists in our system, acknowledge that it's already collected.\n";
    
    return formatted;
  }
  
  // Show full details for 20 or fewer links
  // Group by state for better organization
  const byState: Record<string, ApprovedLink[]> = {};
  for (const link of links) {
    if (!byState[link.state]) {
      byState[link.state] = [];
    }
    byState[link.state].push(link);
  }
  
  let formatted = "\n\n## ALREADY APPROVED PROCUREMENT LINKS\n";
  formatted += "The following procurement links have already been collected and approved in our system. ";
  formatted += "DO NOT suggest these links again. If a user requests a link for one of these locations, ";
  formatted += "inform them that we already have it in our system.\n\n";
  
  // Sort states alphabetically
  const sortedStates = Object.keys(byState).sort();
  for (const state of sortedStates) {
    const stateLinks = byState[state];
    formatted += `### ${state}\n`;
    for (const link of stateLinks) {
      formatted += `- **${link.capital}**: ${link.procurementLink}`;
      if (link.requiresRegistration) {
        formatted += " (Requires Registration)";
      }
      formatted += "\n";
    }
    formatted += "\n";
  }
  
  formatted += "CRITICAL: Before suggesting any procurement link, check this list. ";
  formatted += "If the link already exists here, do NOT include it in your response. ";
  formatted += "Instead, acknowledge that the link is already in our system.\n";
  
  return formatted;
}

/**
 * Format approved links with FULL details (always shows all links, never summaries)
 * Used for copying the complete system prompt to clipboard
 */
function formatApprovedLinksForPromptFull(links: ApprovedLink[]): string {
  if (links.length === 0) return "";
  
  // Always show full details, regardless of count
  // Group by state for better organization
  const byState: Record<string, ApprovedLink[]> = {};
  for (const link of links) {
    if (!byState[link.state]) {
      byState[link.state] = [];
    }
    byState[link.state].push(link);
  }
  
  let formatted = "\n\n## ALREADY APPROVED PROCUREMENT LINKS\n";
  formatted += "The following procurement links have already been collected and approved in our system. ";
  formatted += "DO NOT suggest these links again. If a user requests a link for one of these locations, ";
  formatted += "inform them that we already have it in our system.\n\n";
  
  // Sort states alphabetically
  const sortedStates = Object.keys(byState).sort();
  for (const state of sortedStates) {
    const stateLinks = byState[state];
    formatted += `### ${state}\n`;
    for (const link of stateLinks) {
      formatted += `- **${link.capital}**: ${link.procurementLink}`;
      if (link.requiresRegistration) {
        formatted += " (Requires Registration)";
      }
      formatted += "\n";
    }
    formatted += "\n";
  }
  
  formatted += "CRITICAL: Before suggesting any procurement link, check this list. ";
  formatted += "If the link already exists here, do NOT include it in your response. ";
  formatted += "Instead, acknowledge that the link is already in our system.\n";
  
  return formatted;
}

/**
 * Format approved links for a specific state (state-specific version)
 * Always shows full details for the specified state's links
 */
function formatApprovedLinksForState(links: ApprovedLink[], targetState: string): string {
  if (links.length === 0) return "";
  
  // Filter links for the target state
  const stateLinks = links.filter(link => link.state === targetState);
  
  if (stateLinks.length === 0) return "";
  
  let formatted = "\n\n## ALREADY APPROVED PROCUREMENT LINKS\n";
  formatted += `The following procurement links for ${targetState} have already been collected and approved in our system. `;
  formatted += "DO NOT suggest these links again. If a user requests a link for one of these locations, ";
  formatted += "inform them that we already have it in our system.\n\n";
  
  formatted += `### ${targetState}\n`;
  for (const link of stateLinks) {
    formatted += `- **${link.capital}**: ${link.procurementLink}`;
    if (link.requiresRegistration) {
      formatted += " (Requires Registration)";
    }
    formatted += "\n";
  }
  formatted += "\n";
  
  formatted += "CRITICAL: Before suggesting any procurement link, check this list. ";
  formatted += "If the link already exists here, do NOT include it in your response. ";
  formatted += "Instead, acknowledge that the link is already in our system.\n";
  
  return formatted;
}

/**
 * Remove existing approved links section from prompt text
 */
function removeExistingApprovedLinksSection(promptText: string): string {
  // Find the start of the approved links section (handle both with and without leading newlines)
  let sectionStart = promptText.indexOf("\n\n## ALREADY APPROVED PROCUREMENT LINKS");
  if (sectionStart === -1) {
    sectionStart = promptText.indexOf("## ALREADY APPROVED PROCUREMENT LINKS");
  }
  
  if (sectionStart === -1) {
    return promptText; // No section found, return as-is
  }
  
  // If we found it with leading newlines, include them in the removal
  // Otherwise, we need to find the start of the line
  let actualStart = sectionStart;
  if (sectionStart > 0 && promptText[sectionStart - 1] === '\n') {
    // Check if there's another newline before this
    if (sectionStart > 1 && promptText[sectionStart - 2] === '\n') {
      actualStart = sectionStart - 2; // Include both newlines
    } else {
      actualStart = sectionStart - 1; // Include single newline
    }
  }
  
  // Find the end of the section by looking for the next "##" or "Remember:" or end of string
  const afterSection = promptText.slice(sectionStart);
  const nextSection = afterSection.indexOf("\n\n## ", 1); // Start search after the first "##"
  const rememberIndex = afterSection.indexOf("\n\nRemember:");
  
  let endIndex = afterSection.length;
  if (nextSection !== -1 && rememberIndex !== -1) {
    endIndex = Math.min(nextSection, rememberIndex);
  } else if (nextSection !== -1) {
    endIndex = nextSection;
  } else if (rememberIndex !== -1) {
    endIndex = rememberIndex;
  }
  
  // Remove the section
  const beforeSection = promptText.slice(0, actualStart);
  const afterRemoved = afterSection.slice(endIndex);
  
  // Clean up extra newlines
  const cleaned = (beforeSection.trimEnd() + "\n" + afterRemoved.trimStart()).trim();
  
  return cleaned;
}

/**
 * Inject approved links section into the system prompt
 * Note: basePrompt should already have any existing approved links section removed
 */
function injectApprovedLinksIntoPrompt(basePrompt: string, linksSection: string): string {
  if (!linksSection) return basePrompt;
  
  // Insert the links section before the final "Remember:" instruction
  const rememberIndex = basePrompt.lastIndexOf("Remember:");
  
  if (rememberIndex !== -1) {
    return basePrompt.slice(0, rememberIndex) + linksSection + "\n\n" + basePrompt.slice(rememberIndex);
  }
  
  // If "Remember:" not found, append at the end
  return basePrompt + linksSection;
}

/**
 * Update the primary system prompt with approved procurement links
 * This mutation refreshes the lookup table and then updates the primary prompt
 */
export const updatePrimaryWithApprovedLinks = mutation({
  args: {
    typeId: v.optional(v.id("chatSystemPromptTypes")), // Optional: update primary for specific type
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    linkCount: v.number(),
    promptUpdated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // First, refresh the lookup table
    const identity = await ctx.auth.getUserIdentity();
    const approvedBy = identity?.subject || "System";
    
    // Get all approved procurement links directly from database
    const approvedLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    
    // Transform to lookup format
    type FormattedLink = {
      state: string;
      capital: string;
      officialWebsite: string;
      procurementLink: string;
      entityType: string | null;
      linkType: string | null;
      requiresRegistration: boolean | null;
    };
    
    const formattedLinks: FormattedLink[] = approvedLinks.map((link) => ({
      state: link.state,
      capital: link.capital,
      officialWebsite: link.officialWebsite,
      procurementLink: link.procurementLink,
      entityType: null,
      linkType: null,
      requiresRegistration: link.requiresRegistration ?? null,
    }));
    
    // Update the lookup table
    const existingLookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    if (existingLookup) {
      await ctx.db.patch(existingLookup._id, {
        lastApprovedBy: approvedBy,
        lastApprovedAt: now,
        approvedProcurementLinks: formattedLinks,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("approvedProcurementLinksLookUp", {
        dateCreated: now,
        lastApprovedBy: approvedBy,
        lastApprovedAt: now,
        approvedProcurementLinks: formattedLinks,
        updatedAt: now,
      });
    }
    
    // Get the primary system prompt
    let primaryPrompt;
    if (args.typeId) {
      primaryPrompt = await ctx.db
        .query("chatSystemPrompts")
        .withIndex("by_type_primary", (q) => 
          q.eq("type", args.typeId!).eq("isPrimarySystemPrompt", true)
        )
        .first();
    } else {
      primaryPrompt = await ctx.db
        .query("chatSystemPrompts")
        .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
        .first();
    }
    
    if (!primaryPrompt) {
      return {
        success: false,
        message: "No primary system prompt found. Please create one first.",
        linkCount: formattedLinks.length,
        promptUpdated: false,
      };
    }
    
    // Format approved links for the prompt
    const linksSection = formatApprovedLinksForPrompt(formattedLinks);
    
    // Get the base prompt (remove any existing approved links section)
    let basePrompt = removeExistingApprovedLinksSection(primaryPrompt.systemPromptText);
    
    // If we have approved links, inject them into the prompt
    const updatedPromptText = linksSection 
      ? injectApprovedLinksIntoPrompt(basePrompt, linksSection)
      : basePrompt;
    
    // Update the primary prompt in the database
    await ctx.db.patch(primaryPrompt._id, {
      systemPromptText: updatedPromptText,
      updatedAt: now,
    });
    
    return {
      success: true,
      message: `Successfully updated primary system prompt with ${formattedLinks.length} approved links.`,
      linkCount: formattedLinks.length,
      promptUpdated: true,
    };
  },
});

/**
 * Update a specific system prompt with state-specific approved procurement links
 * Extracts state name from prompt title and injects only that state's approved links
 */
export const updatePromptWithStateLinks = mutation({
  args: {
    promptId: v.id("chatSystemPrompts"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    linkCount: v.number(),
    promptUpdated: v.boolean(),
    stateName: v.optional(v.string()),
    estimatedRequestTokens: v.optional(v.number()),
    estimatedResponseTokens: v.optional(v.number()),
    estimatedTotalTokens: v.optional(v.number()),
    estimatedRequestCostCents: v.optional(v.number()),
    estimatedResponseCostCents: v.optional(v.number()),
    estimatedTotalCostCents: v.optional(v.number()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    promptTextSize: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get the prompt
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) {
      return {
        success: false,
        message: "Prompt not found.",
        linkCount: 0,
        promptUpdated: false,
        stateName: undefined,
        estimatedRequestTokens: undefined,
        estimatedResponseTokens: undefined,
        estimatedTotalTokens: undefined,
        estimatedRequestCostCents: undefined,
        estimatedResponseCostCents: undefined,
        estimatedTotalCostCents: undefined,
        model: undefined,
        provider: undefined,
        promptTextSize: undefined,
      };
    }
    
    // Extract state name from prompt title
    const stateName = extractStateFromTitle(prompt.title);
    if (!stateName) {
      return {
        success: false,
        message: `Could not extract state name from prompt title: "${prompt.title}". Please ensure the title contains a US state name.`,
        linkCount: 0,
        promptUpdated: false,
        stateName: undefined,
        estimatedRequestTokens: undefined,
        estimatedResponseTokens: undefined,
        estimatedTotalTokens: undefined,
        estimatedRequestCostCents: undefined,
        estimatedResponseCostCents: undefined,
        estimatedTotalCostCents: undefined,
        model: undefined,
        provider: undefined,
        promptTextSize: undefined,
      };
    }
    
    // Get approved procurement links for the specific state
    // Only extract the procurementLink URL - agents only need the URL to know what's already collected
    const approvedLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_state_status", (q) => q.eq("state", stateName).eq("status", "approved"))
      .collect();
    
    // Transform to lookup format - only include fields needed for prompt
    const formattedLinks: ApprovedLink[] = approvedLinks.map((link) => ({
      state: link.state,
      capital: link.capital,
      officialWebsite: "", // Not needed for prompt
      procurementLink: link.procurementLink,
      entityType: null, // Not needed for prompt
      linkType: null, // Not needed for prompt
      requiresRegistration: link.requiresRegistration ?? null,
    }));
    
    // Format approved links for the prompt (state-specific)
    const linksSection = formatApprovedLinksForState(formattedLinks, stateName);
    
    // Get the base prompt (remove any existing approved links section)
    let basePrompt = removeExistingApprovedLinksSection(prompt.systemPromptText);
    
    // If we have approved links, inject them into the prompt
    const updatedPromptText = linksSection 
      ? injectApprovedLinksIntoPrompt(basePrompt, linksSection)
      : basePrompt;
    
    // Calculate token estimates and costs for analytics
    // Use gpt-5-mini pricing as default (the model used in procurement chat)
    const model = "gpt-5-mini";
    const provider = "openai";
    const modelPricing = MODEL_PRICING[provider]?.[model] ?? DEFAULT_PRICING;
    
    // Estimate tokens for the updated prompt (this is what would be sent to AI)
    const estimatedRequestTokens = estimateTokens(updatedPromptText);
    // For system prompts, we estimate response tokens as 0 since this is just the prompt being updated
    // The actual AI usage happens when the prompt is used in chat conversations
    const estimatedResponseTokens = 0;
    const estimatedTotalTokens = estimatedRequestTokens + estimatedResponseTokens;
    
    // Calculate estimated costs
    const estimatedRequestCostCents = calculateCost(estimatedRequestTokens, modelPricing.input);
    const estimatedResponseCostCents = calculateCost(estimatedResponseTokens, modelPricing.output);
    const estimatedTotalCostCents = estimatedRequestCostCents + estimatedResponseCostCents;
    
    // Update the prompt in the database
    await ctx.db.patch(args.promptId, {
      systemPromptText: updatedPromptText,
      updatedAt: now,
    });
    
    return {
      success: true,
      message: formattedLinks.length > 0
        ? `Successfully updated prompt with ${formattedLinks.length} approved links for ${stateName}.`
        : `No approved links found for ${stateName}. Prompt updated (removed existing links section).`,
      linkCount: formattedLinks.length,
      promptUpdated: true,
      stateName: stateName,
      // Include token and cost estimates for analytics
      estimatedRequestTokens,
      estimatedResponseTokens,
      estimatedTotalTokens,
      estimatedRequestCostCents,
      estimatedResponseCostCents,
      estimatedTotalCostCents,
      model,
      provider,
      promptTextSize: updatedPromptText.length,
    };
  },
});

/**
 * Get source links from leads for a specific state
 * Maps state name to lead regions and returns unique source URLs
 * Optimized to only query and extract source URLs, not full lead objects
 */
async function getLeadSourceLinksForState(
  ctx: any,
  stateName: string
): Promise<Array<{ url: string; documentName: string; leadCount: number }>> {
  const stateLower = stateName.toLowerCase();
  
  // Map of state names to common region patterns
  const stateToRegionPatterns: Record<string, string[]> = {
    "texas": ["texas", "dallas", "houston", "austin", "san antonio", "el paso", "fort worth"],
    "florida": ["florida", "miami", "tampa", "orlando", "jacksonville", "tallahassee"],
    "california": ["california", "los angeles", "san francisco", "san diego", "sacramento", "oakland"],
    "new york": ["new york", "nyc", "albany", "buffalo", "rochester"],
    // Add more mappings as needed
  };
  
  // Get patterns for this state
  const patterns = stateToRegionPatterns[stateLower] || [stateLower];
  
  // Query leads by region patterns - only get source URLs to minimize data transfer
  const sourceMap = new Map<string, { url: string; documentName: string; leadCount: number }>();
  
  // Query leads for each region pattern and extract only source URLs
  for (const pattern of patterns) {
    try {
      const leads = await ctx.db
        .query("leads")
        .withIndex("by_region", (q: any) => q.eq("location.region", pattern))
        .collect();
      
      // Extract only source URLs from matching leads
      for (const lead of leads) {
        if (lead.source?.url) {
          const url = lead.source.url;
          if (sourceMap.has(url)) {
            sourceMap.get(url)!.leadCount++;
          } else {
            sourceMap.set(url, {
              url,
              documentName: lead.source.documentName || 'Unknown Document',
              leadCount: 1,
            });
          }
        }
      }
    } catch (error) {
      // If index query fails, try case-insensitive matching
      // This is a fallback for regions that don't match exactly
      continue;
    }
  }
  
  // Also try the state name directly as a fallback
  try {
    const stateLeads = await ctx.db
      .query("leads")
      .withIndex("by_region", (q: any) => q.eq("location.region", stateName))
      .collect();
    
    for (const lead of stateLeads) {
      if (lead.source?.url) {
        const url = lead.source.url;
        if (sourceMap.has(url)) {
          sourceMap.get(url)!.leadCount++;
        } else {
          sourceMap.set(url, {
            url,
            documentName: lead.source.documentName || 'Unknown Document',
            leadCount: 1,
          });
        }
      }
    }
  } catch (error) {
    // Ignore if query fails
  }
  
  return Array.from(sourceMap.values()).sort((a, b) => b.leadCount - a.leadCount);
}

/**
 * Get ALL source links from leads (not state-specific)
 * Returns unique source URLs from all leads in the system
 */
async function getAllLeadSourceLinks(
  ctx: any
): Promise<Array<{ url: string; documentName: string; leadCount: number }>> {
  // Query all leads and extract source URLs
  const sourceMap = new Map<string, { url: string; documentName: string; leadCount: number }>();
  
  // Query all leads (no filter needed since we want all of them)
  const allLeads = await ctx.db.query("leads").collect();
  
  // Extract only source URLs from all leads
  for (const lead of allLeads) {
    if (lead.source?.url) {
      const url = lead.source.url;
      if (sourceMap.has(url)) {
        sourceMap.get(url)!.leadCount++;
      } else {
        sourceMap.set(url, {
          url,
          documentName: lead.source.documentName || 'Unknown Document',
          leadCount: 1,
        });
      }
    }
  }
  
  return Array.from(sourceMap.values()).sort((a, b) => b.leadCount - a.leadCount);
}

/**
 * Format lead source links into a readable section for the system prompt
 */
function formatLeadSourceLinksForPrompt(
  sourceLinks: Array<{ url: string; documentName: string; leadCount: number }>,
  stateName: string
): string {
  if (sourceLinks.length === 0) return "";
  
  let formatted = "\n\n## EXISTING LEAD SOURCE DATA LINKS\n";
  formatted += `The following source URLs have been used to collect lead data for ${stateName}. `;
  formatted += "These links represent existing data sources in our system. ";
  formatted += "When generating new leads, avoid duplicating data from these sources unless new opportunities are available.\n\n";
  
  formatted += `### ${stateName} Lead Sources\n`;
  for (const link of sourceLinks) {
    formatted += `- **${link.documentName}**: ${link.url}`;
    if (link.leadCount > 1) {
      formatted += ` (${link.leadCount} leads from this source)`;
    }
    formatted += "\n";
  }
  formatted += "\n";
  
  formatted += "CRITICAL: Before suggesting new lead sources, check this list. ";
  formatted += "If a source URL already exists here, acknowledge that we already have data from this source. ";
  formatted += "Only suggest new sources if they contain different opportunities or updated information.\n";
  
  return formatted;
}

/**
 * Format lead source links for default prompts (without state name)
 * Groups links by state/region when possible for better organization
 */
function formatLeadSourceLinksForDefaultPrompt(
  sourceLinks: Array<{ url: string; documentName: string; leadCount: number }>
): string {
  if (sourceLinks.length === 0) return "";
  
  let formatted = "\n\n## EXISTING LEAD SOURCE DATA LINKS\n";
  formatted += "The following source URLs have been used to collect lead data across all states. ";
  formatted += "These links represent existing data sources in our system. ";
  formatted += "When generating new leads, avoid duplicating data from these sources unless new opportunities are available.\n\n";
  
  // Group by document name for better organization
  const byDocument = new Map<string, Array<{ url: string; documentName: string; leadCount: number }>>();
  for (const link of sourceLinks) {
    const docName = link.documentName || 'Unknown Document';
    if (!byDocument.has(docName)) {
      byDocument.set(docName, []);
    }
    byDocument.get(docName)!.push(link);
  }
  
  // Sort documents by total lead count
  const sortedDocs = Array.from(byDocument.entries()).sort((a, b) => {
    const aTotal = a[1].reduce((sum, link) => sum + link.leadCount, 0);
    const bTotal = b[1].reduce((sum, link) => sum + link.leadCount, 0);
    return bTotal - aTotal;
  });
  
  for (const [docName, links] of sortedDocs) {
    const totalLeads = links.reduce((sum, link) => sum + link.leadCount, 0);
    formatted += `### ${docName} (${totalLeads} total lead${totalLeads > 1 ? 's' : ''})\n`;
    for (const link of links) {
      formatted += `- ${link.url}`;
      if (link.leadCount > 1) {
        formatted += ` (${link.leadCount} leads from this source)`;
      }
      formatted += "\n";
    }
    formatted += "\n";
  }
  
  formatted += "CRITICAL: Before suggesting new lead sources, check this comprehensive list. ";
  formatted += "If a source URL already exists here, acknowledge that we already have data from this source. ";
  formatted += "Only suggest new sources if they contain different opportunities or updated information.\n";
  
  return formatted;
}

/**
 * Remove existing lead source links section from prompt text
 */
function removeExistingLeadSourceLinksSection(promptText: string): string {
  // Find the start of the lead source links section
  let sectionStart = promptText.indexOf("\n\n## EXISTING LEAD SOURCE DATA LINKS");
  if (sectionStart === -1) {
    sectionStart = promptText.indexOf("## EXISTING LEAD SOURCE DATA LINKS");
  }
  
  if (sectionStart === -1) {
    return promptText; // No section found, return as-is
  }
  
  // Include leading newlines if present
  let actualStart = sectionStart;
  if (sectionStart > 0 && promptText[sectionStart - 1] === '\n') {
    if (sectionStart > 1 && promptText[sectionStart - 2] === '\n') {
      actualStart = sectionStart - 2;
    } else {
      actualStart = sectionStart - 1;
    }
  }
  
  // Find the end of the section
  const afterSection = promptText.slice(sectionStart);
  const nextSection = afterSection.indexOf("\n\n## ", 1);
  const rememberIndex = afterSection.indexOf("\n\nRemember:");
  
  let endIndex = afterSection.length;
  if (nextSection !== -1 && rememberIndex !== -1) {
    endIndex = Math.min(nextSection, rememberIndex);
  } else if (nextSection !== -1) {
    endIndex = nextSection;
  } else if (rememberIndex !== -1) {
    endIndex = rememberIndex;
  }
  
  // Remove the section
  const beforeSection = promptText.slice(0, actualStart);
  const afterRemoved = afterSection.slice(endIndex);
  
  // Clean up extra newlines
  const cleaned = (beforeSection.trimEnd() + "\n" + afterRemoved.trimStart()).trim();
  
  return cleaned;
}

/**
 * Inject lead source links section into the system prompt
 */
function injectLeadSourceLinksIntoPrompt(basePrompt: string, linksSection: string): string {
  if (!linksSection) return basePrompt;
  
  // Insert the links section before the final "Remember:" instruction
  // But after any existing procurement links section
  const rememberIndex = basePrompt.lastIndexOf("Remember:");
  const procurementLinksIndex = basePrompt.indexOf("## ALREADY APPROVED PROCUREMENT LINKS");
  
  if (rememberIndex !== -1) {
    // If there's a procurement links section, insert after it
    if (procurementLinksIndex !== -1 && procurementLinksIndex < rememberIndex) {
      // Find the end of the procurement links section
      const afterProcurement = basePrompt.slice(procurementLinksIndex);
      const nextAfterProcurement = afterProcurement.indexOf("\n\n## ", 1);
      const rememberAfterProcurement = afterProcurement.indexOf("\n\nRemember:");
      
      let insertPoint = procurementLinksIndex + afterProcurement.length;
      if (nextAfterProcurement !== -1 && rememberAfterProcurement !== -1) {
        insertPoint = procurementLinksIndex + Math.min(nextAfterProcurement, rememberAfterProcurement);
      } else if (rememberAfterProcurement !== -1) {
        insertPoint = procurementLinksIndex + rememberAfterProcurement;
      }
      
      return basePrompt.slice(0, insertPoint) + linksSection + "\n\n" + basePrompt.slice(insertPoint);
    }
    
    // Otherwise, insert before "Remember:"
    return basePrompt.slice(0, rememberIndex) + linksSection + "\n\n" + basePrompt.slice(rememberIndex);
  }
  
  // If "Remember:" not found, append at the end
  return basePrompt + linksSection;
}

/**
 * Update a specific system prompt with state-specific lead source links
 * Extracts state name from prompt title and injects only that state's lead source URLs
 * This helps reduce duplicate lead data by showing existing sources
 */
export const updatePromptWithLeadSourceLinks = mutation({
  args: {
    promptId: v.id("chatSystemPrompts"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    linkCount: v.number(),
    promptUpdated: v.boolean(),
    stateName: v.optional(v.string()),
    estimatedRequestTokens: v.optional(v.number()),
    estimatedResponseTokens: v.optional(v.number()),
    estimatedTotalTokens: v.optional(v.number()),
    estimatedRequestCostCents: v.optional(v.number()),
    estimatedResponseCostCents: v.optional(v.number()),
    estimatedTotalCostCents: v.optional(v.number()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    promptTextSize: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get the prompt
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) {
      return {
        success: false,
        message: "Prompt not found.",
        linkCount: 0,
        promptUpdated: false,
        stateName: undefined,
        estimatedRequestTokens: undefined,
        estimatedResponseTokens: undefined,
        estimatedTotalTokens: undefined,
        estimatedRequestCostCents: undefined,
        estimatedResponseCostCents: undefined,
        estimatedTotalCostCents: undefined,
        model: undefined,
        provider: undefined,
        promptTextSize: undefined,
      };
    }
    
    // Extract state name from prompt title
    const stateName = extractStateFromTitle(prompt.title);
    if (!stateName) {
      return {
        success: false,
        message: `Could not extract state name from prompt title: "${prompt.title}". Please ensure the title contains a US state name.`,
        linkCount: 0,
        promptUpdated: false,
        stateName: undefined,
        estimatedRequestTokens: undefined,
        estimatedResponseTokens: undefined,
        estimatedTotalTokens: undefined,
        estimatedRequestCostCents: undefined,
        estimatedResponseCostCents: undefined,
        estimatedTotalCostCents: undefined,
        model: undefined,
        provider: undefined,
        promptTextSize: undefined,
      };
    }
    
    // Get source links for the specific state - optimized to only get source URLs
    const sourceLinks = await getLeadSourceLinksForState(ctx, stateName);
    
    // Format lead source links for the prompt
    const linksSection = formatLeadSourceLinksForPrompt(sourceLinks, stateName);
    
    // Get the base prompt (remove any existing lead source links section)
    let basePrompt = removeExistingLeadSourceLinksSection(prompt.systemPromptText);
    
    // If we have source links, inject them into the prompt
    const updatedPromptText = linksSection 
      ? injectLeadSourceLinksIntoPrompt(basePrompt, linksSection)
      : basePrompt;
    
    // Calculate token estimates and costs for analytics
    const model = "gpt-5-mini";
    const provider = "openai";
    const modelPricing = MODEL_PRICING[provider]?.[model] ?? DEFAULT_PRICING;
    
    // Estimate tokens for the updated prompt
    const estimatedRequestTokens = estimateTokens(updatedPromptText);
    const estimatedResponseTokens = 0;
    const estimatedTotalTokens = estimatedRequestTokens + estimatedResponseTokens;
    
    // Calculate estimated costs
    const estimatedRequestCostCents = calculateCost(estimatedRequestTokens, modelPricing.input);
    const estimatedResponseCostCents = calculateCost(estimatedResponseTokens, modelPricing.output);
    const estimatedTotalCostCents = estimatedRequestCostCents + estimatedResponseCostCents;
    
    // Update the prompt in the database
    await ctx.db.patch(args.promptId, {
      systemPromptText: updatedPromptText,
      updatedAt: now,
    });
    
    return {
      success: true,
      message: sourceLinks.length > 0
        ? `Successfully updated prompt with ${sourceLinks.length} lead source links for ${stateName}.`
        : `No lead source links found for ${stateName}. Prompt updated (removed existing links section).`,
      linkCount: sourceLinks.length,
      promptUpdated: true,
      stateName: stateName,
      estimatedRequestTokens,
      estimatedResponseTokens,
      estimatedTotalTokens,
      estimatedRequestCostCents,
      estimatedResponseCostCents,
      estimatedTotalCostCents,
      model,
      provider,
      promptTextSize: updatedPromptText.length,
    };
  },
});

/**
 * Update all system prompts with their respective state data
 * Iterates through all prompts and updates:
 * - procurementHubs prompts with approved procurement links for their state
 * - leads prompts with lead source links for their state
 */
export const updateAllPromptsWithStateData = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    results: v.array(v.object({
      promptId: v.id("chatSystemPrompts"),
      promptTitle: v.string(),
      promptType: v.string(),
      stateName: v.union(v.string(), v.null()),
      success: v.boolean(),
      message: v.string(),
      linkCount: v.number(),
      errorType: v.optional(v.string()),
      errorDetails: v.optional(v.string()),
    })),
    totalProcessed: v.number(),
    totalSucceeded: v.number(),
    totalFailed: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const results: Array<{
      promptId: Id<"chatSystemPrompts">;
      promptTitle: string;
      promptType: string;
      stateName: string | null;
      success: boolean;
      message: string;
      linkCount: number;
      errorType?: string;
      errorDetails?: string;
    }> = [];

    // Get all prompts
    const allPrompts = await ctx.db
      .query("chatSystemPrompts")
      .collect();

    // Get all prompt types
    const promptTypes = await ctx.db
      .query("chatSystemPromptTypes")
      .collect();

    const leadsType = promptTypes.find(t => t.name === "leads");
    const procurementHubsType = promptTypes.find(t => t.name === "procurementHubs");

    let totalSucceeded = 0;
    let totalFailed = 0;

    // Process each prompt
    for (const prompt of allPrompts) {
      const promptType = promptTypes.find(t => t._id === prompt.type);
      const promptTypeName = promptType?.name || "unknown";
      const stateName = extractStateFromTitle(prompt.title);

      // Handle default prompts (no state name) - inject ALL links
      if (!stateName) {
        try {
          // Get ALL approved procurement links (not state-specific)
          const allApprovedLinks = await ctx.db
            .query("procurementUrls")
            .withIndex("by_status", (q) => q.eq("status", "approved"))
            .collect();

          // Transform to lookup format
          const formattedProcurementLinks: ApprovedLink[] = allApprovedLinks.map((link) => ({
            state: link.state,
            capital: link.capital,
            officialWebsite: "", // Not needed for prompt
            procurementLink: link.procurementLink,
            entityType: null,
            linkType: null,
            requiresRegistration: link.requiresRegistration ?? null,
          }));

          // Get ALL lead source links (not state-specific)
          const allLeadSourceLinks = await getAllLeadSourceLinks(ctx);

          // Format procurement links section (use full format for default prompts)
          const procurementLinksSection = formatApprovedLinksForPromptFull(formattedProcurementLinks);
          
          // Format lead source links section (use default format)
          const leadSourceLinksSection = formatLeadSourceLinksForDefaultPrompt(allLeadSourceLinks);

          // Get the base prompt and remove any existing sections
          let basePrompt = removeExistingApprovedLinksSection(prompt.systemPromptText);
          basePrompt = removeExistingLeadSourceLinksSection(basePrompt);

          // Inject both sections into the prompt
          let updatedPromptText = basePrompt;
          if (procurementLinksSection) {
            updatedPromptText = injectApprovedLinksIntoPrompt(updatedPromptText, procurementLinksSection);
          }
          if (leadSourceLinksSection) {
            updatedPromptText = injectLeadSourceLinksIntoPrompt(updatedPromptText, leadSourceLinksSection);
          }

          // Update the prompt in the database
          await ctx.db.patch(prompt._id, {
            systemPromptText: updatedPromptText,
            updatedAt: now,
          });

          const totalLinks = formattedProcurementLinks.length + allLeadSourceLinks.length;
          results.push({
            promptId: prompt._id,
            promptTitle: prompt.title,
            promptType: promptTypeName,
            stateName: null,
            success: true,
            message: `Updated default prompt with ${formattedProcurementLinks.length} procurement links and ${allLeadSourceLinks.length} lead source links`,
            linkCount: totalLinks,
          });
          totalSucceeded++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          const errorStack = error instanceof Error ? error.stack : undefined;
          results.push({
            promptId: prompt._id,
            promptTitle: prompt.title,
            promptType: promptTypeName,
            stateName: null,
            success: false,
            message: errorMessage,
            linkCount: 0,
            errorType: "EXECUTION_ERROR",
            errorDetails: errorStack || errorMessage,
          });
          totalFailed++;
        }
        continue;
      }

      try {
        // Update based on prompt type
        if (procurementHubsType && prompt.type === procurementHubsType._id) {
          // Update with procurement links - only include the procurementLink URL
          const approvedLinks = await ctx.db
            .query("procurementUrls")
            .withIndex("by_state_status", (q) => q.eq("state", stateName).eq("status", "approved"))
            .collect();

          // Only extract the procurementLink URL - agents only need the URL to know what's already collected
          const formattedLinks: ApprovedLink[] = approvedLinks.map((link) => ({
            state: link.state,
            capital: link.capital,
            officialWebsite: "", // Not needed for prompt
            procurementLink: link.procurementLink,
            entityType: null, // Not needed for prompt
            linkType: null, // Not needed for prompt
            requiresRegistration: link.requiresRegistration ?? null,
          }));

          const linksSection = formatApprovedLinksForPrompt(formattedLinks);
          let basePrompt = removeExistingApprovedLinksSection(prompt.systemPromptText);
          const updatedPromptText = linksSection
            ? injectApprovedLinksIntoPrompt(basePrompt, linksSection)
            : basePrompt;

          await ctx.db.patch(prompt._id, {
            systemPromptText: updatedPromptText,
            updatedAt: now,
          });

          results.push({
            promptId: prompt._id,
            promptTitle: prompt.title,
            promptType: promptTypeName,
            stateName: stateName,
            success: true,
            message: `Updated with ${formattedLinks.length} approved procurement links`,
            linkCount: formattedLinks.length,
          });
          totalSucceeded++;
        } else if (leadsType && prompt.type === leadsType._id) {
          // Update with lead source links - optimized to only get source URLs
          const sourceLinks = await getLeadSourceLinksForState(ctx, stateName);
          const linksSection = formatLeadSourceLinksForPrompt(sourceLinks, stateName);
          let basePrompt = removeExistingLeadSourceLinksSection(prompt.systemPromptText);
          const updatedPromptText = linksSection
            ? injectLeadSourceLinksIntoPrompt(basePrompt, linksSection)
            : basePrompt;

          await ctx.db.patch(prompt._id, {
            systemPromptText: updatedPromptText,
            updatedAt: now,
          });

          results.push({
            promptId: prompt._id,
            promptTitle: prompt.title,
            promptType: promptTypeName,
            stateName: stateName,
            success: true,
            message: `Updated with ${sourceLinks.length} lead source links`,
            linkCount: sourceLinks.length,
          });
          totalSucceeded++;
        } else {
          // Unknown or unsupported prompt type
          results.push({
            promptId: prompt._id,
            promptTitle: prompt.title,
            promptType: promptTypeName,
            stateName: stateName,
            success: false,
            message: `Prompt type "${promptTypeName}" is not supported for automatic updates`,
            linkCount: 0,
            errorType: "UNSUPPORTED_PROMPT_TYPE",
            errorDetails: `Only "procurementHubs" and "leads" prompt types are supported. This prompt has type "${promptTypeName}".`,
          });
          totalFailed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        const errorStack = error instanceof Error ? error.stack : undefined;
        results.push({
          promptId: prompt._id,
          promptTitle: prompt.title,
          promptType: promptTypeName,
          stateName: stateName,
          success: false,
          message: errorMessage,
          linkCount: 0,
          errorType: "EXECUTION_ERROR",
          errorDetails: errorStack || errorMessage,
        });
        totalFailed++;
      }
    }

    return {
      success: totalSucceeded > 0,
      message: `Processed ${allPrompts.length} prompts: ${totalSucceeded} succeeded, ${totalFailed} failed`,
      results: results,
      totalProcessed: allPrompts.length,
      totalSucceeded: totalSucceeded,
      totalFailed: totalFailed,
    };
  },
});

// US States list (50 states + DC)
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California",
  "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
  "District of Columbia"
];

/**
 * Get list of states that have system prompts
 * Extracts state names from prompt titles
 */
export const getStatesWithPrompts = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const prompts = await ctx.db
      .query("chatSystemPrompts")
      .collect();
    
    const statesWithPrompts = new Set<string>();
    
    for (const prompt of prompts) {
      const stateName = extractStateFromTitle(prompt.title);
      if (stateName) {
        statesWithPrompts.add(stateName);
      }
    }
    
    return Array.from(statesWithPrompts).sort();
  },
});

/**
 * Get list of states that are missing system prompts
 */
export const getMissingStates = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    // Get states with prompts
    const prompts = await ctx.db
      .query("chatSystemPrompts")
      .collect();
    
    const statesWithPrompts = new Set<string>();
    
    for (const prompt of prompts) {
      const stateName = extractStateFromTitle(prompt.title);
      if (stateName) {
        statesWithPrompts.add(stateName);
      }
    }
    
    // Find missing states
    const missingStates = US_STATES.filter(state => !statesWithPrompts.has(state));
    
    return missingStates.sort();
  },
});

/**
 * Get the default lead prompt template
 * Returns the primary prompt for the "leads" type, or first prompt of that type
 */
export const getDefaultLeadPrompt = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("chatSystemPrompts"),
      systemPromptText: v.string(),
      title: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // First, find the "leads" type
    const leadsType = await ctx.db
      .query("chatSystemPromptTypes")
      .filter((q) => q.eq(q.field("name"), "leads"))
      .first();
    
    if (!leadsType) {
      return null;
    }
    
    // Try to get the primary prompt for leads type
    const primaryPrompt = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_type_primary", (q) => 
        q.eq("type", leadsType._id).eq("isPrimarySystemPrompt", true)
      )
      .first();
    
    if (primaryPrompt) {
      return {
        _id: primaryPrompt._id,
        systemPromptText: primaryPrompt.systemPromptText,
        title: primaryPrompt.title,
      };
    }
    
    // If no primary, get the first prompt of leads type
    const firstPrompt = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_type", (q) => q.eq("type", leadsType._id))
      .first();
    
    if (firstPrompt) {
      return {
        _id: firstPrompt._id,
        systemPromptText: firstPrompt.systemPromptText,
        title: firstPrompt.title,
      };
    }
    
    // Fallback to DEFAULT_SYSTEM_PROMPT
    return null;
  },
});

/**
 * Generate geographical section for a state using OpenAI
 * This is an internal action that calls OpenAI API
 */
export const generateGeographicalSection = internalAction({
  args: {
    stateName: v.string(),
    approvedLinks: v.array(v.object({
      state: v.string(),
      capital: v.string(),
      officialWebsite: v.string(),
      procurementLink: v.string(),
      entityType: v.union(v.string(), v.null()),
      linkType: v.union(v.string(), v.null()),
      requiresRegistration: v.union(v.boolean(), v.null()),
    })),
  },
  returns: v.string(),
  handler: async (ctx: any, args: any): Promise<string> => {
    // Format approved links for the prompt
    let formattedLinks = "";
    if (args.approvedLinks.length > 0) {
      formattedLinks = args.approvedLinks.map((link: any) => {
        let linkText = `- ${link.capital}: ${link.procurementLink}`;
        if (link.requiresRegistration) {
          linkText += " (Requires Registration)";
        }
        return linkText;
      }).join("\n");
    } else {
      formattedLinks = "No approved procurement links available for this state yet.";
    }

    // Create the prompt for OpenAI
    const prompt = `You are creating a geographical section for a system prompt about procurement opportunities in ${args.stateName}.

Approved Procurement Links for ${args.stateName}:
${formattedLinks}

Generate a concise, informative geographical section (2-3 paragraphs) that:
1. Describes the procurement landscape in ${args.stateName}
2. References the approved procurement links provided (if any)
3. Highlights key cities, regions, or procurement hubs
4. Uses professional, clear language suitable for a system prompt

Format the output as markdown with a heading: ## GEOGRAPHICAL CONTEXT: ${args.stateName}`;

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not found in environment variables");
    }

    // Call OpenAI API
    // @ts-ignore - Type instantiation is excessively deep due to Convex type inference
    const response: any = await ctx.runAction(internal.nodeActions.sendOpenAIMessageWithKey, {
      message: prompt,
      modelId: "gpt-5-mini",
      apiKey: apiKey,
    });

    return response.content;
  },
});

/**
 * Internal query to get approved links for a state
 */
export const getApprovedLinksForStateInternal = internalQuery({
  args: {
    stateName: v.string(),
  },
  returns: v.array(v.object({
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
    entityType: v.union(v.string(), v.null()),
    linkType: v.union(v.string(), v.null()),
    requiresRegistration: v.union(v.boolean(), v.null()),
  })),
  handler: async (ctx, args) => {
    const approvedLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_state_status", (q) => q.eq("state", args.stateName).eq("status", "approved"))
      .collect();

    return approvedLinks.map((link) => ({
      state: link.state,
      capital: link.capital,
      officialWebsite: link.officialWebsite,
      procurementLink: link.procurementLink,
      entityType: null,
      linkType: null,
      requiresRegistration: link.requiresRegistration ?? null,
    }));
  },
});

/**
 * Internal query to check if prompt exists for state
 */
export const checkPromptExistsInternal = internalQuery({
  args: {
    stateName: v.string(),
    typeId: v.id("chatSystemPromptTypes"),
  },
  returns: v.union(
    v.object({
      exists: v.boolean(),
      promptId: v.union(v.id("chatSystemPrompts"), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const existingPrompts = await ctx.db
      .query("chatSystemPrompts")
      .collect();
    
    for (const prompt of existingPrompts) {
      const extractedState = extractStateFromTitle(prompt.title);
      if (extractedState === args.stateName && prompt.type === args.typeId) {
        return {
          exists: true,
          promptId: prompt._id,
        };
      }
    }
    
    return {
      exists: false,
      promptId: null,
    };
  },
});

/**
 * Internal mutation to create the state prompt
 */
export const createStatePromptInternal = internalMutation({
  args: {
    stateName: v.string(),
    typeId: v.id("chatSystemPromptTypes"),
    combinedPrompt: v.string(),
  },
  returns: v.id("chatSystemPrompts"),
  handler: async (ctx: any, args: any): Promise<any> => {
    const now = Date.now();
    return await ctx.db.insert("chatSystemPrompts", {
      systemPromptText: args.combinedPrompt,
      isPrimarySystemPrompt: false,
      title: `${args.stateName} - Leads Generation Prompt`,
      description: `Auto-generated state-specific prompt for ${args.stateName}`,
      type: args.typeId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Generate a system prompt for a single state
 * Combines default lead prompt with AI-generated geographical section
 * This is a public action so it can be called from the frontend for real-time progress updates
 */
export const generateStatePrompt = action({
  args: {
    stateName: v.string(),
    typeId: v.id("chatSystemPromptTypes"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    promptId: v.union(v.id("chatSystemPrompts"), v.null()),
  }),
  handler: async (ctx: any, args: any): Promise<any> => {
    // Check if prompt already exists
    const existsCheck: any = await ctx.runQuery(internal.chatSystemPrompts.checkPromptExistsInternal, {
      stateName: args.stateName,
      typeId: args.typeId,
    });
    
    if (existsCheck?.exists) {
      return {
        success: false,
        message: `A prompt for ${args.stateName} already exists.`,
        promptId: existsCheck.promptId,
      };
    }

    // Get approved procurement links for the state
    const formattedLinks: any = await ctx.runQuery(internal.chatSystemPrompts.getApprovedLinksForStateInternal, {
      stateName: args.stateName,
    });

    // Get default lead prompt
    const defaultPrompt: any = await ctx.runQuery(internal.chatSystemPrompts.getDefaultLeadPromptInternal, {});
    
    // Use default prompt if available, otherwise use DEFAULT_SYSTEM_PROMPT
    let defaultPromptText: string = defaultPrompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;

    // Generate geographical section using action
    let geographicalSection: string = "";
    try {
      geographicalSection = await ctx.runAction(internal.chatSystemPrompts.generateGeographicalSection, {
        stateName: args.stateName,
        approvedLinks: formattedLinks,
      });
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate geographical section: ${error instanceof Error ? error.message : 'Unknown error'}`,
        promptId: null,
      };
    }

    // Combine default prompt with geographical section
    // Remove any existing geographical section from default prompt
    let basePrompt: string = defaultPromptText;
    const existingGeoSection = basePrompt.indexOf("## GEOGRAPHICAL CONTEXT:");
    if (existingGeoSection !== -1) {
      // Find the end of the geographical section
      const afterGeo = basePrompt.slice(existingGeoSection);
      const nextSection = afterGeo.indexOf("\n\n## ", 1);
      if (nextSection !== -1) {
        basePrompt = basePrompt.slice(0, existingGeoSection) + basePrompt.slice(existingGeoSection + nextSection);
      } else {
        basePrompt = basePrompt.slice(0, existingGeoSection);
      }
    }

    // Insert geographical section before the final "Remember:" instruction
    const rememberIndex: number = basePrompt.lastIndexOf("Remember:");
    const combinedPrompt: string = rememberIndex !== -1
      ? basePrompt.slice(0, rememberIndex) + "\n\n" + geographicalSection + "\n\n" + basePrompt.slice(rememberIndex)
      : basePrompt + "\n\n" + geographicalSection;

    // Create the new system prompt using internal mutation
    const promptId: any = await ctx.runMutation(internal.chatSystemPrompts.createStatePromptInternal, {
      stateName: args.stateName,
      typeId: args.typeId,
      combinedPrompt: combinedPrompt,
    });

    return {
      success: true,
      message: `Successfully generated prompt for ${args.stateName}.`,
      promptId: promptId,
    };
  },
});

/**
 * Internal query to get default lead prompt
 */
export const getDefaultLeadPromptInternal = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("chatSystemPrompts"),
      systemPromptText: v.string(),
      title: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // First, find the "leads" type
    const leadsType = await ctx.db
      .query("chatSystemPromptTypes")
      .filter((q) => q.eq(q.field("name"), "leads"))
      .first();
    
    if (!leadsType) {
      return null;
    }
    
    // Try to get the primary prompt for leads type
    const primaryPrompt = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_type_primary", (q) => 
        q.eq("type", leadsType._id).eq("isPrimarySystemPrompt", true)
      )
      .first();
    
    if (primaryPrompt) {
      return {
        _id: primaryPrompt._id,
        systemPromptText: primaryPrompt.systemPromptText,
        title: primaryPrompt.title,
      };
    }
    
    // If no primary, get the first prompt of leads type
    const firstPrompt = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_type", (q) => q.eq("type", leadsType._id))
      .first();
    
    if (firstPrompt) {
      return {
        _id: firstPrompt._id,
        systemPromptText: firstPrompt.systemPromptText,
        title: firstPrompt.title,
      };
    }
    
    // Fallback: return null and use DEFAULT_SYSTEM_PROMPT in action
    return null;
  },
});

/**
 * Set cancellation flag for prompt generation
 * This allows the generateAllMissingStatePrompts action to check for cancellation
 */
export const setPromptGenerationCancelled = mutation({
  args: {
    cancelled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Store cancellation flag in logs table using metadata field
    const existing = await ctx.db
      .query("logs")
      .filter((q) => q.eq(q.field("action"), "prompt_generation_cancellation"))
      .first();
    
    if (existing) {
      // Update existing record's metadata
      await ctx.db.patch(existing._id, {
        details: {
          ...existing.details,
          metadata: {
            ...(existing.details.metadata || {}),
            cancelled: args.cancelled,
          },
        },
        createdAt: Date.now(),
      });
    } else {
      // Create new record
      await ctx.db.insert("logs", {
        userId: "system",
        action: "prompt_generation_cancellation",
        type: "action",
        details: {
          metadata: {
            cancelled: args.cancelled,
          },
        },
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Internal query to check if prompt generation is cancelled
 */
export const isPromptGenerationCancelledInternal = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const cancellationRecord = await ctx.db
      .query("logs")
      .filter((q) => q.eq(q.field("action"), "prompt_generation_cancellation"))
      .order("desc")
      .first();
    
    if (!cancellationRecord) {
      return false;
    }
    
    return cancellationRecord.details?.metadata?.cancelled === true;
  },
});

/**
 * Generate prompts for all missing states sequentially
 * Processes states one at a time with rate limiting and error handling
 * Can be cancelled by calling setPromptGenerationCancelled mutation
 */
export const generateAllMissingStatePrompts = action({
  args: {
    typeId: v.optional(v.id("chatSystemPromptTypes")),
  },
  returns: v.object({
    totalStates: v.number(),
    completed: v.number(),
    failed: v.number(),
    cancelled: v.boolean(),
    errors: v.array(v.object({
      state: v.string(),
      error: v.string(),
    })),
  }),
  handler: async (ctx: any, args: any) => {
    // Reset cancellation flag at start
    await ctx.runMutation(internal.chatSystemPrompts.setPromptGenerationCancelledInternal, {
      cancelled: false,
    });

    // Get missing states
    const missingStates: string[] = await ctx.runQuery(internal.chatSystemPrompts.getMissingStatesInternal, {});
    
    if (missingStates.length === 0) {
      return {
        totalStates: 0,
        completed: 0,
        failed: 0,
        cancelled: false,
        errors: [],
      };
    }

    // Get the type ID (use provided or find leads type)
    let typeId: any = args.typeId;
    if (!typeId) {
      const leadsType: any = await ctx.runQuery(internal.chatSystemPrompts.getLeadsTypeInternal, {});
      if (!leadsType) {
        return {
          totalStates: missingStates.length,
          completed: 0,
          failed: missingStates.length,
          cancelled: false,
          errors: missingStates.map((state: string) => ({
            state,
            error: "Leads prompt type not found",
          })),
        };
      }
      typeId = leadsType._id;
    }

    const results = {
      totalStates: missingStates.length,
      completed: 0,
      failed: 0,
      cancelled: false,
      errors: [] as Array<{ state: string; error: string }>,
    };

    // Process each state sequentially with rate limiting
    for (const state of missingStates) {
      // Check for cancellation before processing each state
      const isCancelled: boolean = await ctx.runQuery(internal.chatSystemPrompts.isPromptGenerationCancelledInternal, {});
      if (isCancelled) {
        results.cancelled = true;
        break;
      }

      try {
        // Add delay between requests (1-2 seconds) to avoid rate limits
        if (results.completed > 0 || results.failed > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Check for cancellation again after delay
        const isCancelledAfterDelay: boolean = await ctx.runQuery(internal.chatSystemPrompts.isPromptGenerationCancelledInternal, {});
        if (isCancelledAfterDelay) {
          results.cancelled = true;
          break;
        }

        // @ts-ignore - Type instantiation is excessively deep due to Convex type inference
        const result: any = await ctx.runAction(api.chatSystemPrompts.generateStatePrompt as any, {
          stateName: state,
          typeId: typeId,
        });

        if (result.success) {
          results.completed++;
        } else {
          results.failed++;
          results.errors.push({
            state,
            error: result.message,
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          state,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Reset cancellation flag when done
    await ctx.runMutation(internal.chatSystemPrompts.setPromptGenerationCancelledInternal, {
      cancelled: false,
    });

    return results;
  },
});

/**
 * Internal query to get missing states
 */
export const getMissingStatesInternal = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const prompts = await ctx.db
      .query("chatSystemPrompts")
      .collect();
    
    const statesWithPrompts = new Set<string>();
    
    for (const prompt of prompts) {
      const stateName = extractStateFromTitle(prompt.title);
      if (stateName) {
        statesWithPrompts.add(stateName);
      }
    }
    
    const missingStates = US_STATES.filter(state => !statesWithPrompts.has(state));
    
    return missingStates.sort();
  },
});

/**
 * Internal query to get leads type
 */
export const getLeadsTypeInternal = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("chatSystemPromptTypes"),
      name: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const leadsType = await ctx.db
      .query("chatSystemPromptTypes")
      .withIndex("by_name", (q) => q.eq("name", "leads"))
      .first();
    
    if (!leadsType) {
      return null;
    }
    
    return {
      _id: leadsType._id,
      name: leadsType.name,
    };
  },
});

/**
 * Internal mutation to set cancellation flag
 */
export const setPromptGenerationCancelledInternal = internalMutation({
  args: {
    cancelled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Store cancellation flag in logs table using metadata field
    const existing = await ctx.db
      .query("logs")
      .filter((q) => q.eq(q.field("action"), "prompt_generation_cancellation"))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        details: {
          ...existing.details,
          metadata: {
            ...(existing.details.metadata || {}),
            cancelled: args.cancelled,
          },
        },
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("logs", {
        userId: "system",
        action: "prompt_generation_cancellation",
        type: "action",
        details: {
          metadata: {
            cancelled: args.cancelled,
          },
        },
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Remove duplicate system prompts
 * Groups prompts by:
 * 1. Exact title match
 * 2. Same state extracted from title
 * For each group, keeps only the prompt with the largest character count
 */
export const removeDuplicateSystemPrompts = mutation({
  args: {},
  returns: v.object({
    totalPrompts: v.number(),
    groupsFound: v.number(),
    promptsDeleted: v.number(),
    groups: v.array(v.object({
      groupKey: v.string(),
      promptsInGroup: v.number(),
      keptPromptId: v.id("chatSystemPrompts"),
      deletedPromptIds: v.array(v.id("chatSystemPrompts")),
    })),
  }),
  handler: async (ctx) => {
    // Get all system prompts
    const allPrompts = await ctx.db
      .query("chatSystemPrompts")
      .collect();

    // Create groups: by exact title and by state
    const groupsByTitle = new Map<string, typeof allPrompts>();
    const groupsByState = new Map<string, typeof allPrompts>();

    // Group by exact title
    for (const prompt of allPrompts) {
      const titleKey = prompt.title.toLowerCase().trim();
      if (!groupsByTitle.has(titleKey)) {
        groupsByTitle.set(titleKey, []);
      }
      groupsByTitle.get(titleKey)!.push(prompt);
    }

    // Group by state extracted from title
    for (const prompt of allPrompts) {
      const stateName = extractStateFromTitle(prompt.title);
      if (stateName) {
        const stateKey = stateName.toLowerCase();
        if (!groupsByState.has(stateKey)) {
          groupsByState.set(stateKey, []);
        }
        groupsByState.get(stateKey)!.push(prompt);
      }
    }

    // Combine groups: prioritize title groups, then state groups
    // Use a Set to track which prompts we've already processed
    const processedPromptIds = new Set<string>();
    const finalGroups: Array<{
      groupKey: string;
      prompts: typeof allPrompts;
    }> = [];

    // Add title-based groups (exact title matches)
    for (const [titleKey, prompts] of groupsByTitle.entries()) {
      if (prompts.length > 1) {
        finalGroups.push({
          groupKey: `title:${titleKey}`,
          prompts,
        });
        prompts.forEach(p => processedPromptIds.add(p._id));
      }
    }

    // Add state-based groups (same state in title, even if different titles)
    // Only include prompts not already in title groups
    for (const [stateKey, prompts] of groupsByState.entries()) {
      // Filter out prompts already processed in title groups
      const unprocessedPrompts = prompts.filter(p => !processedPromptIds.has(p._id));
      if (unprocessedPrompts.length > 1) {
        finalGroups.push({
          groupKey: `state:${stateKey}`,
          prompts: unprocessedPrompts,
        });
        unprocessedPrompts.forEach(p => processedPromptIds.add(p._id));
      }
    }

    // Process each group: find the largest prompt and delete others
    const results: {
      totalPrompts: number;
      groupsFound: number;
      promptsDeleted: number;
      groups: Array<{
        groupKey: string;
        promptsInGroup: number;
        keptPromptId: any;
        deletedPromptIds: any[];
      }>;
    } = {
      totalPrompts: allPrompts.length,
      groupsFound: finalGroups.length,
      promptsDeleted: 0,
      groups: [],
    };

    for (const group of finalGroups) {
      // Find the prompt with the largest character count
      let largestPrompt = group.prompts[0];
      for (const prompt of group.prompts) {
        if (prompt.systemPromptText.length > largestPrompt.systemPromptText.length) {
          largestPrompt = prompt;
        }
      }

      // Delete all other prompts in the group
      const deletedIds: string[] = [];
      for (const prompt of group.prompts) {
        if (prompt._id !== largestPrompt._id) {
          await ctx.db.delete(prompt._id);
          deletedIds.push(prompt._id);
          results.promptsDeleted++;
        }
      }

      results.groups.push({
        groupKey: group.groupKey,
        promptsInGroup: group.prompts.length,
        keptPromptId: largestPrompt._id,
        deletedPromptIds: deletedIds,
      });
    }

    return results;
  },
});
