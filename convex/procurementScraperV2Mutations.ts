import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================================================
// HASH FUNCTION (for deduplication)
// ============================================================================

/**
 * Simple hash function for deduplication
 * Uses djb2 algorithm - a simple string hash that works in Convex mutations
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16);
}

// ============================================================================
// OPPORTUNITY MANAGEMENT
// ============================================================================

/**
 * Save a scraped procurement opportunity
 * Called from frontend after extracting data from a detail page
 */
export const saveOpportunity = mutation({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
    sourceUrl: v.string(),
    detailUrl: v.optional(v.string()),
    state: v.string(),
    capital: v.string(),
    title: v.string(),
    referenceNumber: v.optional(v.string()),
    opportunityType: v.optional(v.string()),
    status: v.optional(v.string()),
    postedDate: v.optional(v.string()),
    closingDate: v.optional(v.string()),
    openingDate: v.optional(v.string()),
    awardDate: v.optional(v.string()),
    lastModifiedDate: v.optional(v.string()),
    description: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    department: v.optional(v.string()),
    division: v.optional(v.string()),
    estimatedValue: v.optional(v.string()),
    budgetCode: v.optional(v.string()),
    fundingSource: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactAddress: v.optional(v.string()),
    buyerName: v.optional(v.string()),
    requirements: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    setAside: v.optional(v.string()),
    documents: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.optional(v.string()),
      size: v.optional(v.string()),
    }))),
    submissionMethod: v.optional(v.string()),
    submissionInstructions: v.optional(v.string()),
    rawScrapedText: v.optional(v.string()),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate hash for deduplication
    const hashInput = `${args.state}|${args.capital}|${args.title}|${args.referenceNumber || ''}`;
    const hash = simpleHash(hashInput);
    
    // Check for existing opportunity with same hash
    const existing = await ctx.db
      .query("procurementOpportunities")
      .withIndex("by_hash", (q) => q.eq("hash", hash))
      .first();
    
    if (existing) {
      // Update existing record instead of creating duplicate
      await ctx.db.patch(existing._id, {
        ...args,
        scrapedAt: Date.now(),
        hash,
      });
      return { id: existing._id, isUpdate: true };
    }
    
    // Create new opportunity
    const id = await ctx.db.insert("procurementOpportunities", {
      ...args,
      scrapedAt: Date.now(),
      hash,
    });
    
    return { id, isUpdate: false };
  },
});

/**
 * Internal version for use in actions
 */
export const saveOpportunityInternal = internalMutation({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
    sourceUrl: v.string(),
    detailUrl: v.optional(v.string()),
    state: v.string(),
    capital: v.string(),
    title: v.string(),
    referenceNumber: v.optional(v.string()),
    opportunityType: v.optional(v.string()),
    status: v.optional(v.string()),
    postedDate: v.optional(v.string()),
    closingDate: v.optional(v.string()),
    openingDate: v.optional(v.string()),
    awardDate: v.optional(v.string()),
    lastModifiedDate: v.optional(v.string()),
    description: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    department: v.optional(v.string()),
    division: v.optional(v.string()),
    estimatedValue: v.optional(v.string()),
    budgetCode: v.optional(v.string()),
    fundingSource: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactAddress: v.optional(v.string()),
    buyerName: v.optional(v.string()),
    requirements: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    setAside: v.optional(v.string()),
    documents: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.optional(v.string()),
      size: v.optional(v.string()),
    }))),
    submissionMethod: v.optional(v.string()),
    submissionInstructions: v.optional(v.string()),
    rawScrapedText: v.optional(v.string()),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hashInput = `${args.state}|${args.capital}|${args.title}|${args.referenceNumber || ''}`;
    const hash = simpleHash(hashInput);
    
    const existing = await ctx.db
      .query("procurementOpportunities")
      .withIndex("by_hash", (q) => q.eq("hash", hash))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        scrapedAt: Date.now(),
        hash,
      });
      return existing._id;
    }
    
    return await ctx.db.insert("procurementOpportunities", {
      ...args,
      scrapedAt: Date.now(),
      hash,
    });
  },
});

// ============================================================================
// INTERACTION LOGGING
// ============================================================================

/**
 * Log a scraper interaction for debugging
 */
export const logInteraction = mutation({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
    action: v.string(),
    selector: v.optional(v.string()),
    description: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    snapshotPreview: v.optional(v.string()),
    aiAnalysis: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scraperInteractionLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// SCRAPING SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new browser scraping session
 */
export const createBrowserScrapingSession = mutation({
  args: {
    url: v.string(),
    state: v.string(),
    capital: v.string(),
    procurementLinkId: v.optional(v.id("procurementUrls")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("scrapedProcurementData", {
      sourceUrl: args.url,
      procurementLinkId: args.procurementLinkId,
      state: args.state,
      capital: args.capital,
      scrapedAt: now,
      scrapedBy: "Browser Scraper",
      scrapingStatus: "in_progress",
      scrapedData: { 
        status: "in_progress", 
        method: "browser",
        startedAt: now,
      },
      aiModel: "gpt-4o-mini",
      updatedAt: now,
    });
  },
});

/**
 * Update browser scraping session status
 */
export const updateBrowserScrapingSession = mutation({
  args: {
    recordId: v.id("scrapedProcurementData"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    ),
    opportunityCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    scrapedData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { recordId, status, opportunityCount, errorMessage, scrapedData } = args;
    
    const updateData: any = {
      scrapingStatus: status,
      updatedAt: Date.now(),
    };
    
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }
    
    if (scrapedData !== undefined) {
      updateData.scrapedData = scrapedData;
    }
    
    if (status === "completed" && opportunityCount !== undefined) {
      updateData.scrapedData = {
        ...updateData.scrapedData,
        totalOpportunities: opportunityCount,
        completedAt: Date.now(),
      };
      updateData.dataQuality = opportunityCount > 0 ? "high" : "low";
      updateData.dataCompleteness = opportunityCount > 0 ? 1 : 0;
    }
    
    await ctx.db.patch(recordId, updateData);
  },
});

