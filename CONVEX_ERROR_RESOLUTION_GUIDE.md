# Convex TypeScript Error Resolution Guide

## Overview

This document outlines the TypeScript errors currently affecting the Convex backend and provides detailed solutions for each issue. The errors are primarily related to type mismatches, missing function exports, and incorrect return type definitions.

## Error Summary

**Total Errors:** 13 errors across 3 files
- **convex/chat.ts:** 9 errors
- **convex/messages.ts:** 3 errors  
- **convex/nodeActions.ts:** 1 error

## Detailed Error Analysis

### 1. Missing Properties in Search Results Structure

**Files Affected:** `convex/chat.ts` (lines 52, 54, 60, 62)

**Error Description:**
```
Property 'jobs' does not exist on type '{ results: never[]; analysis: string; recommendations: string[]; }'.
Property 'resumes' does not exist on type '{ results: never[]; analysis: string; recommendations: string[]; }'.
```

**Root Cause:**
The `sendMessageWithVectorSearch` function is trying to access `searchResults.jobs` and `searchResults.resumes` properties, but the search results structure has changed. The current structure returns:
```typescript
{
  results: never[],
  analysis: string,
  recommendations: string[]
}
```

But the code expects:
```typescript
{
  jobs: any[],
  resumes: any[],
  analysis: string,
  recommendations: string[]
}
```

**Solution:**
Update the search results handling in `convex/chat.ts` to match the actual return structure from the vector search functions.

### 2. Missing Function Exports in nodeActions

**Files Affected:** `convex/chat.ts` (lines 74, 81, 88), `convex/messages.ts` (lines 136, 143, 150)

**Error Description:**
```
Property 'sendOpenAIMessageWithKey' does not exist on type '{ searchSimilarJobs: FunctionReference<...>; ... }'.
Property 'sendAnthropicMessageWithKey' does not exist on type '{ searchSimilarJobs: FunctionReference<...>; ... }'.
Property 'sendGeminiMessageWithKey' does not exist on type '{ searchSimilarJobs: FunctionReference<...>; ... }'.
```

**Root Cause:**
The functions `sendOpenAIMessageWithKey`, `sendAnthropicMessageWithKey`, and `sendGeminiMessageWithKey` exist in `nodeActions.ts` but are not being properly exported or recognized by the Convex type system.

**Solution:**
Ensure these functions are properly exported and the Convex type generation is working correctly.

### 3. Type Mismatch in Return Types

**Files Affected:** `convex/nodeActions.ts` (line 232)

**Error Description:**
```
Type 'Promise<{ content: string; modelUsed: any; tokensUsed: number; finishReason: Anthropic.Messages.StopReason | null; }>' is not assignable to type 'Promise<{ tokensUsed?: number | undefined; finishReason?: string | undefined; content: string; modelUsed: string; }>'.
```

**Root Cause:**
The return type definition for the `sendAnthropicMessageWithKey` function doesn't match the actual return type. The function returns `Anthropic.Messages.StopReason | null` for `finishReason`, but the type definition expects `string | undefined`.

**Solution:**
Update the return type definition to match the actual return structure.

## Implementation Solutions

### Solution 1: Fix Search Results Structure in chat.ts

**File:** `convex/chat.ts`

**Current Problematic Code:**
```typescript
// Lines 52-62
if (searchResults.jobs && searchResults.jobs.length > 0) {
  searchResults.jobs.forEach((job: any, index: number) => {
    // ...
  });
}

if (searchResults.resumes && searchResults.resumes.length > 0) {
  searchResults.resumes.forEach((resume: any, index: number) => {
    // ...
  });
}
```

**Required Changes:**
1. Update the search results handling to use the correct structure
2. Remove references to `jobs` and `resumes` properties that don't exist
3. Use the `results` array instead

**Implementation:**
```typescript
// Replace the problematic code with:
if (searchResults.results && searchResults.results.length > 0) {
  searchResults.results.forEach((result: any, index: number) => {
    // Handle each result based on its type
    if (result.type === 'job') {
      // Handle job result
    } else if (result.type === 'resume') {
      // Handle resume result
    }
  });
}
```

### Solution 2: Fix Function Exports in nodeActions.ts

**File:** `convex/nodeActions.ts`

**Current Problematic Code:**
```typescript
// Lines 232-250
export const sendAnthropicMessageWithKey = internalAction({
  args: {
    message: v.string(),
    modelId: v.string(),
    apiKey: v.string(),
  },
  returns: v.string(),
  handler: async (ctx: any, args: any) => {
    // ... implementation
  },
});
```

**Required Changes:**
1. Update the return type definition to match the actual return structure
2. Ensure proper type conversion for `finishReason`

