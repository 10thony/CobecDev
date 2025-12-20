# Vector Search Enhancement Plan for Resume Data

## Executive Summary

This document outlines the plan to migrate the vector search implementation to properly support the newly imported resume data. The goal is to enable queries like "who can build apps for the iPhone" to correctly return matching candidates.

---

## Current State Analysis

### 🔴 Critical Issues Identified

#### 1. **No Vector Index Defined in Schema**
The current schema uses a regular database index instead of Convex's native vector index:

```typescript
// Current (WRONG) - This is a regular index, not a vector index
.index("by_embedding", ["embedding"])

// Required (CORRECT) - This is a proper vector index
.vectorIndex("by_embedding", {
  vectorField: "embedding",
  dimensions: 1536, // OpenAI text-embedding-3-small dimensions
  filterFields: ["skills"],
})
```

**Evidence from schema inspection:**
- `resumes` table shows `"vectorIndexes": []` (empty!)
- Same issue exists for `jobpostings`, `leads`, `opportunities`

#### 2. **Newly Imported Resumes Missing Embeddings**
The bulk import process (`insertResume` mutation) only imports:
- `filename`
- `textContent` (raw extracted text)
- `fileStorageId`
- `checksum`

It does **NOT** generate:
- `completeSearchableText` (aggregated searchable content)
- `embedding` (vector for similarity search)
- `extractedSkills` (skills parsed from resume)

#### 3. **Search Functions Don't Use Native Vector Search**
Current implementation in `vectorSearch.ts`:
- Fetches ALL documents into memory
- Calculates cosine similarity manually in JavaScript
- This is inefficient and doesn't scale

The correct approach is to use `ctx.vectorSearch()` which is Convex's native vector search API (only available in actions).

#### 4. **Query Embedding Not Aligned with Document Embeddings**
When searching for "who can build apps for the iPhone":
- The query gets embedded
- But if resumes don't have embeddings, similarity = 0
- Even if they did, the embeddings need to be generated consistently

---

## Architecture Overview

### Current Flow (Broken)
```
User Query → Generate Query Embedding → Fetch ALL Resumes → 
Filter by embedding existence → Manual Cosine Similarity → Return Results
```

### Target Flow (Fixed)
```
User Query → Generate Query Embedding with Context Enhancement →
ctx.vectorSearch("resumes", "by_embedding", {vector, limit, filter}) →
Fetch Full Documents → Return Ranked Results
```

---

## Implementation Plan

### Phase 1: Schema Migration (Priority: HIGH)

**File: `convex/schema.ts`**

Add proper vector indexes to tables that need semantic search:

```typescript
// For resumes table
resumes: defineTable({
  // ... existing fields ...
  embedding: v.optional(v.array(v.float64())), // Change from v.number() to v.float64()
})
  // ... existing indexes ...
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536, // OpenAI text-embedding-3-small
    filterFields: ["skills", "securityClearance"], // Optional filter fields
  })

// For jobpostings table
jobpostings: defineTable({
  // ... existing fields ...
})
  .vectorIndex("by_embedding", {
    vectorField: "embedding", 
    dimensions: 1536,
    filterFields: ["department", "location", "jobType"],
  })
```

**Migration Notes:**
- Vector indexes require `v.array(v.float64())` type
- The `dimensions` must match OpenAI's embedding model (1536 for text-embedding-3-small)
- `filterFields` are optional but useful for filtering results

### Phase 2: Embedding Generation Pipeline (Priority: HIGH)

**Create: `convex/resumeEmbeddingPipeline.ts`**

