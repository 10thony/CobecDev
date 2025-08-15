"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api.js";

/**
 * Generate embeddings for job posting completeSearchableText
 */
export const generateJobPostingEmbedding = action({
  args: {
    jobPostingId: v.id("jobpostings"),
    completeSearchableText: v.string(),
  },
  handler: async (ctx, { jobPostingId, completeSearchableText }): Promise<{
    success: boolean;
    jobPostingId: string;
    embeddingDimensions: number;
    generatedAt: number;
  }> => {
    try {
      // Generate embedding
      const embeddingResult = await ctx.runAction(api.embeddingService.generateEmbedding, {
        text: completeSearchableText,
        model: "gemini-mrl-2048"
      });

      // Update job posting with embedding
      await ctx.runMutation(api.jobPostings.update, {
        id: jobPostingId,
        updates: {
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model,
          embeddingGeneratedAt: embeddingResult.generatedAt
        }
      });

      return {
        success: true,
        jobPostingId,
        embeddingDimensions: embeddingResult.dimensions,
        generatedAt: embeddingResult.generatedAt
      };
    } catch (error) {
      console.error("Error generating job posting embedding:", error);
      throw new Error(`Failed to generate job posting embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Generate embeddings for resume completeSearchableText
 */
export const generateResumeEmbedding = action({
  args: {
    resumeId: v.id("resumes"),
    completeSearchableText: v.string(),
  },
  handler: async (ctx, { resumeId, completeSearchableText }): Promise<{
    success: boolean;
    resumeId: string;
    embeddingDimensions: number;
    generatedAt: number;
  }> => {
    try {
      // Generate embedding
      const embeddingResult = await ctx.runAction(api.embeddingService.generateEmbedding, {
        text: completeSearchableText,
        model: "gemini-mrl-2048"
      });

      // Update resume with embedding
      await ctx.runMutation(api.resumes.update, {
        id: resumeId,
        updates: {
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model,
          embeddingGeneratedAt: embeddingResult.generatedAt
        }
      });

      return {
        success: true,
        resumeId,
        embeddingDimensions: embeddingResult.dimensions,
        generatedAt: embeddingResult.generatedAt
      };
    } catch (error) {
      console.error("Error generating resume embedding:", error);
      throw new Error(`Failed to generate resume embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Generate embeddings for KFC points (individual field-level)
 */
export const generateKfcPointsEmbedding = action({
  args: {
    kfcPointsId: v.id("kfcpoints"),
    searchableText: v.string(),
  },
  handler: async (ctx, { kfcPointsId, searchableText }): Promise<{
    success: boolean;
    kfcPointsId: string;
    embeddingDimensions: number;
    generatedAt: number;
  }> => {
    try {
      // Generate embedding
      const embeddingResult = await ctx.runAction(api.embeddingService.generateEmbedding, {
        text: searchableText,
        model: "gemini-mrl-2048"
      });

      // Update KFC points with embedding
      await ctx.runMutation(api.kfcData.updateEmbeddings, {
        _id: kfcPointsId,
        embedding: embeddingResult.embedding,
        embeddingModel: embeddingResult.model,
        embeddingGeneratedAt: embeddingResult.generatedAt
      });

      return {
        success: true,
        kfcPointsId,
        embeddingDimensions: embeddingResult.dimensions,
        generatedAt: embeddingResult.generatedAt
      };
    } catch (error) {
      console.error("Error generating KFC points embedding:", error);
      throw new Error(`Failed to generate KFC points embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Batch generate embeddings for multiple job postings
 */
export const batchGenerateJobPostingEmbeddings = action({
  args: {
    jobPostingIds: v.array(v.id("jobpostings")),
  },
  handler: async (ctx, { jobPostingIds }): Promise<{
    success: boolean;
    results: any[];
    errors: any[];
    totalProcessed: number;
    totalErrors: number;
  }> => {
    const results: any[] = [];
    const errors: any[] = [];

    for (const jobPostingId of jobPostingIds) {
      try {
        // Get the job posting to extract completeSearchableText
        const jobPosting = await ctx.runQuery(api.jobPostings.get, { id: jobPostingId });
        
        if (!jobPosting) {
          errors.push({ jobPostingId, error: "Job posting not found" });
          continue;
        }

        if (!jobPosting.completeSearchableText) {
          errors.push({ jobPostingId, error: "No completeSearchableText available" });
          continue;
        }

        // Generate embedding
        const result = await ctx.runAction(api.embeddingManagement.generateJobPostingEmbedding, {
          jobPostingId,
          completeSearchableText: jobPosting.completeSearchableText
        });

        results.push(result);
        
        // Rate limiting to avoid API limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errors.push({ 
          jobPostingId, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return {
      success: true,
      results,
      errors,
      totalProcessed: results.length,
      totalErrors: errors.length
    };
  },
});

/**
 * Batch generate embeddings for multiple resumes
 */
export const batchGenerateResumeEmbeddings = action({
  args: {
    resumeIds: v.array(v.id("resumes")),
  },
  handler: async (ctx, { resumeIds }): Promise<{
    success: boolean;
    results: any[];
    errors: any[];
    totalProcessed: number;
    totalErrors: number;
  }> => {
    const results: any[] = [];
    const errors: any[] = [];

    for (const resumeId of resumeIds) {
      try {
        // Get the resume to extract completeSearchableText
        const resume = await ctx.runQuery(api.resumes.get, { id: resumeId });
        
        if (!resume) {
          errors.push({ resumeId, error: "Resume not found" });
          continue;
        }

        if (!resume.completeSearchableText) {
          errors.push({ resumeId, error: "No completeSearchableText available" });
          continue;
        }

        // Generate embedding
        const result = await ctx.runAction(api.embeddingManagement.generateResumeEmbedding, {
          resumeId,
          completeSearchableText: resume.completeSearchableText
        });

        results.push(result);
        
        // Rate limiting to avoid API limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errors.push({ 
          resumeId, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return {
      success: true,
      results,
      errors,
      totalProcessed: results.length,
      totalErrors: errors.length
    };
  },
});
