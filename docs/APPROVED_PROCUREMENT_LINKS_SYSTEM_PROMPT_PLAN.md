# Approved Procurement Links System Prompt Integration Plan

## Overview
This plan outlines the implementation of injecting already collected/approved procurement links into the AI Chat Assistant's system prompt. This will help the AI provide better, more accurate responses and significantly decrease the amount of duplicated links provided.

## Goals
1. Track approved procurement links in a centralized lookup table
2. Automatically update the lookup table whenever a procurement link is approved (manually or by AI Agent)
3. Inject approved procurement links into the system prompt dynamically
4. Prevent the AI from suggesting links that are already approved in the system

---

## CRITICAL: Implementation Order

**⚠️ FOLLOW THIS EXACT ORDER TO AVOID ERRORS:**

1. **Step 1:** Update `convex/schema.ts` (add the new table)
2. **Step 2:** Run `npx convex dev` and wait for types to generate
3. **Step 3:** Create `convex/approvedProcurementLinksLookup.ts` (the new module)
4. **Step 4:** Run the `initialize` mutation via Convex Dashboard
5. **Step 5:** Update `convex/procurementUrls.ts` (add hooks to refresh lookup)
6. **Step 6:** Update `convex/simpleChatAgent.ts` (add prompt injection)
7. **Step 7:** Update `convex/simpleChat.ts` (pass user message to prompt function)
8. **Step 8:** Test end-to-end

---

## Phase 1: Database Schema - ApprovedProcurementLinksLookUp Table

### 1.1 File to Modify
**File:** `convex/schema.ts`

### 1.2 Exact Change Location
Add the following table definition INSIDE the `applicationTables` object, **after line 622** (after the `procurementUrls` table definition closes):

### 1.3 Exact Code to Add

```typescript
  // Approved Procurement Links Lookup - singleton table for system prompt injection
  // This table caches all approved procurement links for efficient access during chat
  approvedProcurementLinksLookUp: defineTable({
    dateCreated: v.number(), // Timestamp when the lookup was first created
    lastApprovedBy: v.string(), // User ID (Clerk), "AI Agent", "System", or "Migration"
    lastApprovedAt: v.number(), // Timestamp of last approval that triggered update
    approvedProcurementLinks: v.array(
      v.object({
        state: v.string(),
        capital: v.string(),
        officialWebsite: v.string(),
        procurementLink: v.string(),
        // CRITICAL: Use v.union with v.null() for optional fields inside arrays
        // Using v.optional() inside arrays causes Convex deployment errors
        entityType: v.union(v.string(), v.null()),
        linkType: v.union(v.string(), v.null()),
        requiresRegistration: v.union(v.boolean(), v.null()),
      })
    ), // Array of all approved procurement links
    updatedAt: v.number(), // Last update timestamp
  })
    .index("by_creation", ["dateCreated"]), // For sorting/querying
```

### 1.4 Why This Structure?
- **Singleton pattern:** Only one record should exist in this table
- **`v.union(v.string(), v.null())`:** Convex requires this for optional fields inside arrays. Using `v.optional()` causes deployment errors.
- **`lastApprovedBy`:** Audit trail for who/what triggered the last update
- **No complex indexes:** We always query the single record, so no additional indexes needed

### 1.5 Verification After This Step
After saving `schema.ts`, run:
```bash
npx convex dev
```

Wait for the output to show:
```
✔ Schema validation complete
```

Check `convex/_generated/api.d.ts` to verify the new table types are generated.

---

## Phase 2: Lookup Table Management Functions

### 2.1 New File to Create
**File:** `convex/approvedProcurementLinksLookup.ts`

### 2.2 Complete File Contents

**⚠️ COPY THIS ENTIRE FILE EXACTLY:**

