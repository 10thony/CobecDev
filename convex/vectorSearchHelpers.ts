/**
 * Helper queries and mutations for vector search operations.
 * These must be in a separate file (without "use node") because
 * queries and mutations cannot run in the Node.js runtime.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// ============================================
// Resume Helpers
// ============================================

/**
 * Get a single resume by ID
 */
export const getResumeById = internalQuery({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, { resumeId }): Promise<Doc<"resumes"> | null> => {
    return await ctx.db.get(resumeId);
  },
});

/**
 * Get resumes that need embeddings generated
 */
export const getResumesNeedingEmbeddings = internalQuery({
  args: {
    limit: v.number(),
    forceRegenerate: v.boolean(),
  },
  handler: async (ctx, { limit, forceRegenerate }): Promise<Doc<"resumes">[]> => {
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

/**
 * Update a resume with embedding data
 */
export const updateResumeWithEmbedding = internalMutation({
  args: {
    resumeId: v.id("resumes"),
    completeSearchableText: v.string(),
    embedding: v.array(v.float64()),
    extractedSkills: v.array(v.string()),
    embeddingModel: v.string(),
    embeddingGeneratedAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
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

// ============================================
// Job Posting Helpers
// ============================================

/**
 * Get a single job posting by ID
 */
export const getJobById = internalQuery({
  args: { jobId: v.id("jobpostings") },
  handler: async (ctx, { jobId }): Promise<Doc<"jobpostings"> | null> => {
    return await ctx.db.get(jobId);
  },
});

/**
 * Get job postings that need embeddings generated
 */
export const getJobPostingsNeedingEmbeddings = internalQuery({
  args: {
    limit: v.number(),
    forceRegenerate: v.boolean(),
  },
  handler: async (ctx, { limit, forceRegenerate }): Promise<Doc<"jobpostings">[]> => {
    if (forceRegenerate) {
      return await ctx.db.query("jobpostings").take(limit);
    }
    
    // Get job postings without embeddings
    const jobs = await ctx.db.query("jobpostings").collect();
    return jobs
      .filter(j => !j.embedding || j.embedding.length === 0)
      .slice(0, limit);
  },
});

/**
 * Update a job posting with embedding data
 */
export const updateJobWithEmbedding = internalMutation({
  args: {
    jobId: v.id("jobpostings"),
    completeSearchableText: v.string(),
    embedding: v.array(v.float64()),
    extractedSkills: v.array(v.string()),
    embeddingModel: v.string(),
    embeddingGeneratedAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.jobId, {
      completeSearchableText: args.completeSearchableText,
      embedding: args.embedding,
      extractedSkills: args.extractedSkills,
      embeddingModel: args.embeddingModel,
      embeddingGeneratedAt: args.embeddingGeneratedAt,
      updatedAt: Date.now(),
    });
  },
});