```typescript
"use node";

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
};

/**
 * Generate searchable text from resume fields
 * This creates a comprehensive text representation for embedding
 */
function generateSearchableText(resume: any): string {
  const parts: string[] = [];
  
  // Personal info
  if (resume.personalInfo) {
    const { firstName, lastName, yearsOfExperience } = resume.personalInfo;
    if (firstName || lastName) {
      parts.push(`Candidate: ${firstName} ${lastName}`);
    }
    if (yearsOfExperience > 0) {
      parts.push(`Years of Experience: ${yearsOfExperience}`);
    }
  }
  
  // Professional summary
  if (resume.professionalSummary) {
    parts.push(`Summary: ${resume.professionalSummary}`);
  }
  
  // Skills - very important for matching
  if (resume.skills?.length > 0) {
    parts.push(`Skills: ${resume.skills.join(", ")}`);
  }
  
  // Experience
  if (resume.experience?.length > 0) {
    resume.experience.forEach((exp: any) => {
      parts.push(`Experience: ${exp.title} at ${exp.company}`);
      if (exp.responsibilities?.length > 0) {
        parts.push(exp.responsibilities.join(". "));
      }
    });
  }
  
  // Education
  if (resume.education?.length > 0) {
    parts.push(`Education: ${resume.education.join(", ")}`);
  }
  
  // Certifications
  if (resume.certifications) {
    parts.push(`Certifications: ${resume.certifications}`);
  }
  
  // Security clearance
  if (resume.securityClearance) {
    parts.push(`Security Clearance: ${resume.securityClearance}`);
  }
  
  // Raw text content (for bulk imports that only have text)
  if (resume.textContent && parts.length < 3) {
    parts.push(resume.textContent);
  }
  
  // Original text as fallback
  if (resume.originalText && parts.length < 3) {
    parts.push(resume.originalText);
  }
  
  return parts.join("\n\n");
}

/**
 * Extract skills using OpenAI
 */
async function extractSkillsFromText(text: string): Promise<string[]> {
  try {
    const openai = getOpenAI();
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a skill extraction assistant. Extract technical skills, programming languages, 
frameworks, tools, platforms, and domain expertise from the resume text.
Return ONLY a comma-separated list of skills, no explanations.
Focus on: Programming languages, Mobile development (iOS, Android), Web frameworks, 
Cloud platforms, Databases, Tools, Soft skills, Industry-specific skills.`
        },
        { role: "user", content: text.substring(0, 4000) }
      ],
      temperature: 0.2,
      max_tokens: 300,
    });
    
    const skillsText = response.choices[0]?.message?.content?.trim() || "";
    return skillsText.split(",").map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error("Skill extraction failed:", error);
    return [];
  }
}

/**
 * Generate embedding for a single resume
 */
export const generateResumeEmbedding = action({
  args: {
    resumeId: v.id("resumes"),
  },
  handler: async (ctx, { resumeId }) => {
    // Fetch the resume
    const resume = await ctx.runQuery(internal.resumeEmbeddingPipeline.getResume, { resumeId });
    if (!resume) throw new Error(`Resume ${resumeId} not found`);
    
    // Generate searchable text
    const searchableText = generateSearchableText(resume);
    if (!searchableText || searchableText.length < 50) {
      throw new Error("Insufficient text content for embedding");
    }
    
    // Extract skills
    const extractedSkills = await extractSkillsFromText(searchableText);
    
    // Generate embedding
    const openai = getOpenAI();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: searchableText.substring(0, 8000), // OpenAI limit
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Update the resume with embedding data
    await ctx.runMutation(internal.resumeEmbeddingPipeline.updateResumeWithEmbedding, {
      resumeId,
      completeSearchableText: searchableText,
      embedding,
      extractedSkills,
      embeddingModel: "text-embedding-3-small",
      embeddingGeneratedAt: Date.now(),
    });
    
    return {
      success: true,
      resumeId,
      embeddingDimensions: embedding.length,
      skillsExtracted: extractedSkills.length,
    };
  },
});

/**
 * Batch generate embeddings for all resumes without embeddings
 */