```typescript
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Type for the formatted link structure
type FormattedLink = {
  state: string;
  capital: string;
  officialWebsite: string;
  procurementLink: string;
  entityType: string | null;
  linkType: string | null;
  requiresRegistration: boolean | null;
};

/**
 * Shared helper function to refresh the lookup table
 * This can be called directly from mutations
 * 
 * IMPORTANT: This function MUST use null (not undefined) for optional fields
 * to match the schema's v.union(v.string(), v.null()) validators
 */
export async function refreshLookupHelper(
  ctx: MutationCtx,
  approvedBy: string
): Promise<void> {
  // Get all approved procurement links directly from database
  const approvedLinks = await ctx.db
    .query("procurementUrls")
    .withIndex("by_status", (q) => q.eq("status", "approved"))
    .collect();
  
  // Transform to lookup format
  // CRITICAL: Use null instead of undefined for optional fields
  const formattedLinks: FormattedLink[] = approvedLinks.map((link: Doc<"procurementUrls">) => ({
    state: link.state,
    capital: link.capital,
    officialWebsite: link.officialWebsite,
    procurementLink: link.procurementLink,
    entityType: null, // Not stored in procurementUrls table
    linkType: null, // Not stored in procurementUrls table
    requiresRegistration: link.requiresRegistration ?? null, // Convert undefined to null
  }));
  
  const now = Date.now();
  
  // Check if lookup exists (singleton pattern)
  const existing = await ctx.db
    .query("approvedProcurementLinksLookUp")
    .first();
  
  if (existing) {
    // Update existing record
    await ctx.db.patch(existing._id, {
      lastApprovedBy: approvedBy,
      lastApprovedAt: now,
      approvedProcurementLinks: formattedLinks,
      updatedAt: now,
    });
  } else {
    // Create new record
    await ctx.db.insert("approvedProcurementLinksLookUp", {
      dateCreated: now,
      lastApprovedBy: approvedBy,
      lastApprovedAt: now,
      approvedProcurementLinks: formattedLinks,
      updatedAt: now,
    });
  }
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the current lookup record (public query)
 */
export const getLookup = query({
  args: {},
  handler: async (ctx) => {
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    return lookup;
  },
});

/**
 * Get approved links formatted for the system prompt (public query)
 */
export const getApprovedLinksForPrompt = query({
  args: {},
  handler: async (ctx) => {
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    if (!lookup) {
      // Return empty array if lookup doesn't exist yet
      return [];
    }
    
    return lookup.approvedProcurementLinks;
  },
});

/**
 * Get approved links for system prompt (internal query for use in actions)
 * 
 * CRITICAL: This function MUST handle null gracefully since the lookup
 * table may not exist before initialization. Returns empty array to
 * prevent errors in system prompt generation.
 */
export const getApprovedLinksForPromptInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    // Gracefully handle null/undefined lookup (e.g., before initialization)
    // Return empty array to prevent errors in system prompt generation
    return lookup?.approvedProcurementLinks || [];
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Internal mutation to refresh the lookup table
 * Called from other mutations when links are approved
 */
export const refreshLookup = internalMutation({
  args: {
    approvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await refreshLookupHelper(ctx, args.approvedBy);
  },
});

/**
 * Initialize the lookup table with current approved links
 * This should be run once after schema deployment to populate initial data
 * 
 * Can be called from the Convex Dashboard:
 * 1. Go to your Convex Dashboard
 * 2. Navigate to Functions
 * 3. Find approvedProcurementLinksLookup:initialize
 * 4. Click "Run" with no arguments
 */
export const initialize = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    count: v.number(),
    isUpdate: v.boolean(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    // Use "Migration" for initialization to distinguish from runtime updates
    const approvedBy = identity?.subject || "Migration";
    
    // Get all approved links from procurementUrls table
    const approvedLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    
    // Transform to lookup format
    // CRITICAL: Use null instead of undefined for optional fields
    const formattedLinks: FormattedLink[] = approvedLinks.map((link: Doc<"procurementUrls">) => ({
      state: link.state,
      capital: link.capital,
      officialWebsite: link.officialWebsite,
      procurementLink: link.procurementLink,
      entityType: null,
      linkType: null,
      requiresRegistration: link.requiresRegistration ?? null,
    }));
    
    const now = Date.now();
    
    // Check if lookup exists
    const existing = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        lastApprovedBy: approvedBy,
        lastApprovedAt: now,
        approvedProcurementLinks: formattedLinks,
        updatedAt: now,
      });
      return {
        success: true,
        message: `Updated existing lookup with ${formattedLinks.length} approved links`,
        count: formattedLinks.length,
        isUpdate: true,
      };
    } else {
      // Create new record
      await ctx.db.insert("approvedProcurementLinksLookUp", {
        dateCreated: now,
        lastApprovedBy: approvedBy,
        lastApprovedAt: now,
        approvedProcurementLinks: formattedLinks,
        updatedAt: now,
      });
      return {
        success: true,
        message: `Created lookup with ${formattedLinks.length} approved links`,
        count: formattedLinks.length,
        isUpdate: false,
      };
    }
  },
});

/**
 * Force refresh the lookup table (admin utility)
 * Useful if the lookup gets out of sync with procurementUrls
 */
export const forceRefresh = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    count: v.number(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const approvedBy = identity?.subject || "System";
    
    await refreshLookupHelper(ctx, approvedBy);
    
    // Get count for response
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    return {
      success: true,
      count: lookup?.approvedProcurementLinks.length || 0,
    };
  },
});

/**
 * Get statistics about the lookup table
 */
export const getStats = query({
  args: {},
  returns: v.union(
    v.object({
      exists: v.literal(true),
      linkCount: v.number(),
      lastUpdatedAt: v.number(),
      lastApprovedBy: v.string(),
      stateCount: v.number(),
    }),
    v.object({
      exists: v.literal(false),
    })
  ),
  handler: async (ctx) => {
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    if (!lookup) {
      return { exists: false as const };
    }
    
    // Count unique states
    const uniqueStates = new Set(
      lookup.approvedProcurementLinks.map((link) => link.state)
    );
    
    return {
      exists: true as const,
      linkCount: lookup.approvedProcurementLinks.length,
      lastUpdatedAt: lookup.updatedAt,
      lastApprovedBy: lookup.lastApprovedBy,
      stateCount: uniqueStates.size,
    };
  },
});
```

