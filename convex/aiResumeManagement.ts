import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get AI-generated resumes only
export const getAIGeneratedResumes = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;
    
    // Get all resumes and filter for AI-generated ones
    const allResumes = await ctx.db
      .query("resumes")
      .order("desc")
      .collect();
    
    // Filter for AI-generated resumes (metadata.dataType === "ai_generated")
    const aiResumes = allResumes.filter(resume => 
      resume.metadata?.dataType === "ai_generated"
    );
    
    // Apply pagination
    const paginatedResumes = aiResumes.slice(offset, offset + limit);
    
    return {
      resumes: paginatedResumes,
      total: aiResumes.length,
      hasMore: offset + limit < aiResumes.length,
      offset,
      limit,
    };
  },
});

// Clear all AI-generated resumes
export const clearAIGeneratedResumes = mutation({
  args: {
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirm) {
      throw new Error("Must confirm deletion of AI-generated resumes");
    }
    
    // Get all resumes and filter for AI-generated ones
    const allResumes = await ctx.db
      .query("resumes")
      .order("desc")
      .collect();
    
    // Filter for AI-generated resumes
    const aiResumes = allResumes.filter(resume => 
      resume.metadata?.dataType === "ai_generated"
    );
    
    // Delete in batches to avoid memory limits
    let deletedCount = 0;
    for (const resume of aiResumes) {
      await ctx.db.delete(resume._id);
      deletedCount++;
    }
    
    return {
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} AI-generated resume(s)`,
    };
  },
});

// Get resume generation statistics
export const getResumeGenerationStats = query({
  args: {},
  handler: async (ctx) => {
    const allResumes = await ctx.db
      .query("resumes")
      .collect();
    
    const aiGenerated = allResumes.filter(resume => 
      resume.metadata?.dataType === "ai_generated"
    );
    
    const manual = allResumes.filter(resume => 
      resume.metadata?.dataType !== "ai_generated" || !resume.metadata?.dataType
    );
    
    // Count resumes by source lead (if tracked)
    const bySourceLead: Record<string, number> = {};
    aiGenerated.forEach(resume => {
      if (resume.sourceLeadId) {
        const leadId = resume.sourceLeadId;
        bySourceLead[leadId] = (bySourceLead[leadId] || 0) + 1;
      }
    });
    
    return {
      totalAIGenerated: aiGenerated.length,
      totalManual: manual.length,
      total: allResumes.length,
      bySourceLead: bySourceLead,
    };
  },
});

// Get active/running generation jobs
export const getActiveGenerationJobs = query({
  args: {},
  handler: async (ctx) => {
    const activeJobs = await ctx.db
      .query("resumeGenerationJobs")
      .withIndex("by_status", (q) => 
        q.eq("status", "running")
      )
      .order("desc")
      .collect();
    
    return activeJobs;
  },
});

// Get recent generation jobs (all statuses)
export const getRecentGenerationJobs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const jobs = await ctx.db
      .query("resumeGenerationJobs")
      .withIndex("by_creation")
      .order("desc")
      .take(limit);
    
    return jobs;
  },
});

// Get a specific generation job by ID
export const getGenerationJob = query({
  args: {
    jobId: v.id("resumeGenerationJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});
