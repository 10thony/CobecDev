import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  SCRAPING_STATUS,
  DEFAULT_AI_MODEL,
  DEFAULT_SCRAPED_BY,
} from "./procurementScraperConstants";

/**
 * Create a new scraping record
 */
export const createScrapingRecord = internalMutation({
  args: {
    url: v.string(),
    procurementLinkId: v.optional(v.id("procurementUrls")),
    state: v.string(),
    capital: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Note: scrapedData is required in the schema, so we provide a placeholder
    // that will be updated when scraping completes
    return await ctx.db.insert("scrapedProcurementData", {
      sourceUrl: args.url,
      procurementLinkId: args.procurementLinkId,
      state: args.state,
      capital: args.capital,
      scrapedAt: now,
      scrapedBy: DEFAULT_SCRAPED_BY,
      scrapingStatus: SCRAPING_STATUS.IN_PROGRESS,
      scrapedData: { status: "in_progress", message: "Scraping in progress..." }, // Placeholder until scraping completes
      aiModel: DEFAULT_AI_MODEL,
      updatedAt: now,
    });
  },
});

/**
 * Update a scraping record with results
 */
export const updateScrapingRecord = internalMutation({
  args: {
    recordId: v.id("scrapedProcurementData"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    ),
    scrapedData: v.optional(v.any()),
    dataQuality: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    dataCompleteness: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    aiPrompt: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { recordId, status, ...updates } = args;
    
    // Map status to scrapingStatus if provided, and exclude status from patch
    const patchData: any = {
      ...updates,
      updatedAt: Date.now(),
    };
    
    // If status is provided, map it to scrapingStatus
    if (status !== undefined) {
      patchData.scrapingStatus = status;
    }
    
    await ctx.db.patch(recordId, patchData);
  },
});

/**
 * Delete a scraping record (public mutation for UI)
 */
export const deleteScrapingRecord = mutation({
  args: {
    recordId: v.id("scrapedProcurementData"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new Error("Scraping record not found");
    }
    
    await ctx.db.delete(args.recordId);
    return { success: true };
  },
});

/**
 * Delete all scraped procurement data records
 */
export const deleteAllScrapedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all scraped procurement data records
    const allRecords = await ctx.db
      .query("scrapedProcurementData")
      .collect();
    
    // Delete all records
    for (const record of allRecords) {
      await ctx.db.delete(record._id);
    }
    
    return { 
      success: true, 
      deletedCount: allRecords.length 
    };
  },
});

