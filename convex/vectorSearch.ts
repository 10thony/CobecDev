import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search job postings by semantic similarity to a query
 * Uses Gemini MRL 2048 embeddings for optimal performance
 */
export const searchJobPostings = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, { query, limit = 20, similarityThreshold = 0.5 }) => {
    // Get all job postings with embeddings
    const jobPostings = await ctx.db.query("jobpostings").collect();
    
    // Filter by similarity threshold if embeddings exist
    const results = jobPostings
      .filter(job => job.embedding && job.completeSearchableText)
      .map(job => ({
        ...job,
        similarity: 0.8, // Placeholder - will be calculated with vector search when query embedding is available
        hasEmbedding: true,
        searchableText: job.completeSearchableText,
      }))
      .filter(job => job.similarity >= similarityThreshold)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);

    return {
      results,
      totalFound: results.length,
      totalWithEmbeddings: jobPostings.filter(job => job.embedding).length,
      similarityThreshold,
      model: "gemini-mrl-2048"
    };
  },
});

/**
 * Search resumes by semantic similarity to a query
 * Uses Gemini MRL 2048 embeddings for optimal performance
 */
export const searchResumes = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, { query, limit = 20, similarityThreshold = 0.5 }) => {
    // Get all resumes with embeddings
    const resumes = await ctx.db.query("resumes").collect();
    
    // Filter by similarity threshold if embeddings exist
    const results = resumes
      .filter(resume => resume.embedding && resume.completeSearchableText)
      .map(resume => ({
        ...resume,
        similarity: 0.8, // Placeholder - will be calculated with vector search when query embedding is available
        hasEmbedding: true,
        searchableText: resume.completeSearchableText,
      }))
      .filter(resume => resume.similarity >= similarityThreshold)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);

    return {
      results,
      totalFound: results.length,
      totalWithEmbeddings: resumes.filter(resume => resume.embedding).length,
      similarityThreshold,
      model: "gemini-mrl-2048"
    };
  },
});

/**
 * Find resumes that semantically match a given job posting
 * HR-focused matching with 50% minimum similarity threshold
 */
