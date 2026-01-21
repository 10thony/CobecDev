import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation to create a generation job
export const createGenerationJob = internalMutation({
  args: {
    jobType: v.union(v.literal("single"), v.literal("batch")),
    leadIds: v.array(v.id("leads")),
    systemPromptId: v.optional(v.id("resumeGenerationSystemPrompts")),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("resumeGenerationJobs", {
      jobType: args.jobType,
      status: "running",
      leadIds: args.leadIds,
      systemPromptId: args.systemPromptId,
      startedAt: Date.now(),
      progress: {
        current: 0,
        total: args.leadIds.length,
      },
      createdBy: args.createdBy,
    });
  },
});

// Internal mutation to update job progress
export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("resumeGenerationJobs"),
    current: v.number(),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      progress: {
        current: args.current,
        total: args.total,
      },
    });
  },
});

// Internal mutation to complete a job
export const completeJob = internalMutation({
  args: {
    jobId: v.id("resumeGenerationJobs"),
    status: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    result: v.optional(v.object({
      successful: v.number(),
      failed: v.number(),
      resumeIds: v.array(v.id("resumes")),
      errors: v.optional(v.array(v.object({
        leadId: v.id("leads"),
        error: v.string(),
      }))),
    })),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      completedAt: Date.now(),
      result: args.result,
      error: args.error,
    });
  },
});
