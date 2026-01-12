import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
    
    let basePrompt = prompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;
    
    // Get approved procurement links from the lookup table
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    const approvedLinks: ApprovedLink[] = lookup?.approvedProcurementLinks || [];
    
    // If we have approved links, inject them with FULL details
    if (approvedLinks && approvedLinks.length > 0) {
      // Remove any existing approved links section
      basePrompt = removeExistingApprovedLinksSection(basePrompt);
      
      // Format with full details (always show all links)
      const linksSection = formatApprovedLinksForPromptFull(approvedLinks);
      
      // Inject the full links section
      basePrompt = injectApprovedLinksIntoPrompt(basePrompt, linksSection);
    }
    
    return basePrompt;
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
  
  // List of US states for matching
  const states = [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
    "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
    "maine", "maryland", "massachusetts", "michigan", "minnesota",
    "mississippi", "missouri", "montana", "nebraska", "nevada",
    "new hampshire", "new jersey", "new mexico", "new york",
    "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
    "pennsylvania", "rhode island", "south carolina", "south dakota",
    "tennessee", "texas", "utah", "vermont", "virginia", "washington",
    "west virginia", "wisconsin", "wyoming"
  ];
  
  for (const state of states) {
    if (titleLower.includes(state)) {
      // Capitalize first letter of each word
      return state
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
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
    const approvedLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_state_status", (q) => q.eq("state", stateName).eq("status", "approved"))
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