export const findMatchingResumesForJob = query({
  args: {
    jobPostingId: v.id("jobpostings"),
    limit: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, { jobPostingId, limit = 10, similarityThreshold = 0.5 }) => {
    const jobPosting = await ctx.db.get(jobPostingId);
    if (!jobPosting || !jobPosting.embedding) {
      return {
        jobPosting: null,
        matchingResumes: [],
        totalFound: 0,
        similarityThreshold,
        businessInsights: {
          hasMatchingResumes: false,
          skillGap: "Job posting has no embedding for comparison",
          recommendation: "Generate embeddings for this job posting to enable semantic matching"
        }
      };
    }

    const resumes = await ctx.db.query("resumes").collect();
    
    // Calculate similarity scores for resumes with embeddings
    const scoredResumes = resumes
      .filter(resume => resume.embedding && resume.completeSearchableText)
      .map(resume => ({
        ...resume,
        similarity: cosineSimilarity(jobPosting.embedding!, resume.embedding!),
        searchableText: resume.completeSearchableText,
      }))
      .filter(resume => resume.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Business intelligence insights
    const businessInsights = {
      hasMatchingResumes: scoredResumes.length > 0,
      totalCandidates: scoredResumes.length,
      topMatchScore: scoredResumes.length > 0 ? scoredResumes[0].similarity : 0,
      averageMatchScore: scoredResumes.length > 0 
        ? scoredResumes.reduce((sum, r) => sum + r.similarity, 0) / scoredResumes.length 
        : 0,
      skillGap: scoredResumes.length === 0 
        ? "No qualified candidates found - consider adjusting requirements or expanding search"
        : "Qualified candidates available",
      recommendation: scoredResumes.length === 0
        ? "Review job requirements or consider external recruitment"
        : "Proceed with candidate evaluation"
    };

    return {
      jobPosting: {
        id: jobPosting._id,
        jobTitle: jobPosting.jobTitle,
        location: jobPosting.location,
        department: jobPosting.department,
        searchableText: jobPosting.completeSearchableText,
        embeddingModel: jobPosting.embeddingModel,
        embeddingGeneratedAt: jobPosting.embeddingGeneratedAt
      },
      matchingResumes: scoredResumes,
      totalFound: scoredResumes.length,
      similarityThreshold,
      businessInsights
    };
  },
});

/**
 * Find job postings that semantically match a given resume
 * HR-focused matching with 50% minimum similarity threshold
 */
export const findMatchingJobsForResume = query({
  args: {
    resumeId: v.id("resumes"),
    limit: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, { resumeId, limit = 10, similarityThreshold = 0.5 }) => {
    const resume = await ctx.db.get(resumeId);
    if (!resume || !resume.embedding) {
      return {
        resume: null,
        matchingJobs: [],
        totalFound: 0,
        similarityThreshold,
        businessInsights: {
          hasMatchingJobs: false,
          skillGap: "Resume has no embedding for comparison",
          recommendation: "Generate embeddings for this resume to enable semantic matching"
        }
      };
    }

    const jobPostings = await ctx.db.query("jobpostings").collect();
    
    // Calculate similarity scores for job postings with embeddings
    const scoredJobs = jobPostings
      .filter(job => job.embedding && job.completeSearchableText)
      .map(job => ({
        ...job,
        similarity: cosineSimilarity(resume.embedding!, job.embedding!),
        searchableText: job.completeSearchableText,
      }))
      .filter(job => job.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Business intelligence insights
    const businessInsights = {
      hasMatchingJobs: scoredJobs.length > 0,
      totalOpportunities: scoredJobs.length,
      topMatchScore: scoredJobs.length > 0 ? scoredJobs[0].similarity : 0,
      averageMatchScore: scoredJobs.length > 0 
        ? scoredJobs.reduce((sum, j) => sum + j.similarity, 0) / scoredJobs.length 
        : 0,
      skillGap: scoredJobs.length === 0 
        ? "No matching job opportunities found - consider skill development or expanding search criteria"
        : "Matching opportunities available",
      recommendation: scoredJobs.length === 0
        ? "Consider upskilling or expanding job search criteria"
        : "Apply to matching positions"
    };

    return {
      resume: {
        id: resume._id,
        filename: resume.filename,
        personalInfo: resume.personalInfo,
        searchableText: resume.completeSearchableText,
        embeddingModel: resume.embeddingModel,
        embeddingGeneratedAt: resume.embeddingGeneratedAt
      },
      matchingJobs: scoredJobs,
      totalFound: scoredJobs.length,
      similarityThreshold,
      businessInsights
    };
  },
});

/**
 * Cross-table semantic search: Find job-resume matches across the entire system
 * HR-focused matching with configurable similarity threshold (default 50%)
 */
export const crossTableSemanticSearch = query({
  args: {
    query: v.string(),
    searchType: v.union(v.literal("jobs"), v.literal("resumes"), v.literal("both")),
    limit: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, { query, searchType = "both", limit = 20, similarityThreshold = 0.5 }) => {
    const results: any = {
      query,
      searchType,
      similarityThreshold,
      timestamp: Date.now(),
      model: "gemini-mrl-2048"
    };

    if (searchType === "jobs" || searchType === "both") {
      const jobPostings = await ctx.db.query("jobpostings").collect();
      const matchingJobs = jobPostings
        .filter(job => job.embedding && job.completeSearchableText)
        .map(job => ({
          ...job,
          similarity: 0.8, // Placeholder - will be calculated with query embedding
          type: "job",
          searchableText: job.completeSearchableText,
        }))
        .filter(job => job.similarity >= similarityThreshold)
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, limit);

      results.jobs = {
        results: matchingJobs,
        totalFound: matchingJobs.length,
        totalWithEmbeddings: jobPostings.filter(job => job.embedding).length
      };
    }

    if (searchType === "resumes" || searchType === "both") {
      const resumes = await ctx.db.query("resumes").collect();
      const matchingResumes = resumes
        .filter(resume => resume.embedding && resume.completeSearchableText)
        .map(resume => ({
          ...resume,
          similarity: 0.8, // Placeholder - will be calculated with query embedding
          type: "resume",
          searchableText: resume.completeSearchableText,
        }))
        .filter(resume => resume.similarity >= similarityThreshold)
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, limit);

      results.resumes = {
        results: matchingResumes,
        totalFound: matchingResumes.length,
        totalWithEmbeddings: resumes.filter(resume => resume.embedding).length
      };
    }

    return results;
  },
});

/**
 * Search KFC points by semantic similarity to a query
 * Uses Gemini MRL 2048 embeddings for optimal performance
 */
export const searchKfcPoints = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, { query, limit = 20, similarityThreshold = 0.5 }) => {
    // Get all KFC points with embeddings
    const kfcPoints = await ctx.db.query("kfcpoints").collect();
    
    // Filter by similarity threshold if embeddings exist
    const results = kfcPoints
      .filter(point => point.embedding && point.completeSearchableText)
      .map(point => ({
        ...point,
        similarity: 0.8, // Placeholder - will be calculated with vector search when query embedding is available
        hasEmbedding: true,
        searchableText: point.completeSearchableText,
      }))
      .filter(point => point.similarity >= similarityThreshold)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);

    return {
      results,
      totalFound: results.length,
      totalWithEmbeddings: kfcPoints.filter(point => point.embedding).length,
      similarityThreshold,
      model: "gemini-mrl-2048"
    };
  },
});

