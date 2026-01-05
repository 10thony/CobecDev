import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    procurementUrlId: v.optional(v.id("procurementUrls")),
    state: v.string(),
    sourceUrl: v.string(),
    data: v.array(v.any()),
    rowCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("procurementData", {
      ...args,
      status: "pending_review",
      createdAt: Date.now(),
    });
  },
});

/**
 * Get scraped data for a specific procurement URL
 */
export const getByProcurementUrlId = query({
  args: {
    procurementUrlId: v.id("procurementUrls"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("procurementData")
      .withIndex("by_procurement_url", (q) => q.eq("procurementUrlId", args.procurementUrlId))
      .order("desc")
      .collect();
  },
});

/**
 * Get the most recent scraped data for a procurement URL
 */
export const getLatestByProcurementUrlId = query({
  args: {
    procurementUrlId: v.id("procurementUrls"),
  },
  handler: async (ctx, args) => {
    const allData = await ctx.db
      .query("procurementData")
      .withIndex("by_procurement_url", (q) => q.eq("procurementUrlId", args.procurementUrlId))
      .order("desc")
      .collect();
    
    return allData.length > 0 ? allData[0] : null;
  },
});

/**
 * Get scraped data summary (count and latest) for a procurement URL
 */
export const getSummaryByProcurementUrlId = query({
  args: {
    procurementUrlId: v.id("procurementUrls"),
  },
  handler: async (ctx, args) => {
    const allData = await ctx.db
      .query("procurementData")
      .withIndex("by_procurement_url", (q) => q.eq("procurementUrlId", args.procurementUrlId))
      .order("desc")
      .collect();
    
    return {
      count: allData.length,
      latest: allData.length > 0 ? allData[0] : null,
      totalRows: allData.reduce((sum, item) => sum + (item.rowCount || 0), 0),
    };
  },
});

