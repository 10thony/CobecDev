

# 🚀 Procurement Chat Enhancement Plan Using Convex Agent Component

## Executive Summary

Your current implementation has three critical issues:
1. **404 Errors**: GPT-4o-mini is hallucinating URLs that don't exist
2. **Incorrect City Names**: The `capital` field shows "Austin City" for all results even when querying different Texas cities
3. **No Validation**: URLs are returned without any verification

The **Convex Agent Component** (`@convex-dev/agent`) can solve all these issues by providing:
- **Tool Calls**: Allow the AI to search verified URLs and validate links
- **RAG Integration**: Use your existing `procurementUrls` table as a knowledge base
- **Thread Persistence**: Already built-in, replacing your custom session management
- **Streaming**: Real-time response streaming over websockets

---

## Current Architecture Analysis

### Current Flow (Issues Highlighted)

```1:57:convex/procurementChat.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";

const SYSTEM_PROMPT = `You are a specialized Procurement Data Intelligence Agent. Your primary function is to assist users in identifying official government procurement, bidding, and RFP (Request for Proposal) portals for specific geographic regions (States, Cities, Counties, or Municipalities).
// ... truncated
`;
```

**Problems:**
1. ❌ Prompt says "Do not hallucinate URLs" but provides no source data
2. ❌ The `capital` field schema is misleading (used for any city, not just capitals)
3. ❌ No URL validation or verification step
4. ❌ Confidence scores are fabricated by the LLM

---

## Proposed Architecture with Convex Agent

### Phase 1: Install and Configure the Agent Component

```bash
bun install @convex-dev/agent
```

### Phase 2: Create Procurement Agent with Tool Calls

Create a new file `convex/procurementAgent.ts`:

```typescript
// convex/procurementAgent.ts
import { Agent, createTool } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import { components } from "./_generated/api";

// Tool 1: Search verified procurement URLs from database
const searchVerifiedUrls = createTool({
  description: "Search for verified procurement URLs from our database. Use this FIRST before generating any URLs.",
  args: z.object({
    state: z.string().describe("The US state to search for (e.g., 'Texas')"),
    city: z.string().optional().describe("Optional city name to filter by"),
  }),
  handler: async (ctx, args) => {
    // Query the procurementUrls table for approved links
    const results = await ctx.runQuery(api.procurementUrls.searchByStateCity, {
      state: args.state,
      city: args.city,
      status: "approved",
    });
    return results;
  },
});

// Tool 2: Validate a URL exists (HEAD request)
const validateUrl = createTool({
  description: "Validate that a URL is accessible and not returning 404. Use this to verify URLs before returning them.",
  args: z.object({
    url: z.string().url().describe("The URL to validate"),
  }),
  handler: async (ctx, args) => {
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
  handler: async (ctx, args) => {
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
  handler: async (ctx, args) => {
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
  model: openai("gpt-4o-mini"), // Keep using gpt-4o-mini as requested
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
  tools: [searchVerifiedUrls, validateUrl, webSearchProcurement, suggestNewUrl],
});
```

### Phase 3: Update the Action to Use the Agent

```typescript
// convex/procurementChat.ts (updated)
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { procurementAgent } from "./procurementAgent";

export const fetchAndSaveProcurementLinks = action({
  args: { 
    prompt: v.string(),
    sessionId: v.id("procurementChatSessions"),
    targetRegions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      // Use the Agent to process the request
      const result = await procurementAgent.run(ctx, {
        input: args.prompt,
        // Optionally use thread ID from session for conversation context
        threadId: args.sessionId,
      });

      // Parse the structured response
      const parsed = JSON.parse(result.text);
      
      if (!parsed.search_metadata || !parsed.procurement_links) {
        throw new Error("Invalid response structure from Agent");
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
      
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: errorMessage,
        isError: true,
      });
      
      throw new Error(errorMessage);
    }
  },
});
```

### Phase 4: Add Missing Query for Searching Verified URLs

