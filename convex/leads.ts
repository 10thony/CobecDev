import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new lead
export const createLead = mutation({
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
      publishedDate: v.optional(v.string()),
      bidDeadline: v.optional(v.string()),
      projectedStartDate: v.optional(v.string()),
    }),
    source: v.object({
      documentName: v.string(),
      url: v.string(),
    }),
    contacts: v.array(v.object({
      name: v.optional(v.string()),
      title: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      url: v.optional(v.string()),
    })),
    summary: v.string(),
    verificationStatus: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    searchableText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("leads", {
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

// Update an existing lead
export const updateLead = mutation({
  args: {
    id: v.id("leads"),
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
      publishedDate: v.optional(v.string()),
      bidDeadline: v.optional(v.string()),
      projectedStartDate: v.optional(v.string()),
    })),
    source: v.optional(v.object({
      documentName: v.string(),
      url: v.string(),
    })),
    contacts: v.optional(v.array(v.object({
      name: v.optional(v.string()),
      title: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      url: v.optional(v.string()),
    }))),
    summary: v.optional(v.string()),
    verificationStatus: v.optional(v.string()),
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

// Delete a lead
export const deleteLead = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Bulk create leads from JSON data
export const bulkCreateLeads = mutation({
  args: {
    leads: v.array(v.any()), // Use v.any() to allow dynamic fields
    sourceFile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = [];
    
    for (const lead of args.leads) {
      // Ensure required fields are present with defaults
      const processedLead = {
        opportunityType: lead.opportunityType || "Unknown",
        opportunityTitle: lead.opportunityTitle || "Untitled Opportunity",
        contractID: lead.contractID || undefined,
        issuingBody: {
          name: lead.issuingBody?.name || "Unknown Organization",
          level: lead.issuingBody?.level || "Unknown",
        },
        location: {
          city: lead.location?.city || undefined,
          county: lead.location?.county || undefined,
          region: lead.location?.region || "Unknown",
        },
        status: lead.status || "Unknown",
        estimatedValueUSD: lead.estimatedValueUSD || undefined,
        keyDates: {
          publishedDate: lead.keyDates?.publishedDate || undefined,
          bidDeadline: lead.keyDates?.bidDeadline || undefined,
          projectedStartDate: lead.keyDates?.projectedStartDate || undefined,
        },
        source: {
          documentName: lead.source?.documentName || "Unknown Document",
          url: lead.source?.url || "",
        },
        contacts: Array.isArray(lead.contacts) ? lead.contacts : [],
        summary: lead.summary || "No summary available",
        verificationStatus: lead.verificationStatus || undefined,
        category: lead.category || undefined,
        subcategory: lead.subcategory || undefined,
        searchableText: lead.searchableText || "",
        isActive: lead.isActive !== undefined ? lead.isActive : true,
        lastChecked: now,
        // Include adHoc field if present
        adHoc: lead.adHoc || undefined,
        // Include any other dynamic fields
        ...Object.fromEntries(
          Object.entries(lead).filter(([key]) => 
            !['opportunityType', 'opportunityTitle', 'contractID', 'issuingBody', 
              'location', 'status', 'estimatedValueUSD', 'keyDates', 'source', 
              'contacts', 'summary', 'verificationStatus', 'category', 'subcategory', 
              'searchableText', 'isActive', 'adHoc'].includes(key)
          )
        ),
        createdAt: now,
        updatedAt: now,
        metadata: {
          sourceFile: args.sourceFile,
          importedAt: now,
          dataType: "bulk_import",
        },
      };

      const leadId = await ctx.db.insert("leads", processedLead);
      results.push(leadId);
    }
    
    return results;
  },
});

// Mark lead as checked (update lastChecked timestamp)
export const markLeadAsChecked = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.patch(args.id, {
      lastChecked: now,
      updatedAt: now,
    });
  },
});

// Toggle lead active status
export const toggleLeadActive = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) {
      throw new Error("Lead not found");
    }
    
    const now = Date.now();
    return await ctx.db.patch(args.id, {
      isActive: !lead.isActive,
      updatedAt: now,
    });
  },
});

// Get all leads
export const getAllLeads = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("leads").order("desc").collect();
  },
});

// Get leads by issuing body level
export const getLeadsByLevel = query({
  args: { level: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_issuing_level", (q) => q.eq("issuingBody.level", args.level))
      .order("desc")
      .collect();
  },
});

// Get leads by category
export const getLeadsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("desc")
      .collect();
  },
});

// Get leads by region
export const getLeadsByRegion = query({
  args: { region: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_region", (q) => q.eq("location.region", args.region))
      .order("desc")
      .collect();
  },
});

// Get active leads only
export const getActiveLeads = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();
  },
});

// Get leads by opportunity type
export const getLeadsByOpportunityType = query({
  args: { opportunityType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_opportunity_type", (q) => q.eq("opportunityType", args.opportunityType))
      .order("desc")
      .collect();
  },
});

// Get leads by status
export const getLeadsByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

// Get leads by verification status
export const getLeadsByVerificationStatus = query({
  args: { verificationStatus: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_verification_status", (q) => q.eq("verificationStatus", args.verificationStatus))
      .order("desc")
      .collect();
  },
});

