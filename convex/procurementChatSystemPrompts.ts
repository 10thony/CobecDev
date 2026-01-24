import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

// Internal query for getting a prompt by ID (for use in actions)
export const getByIdInternal = internalQuery({
  args: { id: v.id("procurementChatSystemPrompts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get the full system prompt with all approved links included (for copying to clipboard)
 * This always includes the complete list of approved links, not summaries
 */
export const getFullPromptWithLinks = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Get the primary system prompt
    const primaryPrompt = await ctx.db
      .query("procurementChatSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    
    let basePrompt = primaryPrompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;
    
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
 * Check if the critical section contains the non-viable leads sentence
 * Checks for the base sentence pattern (date may vary)
 */
function hasNonViableLeadsSentence(promptText: string): boolean {
  const basePattern = "DO NOT RETURN ANY NON VIABLE LEADS. LEADS ARE NOT VIABLE IF THE DEADLINE IS IN THE PAST";
  return promptText.includes(basePattern);
}

/**
 * Inject the non-viable leads sentence into the critical section
 * If a critical section exists, adds the sentence to it
 * If no critical section exists, creates one
 * Includes the current date to keep the prompt up to date
 */
function injectNonViableLeadsSentence(promptText: string): string {
  const currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const requiredSentence = `DO NOT RETURN ANY NON VIABLE LEADS. LEADS ARE NOT VIABLE IF THE DEADLINE IS IN THE PAST. Current date: ${currentDate}`;
  
  // Check if already present (check for the base sentence without date, as date may change)
  if (hasNonViableLeadsSentence(promptText)) {
    // Even if present, update the date if it's outdated
    // Remove old version and inject new one with current date
    const oldPattern = /DO NOT RETURN ANY NON VIABLE LEADS\. LEADS ARE NOT VIABLE IF THE DEADLINE IS IN THE PAST[^\n]*/;
    if (oldPattern.test(promptText)) {
      return promptText.replace(oldPattern, requiredSentence);
    }
    return promptText;
  }
  
  // Find any existing CRITICAL section
  const criticalPatterns = [
    /(##\s*CRITICAL[^\n]*\n[^#]*)/i,
    /(CRITICAL[^\n]*\n[^#]*)/i,
  ];
  
  let criticalSectionIndex = -1;
  let criticalSectionEnd = -1;
  
  for (const pattern of criticalPatterns) {
    const match = promptText.match(pattern);
    if (match && match.index !== undefined) {
      criticalSectionIndex = match.index;
      criticalSectionEnd = match.index + match[0].length;
      break;
    }
  }
  
  // If a critical section exists, append the sentence to it
  if (criticalSectionIndex !== -1) {
    // Find the end of the critical section (before next ## or end of text)
    const afterCritical = promptText.slice(criticalSectionEnd);
    const nextSection = afterCritical.indexOf("\n\n## ");
    const rememberIndex = afterCritical.indexOf("\n\nRemember:");
    
    let insertPoint = criticalSectionEnd;
    if (nextSection !== -1 && rememberIndex !== -1) {
      insertPoint = criticalSectionEnd + Math.min(nextSection, rememberIndex);
    } else if (rememberIndex !== -1) {
      insertPoint = criticalSectionEnd + rememberIndex;
    } else if (nextSection !== -1) {
      insertPoint = criticalSectionEnd + nextSection;
    } else {
      // No next section found, insert before "Remember:" if it exists
      const rememberIndexGlobal = promptText.indexOf("Remember:");
      if (rememberIndexGlobal !== -1 && rememberIndexGlobal > criticalSectionEnd) {
        insertPoint = rememberIndexGlobal;
      } else {
        insertPoint = promptText.length;
      }
    }
    
    // Insert the sentence with proper formatting
    const beforeInsert = promptText.slice(0, insertPoint).trimEnd();
    const afterInsert = promptText.slice(insertPoint).trimStart();
    
    // Add the sentence with proper spacing
    const sentenceToAdd = `\n\n${requiredSentence}\n`;
    return beforeInsert + sentenceToAdd + afterInsert;
  }
  
  // If no critical section exists, create one before "Remember:" or at the end
  const rememberIndex = promptText.lastIndexOf("Remember:");
  if (rememberIndex !== -1) {
    const beforeRemember = promptText.slice(0, rememberIndex).trimEnd();
    const afterRemember = promptText.slice(rememberIndex);
    return beforeRemember + `\n\n## CRITICAL RULES\n${requiredSentence}\n\n` + afterRemember;
  }
  
  // If no "Remember:" found, append at the end
  return promptText.trimEnd() + `\n\n## CRITICAL RULES\n${requiredSentence}\n`;
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
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    linkCount: v.number(),
    promptUpdated: v.boolean(),
  }),
  handler: async (ctx) => {
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
    const primaryPrompt = await ctx.db
      .query("procurementChatSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    
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
    let updatedPromptText = linksSection 
      ? injectApprovedLinksIntoPrompt(basePrompt, linksSection)
      : basePrompt;
    
    // Update critical section with non-viable leads sentence
    updatedPromptText = injectNonViableLeadsSentence(updatedPromptText);
    
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