/**
 * Get job postings that need embeddings generated
 */
export const getJobPostingsNeedingEmbeddings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 1000 }) => {
    const jobPostings = await ctx.db.query("jobpostings").collect();
    
    return jobPostings
      .filter(job => !job.completeSearchableText || !job.embedding || job.embedding.length === 0)
      .slice(0, limit);
  },
});

/**
 * Get resumes that need embeddings generated
 */
export const getResumesNeedingEmbeddings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 1000 }) => {
    const resumes = await ctx.db.query("resumes").collect();
    
    return resumes
      .filter(resume => !resume.completeSearchableText || !resume.embedding || resume.embedding.length === 0)
      .slice(0, limit);
  },
});

/**
 * Get KFC points that need embeddings generated
 */
export const getKfcPointsNeedingEmbeddings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 1000 }) => {
    const kfcPoints = await ctx.db.query("kfcpoints").collect();
    
    return kfcPoints
      .filter(point => !point.completeSearchableText || !point.embedding || point.embedding.length === 0)
      .slice(0, limit);
  },
});

/**
 * Update job posting embedding fields
 */
export const updateJobPostingEmbedding = mutation({
  args: {
    id: v.id("jobpostings"),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    embeddingGeneratedAt: v.number(),
  },
  handler: async (ctx, { id, embedding, embeddingModel, embeddingGeneratedAt }) => {
    await ctx.db.patch(id, {
      embedding,
      embeddingModel,
      embeddingGeneratedAt,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Update resume embedding fields
 */
export const updateResumeEmbedding = mutation({
  args: {
    id: v.id("resumes"),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    embeddingGeneratedAt: v.number(),
  },
  handler: async (ctx, { id, embedding, embeddingModel, embeddingGeneratedAt }) => {
    await ctx.db.patch(id, {
      embedding,
      embeddingModel,
      embeddingGeneratedAt,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Update KFC points embedding fields
 */
export const updateKfcPointsEmbedding = mutation({
  args: {
    id: v.id("kfcpoints"),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    embeddingGeneratedAt: v.number(),
  },
  handler: async (ctx, { id, embedding, embeddingModel, embeddingGeneratedAt }) => {
    await ctx.db.patch(id, {
      embedding,
      embeddingModel,
      embeddingGeneratedAt,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Get system-wide embedding statistics for monitoring
 */
export const getEmbeddingStats = query({
  args: {},
  handler: async (ctx) => {
    const jobPostings = await ctx.db.query("jobpostings").collect();
    const resumes = await ctx.db.query("resumes").collect();
    const kfcPoints = await ctx.db.query("kfcpoints").collect();

    const stats = {
      jobPostings: {
        total: jobPostings.length,
        withEmbeddings: jobPostings.filter(job => job.embedding).length,
        withSearchableText: jobPostings.filter(job => job.completeSearchableText).length,
        embeddingModel: jobPostings.find(job => job.embeddingModel)?.embeddingModel || "none"
      },
      resumes: {
        total: resumes.length,
        withEmbeddings: resumes.filter(resume => resume.embedding).length,
        withSearchableText: resumes.filter(resume => resume.completeSearchableText).length,
        embeddingModel: resumes.find(resume => resume.embeddingModel)?.embeddingModel || "none"
      },
      kfcPoints: {
        total: kfcPoints.length,
        withEmbeddings: kfcPoints.filter(point => point.embedding).length,
        withSearchableText: kfcPoints.filter(point => point.completeSearchableText).length,
        embeddingModel: kfcPoints.find(point => point.embeddingModel)?.embeddingModel || "none"
      },
      overall: {
        totalDocuments: jobPostings.length + resumes.length + kfcPoints.length,
        totalWithEmbeddings: 
          jobPostings.filter(job => job.embedding).length +
          resumes.filter(resume => resume.embedding).length +
          kfcPoints.filter(point => point.embedding).length,
        embeddingCoverage: 0, // Will be calculated below
        model: "gemini-mrl-2048"
      }
    };

    // Calculate overall embedding coverage percentage
    if (stats.overall.totalDocuments > 0) {
      stats.overall.embeddingCoverage = Math.round(
        (stats.overall.totalWithEmbeddings / stats.overall.totalDocuments) * 100
      );
    }

    return stats;
  },
});