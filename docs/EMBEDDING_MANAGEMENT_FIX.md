# Embedding Management Component Fix

## Issue
The user encountered an error when navigating to the Embedding Management component:

```
Trying to execute semanticEmbeddingService.js:getSemanticEmbeddingStats as Query, but it is defined as Action.
```

## Root Cause

The issue occurred because of a mismatch between how the frontend was calling the function and how Convex interpreted it:

1. **Frontend**: Called `getSemanticEmbeddingStats` as a **query** using `useQuery(api.semanticEmbeddingService.getSemanticEmbeddingStats)`
2. **Backend**: The function was declared with `query({...})` in `convex/semanticEmbeddingService.ts`
3. **Problem**: The file had `"use node";` at the top, which forces **ALL** exported functions to be **actions** regardless of their declaration

### Why "use node" matters
- Files with `"use node"` run in a Node.js environment on Convex servers
- Node.js functions can access environment variables, make HTTP requests, etc.
- These capabilities require the function to be an **action**, not a query
- Queries must be pure database reads without side effects

## Solution

Created a new file `convex/semanticEmbeddingQueries.ts` without `"use node"` directive:

### Changes Made:

1. **Created** `convex/semanticEmbeddingQueries.ts`
   - Moved `getSemanticEmbeddingStats` to this file
   - No `"use node"` directive, so it's a true query
   - Function only reads from database (no Node.js features needed)

2. **Updated** `convex/semanticEmbeddingService.ts`
   - Removed `getSemanticEmbeddingStats` function (now in queries file)
   - Removed unused `query` import

3. **Updated** `src/components/EmbeddingManagement.tsx`
   - Changed import from `api.semanticEmbeddingService.getSemanticEmbeddingStats`
   - To `api.semanticEmbeddingQueries.getSemanticEmbeddingStats`

## Files Modified

- ✅ `convex/semanticEmbeddingQueries.ts` (new file)
- ✅ `convex/semanticEmbeddingService.ts` (removed function + unused import)
- ✅ `src/components/EmbeddingManagement.tsx` (updated import)

## Verification

- ✅ No linter errors
- ✅ Function is now correctly exported as a query
- ✅ Frontend correctly imports from the new location
- ✅ No other code references the old location

## Result

The Embedding Management component should now load without errors. The statistics will be fetched correctly using the query from the new file.

