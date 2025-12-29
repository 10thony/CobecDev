import { query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// OPPORTUNITY QUERIES
// ============================================================================

/**
 * Get all scraped opportunities with optional filters
 */
export const getOpportunities = query({
  args: {
    state: v.optional(v.string()),
    status: v.optional(v.string()),
    opportunityType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let opportunities;
    
    if (args.state) {
      opportunities = await ctx.db
        .query("procurementOpportunities")
        .withIndex("by_state", (q) => q.eq("state", args.state!))
        .order("desc")
        .collect();
    } else {
      opportunities = await ctx.db
        .query("procurementOpportunities")
        .withIndex("by_scraped_at")
        .order("desc")
        .collect();
    }
    
    // Apply additional filters
    if (args.status) {
      opportunities = opportunities.filter((o) => o.status === args.status);
    }
    if (args.opportunityType) {
      opportunities = opportunities.filter((o) => o.opportunityType === args.opportunityType);
    }
    
    // Apply limit
    if (args.limit) {
      opportunities = opportunities.slice(0, args.limit);
    }
    
    return opportunities;
  },
});

/**
 * Get opportunities for a specific scraping session
 */
export const getOpportunitiesByScrapingSession = query({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("procurementOpportunities")
      .withIndex("by_scraped_data", (q) => q.eq("scrapedDataId", args.scrapedDataId))
      .order("desc")
      .collect();
  },
});

/**
 * Get opportunities closing soon
 */
export const getUpcomingDeadlines = query({
  args: {
    days: v.optional(v.number()), // Default 7 days
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const daysAhead = args.days || 7;
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    let opportunities;
    
    if (args.state) {
      opportunities = await ctx.db
        .query("procurementOpportunities")
        .withIndex("by_state", (q) => q.eq("state", args.state!))
        .collect();
    } else {
      opportunities = await ctx.db
        .query("procurementOpportunities")
        .collect();
    }
    
    // Filter to upcoming deadlines
    return opportunities.filter((o) => {
      if (!o.closingDate) return false;
      try {
        const closeDate = new Date(o.closingDate);
        return closeDate >= now && closeDate <= futureDate;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      const dateA = new Date(a.closingDate || '9999-12-31');
      const dateB = new Date(b.closingDate || '9999-12-31');
      return dateA.getTime() - dateB.getTime();
    });
  },
});

/**
 * Get opportunity statistics
 */
export const getOpportunityStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("procurementOpportunities").collect();
    
    // Group by state
    const byState: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    
    for (const opp of all) {
      byState[opp.state] = (byState[opp.state] || 0) + 1;
      if (opp.opportunityType) {
        byType[opp.opportunityType] = (byType[opp.opportunityType] || 0) + 1;
      }
      if (opp.status) {
        byStatus[opp.status] = (byStatus[opp.status] || 0) + 1;
      }
    }
    
    return {
      total: all.length,
      byState,
      byType,
      byStatus,
      withClosingDate: all.filter((o) => o.closingDate).length,
      withDescription: all.filter((o) => o.description).length,
      withDocuments: all.filter((o) => o.documents && o.documents.length > 0).length,
    };
  },
});

// ============================================================================
// INTERACTION LOG QUERIES
// ============================================================================

/**
 * Get interaction log for a scraping session
 */
export const getInteractionLog = query({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scraperInteractionLog")
      .withIndex("by_scraped_data", (q) => q.eq("scrapedDataId", args.scrapedDataId))
      .order("asc")
      .collect();
  },
});