```typescript
// convex/procurementUrls.ts (add this query)
import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const searchByStateCity = query({
  args: {
    state: v.string(),
    city: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("procurementUrls");
    
    if (args.status) {
      query = query.withIndex("by_state_status", (q) => 
        q.eq("state", args.state).eq("status", args.status)
      );
    } else {
      query = query.withIndex("by_state", (q) => q.eq("state", args.state));
    }
    
    const results = await query.collect();
    
    // Filter by city if provided
    if (args.city) {
      return results.filter(r => 
        r.capital.toLowerCase().includes(args.city!.toLowerCase())
      );
    }
    
    return results;
  },
});

export const addPendingUrl = internalMutation({
  args: {
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("procurementUrls", {
      state: args.state,
      capital: args.capital,
      officialWebsite: args.officialWebsite,
      procurementLink: args.procurementLink,
      status: "pending",
      importedAt: Date.now(),
    });
  },
});
```

---

## Phase 5: Schema Enhancement (Fix the "capital" Field Issue)

The current schema uses `capital` for all cities, which is confusing. Add a migration or update the schema:

```typescript
// convex/schema.ts - Updated procurementUrls table
procurementUrls: defineTable({
  state: v.string(),
  city: v.string(), // Renamed from "capital" - actual city name
  entityType: v.union(v.literal("City"), v.literal("County"), v.literal("State"), v.literal("Municipality")),
  officialWebsite: v.string(),
  procurementLink: v.string(),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
  verifiedBy: v.optional(v.string()),
  verifiedAt: v.optional(v.number()),
  denialReason: v.optional(v.string()),
  importedAt: v.number(),
  sourceFile: v.optional(v.string()),
  requiresRegistration: v.optional(v.boolean()),
  // NEW: Track URL validation
  lastValidatedAt: v.optional(v.number()),
  lastValidationStatus: v.optional(v.number()), // HTTP status code
})
```

---

## Implementation Roadmap

| Phase | Task | Effort | Priority |
|-------|------|--------|----------|
| **1** | Install `@convex-dev/agent` | 5 min | 🔴 High |
| **2** | Create `procurementAgent.ts` with tools | 2 hrs | 🔴 High |
| **3** | Add `searchByStateCity` query | 30 min | 🔴 High |
| **4** | Update `fetchAndSaveProcurementLinks` action | 1 hr | 🔴 High |
| **5** | Seed verified URLs into `procurementUrls` table | 1 hr | 🟡 Medium |
| **6** | Add URL validation background job | 2 hrs | 🟡 Medium |
| **7** | Migrate schema (`capital` → `city`) | 1 hr | 🟢 Low |
| **8** | Add web search integration (Serper/Brave) | 2 hrs | 🟢 Low |

---

## Key Benefits of This Approach

### 1. **Eliminates 404 Errors**
- Agent MUST use `searchVerifiedUrls` tool first
- URLs are validated via HEAD requests before returning
- Only verified or validated URLs reach the user

### 2. **Fixes City Name Issue**
- Schema clarification: `city` field instead of `capital`
- Prompt explicitly instructs to use correct city names
- Tool parameters enforce city name capture

### 3. **Maintains gpt-4o-mini**
- Same model, but enhanced with tool capabilities
- Lower latency than larger models
- Cost-effective for your use case

### 4. **Self-Improving System**
- `suggestNewUrl` tool captures new URLs for verification
- URL validation results stored for future reference
- Database grows with each successful discovery

### 5. **Better User Experience**
- Streaming responses via websockets (built into Agent component)
- Real-time progress as tools execute
- Clear confidence scores based on actual data source

---

## Example Flow After Enhancement

```
User: "Get procurement links for Houston and Dallas Texas"

Agent:
1. searchVerifiedUrls(state: "Texas", city: "Houston") → ✅ 2 results
2. searchVerifiedUrls(state: "Texas", city: "Dallas") → ❌ 0 results
3. validateUrl("https://www.dallascityhall.com/purchasing") → ✅ 200 OK
4. suggestNewUrl({state: "Texas", city: "Dallas", ...}) → Saved for review

Response:
{
  "procurement_links": [
    {
      "state": "Texas",
      "city": "Houston",  // ✅ Correct city name
      "procurement_link": "https://www.houstontx.gov/purchasing",
      "confidence_score": 1.0,  // ✅ From database
      "source": "database"
    },
    {
      "state": "Texas", 
      "city": "Dallas",  // ✅ Correct city name
      "procurement_link": "https://www.dallascityhall.com/purchasing",
      "confidence_score": 0.85,  // ✅ Validated via HEAD
      "source": "validated"
    }
  ]
}
```

---

## References

- [Convex Agent Component Documentation](https://www.convex.dev/components/agent)
- [Convex Agent GitHub Repository](https://github.com/get-convex/agent)

Would you like me to start implementing any of these phases?