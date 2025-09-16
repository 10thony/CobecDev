import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Action to import opportunities from JSON data
export const importOpportunitiesFromJson = action({
  args: {
    opportunitiesData: v.array(v.any()),
    sourceFile: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    importedCount: number;
    opportunityIds: any[];
  }> => {
    // Use the bulk create mutation
    const result: any[] = await ctx.runMutation(api.opportunities.bulkCreateOpportunities, {
      opportunities: args.opportunitiesData,
      sourceFile: args.sourceFile,
    });
    
    return {
      success: true,
      importedCount: result.length,
      opportunityIds: result,
    };
  },
});

// Action to clear all opportunities (useful for testing or reset)
export const clearAllOpportunities = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    deletedCount: number;
  }> => {
    const allOpportunities: any[] = await ctx.runQuery(api.opportunities.getAllOpportunities, {});
    
    for (const opportunity of allOpportunities) {
      await ctx.runMutation(api.opportunities.deleteOpportunity, { id: opportunity._id });
    }
    
    return {
      success: true,
      deletedCount: allOpportunities.length,
    };
  },
});

// Action to update opportunity embeddings (for future semantic search)
export const updateOpportunityEmbeddings = action({
  args: {
    opportunityIds: v.optional(v.array(v.id("opportunities"))),
    embeddingModel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    processedCount: number;
    message: string;
  }> => {
    // This is a placeholder for future embedding functionality
    // When you implement semantic search, you can use this action
    // to generate embeddings for opportunities
    
    const opportunities: any[] = args.opportunityIds 
      ? await Promise.all(args.opportunityIds.map((id: any) => ctx.runQuery(api.opportunities.getOpportunityById, { id })))
      : await ctx.runQuery(api.opportunities.getAllOpportunities, {});
    
    const validOpportunities: any[] = opportunities.filter((opp: any) => opp !== null);
    
    // TODO: Implement actual embedding generation
    // For now, just return the opportunities that would be processed
    return {
      success: true,
      processedCount: validOpportunities.length,
      message: "Embedding update not yet implemented",
    };
  },
});

// Action to export opportunities data
export const exportOpportunities = action({
  args: {
    filters: v.optional(v.any()),
    format: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    data: any;
    format: string;
    count: number;
  }> => {
    const opportunities = args.filters
      ? await ctx.runQuery(api.opportunities.getOpportunitiesByFilters, args.filters)
      : await ctx.runQuery(api.opportunities.getAllOpportunities, {});
    
    if (args.format === "csv") {
      // Convert to CSV format
      const headers = [
        "opportunityTitle", "opportunityType", "contractID", "issuingBody.name", 
        "issuingBody.level", "location.city", "location.county", "location.region", 
        "status", "estimatedValueUSD", "keyDates.publishedDate", "keyDates.bidDeadline", 
        "keyDates.projectedStartDate", "source.documentName", "source.url", 
        "summary", "category", "subcategory", "isActive"
      ];
      
      const csvRows = [
        headers.join(","),
        ...opportunities.map((opp: any) => 
          headers.map((header: string) => {
            const value = getNestedValue(opp, header);
            // Escape commas and quotes in CSV
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || "";
          }).join(",")
        )
      ];
      
      return {
        success: true,
        data: csvRows.join("\n"),
        format: "csv",
        count: opportunities.length,
      };
    }
    
    // Default to JSON format
    return {
      success: true,
      data: opportunities,
      format: "json",
      count: opportunities.length,
    };
  },
});

// Action to sync opportunities from external source (placeholder for future API integration)
export const syncOpportunitiesFromExternalSource = action({
  args: {
    sourceUrl: v.string(),
    sourceType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    sourceUrl: string;
    sourceType?: string;
  }> => {
    // This is a placeholder for future external API integration
    // You could implement fetching from external APIs here
    
    return {
      success: false,
      message: "External sync not yet implemented",
      sourceUrl: args.sourceUrl,
      sourceType: args.sourceType,
    };
  },
});

