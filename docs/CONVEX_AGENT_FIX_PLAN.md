# Convex Agent Implementation Fix Plan

## Executive Summary

Your current Convex Agent implementation has several critical issues causing failures. This plan outlines each issue and provides step-by-step resolutions to achieve your MVP goal: **a basic chat system with a system prompt that returns plain text responses**.

---

## Current Issues Identified

### 🚨 Issue 1: Zod Import Incompatibility (CRITICAL)

**Problem**: You're using `zod v4.2.1` but importing it incorrectly for the `@convex-dev/agent` library.

**Current Code (procurementAgent.ts:5)**:
```typescript
import { z } from "zod";
```

**Why It Fails**: Zod v4 changed its export structure. The Convex Agent library documentation explicitly requires `zod/v3` for v4.x:
> [From Convex docs](https://docs.convex.dev/agents/agent-usage): `import { z } from "zod/v3";`

**Resolution**: Update the import to use the v3 subpath export.

---

### 🚨 Issue 2: OpenAI Model Initialization Syntax (CRITICAL)

**Problem**: Incorrect OpenAI model initialization syntax.

**Current Code (procurementAgent.ts:98)**:
```typescript
languageModel: openai("gpt-4o-mini"),
```

**Correct Syntax** (per [Convex Agent docs](https://docs.convex.dev/agents/agent-usage)):
```typescript
languageModel: openai.chat("gpt-4o-mini"),
```

**Why It Matters**: The `openai` export from `@ai-sdk/openai` is a namespace object, not a function. You must call `openai.chat()` to get a language model instance.

---

### 🚨 Issue 3: Agent Returns Empty Response / No JSON (CRITICAL)

**Evidence from Logs**:
```
[ERROR] 'Agent did not return JSON. Response text (first 500 chars):' ''
```

**Root Cause Analysis**:
1. The agent is returning empty strings, indicating it may not be executing properly
2. The current implementation expects complex JSON output, but the agent tools may be consuming all execution time
3. Thread ID corruption is causing crashes before the agent can respond

**MVP Solution**: Simplify to a plain text chat without tools for the MVP.

---

### 🚨 Issue 4: Thread ID Corruption

**Evidence from Logs**:
```
ArgumentValidationError: Found ID "jx7aa64ta8rbs0x8ekxb7z18sh7xnqw4" from table `embeddings_256`, 
which does not match the table name in validator `v.id("threads")`
```

**Problem**: Old session data contains corrupted `threadId` values that reference the wrong table (likely from previous agent component version or misconfiguration).

**Resolution**: 
1. Clear corrupted thread IDs (you already have `clearCorruptedThreadIds` mutation)
2. Ensure new thread creation is idempotent
3. Add validation before using stored threadIds

---

### ⚠️ Issue 5: TypeScript Type Errors

**Errors Found**:
```
convex/procurementAgent.ts:10 - 'searchVerifiedUrls' implicitly has type 'any'
convex/procurementAgent.ts:16 - 'handler' implicitly has return type 'any'
convex/procurementAgent.ts:97 - 'procurementAgent' implicitly has type 'any'
```

**Root Cause**: Circular type inference from self-referencing tool definitions.

**Resolution**: Add explicit type annotations to break the circular dependency.

---

### ⚠️ Issue 6: Over-Engineered for MVP

**Problem**: The current implementation includes:
- 4 custom tools
- Complex JSON parsing and validation
- Retry logic for JSON extraction
- Thread persistence across sessions

**MVP Requirement**: Just send a chat message → get plain text response.

---

## Implementation Plan

### Phase 1: Create Minimal Working Agent (MVP)

#### Step 1.1: Create a Simple Agent File

Create a new, minimal agent that focuses solely on chat functionality:

**File: `convex/simpleChatAgent.ts`**
```typescript
"use node";

import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

// System prompt for procurement assistance
const PROCUREMENT_SYSTEM_PROMPT = `You are a helpful Procurement Data Intelligence Agent. 
Your role is to assist users in identifying government procurement, bidding, and RFP portals.

Keep your responses clear and helpful. When users ask about procurement links:
- Provide helpful guidance about finding official government procurement portals
- Suggest common URL patterns for .gov sites
- Remind users to verify links before use

Be conversational and helpful. Do not output JSON unless specifically asked.`;

// Simple agent without tools for MVP
export const simpleChatAgent = new Agent(components.agent, {
  name: "Procurement Chat Assistant",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: PROCUREMENT_SYSTEM_PROMPT,
  // No tools for MVP - just plain chat
});
```

#### Step 1.2: Create Simple Chat Action

**File: `convex/simpleChat.ts`**
```typescript
"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { simpleChatAgent } from "./simpleChatAgent";

// Simple synchronous chat - MVP version
export const sendMessage = action({
  args: {
    prompt: v.string(),
    sessionId: v.id("procurementChatSessions"),
  },
  handler: async (ctx, args) => {
    try {
      // Create a new thread for each message (stateless for MVP)
      const { threadId } = await simpleChatAgent.createThread(ctx);
      
      // Generate text response
      const result = await simpleChatAgent.generateText(
        ctx, 
        { threadId }, 
        { prompt: args.prompt }
      );
      
      // Save the assistant response
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: result.text || "I apologize, but I couldn't generate a response. Please try again.",
        isError: false,
      });
      
      return { 
        success: true, 
        response: result.text 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Chat error:", errorMessage);
      
      // Save error message
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: `Error: ${errorMessage}`,
        isError: true,
      });
      
      throw new Error(errorMessage);
    }
  },
});
```

#### Step 1.3: Update Frontend to Use Simple Chat

Update `ProcurementChat.tsx` to use the new simple action:

```typescript
// Replace this import:
const fetchAndSaveLinks = useAction(api.procurementChat.fetchAndSaveProcurementLinks);

// With this:
const sendChatMessage = useAction(api.simpleChat.sendMessage);

// Update handleSubmit to use simpler flow:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!prompt.trim()) return;
  // ... create session if needed ...
  
  await addUserMessage({ sessionId: sessionId!, content: userPrompt });
  await sendChatMessage({ prompt: userPrompt, sessionId: sessionId! });
  // Response is saved by the action, will be loaded via sessionMessages query
};
```

---

### Phase 2: Fix Existing Agent (After MVP Works)

If you want to keep the existing implementation with tools, apply these fixes:

#### Step 2.1: Fix Zod Import

**File: `convex/procurementAgent.ts`**

```diff
- import { z } from "zod";
+ import { z } from "zod/v3";
```

#### Step 2.2: Fix OpenAI Initialization

```diff
export const procurementAgent = new Agent(components.agent, {
- languageModel: openai("gpt-4o-mini"),
+ languageModel: openai.chat("gpt-4o-mini"),
  name: "Procurement Link Agent",
  // ... rest of config
});
```

#### Step 2.3: Add Explicit Type Annotations

```typescript
// Add explicit return types to tool handlers
const searchVerifiedUrls = createTool({
  description: "Search for verified procurement URLs...",
  args: z.object({
    state: z.string(),
    city: z.string().optional(),
  }),
  handler: async (ctx, args): Promise<Array<{
    state: string;
    capital: string;
    officialWebsite: string;
    procurementLink: string;
    status: string;
  }>> => {
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
```

#### Step 2.4: Handle Thread ID Validation

Before using a stored threadId, validate it:

```typescript
if (session.threadId) {
  try {
    // Validate thread exists and is valid
    const thread = await ctx.runQuery(internal.threads.getThread, { 
      threadId: session.threadId 
    });
    if (!thread) {
      needsNewThread = true;
    }
  } catch (error) {
    // Thread is corrupted, create a new one
    console.log("Thread validation failed, creating new thread");
    needsNewThread = true;
  }
}
```

---

### Phase 3: Environment & Configuration Checks

#### Step 3.1: Verify Environment Variables

Ensure `OPENAI_API_KEY` is set in your Convex deployment:

```bash
bunx convex env list
```

If not set:
```bash
bunx convex env set OPENAI_API_KEY "sk-your-key-here"
```

#### Step 3.2: Verify Agent Component Registration

Your `convex/convex.config.ts` looks correct:
```typescript
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp();
app.use(agent);

export default app;
```

After any changes, run:
```bash
bunx convex dev --once
```

---

## Recommended Implementation Order

### Quick Win (15 mins): Get Basic Chat Working

1. ✅ Create `convex/simpleChatAgent.ts` (minimal agent, no tools)
2. ✅ Create `convex/simpleChat.ts` (simple action)
3. ✅ Update frontend to use new action
4. ✅ Test basic chat flow

### Phase 2 (Later): Fix Existing Implementation

1. Fix zod import
2. Fix OpenAI initialization
3. Add type annotations
4. Handle thread validation
5. Re-enable tools one by one

---

## Testing Checklist

### MVP Testing
- [ ] Can create a new chat session
- [ ] Can send a plain text message
- [ ] Receive a plain text response
- [ ] Response displays in chat UI
- [ ] Error messages display properly

### Full Implementation Testing
- [ ] searchVerifiedUrls tool returns results
- [ ] validateUrl tool checks URLs properly
- [ ] JSON parsing works for structured responses
- [ ] Thread persistence works across messages
- [ ] Thread recovery handles corrupted IDs

---

## Files to Modify/Create

| File | Action | Priority |
|------|--------|----------|
| `convex/simpleChatAgent.ts` | CREATE | 🔴 High |
| `convex/simpleChat.ts` | CREATE | 🔴 High |
| `src/components/ProcurementChat.tsx` | MODIFY | 🔴 High |
| `convex/procurementAgent.ts` | MODIFY | 🟡 Medium |
| `convex/procurementChat.ts` | MODIFY | 🟡 Medium |

---

## Summary

Your current issues stem from:
1. **Incorrect imports** (zod, openai)
2. **Over-engineering** for MVP needs
3. **Legacy data corruption** (thread IDs)

The fastest path to a working MVP is to create a simplified agent without tools that just handles basic chat. Once that works, you can gradually add back complexity.

**Next Steps**:
1. Create the simple agent files
2. Update the frontend
3. Test basic chat functionality
4. Iterate from there
