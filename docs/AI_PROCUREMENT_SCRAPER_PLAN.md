# AI Procurement Scraper - Implementation Plan

## Overview

This document outlines the plan for building a Convex-AI-Agent component that:
1. Takes a list of approved procurement links
2. Scrapes procurement data from those websites using GPT-5-mini
3. Returns scraped data in JSON format
4. Displays the data in a grid component showing what was scraped and where it came from

**MVP Focus**: Keep it simple and functional while we iron out the kinks of the AI Procurement Scraper.

---

## Phase 1: Database Schema

### 1.1 New Table: `scrapedProcurementData`

**File**: `convex/schema.ts`

Add a new table to store scraped procurement data:

```typescript
scrapedProcurementData: defineTable({
  // Source information
  procurementLinkId: v.optional(v.id("procurementUrls")), // Reference to original procurement link
  sourceUrl: v.string(), // The URL that was scraped
  state: v.string(), // State name
  capital: v.string(), // City/capital name
  
  // Scraping metadata
  scrapedAt: v.number(), // Timestamp when scraping occurred
  scrapedBy: v.string(), // "AI Agent" or user ID
  scrapingStatus: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("failed")
  ),
  errorMessage: v.optional(v.string()), // Error message if scraping failed
  
  // Scraped data (stored as JSON)
  scrapedData: v.any(), // Flexible JSON structure to handle different website formats
  
  // AI metadata
  aiModel: v.string(), // "gpt-5-mini"
  aiPrompt: v.optional(v.string()), // The prompt used for scraping
  tokensUsed: v.optional(v.number()), // Token usage for cost tracking
  
  // Data quality
  dataQuality: v.optional(v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
  )),
  dataCompleteness: v.optional(v.number()), // 0-1 score
  
  // Last update
  updatedAt: v.number(),
})
  .index("by_source_url", ["sourceUrl"])
  .index("by_state", ["state"])
  .index("by_status", ["scrapingStatus"])
  .index("by_scraped_at", ["scrapedAt"])
  .index("by_procurement_link", ["procurementLinkId"]),
```

**Rationale**:
- Flexible `scrapedData` field (v.any()) allows different website structures
- Status tracking for async scraping operations
- Links back to original procurement URLs for traceability
- AI metadata for cost tracking and debugging

### 1.2 New Table: `procurementScraperSystemPrompts`

**File**: `convex/schema.ts`

Add a new table to manage system prompts for the procurement scraper agent (similar to `procurementChatSystemPrompts`):

```typescript
procurementScraperSystemPrompts: defineTable({
  systemPromptText: v.string(), // The full system prompt text
  isPrimarySystemPrompt: v.boolean(), // Whether this is the active/primary prompt
  title: v.string(), // A descriptive title for this prompt
  description: v.optional(v.string()), // Optional description
  createdBy: v.optional(v.string()), // Clerk user ID who created this
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_primary", ["isPrimarySystemPrompt"])
  .index("by_creation", ["createdAt"]),
```

**Rationale**:
- Allows admins to manage and update the scraper agent's system prompt without code changes
- Supports multiple prompt versions with one marked as primary
- Enables A/B testing and prompt iteration
- Follows the same pattern as `procurementChatSystemPrompts` for consistency

### 1.3 Constants File

**File**: `convex/procurementScraperConstants.ts`

Create a constants file to centralize hardcoded values:

```typescript
/**
 * Scraping status values
 */
export const SCRAPING_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ScrapingStatus = typeof SCRAPING_STATUS[keyof typeof SCRAPING_STATUS];

/**
 * Data quality values
 */
export const DATA_QUALITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type DataQuality = typeof DATA_QUALITY[keyof typeof DATA_QUALITY];

/**
 * Default AI model name
 */
export const DEFAULT_AI_MODEL = "gpt-5-mini";

/**
 * Default scraped by value
 */
export const DEFAULT_SCRAPED_BY = "AI Agent";

/**
 * Default data quality when parsing fails
 */
export const DEFAULT_DATA_QUALITY: DataQuality = DATA_QUALITY.MEDIUM;

/**
 * Default data completeness score
 */
export const DEFAULT_DATA_COMPLETENESS = 0.5;
```