export const batchGenerateResumeEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, { batchSize = 10, forceRegenerate = false }) => {
    // Get resumes needing embeddings
    const resumes = await ctx.runQuery(
      internal.resumeEmbeddingPipeline.getResumesNeedingEmbeddings,
      { limit: batchSize, forceRegenerate }
    );
    
    const results = {
      total: resumes.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const resume of resumes) {
      try {
        await ctx.runAction(api.resumeEmbeddingPipeline.generateResumeEmbedding, {
          resumeId: resume._id,
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${resume._id}: ${error}`);
      }
      
      // Rate limiting to avoid OpenAI throttling
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  },
});

// Internal query to get a resume
export const getResume = internalQuery({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, { resumeId }) => {
    return await ctx.db.get(resumeId);
  },
});

// Internal query to get resumes needing embeddings
export const getResumesNeedingEmbeddings = internalQuery({
  args: {
    limit: v.number(),
    forceRegenerate: v.boolean(),
  },
  handler: async (ctx, { limit, forceRegenerate }) => {
    if (forceRegenerate) {
      return await ctx.db.query("resumes").take(limit);
    }
    
    // Get resumes without embeddings
    const resumes = await ctx.db.query("resumes").collect();
    return resumes
      .filter(r => !r.embedding || r.embedding.length === 0)
      .slice(0, limit);
  },
});

// Internal mutation to update resume with embedding
export const updateResumeWithEmbedding = internalMutation({
  args: {
    resumeId: v.id("resumes"),
    completeSearchableText: v.string(),
    embedding: v.array(v.float64()),
    extractedSkills: v.array(v.string()),
    embeddingModel: v.string(),
    embeddingGeneratedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.resumeId, {
      completeSearchableText: args.completeSearchableText,
      embedding: args.embedding,
      extractedSkills: args.extractedSkills,
      embeddingModel: args.embeddingModel,
      embeddingGeneratedAt: args.embeddingGeneratedAt,
      updatedAt: Date.now(),
    });
  },
});
```

### Phase 3: Native Vector Search Implementation (Priority: HIGH)

**Create: `convex/nativeVectorSearch.ts`**

```typescript
"use node";

import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
};

/**
 * Search resumes using native Convex vector search
 * This is the proper way to do vector search in Convex
 */
export const searchResumes = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
    skillsFilter: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { query, limit = 20, minScore = 0.5, skillsFilter }) => {
    // Step 1: Generate query embedding
    const openai = getOpenAI();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryVector = embeddingResponse.data[0].embedding;
    
    // Step 2: Execute native vector search
    // Note: ctx.vectorSearch is only available in actions
    const vectorResults = await ctx.vectorSearch("resumes", "by_embedding", {
      vector: queryVector,
      limit: limit,
      // Optional filter - uncomment when filterFields are defined
      // filter: skillsFilter?.length ? (q) => 
      //   q.or(...skillsFilter.map(skill => q.eq("skills", skill)))
      // : undefined,
    });
    
    // Step 3: Filter by score
    const filteredResults = vectorResults.filter(r => r._score >= minScore);
    
    // Step 4: Fetch full documents
    const fullResults = await Promise.all(
      filteredResults.map(async (result) => {
        const doc = await ctx.runQuery(internal.nativeVectorSearch.getResumeById, {
          resumeId: result._id,
        });
        return {
          ...doc,
          _score: result._score,
        };
      })
    );
    
    return {
      query,
      results: fullResults,
      totalFound: fullResults.length,
      model: "text-embedding-3-small",
    };
  },
});

/**
 * Unified search across resumes and job postings
 */
export const unifiedSearch = action({
  args: {
    query: v.string(),
    searchType: v.union(v.literal("resumes"), v.literal("jobs"), v.literal("both")),
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, { query, searchType, limit = 20, minScore = 0.5 }) => {
    // Generate query embedding once
    const openai = getOpenAI();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryVector = embeddingResponse.data[0].embedding;
    
    const results: any = {
      query,
      timestamp: Date.now(),
    };
    
    // Search resumes
    if (searchType === "resumes" || searchType === "both") {
      const resumeResults = await ctx.vectorSearch("resumes", "by_embedding", {
        vector: queryVector,
        limit: limit,
      });
      
      const resumeDocs = await Promise.all(
        resumeResults
          .filter(r => r._score >= minScore)
          .map(async (result) => {
            const doc = await ctx.runQuery(internal.nativeVectorSearch.getResumeById, {
              resumeId: result._id,
            });
            return { ...doc, _score: result._score };
          })
      );
      
      results.resumes = resumeDocs;
    }
    
    // Search job postings
    if (searchType === "jobs" || searchType === "both") {
      const jobResults = await ctx.vectorSearch("jobpostings", "by_embedding", {
        vector: queryVector,
        limit: limit,
      });
      
      const jobDocs = await Promise.all(
        jobResults
          .filter(r => r._score >= minScore)
          .map(async (result) => {
            const doc = await ctx.runQuery(internal.nativeVectorSearch.getJobById, {
              jobId: result._id,
            });
            return { ...doc, _score: result._score };
          })
      );
      
      results.jobs = jobDocs;
    }
    
    return results;
  },
});

// Internal queries for fetching full documents
export const getResumeById = internalQuery({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, { resumeId }) => {
    return await ctx.db.get(resumeId);
  },
});

export const getJobById = internalQuery({
  args: { jobId: v.id("jobpostings") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});
```

### Phase 4: Dynamic Query Enhancement (Priority: MEDIUM)

Enhance search queries with context for better matching:

```typescript
/**
 * Enhance user queries for better vector matching
 * Converts natural language questions to embedding-optimized text
 */
async function enhanceQueryForEmbedding(query: string): Promise<string> {
  const openai = getOpenAI();
  
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a search query optimizer. Convert the user's natural language question 
into a search-optimized query for finding matching resumes.

For example:
- "who can build apps for the iPhone" → "iOS developer, iPhone app development, Swift, mobile development, App Store"
- "find someone with Python experience" → "Python developer, Python programming, backend development"
- "looking for project managers" → "project manager, PMP, agile, scrum, project management"

Return ONLY the optimized query terms, no explanation.`
      },
      { role: "user", content: query }
    ],
    temperature: 0.3,
    max_tokens: 150,
  });
  
  return response.choices[0]?.message?.content || query;
}
```

### Phase 5: Frontend Integration Updates (Priority: MEDIUM)

**Update: `src/components/HRDashboard.tsx`**

Replace the search handler to use the new native vector search:

```typescript
// Replace existing search action
const searchResumes = useAction(api.nativeVectorSearch.searchResumes);
const unifiedSearch = useAction(api.nativeVectorSearch.unifiedSearch);