// Search leads by title, summary, or searchable text
export const searchLeads = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const allLeads = await ctx.db.query("leads").collect();
    
    return allLeads.filter(lead => 
      lead.opportunityTitle.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      lead.summary.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      (lead.searchableText && lead.searchableText.toLowerCase().includes(args.searchTerm.toLowerCase()))
    );
  },
});

// Get lead by ID
export const getLeadById = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get leads by multiple filters
export const getLeadsByFilters = query({
  args: {
    level: v.optional(v.string()),
    category: v.optional(v.string()),
    region: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    opportunityType: v.optional(v.string()),
    status: v.optional(v.string()),
    verificationStatus: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    let leads: any[] = [];
    
    // Apply filters based on provided arguments
    if (args.level) {
      leads = await ctx.db.query("leads")
        .withIndex("by_issuing_level", (q) => q.eq("issuingBody.level", args.level!))
        .order("desc")
        .collect();
    } else if (args.category) {
      leads = await ctx.db.query("leads")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .collect();
    } else if (args.region) {
      leads = await ctx.db.query("leads")
        .withIndex("by_region", (q) => q.eq("location.region", args.region!))
        .order("desc")
        .collect();
    } else if (args.isActive !== undefined) {
      leads = await ctx.db.query("leads")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!))
        .order("desc")
        .collect();
    } else if (args.opportunityType) {
      leads = await ctx.db.query("leads")
        .withIndex("by_opportunity_type", (q) => q.eq("opportunityType", args.opportunityType!))
        .order("desc")
        .collect();
     } else if (args.status) {
       leads = await ctx.db.query("leads")
         .withIndex("by_status", (q) => q.eq("status", args.status!))
         .order("desc")
         .collect();
     } else if (args.verificationStatus) {
       leads = await ctx.db.query("leads")
         .withIndex("by_verification_status", (q) => q.eq("verificationStatus", args.verificationStatus!))
         .order("desc")
         .collect();
     } else {
       leads = await ctx.db.query("leads")
         .order("desc")
         .collect();
     }
    
    return leads;
  },
});

// Get leads statistics
export const getLeadsStats = query({
  args: {},
  handler: async (ctx) => {
    const allLeads = await ctx.db.query("leads").collect();
    
    const stats = {
      total: allLeads.length,
      active: allLeads.filter(lead => lead.isActive).length,
      inactive: allLeads.filter(lead => !lead.isActive).length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byRegion: {} as Record<string, number>,
      byOpportunityType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byVerificationStatus: {} as Record<string, number>,
    };
    
    // Helper function to sanitize field names for use as object keys
    const sanitizeFieldName = (name: string): string => {
      return name.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    };

    // Store original names for display purposes
    const originalNames: Record<string, string> = {};

    // Count by issuing body level
    allLeads.forEach(lead => {
      const originalLevel = lead.issuingBody.level;
      const sanitizedLevel = sanitizeFieldName(originalLevel);
      originalNames[sanitizedLevel] = originalLevel;
      stats.byLevel[sanitizedLevel] = (stats.byLevel[sanitizedLevel] || 0) + 1;
    });
    
    // Count by category
    allLeads.forEach(lead => {
      if (lead.category) {
        const originalCategory = lead.category;
        const sanitizedCategory = sanitizeFieldName(originalCategory);
        originalNames[sanitizedCategory] = originalCategory;
        stats.byCategory[sanitizedCategory] = (stats.byCategory[sanitizedCategory] || 0) + 1;
      }
    });
    
    // Count by region
    allLeads.forEach(lead => {
      const originalRegion = lead.location.region;
      const sanitizedRegion = sanitizeFieldName(originalRegion);
      originalNames[sanitizedRegion] = originalRegion;
      stats.byRegion[sanitizedRegion] = (stats.byRegion[sanitizedRegion] || 0) + 1;
    });
    
    // Count by opportunity type
    allLeads.forEach(lead => {
      const originalType = lead.opportunityType;
      const sanitizedType = sanitizeFieldName(originalType);
      originalNames[sanitizedType] = originalType;
      stats.byOpportunityType[sanitizedType] = (stats.byOpportunityType[sanitizedType] || 0) + 1;
    });
    
    // Count by status
    allLeads.forEach(lead => {
      const originalStatus = lead.status;
      const sanitizedStatus = sanitizeFieldName(originalStatus);
      originalNames[sanitizedStatus] = originalStatus;
      stats.byStatus[sanitizedStatus] = (stats.byStatus[sanitizedStatus] || 0) + 1;
    });
    
    // Count by verification status
    allLeads.forEach(lead => {
      if (lead.verificationStatus) {
        const originalVerificationStatus = lead.verificationStatus;
        const sanitizedVerificationStatus = sanitizeFieldName(originalVerificationStatus);
        originalNames[sanitizedVerificationStatus] = originalVerificationStatus;
        stats.byVerificationStatus[sanitizedVerificationStatus] = (stats.byVerificationStatus[sanitizedVerificationStatus] || 0) + 1;
      }
    });
    
    return {
      ...stats,
      originalNames, // Include mapping of sanitized names to original names for display
    };
  },
});
