"use node";

import { Agent, createTool } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v3";
import { api, internal } from "./_generated/api";
import { components } from "./_generated/api";

// Tool 1: Search verified procurement URLs from database
const searchVerifiedUrls = createTool({
  description: "Search for verified procurement URLs from our database. Use this FIRST before generating any URLs.",
  args: z.object({
    state: z.string().describe("The US state to search for (e.g., 'Texas')"),
    city: z.string().optional().describe("Optional city name to filter by"),
  }),
  handler: async (ctx, args): Promise<Array<{
    state: string;
    capital: string;
    officialWebsite: string;
    procurementLink: string;
    status: string;
  }>> => {
    // Query the procurementUrls table for approved links
    const results = await ctx.runQuery(api.procurementUrls.searchByStateCity, {
      state: args.state,
      city: args.city,
      status: "approved",
    });
    return results as Array<{
      state: string;
      capital: string;
      officialWebsite: string;
      procurementLink: string;
      status: string;
    }>;
  },
});

// Tool 2: Validate a URL exists (HEAD request)
const validateUrl = createTool({
  description: "Validate that a URL is accessible and not returning 404. Use this to verify URLs before returning them.",
  args: z.object({
    url: z.string().url().describe("The URL to validate"),
  }),
  handler: async (ctx, args): Promise<{ isValid: boolean; statusCode: number; finalUrl?: string; error?: string }> => {
    try {
      const response = await fetch(args.url, { 
        method: "HEAD",
        headers: { "User-Agent": "CobecDev/1.0" },
      });
      return {
        isValid: response.ok,
        statusCode: response.status,
        finalUrl: response.url, // In case of redirects
      };
    } catch (error) {
      return {
        isValid: false,
        statusCode: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Tool 3: Search for procurement portals (web search fallback)
const webSearchProcurement = createTool({
  description: "Search the web for official government procurement portals. Only use when database has no results.",
  args: z.object({
    query: z.string().describe("Search query for finding procurement portals"),
    state: z.string().describe("The US state context"),
    city: z.string().optional().describe("Optional city name"),
  }),
  handler: async (ctx, args): Promise<{ suggestion: string; knownPatterns: string[] }> => {
    // This could integrate with a search API (Serper, Brave, etc.)
    // For now, return guidance to use known patterns
    return {
      suggestion: `Search for "${args.city || args.state} procurement bidding RFP portal site:.gov"`,
      knownPatterns: [
        `${args.city?.toLowerCase().replace(/\s/g, '')}.gov/purchasing`,
        `${args.city?.toLowerCase().replace(/\s/g, '')}texas.gov/procurement`,
      ],
    };
  },
});

// Tool 4: Store newly discovered URLs for verification
const suggestNewUrl = createTool({
  description: "Suggest a new procurement URL for manual verification. Use when you find a likely valid URL that's not in our database.",
  args: z.object({
    state: z.string(),
    city: z.string(),
    officialWebsite: z.string().url(),
    procurementLink: z.string().url(),
    entityType: z.enum(["City", "County", "State", "Municipality"]),
  }),
  handler: async (ctx, args): Promise<{ saved: boolean; status: string }> => {
    await ctx.runMutation(internal.procurementUrls.addPendingUrl, {
      state: args.state,
      capital: args.city, // Note: "capital" field is actually city name
      officialWebsite: args.officialWebsite,
      procurementLink: args.procurementLink,
    });
    return { saved: true, status: "pending_verification" };
  },
});

// Define the Procurement Agent
export const procurementAgent = new Agent(components.agent, {
  languageModel: openai.chat("gpt-4o-mini"), // Keep using gpt-4o-mini as requested
  name: "Procurement Link Agent",
  instructions: `You are a Procurement Data Intelligence Agent that helps users find official government procurement portals.

CRITICAL RULES:
1. ALWAYS use the searchVerifiedUrls tool FIRST to check our database
2. NEVER fabricate or guess URLs - only return URLs that are verified or validated
3. For each city requested, use the CORRECT city name (not "Austin" for everything)
4. If database has no results, use validateUrl to check known URL patterns
5. Use suggestNewUrl to save promising URLs for future use
6. Confidence scores should reflect actual validation status:
   - 1.0 = From verified database
   - 0.7-0.9 = URL validated via HEAD request
   - 0.5-0.6 = Pattern-based guess (requires validation)
   - <0.5 = Should not be returned

OUTPUT FORMAT:
Always structure your final response as JSON with this schema:
{
  "search_metadata": {
    "target_regions": ["Texas"],
    "count_found": 3,
    "timestamp": "ISO timestamp",
    "sources": ["database", "validated", "suggested"]
  },
  "procurement_links": [
    {
      "state": "Texas",
      "city": "Houston",  // Use actual city name, NOT "capital"
      "official_website": "https://www.houstontx.gov",
      "procurement_link": "https://www.houstontx.gov/purchasing",
      "entity_type": "City",
      "link_type": "Direct Portal",
      "confidence_score": 1.0,
      "source": "database"  // or "validated" or "suggested"
    }
  ]
}`,
  tools: {
    searchVerifiedUrls,
    validateUrl,
    webSearchProcurement,
    suggestNewUrl,
  },
});
