import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Create a new scraping job
 */
export const createScrapingJob = internalMutation({
  args: {
    portalId: v.optional(v.id("portals")),
    agentJobId: v.string(),
    url: v.string(),
    procurementLinkId: v.optional(v.id("procurementUrls")),
    state: v.string(),
    capital: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"scrapingJobs">> => {
    const now = Date.now();
    return await ctx.db.insert("scrapingJobs", {
      portalId: args.portalId,
      agentJobId: args.agentJobId,
      status: "pending",
      queuedAt: now,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
      // Store additional context
      url: args.url,
      procurementLinkId: args.procurementLinkId,
      state: args.state,
      capital: args.capital,
    } as any);
  },
});

/**
 * Update scraping job
 */
export const updateScrapingJob = internalMutation({
  args: {
    scrapingJobId: v.id("scrapingJobs"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    )),
    agentStatus: v.optional(v.string()),
    currentPage: v.optional(v.number()),
    totalPages: v.optional(v.number()),
    opportunitiesFound: v.optional(v.number()),
    currentAction: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    resultRecordId: v.optional(v.id("scrapedProcurementData")),
    errorMessage: v.optional(v.string()),
    errorType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { scrapingJobId, ...updates } = args;
    const updateData: any = {
      ...updates,
      updatedAt: Date.now(),
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await ctx.db.patch(scrapingJobId, updateData);
  },
});