**Implementation:**
```typescript
export const sendAnthropicMessageWithKey = internalAction({
  args: {
    message: v.string(),
    modelId: v.string(),
    apiKey: v.string(),
  },
  returns: v.object({
    content: v.string(),
    modelUsed: v.string(),
    tokensUsed: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  }),
  handler: async (ctx: any, args: any) => {
    try {
      const client = new Anthropic({
        apiKey: args.apiKey,
      });

      const response = await client.messages.create({
        model: args.modelId,
        max_tokens: 1000,
        messages: [{ role: "user", content: args.message }],
      });

      return {
        content: response.content[0].type === "text" ? response.content[0].text : "No text response",
        modelUsed: args.modelId,
        tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        finishReason: response.stop_reason || undefined,
      };
    } catch (error) {
      console.error('Error in Anthropic message:', error);
      throw new Error(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});
```

### Solution 3: Update Similar Functions

**Files:** `convex/chat.ts`, `convex/messages.ts`

**Required Changes:**
1. Update `sendOpenAIMessageWithKey` and `sendGeminiMessageWithKey` with similar return type fixes
2. Update all calling code to handle the new return structure

**Implementation for OpenAI:**
```typescript
export const sendOpenAIMessageWithKey = internalAction({
  args: {
    message: v.string(),
    modelId: v.string(),
    apiKey: v.string(),
  },
  returns: v.object({
    content: v.string(),
    modelUsed: v.string(),
    tokensUsed: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  }),
  handler: async (ctx: any, args: any) => {
    try {
      const client = new OpenAI({
        apiKey: args.apiKey,
      });

      const response = await client.chat.completions.create({
        model: args.modelId,
        messages: [{ role: "user", content: args.message }],
        temperature: 0.7,
      });

      return {
        content: response.choices[0].message.content || "No response generated",
        modelUsed: args.modelId,
        tokensUsed: response.usage?.total_tokens,
        finishReason: response.choices[0].finish_reason || undefined,
      };
    } catch (error) {
      console.error('Error in OpenAI message:', error);
      throw new Error(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});
```

**Implementation for Gemini:**
```typescript
export const sendGeminiMessageWithKey = internalAction({
  args: {
    message: v.string(),
    modelId: v.string(),
    apiKey: v.string(),
  },
  returns: v.object({
    content: v.string(),
    modelUsed: v.string(),
    tokensUsed: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  }),
  handler: async (ctx: any, args: any) => {
    try {
      const client = new GoogleGenerativeAI(args.apiKey);
      const model = client.getGenerativeModel({ model: args.modelId });
      
      const result = await model.generateContent(args.message);
      const response = result.response;
      
      return {
        content: response.text(),
        modelUsed: args.modelId,
        tokensUsed: undefined, // Gemini doesn't provide token usage in this context
        finishReason: "stop", // Default for Gemini
      };
    } catch (error) {
      console.error('Error in Google AI message:', error);
      throw new Error(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});
```

## Step-by-Step Resolution Process

### Phase 1: Fix Type Definitions
1. Update `convex/nodeActions.ts` return types for all AI message functions
2. Ensure proper type conversion for `finishReason` fields
3. Test type generation with `npx convex dev`

### Phase 2: Update Search Results Handling
1. Modify `convex/chat.ts` to handle the correct search results structure
2. Update any other files that reference the old structure
3. Test search functionality

### Phase 3: Update Calling Code
1. Update `convex/messages.ts` to handle new return structures
2. Update any client-side code that calls these functions
3. Test end-to-end functionality

### Phase 4: Verification
1. Run `npx convex dev` to check for remaining errors
2. Test all AI model integrations
3. Verify search functionality works correctly

## Testing Checklist

- [ ] TypeScript compilation passes without errors
- [ ] OpenAI message generation works
- [ ] Anthropic message generation works  
- [ ] Gemini message generation works
- [ ] Vector search returns correct structure
- [ ] Chat functionality works end-to-end
- [ ] All error handling works correctly

## Environment Setup

Ensure the following environment variables are configured:
- `CLERK_SECRET_KEY`
- `GOOGLE_AI_API_KEY`
- `MONGODB_USERNAME`
- `MONGODB_PASSWORD`
- `MONGODB_CLUSTER`

## Dependencies

Make sure these packages are installed:
```json
{
  "openai": "^4.0.0",
  "@anthropic-ai/sdk": "^0.7.0",
  "@google/generative-ai": "^0.2.0",
  "mongodb": "^5.0.0"
}
```

## Notes

- The errors are primarily TypeScript compilation issues, not runtime errors
- The core functionality should work once types are properly aligned
- Consider adding better error handling for edge cases
- Monitor Convex logs for any runtime issues after fixes 