import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all scraped procurement data
 */
export const getAllScrapedData = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Note: Cannot reassign query variable - use if/else pattern instead
    if (args.status) {
      return await ctx.db
        .query("scrapedProcurementData")
        .withIndex("by_status", (q) => q.eq("scrapingStatus", args.status!))
        .order("desc")
        .collect();
    } else {
      return await ctx.db
        .query("scrapedProcurementData")
        .withIndex("by_scraped_at", (q) => q)
        .order("desc")
        .collect();
    }
  },
});

/**
 * Get scraped data by state
 */
export const getScrapedDataByState = query({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scrapedProcurementData")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .order("desc")
      .collect();
  },
});

/**
 * Get scraped data by source URL
 */
export const getScrapedDataByUrl = query({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scrapedProcurementData")
      .withIndex("by_source_url", (q) => q.eq("sourceUrl", args.url))
      .order("desc")
      .collect();
  },
});

/**
 * Get statistics about scraped data
 */
export const getScrapingStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("scrapedProcurementData").collect();
    
    return {
      total: all.length,
      completed: all.filter((d) => d.scrapingStatus === "completed").length,
      inProgress: all.filter((d) => d.scrapingStatus === "in_progress").length,
      failed: all.filter((d) => d.scrapingStatus === "failed").length,
      pending: all.filter((d) => d.scrapingStatus === "pending").length,
      byQuality: {
        high: all.filter((d) => d.dataQuality === "high").length,
        medium: all.filter((d) => d.dataQuality === "medium").length,
        low: all.filter((d) => d.dataQuality === "low").length,
      },
    };
  },
});