---

## Phase 2: Convex AI Agent for Web Scraping

### 2.1 System Prompt Management Module

**File**: `convex/procurementScraperSystemPrompts.ts`

Create a module to manage system prompts for the procurement scraper (following the pattern from `procurementChatSystemPrompts.ts`):

```typescript
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
      "officeName": "Procurement Office",
      "email": "email@example.gov",
      "phone": "phone number",
      "address": "physical address"
    },
    "registrationInfo": {...},
    "otherInfo": "Any additional relevant information"
  },
  "metadata": {
    "dataQuality": "high|medium|low",
    "dataCompleteness": 0.0-1.0,
    "notes": "Any notes about the scraping process"
  }
}

IMPORTANT:
- If a website requires login/registration, note this in the metadata
- If data is not available, return empty arrays but still provide structure
- Be conservative with data quality scores
- Extract only publicly available information
- Handle errors gracefully and report them in the output`;

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
```

### 2.2 Create Scraping Agent

**File**: `convex/procurementScraperAgent.ts`

Create a new agent specifically for scraping procurement websites. The agent will retrieve its system prompt from the database:

```typescript
"use node";

import { Agent, createTool } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v3";
import { api, internal } from "./_generated/api";
import { components } from "./_generated/api";
import { DEFAULT_SYSTEM_PROMPT } from "./procurementScraperSystemPrompts";
import { DEFAULT_AI_MODEL } from "./procurementScraperConstants";

