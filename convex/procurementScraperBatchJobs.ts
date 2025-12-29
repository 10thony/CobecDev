import { mutation, internalMutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Create a new scraping batch job
 */
export const createBatchJob = internalMutation({
  args: {
    userId: v.string(),
    jobType: v.union(
      v.literal("all_approved"),
      v.literal("multiple"),
      v.literal("single")
    ),
    totalUrls: v.number(),
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("scrapingBatchJobs", {
      userId: args.userId,
      jobType: args.jobType,
      status: "pending",
      totalUrls: args.totalUrls,
      completedUrls: 0,
      failedUrls: 0,
      urls: args.urls,
      recordIds: [],
      startedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update batch job progress
 */
export const updateBatchJobProgress = internalMutation({
  args: {
    jobId: v.id("scrapingBatchJobs"),
    completedUrls: v.optional(v.number()),
    failedUrls: v.optional(v.number()),
    recordId: v.optional(v.id("scrapedProcurementData")),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args;
    const job = await ctx.db.get(jobId);
    if (!job) {
      throw new Error("Batch job not found");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (updates.completedUrls !== undefined) {
      updateData.completedUrls = updates.completedUrls;
    }
    if (updates.failedUrls !== undefined) {
      updateData.failedUrls = updates.failedUrls;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      if (
        updates.status === "completed" ||
        updates.status === "failed" ||
        updates.status === "cancelled"
      ) {
        updateData.completedAt = Date.now();
      }
    }
    if (updates.errorMessage !== undefined) {
      updateData.errorMessage = updates.errorMessage;
    }
    if (updates.recordId !== undefined) {
      updateData.recordIds = [...job.recordIds, updates.recordId];
    }

    await ctx.db.patch(jobId, updateData);
  },
});

/**
 * Get active batch jobs for a user (pending or in_progress)
 */
export const getActiveJobs = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get both pending and in_progress jobs
    const pendingJobs = await ctx.db
      .query("scrapingBatchJobs")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .order("desc")
      .collect();
    
    const inProgressJobs = await ctx.db
      .query("scrapingBatchJobs")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "in_progress")
      )
      .order("desc")
      .collect();
    
    // Combine and sort by startedAt (most recent first)
    const allActiveJobs = [...pendingJobs, ...inProgressJobs];
    return allActiveJobs.sort((a, b) => b.startedAt - a.startedAt);
  },
});

/**
 * Get all batch jobs for a user
 */
export const getUserJobs = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("scrapingBatchJobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

/**
 * Get a specific batch job
 */
export const getBatchJob = query({
  args: {
    jobId: v.id("scrapingBatchJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * Internal query to get a batch job (for use in actions)
 */
export const getBatchJobInternal = internalQuery({
  args: {
    jobId: v.id("scrapingBatchJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * Cancel a batch job (mutation for user to call)
 */
export const cancelBatchJob = mutation({
  args: {
    jobId: v.id("scrapingBatchJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Batch job not found");
    }

    // Only allow cancelling jobs that are pending or in_progress
    if (job.status !== "pending" && job.status !== "in_progress") {
      throw new Error(`Cannot cancel job with status: ${job.status}`);
    }

    await ctx.db.patch(args.jobId, {
      status: "cancelled",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