### 2.3 Verification After This Step
After saving the file, `npx convex dev` should show no errors. If you see type errors, make sure:
1. You ran `npx convex dev` after updating the schema
2. The types in `_generated/dataModel.d.ts` include the new table

---

## Phase 3: Hook into Approval Points

### 3.1 File to Modify
**File:** `convex/procurementUrls.ts`

### 3.2 Add Import at Top of File
**Location:** After line 2 (after existing imports)

```typescript
import { refreshLookupHelper } from "./approvedProcurementLinksLookup";
```

### 3.3 Update `approve` Mutation
**Current location:** Lines 352-375

**Find this code (around line 373):**
```typescript
    await ctx.db.patch(args.id, updateData);
  },
});
```

**Replace with:**
```typescript
    await ctx.db.patch(args.id, updateData);
    
    // Refresh the approved procurement links lookup table
    const approvedBy = identity?.subject || "System";
    await refreshLookupHelper(ctx, approvedBy);
  },
});
```

### 3.4 Update `reportAgentResult` Internal Mutation
**Current location:** Lines 590-624

**Find this code (around line 622):**
```typescript
    await ctx.db.patch(args.id, updateData);
  },
});
```

**Replace with:**
```typescript
    await ctx.db.patch(args.id, updateData);
    
    // If approved, refresh the lookup table
    if (args.status === "approved") {
      await refreshLookupHelper(ctx, "AI Agent");
    }
  },
});
```

### 3.5 Update `addManual` Mutation
**Current location:** Lines 500-561

**Find this code (around line 536-537):**
```typescript
      await ctx.db.patch(existing._id, updateData);
      return existing._id;
```

**Replace with:**
```typescript
      await ctx.db.patch(existing._id, updateData);
      
      // Refresh the approved procurement links lookup table
      const approvedBy = identity?.subject || "System";
      await refreshLookupHelper(ctx, approvedBy);
      
      return existing._id;
```

**Also find this code (around line 557):**
```typescript
    const id = await ctx.db.insert("procurementUrls", insertData);

    return id;
```

**Replace with:**
```typescript
    const id = await ctx.db.insert("procurementUrls", insertData);
    
    // Refresh the approved procurement links lookup table
    const approvedBy = identity?.subject || "System";
    await refreshLookupHelper(ctx, approvedBy);

    return id;
```

### 3.6 Update `approveAll` Mutation
**Current location:** Lines 447-471

**Find this code (around line 469):**
```typescript
    }
    
    return pending.length;
  },
});
```

**Replace with:**
```typescript
    }
    
    // Refresh the lookup table after bulk approval
    if (pending.length > 0) {
      const approvedBy = identity?.subject || "System";
      await refreshLookupHelper(ctx, approvedBy);
    }
    
    return pending.length;
  },
});
```

### 3.7 Verification After This Step
Run `npx convex dev` and verify no type errors. The import should resolve correctly.

---

## Phase 4: System Prompt Integration

### 4.1 File to Modify
**File:** `convex/simpleChatAgent.ts`

