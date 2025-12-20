# Query Timeout Fix

## Problem
The `jobPostings:list` and `resumes:list` queries were timing out because they were trying to fetch ALL records from the database without any pagination or limits. Each query was:
- Loading potentially thousands of records
- Each record containing large embedding arrays (vectors with 3072 numbers for text-embedding-3-large)
- Exceeding Convex's 1-second query timeout limit

## Solution

### 1. Added Default Limits to List Queries
Modified both `list` queries to return only the first 100 items by default:
```typescript
export const list = query({
  args: {},
  handler: async (ctx) => {
    // Default: return first 100 items to prevent timeouts
    return await ctx.db.query("jobpostings").take(100);
  },
});
```

This maintains backward compatibility with existing frontend code while preventing timeouts. These queries always return arrays (not PaginationResult), ensuring type consistency.

### 2. Created Dedicated Paginated Queries
Added new `listPaginated` queries for explicit pagination that return `PaginationResult`:
```typescript
export const listPaginated = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, { paginationOpts }) => {
    return await ctx.db.query("jobpostings").paginate(paginationOpts);
  },
});
```
- `jobPostings.listPaginated`
- `resumes.listPaginated`

### 3. Created Vector Search Optimized Queries
Added new queries specifically for vector search operations with higher limits:
- `jobPostings.listForVectorSearch` (default 500, configurable up to 1000)
- `resumes.listForVectorSearch` (default 500, configurable up to 1000)

### 4. Updated Vector Search Actions
Updated `vectorSearch.ts` to use the optimized queries:
- `searchJobPostingsWithEmbedding` - uses `listForVectorSearch` with limit of 1000
- `searchResumesWithEmbedding` - uses `listForVectorSearch` with limit of 1000
- `unifiedSemanticSearchWithEmbedding` - uses `listForVectorSearch` for both collections

### 5. Fixed TypeScript Type Issues
Ensured all queries return consistent types:
- `list` queries always return arrays (`Doc<"jobpostings">[]` or `Doc<"resumes">[]`)
- `listPaginated` queries return `PaginationResult`
- `listForVectorSearch` queries return arrays with configurable limits
- Updated all internal Convex function calls in `migrations.ts` and `semanticEmbeddingService.ts` to match the new signatures

## Resolution Steps Taken
1. ✅ Identified the root cause: `.collect()` loading all records
2. ✅ Modified `list` queries to use `.take(100)` instead
3. ✅ Created separate `listPaginated` queries for proper pagination
4. ✅ Created `listForVectorSearch` queries for vector search operations
5. ✅ Updated vector search actions to use optimized queries
6. ✅ Fixed all TypeScript errors by ensuring consistent return types
7. ✅ Verified with `npx convex dev --once` - all checks passed

## Impact on Frontend
- **No changes required** in existing frontend code
- All current `useQuery(api.jobPostings.list)` and `useQuery(api.resumes.list)` calls will work
- They will now return max 100 items by default (fast and no timeouts)

## Recommendations for Future

### For UI Grids/Lists
Consider implementing pagination in the UI using `usePaginatedQuery`:
```typescript
const { results, status, loadMore } = usePaginatedQuery(
  api.jobPostings.listPaginated,
  {},
  { initialNumItems: 50 }
);
```

### For Vector Search
The current implementation searches up to 1000 items per collection. If your database grows beyond this:
1. Consider using Convex's native vector search (when available)
2. Implement incremental search with multiple batches
3. Add filtering criteria to reduce the search space

### For Data Export/Migration
If you need to access ALL records:
1. Use the paginated queries with a loop
2. Process in batches
3. Use actions (not queries) for long-running operations

## Files Modified
- `convex/jobPostings.ts` - Added pagination and limits, created new query variants
- `convex/resumes.ts` - Added pagination and limits, created new query variants
- `convex/vectorSearch.ts` - Updated to use optimized queries
- `convex/migrations.ts` - Updated query calls to match new signatures
- `convex/semanticEmbeddingService.ts` - Updated query calls to match new signatures

## Testing
After deploying these changes:
1. Monitor the Convex logs - timeouts should disappear
2. Check UI grids load properly (showing first 100 items)
3. Test vector search functionality
4. Verify pagination works in components that implement it

