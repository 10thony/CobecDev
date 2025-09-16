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
    leads: v.array(v.object({
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
      searchableText: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    })),
    sourceFile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = [];
    
    for (const lead of args.leads) {
      const leadId = await ctx.db.insert("leads", {
        ...lead,
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
    
    // Count by issuing body level
    allLeads.forEach(lead => {
      stats.byLevel[lead.issuingBody.level] = (stats.byLevel[lead.issuingBody.level] || 0) + 1;
    });
    
    // Count by category
    allLeads.forEach(lead => {
      if (lead.category) {
        stats.byCategory[lead.category] = (stats.byCategory[lead.category] || 0) + 1;
      }
    });
    
    // Count by region
    allLeads.forEach(lead => {
      stats.byRegion[lead.location.region] = (stats.byRegion[lead.location.region] || 0) + 1;
    });
    
    // Count by opportunity type
    allLeads.forEach(lead => {
      stats.byOpportunityType[lead.opportunityType] = (stats.byOpportunityType[lead.opportunityType] || 0) + 1;
    });
    
    // Count by status
    allLeads.forEach(lead => {
      stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
    });
    
    // Count by verification status
    allLeads.forEach(lead => {
      if (lead.verificationStatus) {
        // Sanitize the verification status to avoid special characters in object keys
        const sanitizedStatus = lead.verificationStatus.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        stats.byVerificationStatus[sanitizedStatus] = (stats.byVerificationStatus[sanitizedStatus] || 0) + 1;
      }
    });
    
    return stats;
  },
});