// Action to get opportunities analytics
export const getOpportunitiesAnalytics = action({
  args: {
    timeRange: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<any> => {
    const stats = await ctx.runQuery(api.opportunities.getOpportunitiesStats, {});
    const allOpportunities = await ctx.runQuery(api.opportunities.getAllOpportunities, {});
    
    // Filter by time range if provided
    let filteredOpportunities: any[] = allOpportunities;
    if (args.timeRange) {
      filteredOpportunities = allOpportunities.filter((opp: any) => 
        opp.createdAt >= args.timeRange!.startDate && 
        opp.createdAt <= args.timeRange!.endDate
      );
    }
    
    // Calculate additional analytics
    const analytics = {
      ...stats,
      timeRange: args.timeRange,
      filteredCount: filteredOpportunities.length,
      valueDistribution: calculateValueDistribution(filteredOpportunities),
      statusDistribution: calculateStatusDistribution(filteredOpportunities),
      regionDistribution: calculateRegionDistribution(filteredOpportunities),
      categoryDistribution: calculateCategoryDistribution(filteredOpportunities),
      topIssuingBodies: getTopIssuingBodies(filteredOpportunities),
      recentOpportunities: getRecentOpportunities(filteredOpportunities, 10),
    };
    
    return analytics;
  },
});

// Action to get opportunities by value range with detailed breakdown
export const getOpportunitiesByValueRange = action({
  args: {
    minValue: v.number(),
    maxValue: v.number(),
    includeBreakdown: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<any> => {
    const opportunities: any[] = await ctx.runQuery(api.opportunities.getOpportunitiesByValueRange, {
      minValue: args.minValue,
      maxValue: args.maxValue,
    });
    
    let breakdown: any = null;
    if (args.includeBreakdown) {
      breakdown = {
        byRegion: groupBy(opportunities, (opp: any) => opp.location.region),
        byCategory: groupBy(opportunities, (opp: any) => opp.category || "Uncategorized"),
        byStatus: groupBy(opportunities, (opp: any) => opp.status),
        byIssuingLevel: groupBy(opportunities, (opp: any) => opp.issuingBody.level),
      };
    }
    
    return {
      opportunities,
      count: opportunities.length,
      totalValue: opportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedValueUSD || 0), 0),
      averageValue: opportunities.length > 0 
        ? opportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedValueUSD || 0), 0) / opportunities.length 
        : 0,
      breakdown,
    };
  },
});

// Action to search opportunities with advanced filters
export const searchOpportunitiesAdvanced = action({
  args: {
    searchTerm: v.string(),
    filters: v.optional(v.any()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    // First get filtered opportunities
    const filteredOpportunities = args.filters
      ? await ctx.runQuery(api.opportunities.getOpportunitiesByFilters, args.filters)
      : await ctx.runQuery(api.opportunities.getAllOpportunities, {});
    
    // Then search within filtered results
    const searchResults = filteredOpportunities.filter((opp: any) => 
      opp.opportunityTitle.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      opp.summary.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      (opp.searchableText && opp.searchableText.includes(args.searchTerm.toLowerCase())) ||
      opp.issuingBody.name.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      opp.location.region.toLowerCase().includes(args.searchTerm.toLowerCase())
    );
    
    // Apply limit if specified
    const limitedResults = args.limit 
      ? searchResults.slice(0, args.limit)
      : searchResults;
    
    return {
      results: limitedResults,
      totalCount: searchResults.length,
      searchTerm: args.searchTerm,
      filters: args.filters,
    };
  },
});

// Helper function to get nested values from objects
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Helper function to calculate value distribution
function calculateValueDistribution(opportunities: any[]): Record<string, number> {
  const distribution: Record<string, number> = {
    "Under $1M": 0,
    "$1M - $10M": 0,
    "$10M - $50M": 0,
    "$50M - $100M": 0,
    "Over $100M": 0,
    "No Value": 0,
  };
  
  opportunities.forEach((opp: any) => {
    const value = opp.estimatedValueUSD;
    if (!value) {
      distribution["No Value"]++;
    } else if (value < 1000000) {
      distribution["Under $1M"]++;
    } else if (value < 10000000) {
      distribution["$1M - $10M"]++;
    } else if (value < 50000000) {
      distribution["$10M - $50M"]++;
    } else if (value < 100000000) {
      distribution["$50M - $100M"]++;
    } else {
      distribution["Over $100M"]++;
    }
  });
  
  return distribution;
}

// Helper function to calculate status distribution
function calculateStatusDistribution(opportunities: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  opportunities.forEach((opp: any) => {
    distribution[opp.status] = (distribution[opp.status] || 0) + 1;
  });
  return distribution;
}

// Helper function to calculate region distribution
function calculateRegionDistribution(opportunities: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  opportunities.forEach((opp: any) => {
    distribution[opp.location.region] = (distribution[opp.location.region] || 0) + 1;
  });
  return distribution;
}

// Helper function to calculate category distribution
function calculateCategoryDistribution(opportunities: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  opportunities.forEach((opp: any) => {
    const category = opp.category || "Uncategorized";
    distribution[category] = (distribution[category] || 0) + 1;
  });
  return distribution;
}

// Helper function to get top issuing bodies
function getTopIssuingBodies(opportunities: any[], limit: number = 10): Array<{name: string, count: number}> {
  const counts: Record<string, number> = {};
  opportunities.forEach((opp: any) => {
    counts[opp.issuingBody.name] = (counts[opp.issuingBody.name] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Helper function to get recent opportunities
function getRecentOpportunities(opportunities: any[], limit: number = 10): any[] {
  return opportunities
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

// Helper function to group array by key
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