### 4.2 Complete Updated File Contents

**⚠️ REPLACE THE ENTIRE FILE WITH THIS:**

```typescript
"use node";

import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components, internal } from "./_generated/api";
import { DEFAULT_SYSTEM_PROMPT } from "./procurementChatSystemPrompts";

// Type for the approved link structure from lookup table
interface ApprovedLink {
  state: string;
  capital: string;
  officialWebsite: string;
  procurementLink: string;
  entityType: string | null;
  linkType: string | null;
  requiresRegistration: boolean | null;
}

/**
 * Creates a simple chat agent with the provided system prompt.
 * @param systemPrompt - The system prompt to use for the agent
 * @returns A configured Agent instance
 */
export function createSimpleChatAgent(systemPrompt: string): Agent {
  return new Agent(components.agent, {
    name: "Procurement Chat Assistant",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: systemPrompt,
    // No tools for MVP - just plain chat
  });
}

/**
 * Gets the primary system prompt from the database or returns the default.
 * Optionally injects approved procurement links based on user message context.
 * 
 * This function should be called from an action context.
 * 
 * @param ctx - The action context
 * @param userMessage - Optional user message for state detection
 */
export async function getPrimarySystemPrompt(
  ctx: any,
  userMessage?: string
): Promise<string> {
  // Get the primary system prompt from database
  const primaryPrompt = await ctx.runQuery(
    internal.procurementChatSystemPrompts.getPrimaryInternal,
    {}
  );
  let basePrompt = primaryPrompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;
  
  // Get approved procurement links from the lookup table
  let approvedLinks: ApprovedLink[] = [];
  try {
    approvedLinks = await ctx.runQuery(
      internal.approvedProcurementLinksLookup.getApprovedLinksForPromptInternal,
      {}
    );
  } catch (error) {
    // If the lookup table doesn't exist yet, continue without approved links
    console.warn("Could not fetch approved links (lookup may not be initialized):", error);
    approvedLinks = [];
  }
  
  // If we have approved links, inject them into the prompt
  if (approvedLinks && approvedLinks.length > 0) {
    // Detect target state from user message (if provided)
    const targetState = detectStateFromMessage(userMessage);
    
    const linksSection = formatApprovedLinksForPrompt(
      approvedLinks,
      targetState
    );
    basePrompt = injectApprovedLinksIntoPrompt(basePrompt, linksSection);
  }
  
  return basePrompt;
}

/**
 * Detect state name from user message (simple keyword matching)
 * Returns state name if detected, null otherwise
 */
function detectStateFromMessage(message?: string): string | null {
  if (!message) return null;
  
  const messageLower = message.toLowerCase();
  
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
    if (messageLower.includes(state)) {
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
 * @param links - Array of approved procurement links
 * @param targetState - Optional state name to filter links (if user asked for specific state)
 */
function formatApprovedLinksForPrompt(
  links: ApprovedLink[],
  targetState?: string | null
): string {
  if (links.length === 0) return "";
  
  // Filter links by target state if specified
  let filteredLinks = links;
  if (targetState) {
    filteredLinks = links.filter(
      link => link.state.toLowerCase() === targetState.toLowerCase()
    );
  }
  
  // If no state filter and we have many links, show summary only
  if (!targetState && filteredLinks.length > 20) {
    // Group by state and show summary
    const byState: Record<string, number> = {};
    for (const link of filteredLinks) {
      byState[link.state] = (byState[link.state] || 0) + 1;
    }
    
    let formatted = "\n\n## ALREADY APPROVED PROCUREMENT LINKS\n";
    formatted += `We have ${filteredLinks.length} approved procurement links across ${Object.keys(byState).length} states. `;
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
  
  // If we have a specific state or fewer than 20 links, show full details
  // Group by state for better organization
  const byState: Record<string, ApprovedLink[]> = {};
  for (const link of filteredLinks) {
    if (!byState[link.state]) {
      byState[link.state] = [];
    }
    byState[link.state].push(link);
  }
  
  let formatted = "\n\n## ALREADY APPROVED PROCUREMENT LINKS\n";
  if (targetState && filteredLinks.length > 0) {
    formatted += `The following procurement links for **${targetState}** have already been collected and approved in our system. `;
  } else if (filteredLinks.length > 0) {
    formatted += "The following procurement links have already been collected and approved in our system. ";
  } else {
    // No links found for the target state
    formatted += `No approved procurement links found for **${targetState}** yet. `;
    formatted += "You may suggest new links for this state.\n";
    return formatted;
  }
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
 * Inject approved links section into the system prompt
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
```

