import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new opportunity
export const createOpportunity = mutation({
  args: {
    opportunityType: v.string(),
    opportunityTitle: v.string(),
    contractID: v.optional(v.string()),
    issuingBody: v.object({
      name: v.string(),
      level: v.string(),
    }),
    location: v.object({
      city: v.optional(v.string()),
      county: v.optional(v.string()),
      region: v.string(),
    }),
    status: v.string(),
    estimatedValueUSD: v.optional(v.number()),
    keyDates: v.object({
      publishedDate: v.string(),
      bidDeadline: v.optional(v.string()),
      projectedStartDate: v.optional(v.string()),
    }),
    source: v.object({
      documentName: v.string(),
      url: v.string(),
    }),
    summary: v.string(),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    searchableText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("opportunities", {
      ...args,
      isActive: args.isActive ?? true,
      lastChecked: now,
      createdAt: now,
      updatedAt: now,
      metadata: {
        importedAt: now,
        dataType: "manual",
      },
    });
  },
});

// Update an existing opportunity
export const updateOpportunity = mutation({
  args: {
    id: v.id("opportunities"),
    opportunityType: v.optional(v.string()),
    opportunityTitle: v.optional(v.string()),
    contractID: v.optional(v.string()),
    issuingBody: v.optional(v.object({
      name: v.string(),
      level: v.string(),
    })),
    location: v.optional(v.object({
      city: v.optional(v.string()),
      county: v.optional(v.string()),
      region: v.string(),
    })),
    status: v.optional(v.string()),
    estimatedValueUSD: v.optional(v.number()),
    keyDates: v.optional(v.object({
      publishedDate: v.string(),
      bidDeadline: v.optional(v.string()),
      projectedStartDate: v.optional(v.string()),
    })),
    source: v.optional(v.object({
      documentName: v.string(),
      url: v.string(),
    })),
    summary: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    searchableText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });
  },
});

// Delete an opportunity
export const deleteOpportunity = mutation({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Bulk create opportunities from JSON data
export const bulkCreateOpportunities = mutation({
  args: {
    opportunities: v.array(v.object({
      opportunityType: v.string(),
      opportunityTitle: v.string(),
      contractID: v.optional(v.string()),
      issuingBody: v.object({
        name: v.string(),
        level: v.string(),
      }),
      location: v.object({
        city: v.optional(v.string()),
        county: v.optional(v.string()),
        region: v.string(),
      }),
      status: v.string(),
      estimatedValueUSD: v.optional(v.number()),
      keyDates: v.object({
        publishedDate: v.string(),
        bidDeadline: v.optional(v.string()),
        projectedStartDate: v.optional(v.string()),
      }),
      source: v.object({
        documentName: v.string(),
        url: v.string(),
      }),
      summary: v.string(),
    })),
    sourceFile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = [];
    
    for (const opportunity of args.opportunities) {
      // Auto-categorize based on content
      let category = "General";
      let subcategory = "General";
      
      const title = opportunity.opportunityTitle.toLowerCase();
      const summary = opportunity.summary.toLowerCase();
      
      if (title.includes("highway") || title.includes("interstate") || title.includes("road") || 
          summary.includes("highway") || summary.includes("road") || summary.includes("transportation")) {
        category = "Transportation";
        if (title.includes("i-") || title.includes("interstate")) {
          subcategory = "Highway";
        } else if (title.includes("transit") || summary.includes("transit")) {
          subcategory = "Transit";
        } else {
          subcategory = "Roadway";
        }
      } else if (title.includes("airport") || title.includes("aviation") || summary.includes("airport")) {
        category = "Aviation";
        subcategory = "Airport Infrastructure";
      } else if (title.includes("digital") || title.includes("kiosk") || title.includes("smart city") || 
                 summary.includes("digital") || summary.includes("kiosk") || summary.includes("its")) {
        category = "Digital Infrastructure";
        subcategory = "Smart City";
      } else if (title.includes("sewer") || title.includes("drainage") || title.includes("utility") || 
                 summary.includes("sewer") || summary.includes("drainage") || summary.includes("utility")) {
        category = "Infrastructure";
        subcategory = "Utilities";
      } else if (title.includes("construction") || summary.includes("construction")) {
        category = "Construction";
        subcategory = "General Construction";
      }
      
      // Create searchable text
      const searchableText = [
        opportunity.opportunityTitle,
        opportunity.issuingBody.name,
        opportunity.location.region,
        opportunity.status,
        opportunity.summary,
        category,
        subcategory,
        opportunity.contractID || "",
      ].join(" ").toLowerCase();
      
      const opportunityId = await ctx.db.insert("opportunities", {
        ...opportunity,
        category,
        subcategory,
        searchableText,
        isActive: true,
        lastChecked: now,
        createdAt: now,
        updatedAt: now,
        metadata: {
          sourceFile: args.sourceFile,
          importedAt: now,
          dataType: "bulk_import",
        },
      });
      results.push(opportunityId);
    }
    
    return results;
  },
});

// Mark opportunity as checked (update lastChecked timestamp)
export const markOpportunityAsChecked = mutation({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.patch(args.id, {
      lastChecked: now,
      updatedAt: now,
    });
  },
});

// Toggle opportunity active status
export const toggleOpportunityActive = mutation({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.id);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }
    
    const now = Date.now();
    return await ctx.db.patch(args.id, {
      isActive: !opportunity.isActive,
      updatedAt: now,
    });
  },
});

