import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Lead Link Verifier Mutations
 * 
 * Mutations for managing verification jobs and updating leads with verified URLs.
 */

// Create a new verification job
export const createVerificationJob = mutation({
  args: {
    batchSize: v.number(),
    processingOrder: v.union(v.literal("newest_first"), v.literal("oldest_first")),
    startedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Count total leads
    const allLeads = await ctx.db.query("leads").collect();
    const totalLeads = allLeads.length;

    const jobId = await ctx.db.insert("leadLinkVerificationJobs", {
      status: "pending",
      batchSize: args.batchSize,
      processingOrder: args.processingOrder,
      totalLeads,
      processedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      startedAt: now,
      lastActivityAt: now,
      startedBy: args.startedBy,
    });

    return jobId;
  },
});

// Internal version for workflow
export const createVerificationJobInternal = internalMutation({
  args: {
    batchSize: v.number(),
    processingOrder: v.union(v.literal("newest_first"), v.literal("oldest_first")),
    startedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const allLeads = await ctx.db.query("leads").collect();
    const totalLeads = allLeads.length;

    const jobId = await ctx.db.insert("leadLinkVerificationJobs", {
      status: "pending",
      batchSize: args.batchSize,
      processingOrder: args.processingOrder,
      totalLeads,
      processedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      startedAt: now,
      lastActivityAt: now,
      startedBy: args.startedBy,
    });

    return jobId;
  },
});

// Update verification job status
export const updateVerificationJobStatus = internalMutation({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    )),
    currentTask: v.optional(v.string()),
    currentBatch: v.optional(v.number()),
    lastProcessedLeadId: v.optional(v.id("leads")),
    lastProcessedCreatedAt: v.optional(v.number()),
    workflowId: v.optional(v.string()),
    lastError: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(jobId, {
      ...updates,
      lastActivityAt: now,
    });
  },
});

// Increment job progress counters
export const incrementJobProgress = internalMutation({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
    processed: v.optional(v.number()),
    updated: v.optional(v.number()),
    skipped: v.optional(v.number()),
    failed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    const now = Date.now();

    await ctx.db.patch(args.jobId, {
      processedCount: job.processedCount + (args.processed || 0),
      updatedCount: job.updatedCount + (args.updated || 0),
      skippedCount: job.skippedCount + (args.skipped || 0),
      failedCount: job.failedCount + (args.failed || 0),
      lastActivityAt: now,
    });
  },
});

// Add error to job
export const addJobError = internalMutation({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
    leadId: v.id("leads"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    const now = Date.now();
    const errors = job.errors || [];

    // Keep only last 100 errors
    const newErrors = [
      ...errors.slice(-99),
      { leadId: args.leadId, error: args.error, timestamp: now },
    ];

    await ctx.db.patch(args.jobId, {
      errors: newErrors,
      lastError: args.error,
      lastActivityAt: now,
    });
  },
});

// Cancel a verification job
export const cancelVerificationJob = mutation({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.jobId, {
      status: "cancelled",
      completedAt: now,
      lastActivityAt: now,
    });
  },
});

// Record a verification result
export const recordVerificationResult = internalMutation({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
    leadId: v.id("leads"),
    originalUrl: v.string(),
    result: v.union(
      v.literal("skipped"),
      v.literal("updated"),
      v.literal("no_change"),
      v.literal("failed")
    ),
    newUrl: v.optional(v.string()),
    originalUrlQuality: v.optional(v.object({
      isAccessible: v.boolean(),
      containsOpportunityId: v.boolean(),
      contentMatchesLead: v.boolean(),
      isSpecificUrl: v.boolean(),
      score: v.number(),
    })),
    newUrlQuality: v.optional(v.object({
      isAccessible: v.boolean(),
      containsOpportunityId: v.boolean(),
      contentMatchesLead: v.boolean(),
      isSpecificUrl: v.boolean(),
      score: v.number(),
    })),
    aiReasoning: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("leadLinkVerificationResults", {
      jobId: args.jobId,
      leadId: args.leadId,
      originalUrl: args.originalUrl,
      result: args.result,
      newUrl: args.newUrl,
      originalUrlQuality: args.originalUrlQuality,
      newUrlQuality: args.newUrlQuality,
      aiReasoning: args.aiReasoning,
      verifiedAt: now,
      durationMs: args.durationMs,
      error: args.error,
    });
  },
});

// Update lead source URL
export const updateLeadSourceUrl = internalMutation({
  args: {
    leadId: v.id("leads"),
    newUrl: v.string(),
    newDocumentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return;

    const now = Date.now();

    await ctx.db.patch(args.leadId, {
      source: {
        documentName: args.newDocumentName || lead.source.documentName,
        url: args.newUrl,
      },
      lastChecked: now,
      updatedAt: now,
    });
  },
});

// Mark lead as verified (update lastChecked without changing URL)
export const markLeadVerified = internalMutation({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.leadId, {
      lastChecked: now,
      updatedAt: now,
    });
  },
});

// Delete a verification job and its results
export const deleteVerificationJob = mutation({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
  },
  handler: async (ctx, args) => {
    // Delete all results for this job
    const results = await ctx.db
      .query("leadLinkVerificationResults")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();

    for (const result of results) {
      await ctx.db.delete(result._id);
    }

    // Delete the job
    await ctx.db.delete(args.jobId);

    return { deletedResults: results.length };
  },
});