---

## Phase 5: Update Chat Action to Pass User Message

### 5.1 File to Modify
**File:** `convex/simpleChat.ts`

### 5.2 Find and Update Line 29
**Current code:**
```typescript
      const systemPrompt = await getPrimarySystemPrompt(ctx);
```

**Replace with:**
```typescript
      // Get the primary system prompt from the database
      // Pass user message to enable state filtering for approved links
      const systemPrompt = await getPrimarySystemPrompt(ctx, args.prompt);
```

---

## Phase 6: Initialization and Testing

### 6.1 Run Schema Deployment
```bash
npx convex dev
```

Wait for successful deployment with no errors.

### 6.2 Initialize the Lookup Table

**IMPORTANT:** This must be done before testing the chat!

**Option A: Via Convex Dashboard**
1. Go to your Convex Dashboard (https://dashboard.convex.dev)
2. Select your project
3. Navigate to "Functions" tab
4. Find `approvedProcurementLinksLookup:initialize`
5. Click "Run"
6. Verify the response shows `success: true`

**Option B: Via Convex CLI**
```bash
npx convex run approvedProcurementLinksLookup:initialize
```

### 6.3 Verify Initialization
Run the stats query to verify:
```bash
npx convex run approvedProcurementLinksLookup:getStats
```

Expected output should show:
```json
{
  "exists": true,
  "linkCount": <number of approved links>,
  "stateCount": <number of unique states>
}
```

---

## Phase 7: Testing and Validation

### 7.1 Test Cases

#### Test 1: Initialization Verification
- Run `getStats` query
- Verify `linkCount` matches the number of approved links in `procurementUrls`

#### Test 2: Manual Approval Triggers Refresh
1. Go to the Procurement Link Verifier
2. Approve a pending link
3. Run `getStats` query
4. Verify `linkCount` increased by 1
5. Verify `lastApprovedBy` is your Clerk user ID

#### Test 3: AI Agent Approval Triggers Refresh
1. Trigger AI agent verification on a pending link
2. If approved, run `getStats` query
3. Verify `lastApprovedBy` is "AI Agent"

#### Test 4: System Prompt Contains Approved Links
1. Send a chat message asking for a state that has approved links
2. The AI should acknowledge existing links instead of suggesting new ones
3. Check the Convex logs to see the system prompt length

#### Test 5: State Filtering
1. Send: "Find procurement links for Texas"
2. If Texas has approved links, they should be included in the prompt
3. The AI should NOT suggest already-approved Texas links

#### Test 6: Generic Query (Summary Mode)
1. If you have >20 approved links, send a generic query
2. The prompt should include a summary instead of full list
3. Verify AI doesn't suggest duplicate links

### 7.2 Edge Case Tests

#### Empty Lookup Table
1. Delete the lookup record from the dashboard
2. Send a chat message
3. Verify no errors occur (graceful fallback)

#### Concurrent Approvals
1. Approve multiple links rapidly
2. Verify lookup table is consistent
3. Run `forceRefresh` if needed

---

## Common Errors and Solutions

### Error 1: "Cannot find module './approvedProcurementLinksLookup'"

**Cause:** The file wasn't created or has the wrong name.

**Solution:**
1. Verify the file exists at `convex/approvedProcurementLinksLookup.ts`
2. Check the filename is exactly `approvedProcurementLinksLookup.ts` (case-sensitive)
3. Run `npx convex dev` to re-sync

### Error 2: "Property 'approvedProcurementLinksLookUp' does not exist on type..."

**Cause:** Schema wasn't updated or types weren't regenerated.

**Solution:**
1. Verify the table is in `convex/schema.ts`
2. Run `npx convex dev` and wait for completion
3. Check `convex/_generated/dataModel.d.ts` includes the new table

### Error 3: "Validator error: optional is not allowed in arrays"

**Cause:** Used `v.optional()` inside the array instead of `v.union()`.

**Solution:**
Change from:
```typescript
entityType: v.optional(v.string()),
```
To:
```typescript
entityType: v.union(v.string(), v.null()),
```

### Error 4: "Cannot read properties of undefined (reading 'approvedProcurementLinks')"

**Cause:** Lookup table wasn't initialized before use.

**Solution:**
1. Run the `initialize` mutation first
2. Verify initialization succeeded with `getStats` query

### Error 5: "refreshLookupHelper is not a function"

**Cause:** Import statement is incorrect or function isn't exported.

**Solution:**
1. Verify the import in `procurementUrls.ts`:
   ```typescript
   import { refreshLookupHelper } from "./approvedProcurementLinksLookup";
   ```
2. Verify `refreshLookupHelper` is exported in `approvedProcurementLinksLookup.ts`

### Error 6: "internal.approvedProcurementLinksLookup is undefined"

**Cause:** The internal query isn't registered properly.

**Solution:**
1. Ensure the file is named correctly
2. Ensure `getApprovedLinksForPromptInternal` is exported as `internalQuery`
3. Run `npx convex dev` to regenerate the API

### Error 7: Type error with MutationCtx

**Cause:** MutationCtx type not imported correctly.

**Solution:**
```typescript
import { MutationCtx } from "./_generated/server";
```

### Error 8: "undefined is not a valid value for field 'requiresRegistration'"

**Cause:** Passing `undefined` instead of `null` for optional fields.

**Solution:**
Use `?? null` to convert undefined to null:
```typescript
requiresRegistration: link.requiresRegistration ?? null,
```

---

## Files Modified/Created Summary

### New Files
| File | Purpose |
|------|---------|
| `convex/approvedProcurementLinksLookup.ts` | Lookup table management functions |

### Modified Files
| File | Changes |
|------|---------|
| `convex/schema.ts` | Add `approvedProcurementLinksLookUp` table |
| `convex/procurementUrls.ts` | Add import and refresh calls in approval mutations |
| `convex/simpleChatAgent.ts` | Add state detection and prompt injection |
| `convex/simpleChat.ts` | Pass user message to `getPrimarySystemPrompt` |

---

## Rollback Plan

If issues occur after deployment:

### 1. Remove Prompt Injection (Quick Fix)
In `convex/simpleChatAgent.ts`, temporarily bypass the approved links injection:

```typescript
export async function getPrimarySystemPrompt(
  ctx: any,
  userMessage?: string
): Promise<string> {
  const primaryPrompt = await ctx.runQuery(
    internal.procurementChatSystemPrompts.getPrimaryInternal,
    {}
  );
  return primaryPrompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;
  // Comment out the rest temporarily
}
```

### 2. Remove Refresh Hooks (If Needed)
Remove the `refreshLookupHelper` calls from `procurementUrls.ts` if causing issues.

### 3. Delete Lookup Table (Full Rollback)
Via Convex Dashboard, delete all records from `approvedProcurementLinksLookUp` table.

---

## Performance Considerations

### Lookup Table Size
- Each approved link adds ~200-300 bytes
- 100 approved links ≈ 30KB
- 1000 approved links ≈ 300KB
- Well within Convex document limits

### System Prompt Size
- GPT-5-mini has 128K context window
- Approved links section adds ~50-100 tokens per link
- With 50 approved links ≈ 2,500-5,000 tokens added
- Summary mode (>20 links) reduces this significantly

### Query Performance
- Lookup query is O(1) - always fetches single record
- No performance degradation as links grow
- Refresh is O(n) where n = approved links count

---

## Future Enhancements (Out of Scope)

1. **Link Deduplication:** Fuzzy URL matching
2. **Link Expiration:** Track stale/broken links
3. **Embeddings:** Semantic matching for link suggestions
4. **Analytics:** Track duplicate prevention effectiveness
5. **UI Dashboard:** Show lookup table stats in admin panel

---

## Success Criteria Checklist

- [ ] Schema updated with `approvedProcurementLinksLookUp` table
- [ ] `approvedProcurementLinksLookup.ts` created with all functions
- [ ] Lookup table initialized with existing approved links
- [ ] `approve` mutation triggers lookup refresh
- [ ] `reportAgentResult` mutation triggers lookup refresh (for approved)
- [ ] `addManual` mutation triggers lookup refresh
- [ ] `approveAll` mutation triggers lookup refresh
- [ ] System prompt includes approved links section
- [ ] State filtering works when user mentions specific state
- [ ] Summary mode activates when >20 links without state filter
- [ ] AI acknowledges existing links instead of suggesting duplicates
- [ ] No errors when lookup table is empty
- [ ] All edge cases handled gracefully