// Get all opportunities
export const getAllOpportunities = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("opportunities").order("desc").collect();
  },
});

// Get opportunities by opportunity type
export const getOpportunitiesByType = query({
  args: { opportunityType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opportunities")
      .withIndex("by_opportunity_type", (q) => q.eq("opportunityType", args.opportunityType))
      .order("desc")
      .collect();
  },
});

// Get opportunities by issuing body level
export const getOpportunitiesByIssuingLevel = query({
  args: { level: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opportunities")
      .withIndex("by_issuing_level", (q) => q.eq("issuingBody.level", args.level))
      .order("desc")
      .collect();
  },
});

// Get opportunities by region
export const getOpportunitiesByRegion = query({
  args: { region: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opportunities")
      .withIndex("by_region", (q) => q.eq("location.region", args.region))
      .order("desc")
      .collect();
  },
});

// Get opportunities by status
export const getOpportunitiesByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opportunities")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

// Get opportunities by category
export const getOpportunitiesByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opportunities")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("desc")
      .collect();
  },
});

// Get active opportunities only
export const getActiveOpportunities = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("opportunities")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();
  },
});

// Get opportunities by estimated value range
export const getOpportunitiesByValueRange = query({
  args: { 
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number())
  },
  handler: async (ctx, args): Promise<any[]> => {
    let query = ctx.db.query("opportunities");
    
    if (args.minValue !== undefined) {
      query = query.filter((q) => q.gte(q.field("estimatedValueUSD"), args.minValue!));
    }
    
    if (args.maxValue !== undefined) {
      query = query.filter((q) => q.lte(q.field("estimatedValueUSD"), args.maxValue!));
    }
    
    return await query.order("desc").collect();
  },
});

// Search opportunities by title, summary, or searchable text
export const searchOpportunities = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const allOpportunities = await ctx.db.query("opportunities").collect();
    
    return allOpportunities.filter(opportunity => 
      opportunity.opportunityTitle.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      opportunity.summary.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      (opportunity.searchableText && opportunity.searchableText.includes(args.searchTerm.toLowerCase())) ||
      opportunity.issuingBody.name.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      opportunity.location.region.toLowerCase().includes(args.searchTerm.toLowerCase())
    );
  },
});