// Tool: Fetch and parse webpage content
const fetchWebpageContent = createTool({
  description: "Fetch the HTML content from a procurement website URL. This is the first step in scraping.",
  args: z.object({
    url: z.string().url().describe("The procurement website URL to fetch"),
  }),
  handler: async (ctx, args): Promise<{
    url: string;
    statusCode: number;
    html: string;
    text: string; // Extracted text content
    error?: string;
  }> => {
    try {
      const response = await fetch(args.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      
      if (!response.ok) {
        return {
          url: args.url,
          statusCode: response.status,
          html: "",
          text: "",
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
      const html = await response.text();
      // Basic text extraction (remove HTML tags)
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 50000); // Limit to 50k chars for token efficiency
      
      return {
        url: args.url,
        statusCode: response.status,
        html: html.substring(0, 100000), // Limit HTML size
        text,
      };
    } catch (error) {
      return {
        url: args.url,
        statusCode: 0,
        html: "",
        text: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Create a procurement scraper agent with a system prompt
 * @param systemPrompt - The system prompt to use (retrieved from database or default)
 */
export function createProcurementScraperAgent(systemPrompt: string): Agent {
  return new Agent(components.agent, {
    languageModel: openai.chat(DEFAULT_AI_MODEL),
    name: "Procurement Data Scraper",
    instructions: systemPrompt,
    tools: {
      fetchWebpageContent,
    },
  });
}

/**
 * Gets the primary system prompt from the database or returns the default.
 * This function should be called from an action context.
 * 
 * @param ctx - The action context
 */
export async function getPrimarySystemPrompt(ctx: any): Promise<string> {
  // Get the primary system prompt from database
  const primaryPrompt = await ctx.runQuery(
    internal.procurementScraperSystemPrompts.getPrimaryInternal,
    {}
  );
  return primaryPrompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;
}
```

---

## Phase 3: Convex Actions and Mutations

### 3.1 Scraping Action

**File**: `convex/procurementScraperActions.ts`

Create actions to trigger scraping:

```typescript
"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { createProcurementScraperAgent, getPrimarySystemPrompt } from "./procurementScraperAgent";
import {
  SCRAPING_STATUS,
  DATA_QUALITY,
  DEFAULT_DATA_QUALITY,
  DEFAULT_DATA_COMPLETENESS,
} from "./procurementScraperConstants";

/**
 * Scrape a single procurement URL
 */
export const scrapeProcurementUrl = action({
  args: {
    url: v.string(),
    procurementLinkId: v.optional(v.id("procurementUrls")),
    state: v.string(),
    capital: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    recordId: any;
    dataQuality?: typeof DATA_QUALITY[keyof typeof DATA_QUALITY];
    dataCompleteness?: number;
    error?: string;
  }> => {
    // Get the primary system prompt from database
    const systemPrompt = await getPrimarySystemPrompt(ctx);
    
    // Create the agent with the system prompt
    const agent = createProcurementScraperAgent(systemPrompt);
    
    // Create scraping record with "in_progress" status
    const scrapingRecordId: any = await ctx.runMutation(
      internal.procurementScraperMutations.createScrapingRecord,
      {
        url: args.url,
        procurementLinkId: args.procurementLinkId,
        state: args.state,
        capital: args.capital,
      }
    );

    try {
      // Use the agent to scrape the URL
      // Note: createThread requires ctx as first argument
      const { threadId } = await agent.createThread(ctx);
      
      // Use generateText instead of run
      const response = await agent.generateText(
        ctx,
        { threadId },
        { prompt: `Please scrape procurement data from this URL: ${args.url}

Extract all available procurement opportunities, RFPs, RFQs, and related information. Return the data in the JSON format specified in your instructions.` }
      );

      // Parse the response
      let scrapedData: any;
      let dataQuality: typeof DATA_QUALITY[keyof typeof DATA_QUALITY] = DEFAULT_DATA_QUALITY;
      let dataCompleteness: number = DEFAULT_DATA_COMPLETENESS;
      let tokensUsed: number | undefined;

      try {
        // Try to extract JSON from the response
        const content = response.text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          scrapedData = JSON.parse(jsonMatch[0]);
          // Validate data quality value
          const quality = scrapedData.metadata?.dataQuality;
          if (quality === DATA_QUALITY.HIGH || quality === DATA_QUALITY.MEDIUM || quality === DATA_QUALITY.LOW) {
            dataQuality = quality;
          } else {
            dataQuality = DEFAULT_DATA_QUALITY;
          }
          dataCompleteness = scrapedData.metadata?.dataCompleteness || DEFAULT_DATA_COMPLETENESS;
        } else {
          // If no JSON found, store the raw response
          scrapedData = { rawResponse: content };
          dataQuality = DATA_QUALITY.LOW;
        }
      } catch (parseError) {
        // If parsing fails, store raw response
        scrapedData = { rawResponse: response.text, parseError: String(parseError) };
        dataQuality = DATA_QUALITY.LOW;
      }

      // Get token usage if available
      if (response.usage) {
        tokensUsed = response.usage.totalTokens;
      }

      // Update the scraping record with results
      await ctx.runMutation(
        internal.procurementScraperMutations.updateScrapingRecord,
        {
          recordId: scrapingRecordId,
          status: SCRAPING_STATUS.COMPLETED,
          scrapedData,
          dataQuality,
          dataCompleteness,
          tokensUsed,
          aiPrompt: `Scrape procurement data from ${args.url}`,
        }
      );

      return {
        success: true,
        recordId: scrapingRecordId,
        dataQuality,
        dataCompleteness,
      };
    } catch (error) {
      // Update record with error
      await ctx.runMutation(
        internal.procurementScraperMutations.updateScrapingRecord,
        {
          recordId: scrapingRecordId,
          status: SCRAPING_STATUS.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        }
      );

      return {
        success: false,
        recordId: scrapingRecordId,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Scrape multiple procurement URLs (batch operation)
 */
export const scrapeMultipleProcurementUrls = action({
  args: {
    urls: v.array(
      v.object({
        url: v.string(),
        procurementLinkId: v.optional(v.id("procurementUrls")),
        state: v.string(),
        capital: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      success: boolean;
      recordId: any;
      dataQuality?: typeof DATA_QUALITY[keyof typeof DATA_QUALITY];
      dataCompleteness?: number;
      error?: string;
    }>;
  }> => {
    const results: Array<{
      success: boolean;
      recordId: any;
      dataQuality?: typeof DATA_QUALITY[keyof typeof DATA_QUALITY];
      dataCompleteness?: number;
      error?: string;
    }> = [];

    for (const urlData of args.urls) {
      const result = await ctx.runAction(api.procurementScraperActions.scrapeProcurementUrl, {
        url: urlData.url,
        procurementLinkId: urlData.procurementLinkId,
        state: urlData.state,
        capital: urlData.capital,
      });
      results.push(result);

      // Add a small delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return {
      total: args.urls.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

/**
 * Scrape all approved procurement links
 */
export const scrapeAllApprovedLinks = action({
  args: {},
  handler: async (ctx): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      success: boolean;
      recordId: any;
      dataQuality?: typeof DATA_QUALITY[keyof typeof DATA_QUALITY];
      dataCompleteness?: number;
      error?: string;
    }>;
  } | {
    success: false;
    error: string;
  }> => {
    // Get all approved procurement links
    // Note: Check the actual query name in your codebase - it might be getLookup instead of getCurrentLookup
    const lookup: any = await ctx.runQuery(
      api.approvedProcurementLinksLookup.getLookup
    );

    if (!lookup || !lookup.approvedProcurementLinks || lookup.approvedProcurementLinks.length === 0) {
      return {
        success: false,
        error: "No approved procurement links found",
      };
    }

    // Transform to scraping format
    const urlsToScrape: Array<{
      url: string;
      procurementLinkId?: any;
      state: string;
      capital: string;
    }> = lookup.approvedProcurementLinks.map((link: {
      procurementLink: string;
      state: string;
      capital: string;
    }) => ({
      url: link.procurementLink,
      state: link.state,
      capital: link.capital,
      // Note: We don't have procurementLinkId here, would need to look it up
    }));

    // Scrape all
    return await ctx.runAction(
      api.procurementScraperActions.scrapeMultipleProcurementUrls,
      {
        urls: urlsToScrape,
      }
    );
  },
});
```

### 3.2 Scraping Mutations

**File**: `convex/procurementScraperMutations.ts`

Create internal mutations for database operations:

```typescript
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  SCRAPING_STATUS,
  DEFAULT_AI_MODEL,
  DEFAULT_SCRAPED_BY,
} from "./procurementScraperConstants";

/**
 * Create a new scraping record
 */
export const createScrapingRecord = internalMutation({
  args: {
    url: v.string(),
    procurementLinkId: v.optional(v.id("procurementUrls")),
    state: v.string(),
    capital: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Note: scrapedData is required in the schema, so we provide a placeholder
    // that will be updated when scraping completes
    return await ctx.db.insert("scrapedProcurementData", {
      sourceUrl: args.url,
      procurementLinkId: args.procurementLinkId,
      state: args.state,
      capital: args.capital,
      scrapedAt: now,
      scrapedBy: DEFAULT_SCRAPED_BY,
      scrapingStatus: SCRAPING_STATUS.IN_PROGRESS,
      scrapedData: { status: "in_progress", message: "Scraping in progress..." }, // Placeholder until scraping completes
      aiModel: DEFAULT_AI_MODEL,
      updatedAt: now,
    });
  },
});

/**
 * Update a scraping record with results
 */
export const updateScrapingRecord = internalMutation({
  args: {
    recordId: v.id("scrapedProcurementData"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    ),
    scrapedData: v.optional(v.any()),
    dataQuality: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    dataCompleteness: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    aiPrompt: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { recordId, ...updates } = args;
    
    await ctx.db.patch(recordId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
```

### 3.3 Scraping Queries

**File**: `convex/procurementScraperQueries.ts`

Create queries to retrieve scraped data:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all scraped procurement data
 */
export const getAllScrapedData = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Note: Cannot reassign query variable - use if/else pattern instead
    if (args.status) {
      return await ctx.db
        .query("scrapedProcurementData")
        .withIndex("by_status", (q) => q.eq("scrapingStatus", args.status!))
        .order("desc")
        .collect();
    } else {
      return await ctx.db
        .query("scrapedProcurementData")
        .withIndex("by_scraped_at")
        .order("desc")
        .collect();
    }
  },
});

/**
 * Get scraped data by state
 */
export const getScrapedDataByState = query({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scrapedProcurementData")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .order("desc")
      .collect();
  },
});

/**
 * Get scraped data by source URL
 */
export const getScrapedDataByUrl = query({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scrapedProcurementData")
      .withIndex("by_source_url", (q) => q.eq("sourceUrl", args.url))
      .order("desc")
      .collect();
  },
});

/**
 * Get statistics about scraped data
 */
export const getScrapingStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("scrapedProcurementData").collect();
    
    return {
      total: all.length,
      completed: all.filter((d) => d.scrapingStatus === "completed").length,
      inProgress: all.filter((d) => d.scrapingStatus === "in_progress").length,
      failed: all.filter((d) => d.scrapingStatus === "failed").length,
      pending: all.filter((d) => d.scrapingStatus === "pending").length,
      byQuality: {
        high: all.filter((d) => d.dataQuality === "high").length,
        medium: all.filter((d) => d.dataQuality === "medium").length,
        low: all.filter((d) => d.dataQuality === "low").length,
      },
    };
  },
});
```

---

## Phase 4: Frontend Components

### 4.1 Scraped Data Grid Component

**File**: `src/components/ScrapedProcurementDataGrid.tsx`

Create a grid component following the existing pattern (similar to `JobPostingsGrid`, `ResumesGrid`):

```typescript
import React, { useState, useMemo } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Eye
} from 'lucide-react';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { TronStatCard } from './TronStatCard';

interface ScrapedProcurementData {
  _id: string;
  sourceUrl: string;
  state: string;
  capital: string;
  scrapedAt: number;
  scrapingStatus: "pending" | "in_progress" | "completed" | "failed";
  scrapedData: any;
  dataQuality?: "high" | "medium" | "low";
  dataCompleteness?: number;
  errorMessage?: string;
}

type SortField = keyof ScrapedProcurementData;
type SortDirection = "asc" | "desc" | null;

export function ScrapedProcurementDataGrid({ className = '' }: { className?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRecord, setSelectedRecord] = useState<ScrapedProcurementData | null>(null);

  // Fetch data
  const scrapedData = useQuery(api.procurementScraperQueries.getAllScrapedData, {});
  const stats = useQuery(api.procurementScraperQueries.getScrapingStats, {});
  
  // Actions
  const scrapeAll = useAction(api.procurementScraperActions.scrapeAllApprovedLinks);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    if (!scrapedData) return [];

    let filtered = scrapedData;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        item.state.toLowerCase().includes(term) ||
        item.capital.toLowerCase().includes(term) ||
        item.sourceUrl.toLowerCase().includes(term) ||
        JSON.stringify(item.scrapedData).toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [scrapedData, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-tron-gray opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 text-tron-blue" />
    ) : (
      <ArrowDown className="w-4 h-4 text-tron-blue" />
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getQualityBadge = (quality?: string) => {
    if (!quality) return null;
    const colors = {
      high: "bg-green-500/20 text-green-400",
      medium: "bg-yellow-500/20 text-yellow-400",
      low: "bg-red-500/20 text-red-400",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[quality as keyof typeof colors]}`}>
        {quality.toUpperCase()}
      </span>
    );
  };

  const handleScrapeAll = async () => {
    try {
      await scrapeAll({});
      // Show success notification
    } catch (error) {
      console.error("Error scraping:", error);
      // Show error notification
    }
  };

  if (!scrapedData) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="w-6 h-6 animate-spin text-tron-blue" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <TronStatCard
            title="Total Scraped"
            value={stats.total}
            icon={RefreshCw}
          />
          <TronStatCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle}
            className="text-green-400"
          />
          <TronStatCard
            title="In Progress"
            value={stats.inProgress}
            icon={Clock}
            className="text-yellow-400"
          />
          <TronStatCard
            title="Failed"
            value={stats.failed}
            icon={XCircle}
            className="text-red-400"
          />
        </div>
      )}

      {/* Controls */}
      <TronPanel>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-tron-gray" />
              <input
                type="text"
                placeholder="Search by state, city, URL, or data content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-tron-bg border border-tron-border rounded-lg text-tron-text placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-blue"
              />
            </div>
          </div>
          <TronButton onClick={handleScrapeAll} className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Scrape All Approved Links
          </TronButton>
        </div>
      </TronPanel>

      {/* Table */}
      <TronPanel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tron-table w-full">
            <thead>
              <tr>
                <th onClick={() => handleSort("state")} className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                  <div className="flex items-center gap-2">
                    <span>State</span>
                    {renderSortIcon("state")}
                  </div>
                </th>
                <th onClick={() => handleSort("capital")} className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                  <div className="flex items-center gap-2">
                    <span>City</span>
                    {renderSortIcon("capital")}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Source URL
                </th>
                <th onClick={() => handleSort("scrapingStatus")} className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    {renderSortIcon("scrapingStatus")}
                  </div>
                </th>
                <th onClick={() => handleSort("dataQuality")} className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                  <div className="flex items-center gap-2">
                    <span>Quality</span>
                    {renderSortIcon("dataQuality")}
                  </div>
                </th>
                <th onClick={() => handleSort("scrapedAt")} className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                  <div className="flex items-center gap-2">
                    <span>Scraped At</span>
                    {renderSortIcon("scrapedAt")}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-tron-gray">
                    {searchTerm ? "No results found" : "No scraped data yet. Click 'Scrape All Approved Links' to start."}
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((item) => (
                  <tr key={item._id} className="border-t border-tron-border hover:bg-tron-bg-card transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-tron-text">{item.state}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-tron-text">{item.capital}</td>
                    <td className="px-6 py-4">
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-tron-blue hover:underline flex items-center gap-1 max-w-xs truncate"
                      >
                        {item.sourceUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.scrapingStatus)}
                        <span className="text-tron-text capitalize">{item.scrapingStatus.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getQualityBadge(item.dataQuality)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-tron-gray text-sm">
                      {new Date(item.scrapedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="text-tron-blue hover:text-tron-blue-light transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TronPanel>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <TronPanel className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-tron-text">Scraped Data Details</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-tron-gray hover:text-tron-text"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-tron-gray mb-2">Source Information</h3>
                <div className="bg-tron-bg-card p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">State:</span> {selectedRecord.state}</p>
                  <p><span className="font-medium">City:</span> {selectedRecord.capital}</p>
                  <p><span className="font-medium">URL:</span> <a href={selectedRecord.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-tron-blue hover:underline">{selectedRecord.sourceUrl}</a></p>
                  <p><span className="font-medium">Scraped At:</span> {new Date(selectedRecord.scrapedAt).toLocaleString()}</p>
                  <p><span className="font-medium">Status:</span> {selectedRecord.scrapingStatus}</p>
                  {selectedRecord.dataQuality && <p><span className="font-medium">Quality:</span> {selectedRecord.dataQuality}</p>}
                  {selectedRecord.dataCompleteness && <p><span className="font-medium">Completeness:</span> {(selectedRecord.dataCompleteness * 100).toFixed(0)}%</p>}
                  {selectedRecord.errorMessage && (
                    <p className="text-red-400"><span className="font-medium">Error:</span> {selectedRecord.errorMessage}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-tron-gray mb-2">Scraped Data (JSON)</h3>
                <pre className="bg-tron-bg-card p-4 rounded-lg overflow-x-auto text-xs text-tron-text">
                  {JSON.stringify(selectedRecord.scrapedData, null, 2)}
                </pre>
              </div>
            </div>
          </TronPanel>
        </div>
      )}
    </div>
  );
}
```

### 4.2 Create Page Component

**File**: `src/pages/ScrapedProcurementDataPage.tsx`

```typescript
import React from 'react';
import { ScrapedProcurementDataGrid } from '../components/ScrapedProcurementDataGrid';

export function ScrapedProcurementDataPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-tron-text mb-2">AI Procurement Scraper</h1>
        <p className="text-tron-gray">
          View scraped procurement data from approved procurement links
        </p>
      </div>
      <ScrapedProcurementDataGrid />
    </div>
  );
}
```

### 4.3 HRDashboard Integration

**File**: `src/pages/HRDashboardPage.tsx`

The Scraped Procurement Data Grid will be integrated into the HRDashboard as a third sub-tab under the "Procurement Links" tab, alongside "AI Chat Assistant" and "Link Verifier".

**Changes Required:**

1. **Update the procurementSubTab state type** to include the new 'scraper' option:

```typescript
const [procurementSubTab, setProcurementSubTab] = useState<'chat' | 'verifier' | 'scraper'>('chat');
```

2. **Add the new sub-tab button** in the procurement-links case:

```typescript
case 'procurement-links':
  return (
    <div className="space-y-6">
      <div className="border-b border-tron-cyan/20">
        <nav className="-mb-px flex justify-center space-x-8">
          <button
            onClick={() => setProcurementSubTab('chat')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${ procurementSubTab === 'chat' ? 'border-tron-cyan text-tron-cyan' : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40' }`}
          >
            AI Chat Assistant
          </button>
          <button
            onClick={() => setProcurementSubTab('verifier')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${ procurementSubTab === 'verifier' ? 'border-tron-cyan text-tron-cyan' : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40' }`}
          >
            Link Verifier
          </button>
          <button
            onClick={() => setProcurementSubTab('scraper')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${ procurementSubTab === 'scraper' ? 'border-tron-cyan text-tron-cyan' : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40' }`}
          >
            AI Scraper
          </button>
        </nav>
      </div>
      {procurementSubTab === 'chat' && (
        <ProcurementChat 
          onExportToVerifier={() => setProcurementSubTab('verifier')}
        />
      )}
      {procurementSubTab === 'verifier' && <ProcurementLinkVerifier />}
      {procurementSubTab === 'scraper' && <ScrapedProcurementDataGrid />}
    </div>
  );
```

3. **Import the component** at the top of the file:

```typescript
import { ScrapedProcurementDataGrid } from '../components/ScrapedProcurementDataGrid';
```

**Rationale:**
- The AI Scraper is logically related to procurement links management
- It follows the existing pattern of sub-tabs in the HRDashboard (similar to KFC Management)
- Keeps all procurement-related tools in one place for better UX
- Users can easily navigate between finding links (Chat), verifying them (Verifier), and scraping data from them (Scraper)

**Note:** The standalone `ScrapedProcurementDataPage` component (from section 4.2) is optional and can be kept for direct navigation if needed, but the primary integration point is the HRDashboard.

---

## Phase 5: Router Integration

### 5.1 Update Router

**File**: `convex/router.ts`

Add the new routes:

```typescript
// Add to existing router
procurementScraperActions: procurementScraperActions,
procurementScraperMutations: procurementScraperMutations,
procurementScraperQueries: procurementScraperQueries,
procurementScraperSystemPrompts: procurementScraperSystemPrompts,
```

---

## Phase 6: Environment Variables

### 6.1 Required Environment Variables

Ensure these are set in Convex:

```bash
OPENAI_API_KEY=sk-...  # Required for AI model (default: gpt-4o-mini)
```

---

## Implementation Order

### Step 1: Database Schema (15 mins)
1. Add `scrapedProcurementData` table to `convex/schema.ts`
2. Add `procurementScraperSystemPrompts` table to `convex/schema.ts`
3. Run `bunx convex dev` to validate schema

### Step 2: Constants and System Prompt Management (30 mins)
1. Create `convex/procurementScraperConstants.ts` with all constant values
2. Create `convex/procurementScraperSystemPrompts.ts` for prompt management
3. Run `bunx convex dev` to generate types
4. Initialize default system prompt via Convex Dashboard (run `initializeDefault` mutation)

### Step 3: Backend - Agent & Actions (1-2 hours)
1. Create `convex/procurementScraperAgent.ts` (uses system prompt from database)
2. Create `convex/procurementScraperActions.ts` (uses constants and database prompt)
3. Create `convex/procurementScraperMutations.ts` (uses constants)
4. Create `convex/procurementScraperQueries.ts`
5. Update `convex/router.ts` (include all new modules)

### Step 4: Frontend - Components (1-2 hours)
1. Create `src/components/ScrapedProcurementDataGrid.tsx`
2. Create `src/pages/ScrapedProcurementDataPage.tsx` (optional - for standalone page)
3. Integrate into `src/pages/HRDashboardPage.tsx`:
   - Import `ScrapedProcurementDataGrid` component
   - Update `procurementSubTab` state type to include `'scraper'`
   - Add "AI Scraper" sub-tab button in the procurement-links section
   - Add conditional rendering for the scraper sub-tab

### Step 5: Testing (30 mins)
1. Test scraping a single URL
2. Test scraping multiple URLs
3. Test grid display
4. Test search and sort functionality
5. Test detail modal

---

## MVP Considerations

### What's Included:
- ✅ Basic web scraping using GPT-5-mini
- ✅ JSON data storage
- ✅ Grid display with search/sort
- ✅ Status tracking
- ✅ Error handling

### What's Deferred (Future Enhancements):
- ⏸️ Advanced HTML parsing (Puppeteer for JS-heavy sites)
- ⏸️ Scheduled/automated scraping
- ⏸️ Data normalization across different sites
- ⏸️ Duplicate detection
- ⏸️ Change detection (notify when new opportunities appear)
- ⏸️ Export functionality (CSV, Excel)
- ⏸️ Advanced filtering (by date, category, etc.)
- ⏸️ Data validation rules
- ⏸️ Retry logic for failed scrapes

---

## Notes

1. **Rate Limiting**: The batch scraper includes a 2-second delay between requests. Adjust as needed.

2. **Token Costs**: GPT-5-mini is cost-effective, but monitor token usage via the `tokensUsed` field.

3. **Error Handling**: Websites may block scrapers, require login, or have different structures. The agent should handle these gracefully.

4. **Data Structure**: The flexible JSON structure allows different websites to return different formats. We can normalize later.

5. **Performance**: For large batches, consider implementing a queue system or background jobs.

6. **Security**: Ensure URLs are validated before scraping to prevent SSRF attacks.

---

## Next Steps After MVP

1. **Improve Scraping Accuracy**: Fine-tune prompts based on real-world results
2. **Add Data Normalization**: Create a standard schema for procurement opportunities
3. **Implement Change Detection**: Track when new opportunities appear
4. **Add Notifications**: Alert users when new opportunities are found
5. **Enhance UI**: Add filters, export, and better data visualization
6. **Add Scheduling**: Automatically scrape on a schedule
7. **Add Retry Logic**: Automatically retry failed scrapes

---

## Critical Implementation Notes (TypeScript Fixes)

### Agent API Usage
- **`createThread` requires `ctx` as first argument**: Use `const { threadId } = await agent.createThread(ctx);` not `agent.createThread()`
- **Use `generateText` instead of `run`**: The Agent class uses `generateText(ctx, { threadId }, { prompt })` not `agent.run({ threadId, messages })`

### Type Annotations Required
- **All action handlers need explicit return types**: Add `: Promise<ReturnType>` to handler functions
- **All variables need type annotations**: Especially for `scrapingRecordId`, `result`, `lookup`, `urlsToScrape`, and callback parameters like `link`

### Database Schema Requirements
- **`scrapedData` is required**: When creating a record with "in_progress" status, provide a placeholder: `scrapedData: { status: "in_progress", message: "Scraping in progress..." }`

### Query Builder Pattern
- **Cannot reassign query variable**: Use if/else pattern instead of reassigning:
  ```typescript
  // ❌ WRONG:
  let query = ctx.db.query("table");
  if (condition) {
    query = query.withIndex(...);
  }
  
  // ✅ CORRECT:
  if (condition) {
    return await ctx.db.query("table").withIndex(...).collect();
  } else {
    return await ctx.db.query("table").collect();
  }
  ```

### Query Names
- **Use `getLookup` not `getCurrentLookup`**: The query is `api.approvedProcurementLinksLookup.getLookup`

### Example Fixed Action Handler
```typescript
export const scrapeProcurementUrl = action({
  args: { ... },
  handler: async (ctx, args): Promise<ReturnType> => {
    const scrapingRecordId: Id<"scrapedProcurementData"> = await ctx.runMutation(...);
    const { threadId } = await agent.createThread(ctx);
    const response = await agent.generateText(ctx, { threadId }, { prompt: "..." });
    // ... rest of implementation
  },
});
```

