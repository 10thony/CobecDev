import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get scraping job by agent job ID
 */
export const getByAgentJobId = internalQuery({
  args: {
    agentJobId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("scrapingJobs")
      .withIndex("by_agent_job_id", (q) => q.eq("agentJobId", args.agentJobId))
      .first();
    
    return job;
  },
});

/**
 * Get scraping job by ID
 */
export const getById = internalQuery({
  args: {
    scrapingJobId: v.id("scrapingJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.scrapingJobId);
  },
});

/**
 * Get scraping jobs by portal
 */
export const getByPortal = internalQuery({
  args: {
    portalId: v.id("portals"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scrapingJobs")
      .withIndex("by_portal", (q) => q.eq("portalId", args.portalId))
      .collect();
  },
});

/**
 * Get scraping jobs by status
 */
export const getByStatus = internalQuery({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scrapingJobs")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

