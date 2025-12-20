"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import OpenAI from "openai";

const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
};

/**
 * Enhance user queries for better vector matching
 * Converts natural language questions to embedding-optimized text
 */
async function enhanceQueryForEmbedding(query: string): Promise<string> {
  try {
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
  } catch (error) {
    console.error("Query enhancement failed, using original query:", error);
    return query;
  }
}

// Type for search results with score
interface SearchResultWithScore {
  _id: string;
  _score: number;
  [key: string]: unknown;
}

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
    useQueryEnhancement: v.optional(v.boolean()),
  },
  handler: async (ctx, { query, limit = 20, minScore = 0.5, skillsFilter, useQueryEnhancement = true }): Promise<{
    query: string;
    enhancedQuery: string;
    results: SearchResultWithScore[];
    totalFound: number;
    model: string;
  }> => {
    // Step 1: Enhance query if enabled
    let searchQuery = query;
    if (useQueryEnhancement) {
      searchQuery = await enhanceQueryForEmbedding(query);
    }
    
    // Step 2: Generate query embedding
    const openai = getOpenAI();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: searchQuery,
    });
    const queryVector = embeddingResponse.data[0].embedding;
    
    // Step 3: Execute native vector search
    // Note: ctx.vectorSearch is only available in actions
    const vectorResults = await ctx.vectorSearch("resumes", "by_embedding", {
      vector: queryVector,
      limit: limit * 2, // Get more results to filter by score
    });
    
    // Step 4: Filter by score
    const filteredResults = vectorResults.filter(r => r._score >= minScore);
    
    // Step 5: Fetch full documents
    const fullResults: SearchResultWithScore[] = [];
    for (const result of filteredResults.slice(0, limit)) {
      const doc = await ctx.runQuery(internal.vectorSearchHelpers.getResumeById, {
        resumeId: result._id,
      }) as Doc<"resumes"> | null;
      
      if (doc) {
        fullResults.push({
          ...doc,
          _id: doc._id,
          _score: result._score,
        });
      }
    }
    
    return {
      query,
      enhancedQuery: useQueryEnhancement ? searchQuery : query,
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
    useQueryEnhancement: v.optional(v.boolean()),
  },
  handler: async (ctx, { query, searchType, limit = 20, minScore = 0.5, useQueryEnhancement = true }): Promise<{
    query: string;
    enhancedQuery: string;
    timestamp: number;
    resumes?: SearchResultWithScore[];
    jobs?: SearchResultWithScore[];
  }> => {
    // Step 1: Enhance query if enabled
    let searchQuery = query;
    if (useQueryEnhancement) {
      searchQuery = await enhanceQueryForEmbedding(query);
    }
    
    // Step 2: Generate query embedding once
    const openai = getOpenAI();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: searchQuery,
    });
    const queryVector = embeddingResponse.data[0].embedding;
    
    const results: {
      query: string;
      enhancedQuery: string;
      timestamp: number;
      resumes?: SearchResultWithScore[];
      jobs?: SearchResultWithScore[];
    } = {
      query,
      enhancedQuery: useQueryEnhancement ? searchQuery : query,
      timestamp: Date.now(),
    };
    
    // Search resumes
    if (searchType === "resumes" || searchType === "both") {
      const resumeResults = await ctx.vectorSearch("resumes", "by_embedding", {
        vector: queryVector,
        limit: limit * 2, // Get more to filter by score
      });
      
      const resumeDocs: SearchResultWithScore[] = [];
      for (const result of resumeResults.filter(r => r._score >= minScore).slice(0, limit)) {
        const doc = await ctx.runQuery(internal.vectorSearchHelpers.getResumeById, {
          resumeId: result._id,
        }) as Doc<"resumes"> | null;
        
        if (doc) {
          resumeDocs.push({
            ...doc,
            _id: doc._id,
            _score: result._score,
          });
        }
      }
      
      results.resumes = resumeDocs;
    }
    
    // Search job postings
    if (searchType === "jobs" || searchType === "both") {
      const jobResults = await ctx.vectorSearch("jobpostings", "by_embedding", {
        vector: queryVector,
        limit: limit * 2, // Get more to filter by score
      });
      
      const jobDocs: SearchResultWithScore[] = [];
      for (const result of jobResults.filter(r => r._score >= minScore).slice(0, limit)) {
        const doc = await ctx.runQuery(internal.vectorSearchHelpers.getJobById, {
          jobId: result._id,
        }) as Doc<"jobpostings"> | null;
        
        if (doc) {
          jobDocs.push({
            ...doc,
            _id: doc._id,
            _score: result._score,
          });
        }
      }
      
      results.jobs = jobDocs;
    }
    
    return results;
  },
});
