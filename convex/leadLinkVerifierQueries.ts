import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Lead Link Verifier Queries
 * 
 * Provides batch selection queries for the lead link verification workflow.
 * The key design decision is to NOT pre-filter leads - let the AI agent decide
 * which URLs need verification. This avoids false negatives from buggy filtering logic.
 */

// Get leads in batches for verification (no pre-filtering)
// Processes ALL leads and lets the agent decide if URL needs verification
export const getLeadsBatch = query({
  args: {
    batchSize: v.number(),
    lastCreatedAt: v.optional(v.number()),
    lastId: v.optional(v.id("leads")),
    order: v.optional(v.union(v.literal("newest_first"), v.literal("oldest_first"))),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize;
    const order = args.order || "newest_first";
    const isDescending = order === "newest_first";

    let leads;

    if (args.lastCreatedAt !== undefined && args.lastId !== undefined) {
      // Compound cursor pagination
      if (isDescending) {
        // Get leads with createdAt < lastCreatedAt (older)
        const leadsBefore = await ctx.db
          .query("leads")
          .withIndex("by_creation")
          .order("desc")
          .filter((q) => q.lt(q.field("createdAt"), args.lastCreatedAt!))
          .take(batchSize);

        // If we need more, get leads with same createdAt but smaller _id
        if (leadsBefore.length < batchSize) {
          const remaining = batchSize - leadsBefore.length;
          const leadsSameTime = await ctx.db
            .query("leads")
            .withIndex("by_creation")
            .order("desc")
            .filter((q) => q.eq(q.field("createdAt"), args.lastCreatedAt!))
            .collect();

          const filteredSameTime = leadsSameTime
            .filter((lead) => lead._id < args.lastId!)
            .sort((a, b) => b._id.localeCompare(a._id))
            .slice(0, remaining);

          leads = [...leadsBefore, ...filteredSameTime];
        } else {
          leads = leadsBefore;
        }
      } else {
        // Ascending order - get leads with createdAt > lastCreatedAt (newer)
        const leadsAfter = await ctx.db
          .query("leads")
          .withIndex("by_creation")
          .order("asc")
          .filter((q) => q.gt(q.field("createdAt"), args.lastCreatedAt!))
          .take(batchSize);

        if (leadsAfter.length < batchSize) {
          const remaining = batchSize - leadsAfter.length;
          const leadsSameTime = await ctx.db
            .query("leads")
            .withIndex("by_creation")
            .order("asc")
            .filter((q) => q.eq(q.field("createdAt"), args.lastCreatedAt!))
            .collect();

          const filteredSameTime = leadsSameTime
            .filter((lead) => lead._id > args.lastId!)
            .sort((a, b) => a._id.localeCompare(b._id))
            .slice(0, remaining);

          leads = [...leadsAfter, ...filteredSameTime];
        } else {
          leads = leadsAfter;
        }
      }
    } else {
      // First batch
      leads = await ctx.db
        .query("leads")
        .withIndex("by_creation")
        .order(isDescending ? "desc" : "asc")
        .take(batchSize);
    }

    // Return only fields needed for verification (avoid loading large fields)
    return leads.map((lead) => ({
      _id: lead._id,
      opportunityTitle: lead.opportunityTitle,
      opportunityType: lead.opportunityType,
      contractID: lead.contractID,
      issuingBody: lead.issuingBody,
      location: lead.location,
      status: lead.status,
      source: lead.source,
      summary: lead.summary ? (lead.summary.length > 500 ? lead.summary.substring(0, 500) + "..." : lead.summary) : "",
      keyDates: lead.keyDates,
      createdAt: lead.createdAt,
    }));
  },
});

// Internal query for workflow - same as above but internal
export const getLeadsBatchInternal = internalQuery({
  args: {
    batchSize: v.number(),
    lastCreatedAt: v.optional(v.number()),
    lastId: v.optional(v.id("leads")),
    order: v.optional(v.union(v.literal("newest_first"), v.literal("oldest_first"))),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize;
    const order = args.order || "newest_first";
    const isDescending = order === "newest_first";

    let leads;

    if (args.lastCreatedAt !== undefined && args.lastId !== undefined) {
      if (isDescending) {
        const leadsBefore = await ctx.db
          .query("leads")
          .withIndex("by_creation")
          .order("desc")
          .filter((q) => q.lt(q.field("createdAt"), args.lastCreatedAt!))
          .take(batchSize);

        if (leadsBefore.length < batchSize) {
          const remaining = batchSize - leadsBefore.length;
          const leadsSameTime = await ctx.db
            .query("leads")
            .withIndex("by_creation")
            .order("desc")
            .filter((q) => q.eq(q.field("createdAt"), args.lastCreatedAt!))
            .collect();

          const filteredSameTime = leadsSameTime
            .filter((lead) => lead._id < args.lastId!)
            .sort((a, b) => b._id.localeCompare(a._id))
            .slice(0, remaining);

          leads = [...leadsBefore, ...filteredSameTime];
        } else {
          leads = leadsBefore;
        }
      } else {
        const leadsAfter = await ctx.db
          .query("leads")
          .withIndex("by_creation")
          .order("asc")
          .filter((q) => q.gt(q.field("createdAt"), args.lastCreatedAt!))
          .take(batchSize);

        if (leadsAfter.length < batchSize) {
          const remaining = batchSize - leadsAfter.length;
          const leadsSameTime = await ctx.db
            .query("leads")
            .withIndex("by_creation")
            .order("asc")
            .filter((q) => q.eq(q.field("createdAt"), args.lastCreatedAt!))
            .collect();

          const filteredSameTime = leadsSameTime
            .filter((lead) => lead._id > args.lastId!)
            .sort((a, b) => a._id.localeCompare(b._id))
            .slice(0, remaining);

          leads = [...leadsAfter, ...filteredSameTime];
        } else {
          leads = leadsAfter;
        }
      }
    } else {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_creation")
        .order(isDescending ? "desc" : "asc")
        .take(batchSize);
    }

    return leads.map((lead) => ({
      _id: lead._id,
      opportunityTitle: lead.opportunityTitle,
      opportunityType: lead.opportunityType,
      contractID: lead.contractID,
      issuingBody: lead.issuingBody,
      location: lead.location,
      status: lead.status,
      source: lead.source,
      summary: lead.summary ? (lead.summary.length > 500 ? lead.summary.substring(0, 500) + "..." : lead.summary) : "",
      keyDates: lead.keyDates,
      createdAt: lead.createdAt,
    }));
  },
});