// Get opportunity by ID
export const getOpportunityById = query({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get opportunities by multiple filters
export const getOpportunitiesByFilters = query({
  args: {
    opportunityType: v.optional(v.string()),
    issuingLevel: v.optional(v.string()),
    region: v.optional(v.string()),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    let opportunities: any[] = [];
    
    // Apply filters based on provided arguments
    if (args.opportunityType) {
      opportunities = await ctx.db.query("opportunities")
        .withIndex("by_opportunity_type", (q) => q.eq("opportunityType", args.opportunityType!))
        .order("desc")
        .collect();
    } else if (args.issuingLevel) {
      opportunities = await ctx.db.query("opportunities")
        .withIndex("by_issuing_level", (q) => q.eq("issuingBody.level", args.issuingLevel!))
        .order("desc")
        .collect();
    } else if (args.region) {
      opportunities = await ctx.db.query("opportunities")
        .withIndex("by_region", (q) => q.eq("location.region", args.region!))
        .order("desc")
        .collect();
    } else if (args.status) {
      opportunities = await ctx.db.query("opportunities")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.category) {
      opportunities = await ctx.db.query("opportunities")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .collect();
    } else if (args.isActive !== undefined) {
      opportunities = await ctx.db.query("opportunities")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!))
        .order("desc")
        .collect();
    } else {
      opportunities = await ctx.db.query("opportunities")
        .order("desc")
        .collect();
    }
    
    // Apply additional filters that don't have indexes
    if (args.minValue !== undefined) {
      opportunities = opportunities.filter((opp: any) => 
        opp.estimatedValueUSD && opp.estimatedValueUSD >= args.minValue!
      );
    }
    
    if (args.maxValue !== undefined) {
      opportunities = opportunities.filter((opp: any) => 
        opp.estimatedValueUSD && opp.estimatedValueUSD <= args.maxValue!
      );
    }
    
    return opportunities;
  },
});

// Get opportunities statistics
export const getOpportunitiesStats = query({
  args: {},
  handler: async (ctx) => {
    const allOpportunities = await ctx.db.query("opportunities").collect();
    
    const stats = {
      total: allOpportunities.length,
      active: allOpportunities.filter(opp => opp.isActive).length,
      inactive: allOpportunities.filter(opp => !opp.isActive).length,
      withValue: allOpportunities.filter(opp => opp.estimatedValueUSD).length,
      totalValue: allOpportunities.reduce((sum, opp) => sum + (opp.estimatedValueUSD || 0), 0),
      averageValue: 0,
      byOpportunityType: {} as Record<string, number>,
      byIssuingLevel: {} as Record<string, number>,
      byRegion: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    };
    
    // Calculate average value
    const opportunitiesWithValue = allOpportunities.filter(opp => opp.estimatedValueUSD);
    stats.averageValue = opportunitiesWithValue.length > 0 
      ? stats.totalValue / opportunitiesWithValue.length 
      : 0;
    
    // Count by opportunity type
    allOpportunities.forEach(opp => {
      stats.byOpportunityType[opp.opportunityType] = (stats.byOpportunityType[opp.opportunityType] || 0) + 1;
    });
    
    // Count by issuing level
    allOpportunities.forEach(opp => {
      stats.byIssuingLevel[opp.issuingBody.level] = (stats.byIssuingLevel[opp.issuingBody.level] || 0) + 1;
    });
    
    // Count by region
    allOpportunities.forEach(opp => {
      stats.byRegion[opp.location.region] = (stats.byRegion[opp.location.region] || 0) + 1;
    });
    
    // Count by status
    allOpportunities.forEach(opp => {
      stats.byStatus[opp.status] = (stats.byStatus[opp.status] || 0) + 1;
    });
    
    // Count by category
    allOpportunities.forEach(opp => {
      if (opp.category) {
        stats.byCategory[opp.category] = (stats.byCategory[opp.category] || 0) + 1;
      }
    });
    
    return stats;
  },
});
