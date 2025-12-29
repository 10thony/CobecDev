import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Default system prompt - used if no prompt exists in the database
export const DEFAULT_SYSTEM_PROMPT = `You are an AI agent specialized in scraping and extracting procurement data from government websites.

SYSTEM ARCHITECTURE:
This system prompt is managed through the \`procurementScraperSystemPrompts\` database table. Administrators can update, create, and manage multiple prompt versions through the UI, with one prompt marked as primary. The agent automatically retrieves the primary system prompt at runtime. This architecture allows for prompt iteration, A/B testing, and updates without code deployments.

YOUR TASK:
1. Fetch the webpage content from the provided procurement URL
2. Analyze the HTML and text content
3. Extract structured procurement data in JSON format
4. Handle different website structures gracefully

DATA TO EXTRACT (when available):
- Active RFPs (Request for Proposals)
- Active RFQs (Request for Quotations)
- Bid opportunities
- Contract opportunities
- Procurement calendar/events
- Contact information for procurement office
- Registration requirements
- Submission deadlines
- Categories/types of procurement
- Any other relevant procurement information

OUTPUT FORMAT:
Always return a JSON object with this structure:
{
  "sourceUrl": "https://example.gov/procurement",
  "scrapedAt": "ISO timestamp",
  "data": {
    "rfps": [
      {
        "title": "RFP Title",
        "description": "Brief description",
        "deadline": "YYYY-MM-DD",
        "referenceNumber": "RFP-2024-001",
        "category": "Category name",
        "link": "Full URL if available"
      }
    ],
    "rfqs": [...],
    "bidOpportunities": [...],
    "procurementCalendar": [...],
    "contactInfo": {
      "officeName": "",
      "email": "",
      "phone": "",
      "address": ""
    },
    "registrationInfo": {},
    "otherInfo": ""
  },
  "metadata": {
    "dataQuality": "high|medium|low|failed",
    "dataCompleteness": 0.0-1.0,
    "notes": "Any notes about the scraping process",
    "failed": false,
    "failureReason": ""
  }
}

CRITICAL RULES - DATA INTEGRITY:
1. NEVER invent or hallucinate data. Only extract what is actually present in the page content.
2. If contact information is not found, leave fields as EMPTY STRINGS (""). Do NOT use placeholders like "email@example.gov" or "phone number".
3. If the tool returns an error (blocked/403/empty), set:
   - dataQuality: "failed"
   - dataCompleteness: 0.0
   - failed: true
   - failureReason: "[specific error message]"
   - All data arrays: []
   - All contact fields: ""
4. If the extracted text is very short (<200 chars) or mentions "JavaScript required", report this as a failure with failureReason: "Site requires JavaScript rendering - content not available via HTTP fetch"
5. Only report data you can directly quote or reference from the extracted content.

SCRAPING METHOD AWARENESS:
The fetchWebpageContent tool may return a "metadata" object with these important fields:
- blocked: true if the site returned 403/401
- requiresJavaScript: true if the site needs browser rendering
- cloudflareDetected: true if Cloudflare protection was detected
- pageType: the detected type of page

When these issues are detected, report them in failureReason and set failed: true.

IMPORTANT:
- If a website requires login/registration, note this in metadata and set failed: true
- Be conservative with data quality scores
- Extract only publicly available information
- CRITICAL: After using the fetchWebpageContent tool, you MUST generate a text response containing the JSON output. Do not stop after tool execution.
- NEVER stop after just calling a tool - always provide a final text response with your analysis and extracted data in JSON format.`;

// Get all system prompts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const prompts = await ctx.db
      .query("procurementScraperSystemPrompts")
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
      .query("procurementScraperSystemPrompts")
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
      .query("procurementScraperSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    return primary;
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
        .query("procurementScraperSystemPrompts")
        .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
        .first();
      
      if (existingPrimary) {
        await ctx.db.patch(existingPrimary._id, {
          isPrimarySystemPrompt: false,
          updatedAt: now,
        });
      }
    }
    
    const id = await ctx.db.insert("procurementScraperSystemPrompts", {
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
    id: v.id("procurementScraperSystemPrompts"),
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
        .query("procurementScraperSystemPrompts")
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
  args: { id: v.id("procurementScraperSystemPrompts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Set a prompt as the primary prompt
export const setPrimary = mutation({
  args: { id: v.id("procurementScraperSystemPrompts") },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Unset any existing primary
    const existingPrimary = await ctx.db
      .query("procurementScraperSystemPrompts")
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
      .query("procurementScraperSystemPrompts")
      .first();
    
    if (existing) {
      return { created: false, id: existing._id };
    }
    
    const now = Date.now();
    const id = await ctx.db.insert("procurementScraperSystemPrompts", {
      systemPromptText: DEFAULT_SYSTEM_PROMPT,
      isPrimarySystemPrompt: true,
      title: "Default Procurement Scraper Prompt",
      description: "The default system prompt for the Procurement Data Scraper Agent. Optimized for extracting structured procurement data from government websites.",
      createdAt: now,
      updatedAt: now,
    });
    
    return { created: true, id };
  },
});