// Get total count of leads
export const getTotalLeadsCount = query({
  args: {},
  handler: async (ctx) => {
    const allLeads = await ctx.db.query("leads").collect();
    return allLeads.length;
  },
});

// Internal version for workflow
export const getTotalLeadsCountInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allLeads = await ctx.db.query("leads").collect();
    return allLeads.length;
  },
});

// Get a single lead by ID for verification
export const getLeadForVerification = query({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return null;

    return {
      _id: lead._id,
      opportunityTitle: lead.opportunityTitle,
      opportunityType: lead.opportunityType,
      contractID: lead.contractID,
      issuingBody: lead.issuingBody,
      location: lead.location,
      status: lead.status,
      source: lead.source,
      summary: lead.summary ? (lead.summary.length > 1000 ? lead.summary.substring(0, 1000) + "..." : lead.summary) : "",
      keyDates: lead.keyDates,
      createdAt: lead.createdAt,
    };
  },
});

// Internal version
export const getLeadForVerificationInternal = internalQuery({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return null;

    return {
      _id: lead._id,
      opportunityTitle: lead.opportunityTitle,
      opportunityType: lead.opportunityType,
      contractID: lead.contractID,
      issuingBody: lead.issuingBody,
      location: lead.location,
      status: lead.status,
      source: lead.source,
      summary: lead.summary ? (lead.summary.length > 1000 ? lead.summary.substring(0, 1000) + "..." : lead.summary) : "",
      keyDates: lead.keyDates,
      createdAt: lead.createdAt,
    };
  },
});

// Get verification job by ID
export const getVerificationJob = query({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

// Internal version
export const getVerificationJobInternal = internalQuery({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

// Get all verification jobs (for dashboard)
export const getAllVerificationJobs = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    if (args.status) {
      const jobs = await ctx.db
        .query("leadLinkVerificationJobs")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
      return jobs;
    }

    const jobs = await ctx.db
      .query("leadLinkVerificationJobs")
      .order("desc")
      .take(limit);
    return jobs;
  },
});

// Get verification results for a job
export const getVerificationResults = query({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
    limit: v.optional(v.number()),
    result: v.optional(v.union(
      v.literal("skipped"),
      v.literal("updated"),
      v.literal("no_change"),
      v.literal("failed")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("leadLinkVerificationResults")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId));

    const results = await query.order("desc").take(args.limit || 100);

    // Filter by result type if specified
    if (args.result) {
      return results.filter((r) => r.result === args.result);
    }

    return results;
  },
});

// Get stats for a verification job
export const getVerificationJobStats = query({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;

    const results = await ctx.db
      .query("leadLinkVerificationResults")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();

    const stats = {
      total: results.length,
      skipped: results.filter((r) => r.result === "skipped").length,
      updated: results.filter((r) => r.result === "updated").length,
      noChange: results.filter((r) => r.result === "no_change").length,
      failed: results.filter((r) => r.result === "failed").length,
      averageDurationMs: 0,
      averageQualityImprovement: 0,
    };

    // Calculate average duration
    const withDuration = results.filter((r) => r.durationMs !== undefined);
    if (withDuration.length > 0) {
      stats.averageDurationMs = Math.round(
        withDuration.reduce((sum, r) => sum + (r.durationMs || 0), 0) / withDuration.length
      );
    }

    // Calculate average quality improvement for updated URLs
    const updated = results.filter(
      (r) => r.result === "updated" && r.originalUrlQuality && r.newUrlQuality
    );
    if (updated.length > 0) {
      stats.averageQualityImprovement =
        updated.reduce(
          (sum, r) => sum + ((r.newUrlQuality?.score || 0) - (r.originalUrlQuality?.score || 0)),
          0
        ) / updated.length;
    }

    return {
      job,
      stats,
    };
  },
});