const handleSearch = async () => {
  if (!searchQuery.trim()) return;
  
  setIsSearching(true);
  try {
    const results = await unifiedSearch({
      query: searchQuery,
      searchType: "both",
      limit: matchLimit,
      minScore: similarityThreshold,
    });
    setSearchResults(results);
  } catch (error) {
    console.error("Search error:", error);
    toast.error("Search failed. Please try again.");
  } finally {
    setIsSearching(false);
  }
};
```

---

## Migration Checklist

### Pre-Migration
- [ ] Ensure `OPENAI_API_KEY` is set in Convex environment variables
- [ ] Back up current resume data (export from Convex Dashboard)
- [ ] Document current resume count for verification

### Schema Migration
- [ ] Update `schema.ts` to add `.vectorIndex()` for resumes table
- [ ] Update `schema.ts` to add `.vectorIndex()` for jobpostings table
- [ ] Deploy schema changes (`npx convex deploy` or `npx convex dev`)
- [ ] Verify vector indexes are created (check Convex Dashboard → Indexes)

### Embedding Generation
- [ ] Create `resumeEmbeddingPipeline.ts` with embedding generation actions
- [ ] Test single resume embedding generation
- [ ] Run batch embedding generation for all resumes
- [ ] Verify embeddings are populated (check Convex Dashboard → Data)

### Search Implementation
- [ ] Create `nativeVectorSearch.ts` with `ctx.vectorSearch()` implementation
- [ ] Test search with query "who can build apps for the iPhone"
- [ ] Verify results return expected candidates
- [ ] Update frontend to use new search actions

### Testing
- [ ] Test query: "who can build apps for the iPhone"
- [ ] Test query: "Python developer with AWS experience"  
- [ ] Test query: "project manager with PMP certification"
- [ ] Verify similarity scores are reasonable (0.5-1.0 range)

---

## Test Cases

### Test Case 1: iOS Developer Search
**Query:** "who can build apps for the iPhone"
**Expected Behavior:**
1. Query gets enhanced to: "iOS developer, iPhone app development, Swift, mobile development, App Store, Xcode"
2. Query embedding generated using text-embedding-3-small
3. Vector search finds resumes with similar embeddings
4. Results sorted by similarity score
5. Returns candidates with iOS/mobile development skills

**Verification:**
- At least 1 result returned (based on your data)
- Similarity scores > 0.5
- Returned candidates have relevant skills in `extractedSkills`

### Test Case 2: Empty Results Investigation
**If no results returned:**
1. Check if resumes have `embedding` field populated
2. Check if vector index exists (`vectorIndexes` in table schema)
3. Check embedding dimensions match (1536)
4. Lower `minScore` threshold to 0.3 for testing

---

## Appendix: OpenAI Embedding Models

| Model | Dimensions | Best For | Cost |
|-------|------------|----------|------|
| text-embedding-3-small | 1536 | General purpose, cost-effective | Low |
| text-embedding-3-large | 3072 | Higher accuracy | Medium |
| text-embedding-ada-002 | 1536 | Legacy compatibility | Medium |

**Recommendation:** Use `text-embedding-3-small` for cost-effectiveness with good accuracy.

---

## Estimated Timeline

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Schema Migration | 1-2 hours | None |
| Phase 2: Embedding Pipeline | 2-3 hours | Phase 1 |
| Phase 3: Native Vector Search | 2-3 hours | Phase 1 |
| Phase 4: Query Enhancement | 1-2 hours | Phase 3 |
| Phase 5: Frontend Updates | 1-2 hours | Phase 3 |
| Testing & Verification | 1-2 hours | All phases |

**Total Estimated Effort:** 8-14 hours

---

## Environment Variables Required

Ensure these are set in Convex Dashboard → Settings → Environment Variables:

```
OPENAI_API_KEY=sk-...your-openai-api-key...
```

---

## References

- [Convex Vector Search Documentation](https://docs.convex.dev/search/vector-search)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- Current schema: `convex/schema.ts`
- Current search: `convex/vectorSearch.ts`
