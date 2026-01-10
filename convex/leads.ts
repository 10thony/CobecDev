import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

// Get total count of leads (lightweight - only fetches IDs)
export const getLeadsCount = query({
  args: {},
  handler: async (ctx) => {
    // Use the by_creation index to efficiently count
    // We only need to know if there are any leads, so we can use take(1) and check
    // For an actual count, we'll use a more efficient approach
    const allLeads = await ctx.db.query("leads").collect();
    return allLeads.length;
  },
});

// Get leads with pagination for progressive loading
// Optimized to use by_creation index for better performance
// This loads leads in chunks to improve initial page load time
export const getLeadsPaginated = query({
  args: {
    limit: v.number(),
    lastCreatedAt: v.optional(v.number()), // Use createdAt for cursor instead of _id
    lastId: v.optional(v.id("leads")), // Keep for backward compatibility
    includeTotal: v.optional(v.boolean()), // Optionally include total count
  },
  handler: async (ctx, args) => {
    const limit = args.limit;
    
    // Use by_creation index for efficient ordering
    let query = ctx.db
      .query("leads")
      .withIndex("by_creation")
      .order("desc");
    
    // Cursor-based pagination using createdAt (more efficient than _id)
    // Support both new createdAt-based and old _id-based pagination for compatibility
    let leads;
    if (args.lastCreatedAt !== undefined) {
      // New approach: use createdAt for cursor
      leads = await query
        .filter(q => q.lt(q.field("createdAt"), args.lastCreatedAt!))
        .take(limit);
    } else if (args.lastId !== undefined) {
      // Legacy approach: get the lead first to find its createdAt
      const lastLead = await ctx.db.get(args.lastId);
      if (lastLead) {
        leads = await query
          .filter(q => q.lt(q.field("createdAt"), lastLead.createdAt))
          .take(limit);
      } else {
        // If lastId not found, start from beginning
        leads = await query.take(limit);
      }
    } else {
      // First batch: just take the limit
      leads = await query.take(limit);
    }
    
    const lastId = leads.length > 0 ? leads[leads.length - 1]._id : undefined;
    const lastCreatedAt = leads.length > 0 ? leads[leads.length - 1].createdAt : undefined;
    
    // Only get total count if explicitly requested (to avoid expensive operation)
    let total: number | undefined = undefined;
    if (args.includeTotal && args.lastCreatedAt === undefined && args.lastId === undefined) {
      // Only calculate total on first batch if requested
      // This is still expensive but only done once when needed
      const allLeads = await ctx.db.query("leads").collect();
      total = allLeads.length;
    }
    
    // Determine if there are more leads based on batch size
    // If we got a full batch, there might be more
    const hasMore = leads.length === limit;
    
    return {
      leads,
      hasMore,
      total,
      lastId,
      lastCreatedAt, // Return for next pagination call
    };
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

// Internal mutation to clear embeddings for a single lead (called by action)
export const clearLeadEmbedding = internalMutation({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.leadId, {
      embedding: undefined,
      embeddingModel: undefined,
      embeddingGeneratedAt: undefined,
      updatedAt: now,
    });
    return { success: true };
  },
});

// Action to clear all embedding data from leads table
// Uses the by_embedding_generated index to find leads with embeddings
// Patches each lead directly without reading the full document
// Designed to run in smaller batches to avoid timeout (600s limit)
export const clearAllEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()), // Batch size for getting IDs (default: 100)
    maxBatches: v.optional(v.number()), // Maximum number of batches to process (default: 10)
    lastEmbeddingGeneratedAt: v.optional(v.number()), // For pagination
    lastModelIndexId: v.optional(v.id("leads")), // For pagination on model index
    skipModelIndex: v.optional(v.boolean()), // Skip the model index check (for faster processing)
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    const maxBatches = args.maxBatches ?? 10; // Process max 10 batches per call to avoid timeout
    let clearedCount = 0;
    let processedCount = 0;
    let errorCount = 0;
    let lastEmbeddingGeneratedAt = args.lastEmbeddingGeneratedAt;
    let lastModelIndexId = args.lastModelIndexId;
    const errors: string[] = [];
    let hasMoreEmbeddingGenerated = true;
    let batchCount = 0;
    const startTime = Date.now();
    const maxDuration = 550000; // 550 seconds - leave 50s buffer before 600s timeout
    
    // Process leads in batches using the by_embedding_generated index
    while (hasMoreEmbeddingGenerated && batchCount < maxBatches) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > maxDuration) {
        errors.push(`Approaching timeout, stopping early. Processed ${batchCount} batches.`);
        break;
      }
      
      try {
        // Get a batch of lead IDs that have embeddings (using the index)
        const leadData = await ctx.runQuery(internal.leads.getLeadIdsWithEmbeddings, {
          limit: batchSize,
          lastEmbeddingGeneratedAt: lastEmbeddingGeneratedAt ?? undefined,
        });
        
        if (!leadData || leadData.length === 0) {
          hasMoreEmbeddingGenerated = false;
          break;
        }
        
        // Process each lead ID - patch directly without reading the document
        for (const { id, embeddingGeneratedAt } of leadData) {
          try {
            // Patch the lead directly - this doesn't require reading the document
            await ctx.runMutation(internal.leads.clearLeadEmbedding, { leadId: id });
            clearedCount++;
            processedCount++;
            lastEmbeddingGeneratedAt = embeddingGeneratedAt;
          } catch (error) {
            // If patching fails, log and continue
            errorCount++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(`Failed to patch lead ${id}: ${errorMsg}`);
            if (errors.length > 10) errors.shift();
            processedCount++;
          }
        }
        
        batchCount++;
        
        // If we got fewer than batchSize, we've reached the end
        if (leadData.length < batchSize) {
          hasMoreEmbeddingGenerated = false;
        }
      } catch (error) {
        // If query fails (e.g., byte limit), try smaller batch or stop
        const errorMsg = error instanceof Error ? error.message : String(error);
        errorCount++;
        errors.push(`Query error: ${errorMsg}`);
        if (errors.length > 10) errors.shift();
        hasMoreEmbeddingGenerated = false;
      }
    }
    
    // Also check by_embedding_model index for any leads we might have missed
    // Only if we haven't skipped it and haven't hit timeout
    let modelIndexHasMore = false;
    if (!args.skipModelIndex && (Date.now() - startTime < maxDuration)) {
      modelIndexHasMore = true;
      let modelBatchCount = 0;
      const maxModelBatches = 5; // Limit model index batches too
      
      while (modelIndexHasMore && modelBatchCount < maxModelBatches && processedCount < 10000) {
        // Check timeout again
        if (Date.now() - startTime > maxDuration) {
          break;
        }
        
        try {
          const leadIds = await ctx.runQuery(internal.leads.getLeadIdsWithEmbeddingModel, {
            limit: batchSize,
            lastId: lastModelIndexId,
          });
          
          if (!leadIds || leadIds.length === 0) {
            modelIndexHasMore = false;
            break;
          }
          
          for (const leadId of leadIds) {
            try {
              await ctx.runMutation(internal.leads.clearLeadEmbedding, { leadId });
              clearedCount++;
              processedCount++;
              lastModelIndexId = leadId;
            } catch (error) {
              errorCount++;
              processedCount++;
              lastModelIndexId = leadId;
            }
          }
          
          modelBatchCount++;
          
          if (leadIds.length < batchSize) {
            modelIndexHasMore = false;
          }
        } catch (error) {
          modelIndexHasMore = false;
        }
      }
    }
    
    const hasMore = hasMoreEmbeddingGenerated || modelIndexHasMore;
    const duration = Date.now() - startTime;
    
    return {
      processedCount,
      clearedCount,
      errorCount,
      batchesProcessed: batchCount,
      lastEmbeddingGeneratedAt,
      lastModelIndexId,
      hasMore,
      durationMs: duration,
      errors: errors.length > 0 ? errors : undefined,
      message: `Cleared embedding data from ${clearedCount} lead(s) in ${batchCount} batch(es)${hasMore ? ' (more remaining - run again to continue)' : ' (complete)'}${errorCount > 0 ? ` (${errorCount} errors)` : ''}`,
    };
  },
});

// Internal query to get batch of lead IDs with embeddings using the index
// Returns just IDs, even though documents are loaded (we extract IDs immediately)
export const getLeadIdsWithEmbeddings = internalQuery({
  args: {
    limit: v.number(),
    lastEmbeddingGeneratedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Use by_embedding_generated index - if a document has this field, it has embedding data
      let query = ctx.db
        .query("leads")
        .withIndex("by_embedding_generated");
      
      // If we have a last timestamp, filter to get next batch
      if (args.lastEmbeddingGeneratedAt !== undefined) {
        query = query.filter(q => q.gt(q.field("embeddingGeneratedAt"), args.lastEmbeddingGeneratedAt!));
      }
      
      const leads = await query.order("asc").take(args.limit);
      
      // Extract just the IDs and timestamps (minimal data)
      return leads.map(lead => ({
        id: lead._id,
        embeddingGeneratedAt: lead.embeddingGeneratedAt,
      }));
    } catch (error) {
      // If query fails due to byte limit, return empty array
      // The action will handle this by processing in smaller batches
      return [];
    }
  },
});

// Internal query to also check by_embedding_model index for leads that might have embeddings
export const getLeadIdsWithEmbeddingModel = internalQuery({
  args: {
    limit: v.number(),
    lastId: v.optional(v.id("leads")),
  },
  handler: async (ctx, args) => {
    try {
      const lastId = args.lastId;
      let query = ctx.db
        .query("leads")
        .withIndex("by_embedding_model");
      
      if (lastId !== undefined) {
        query = query.filter(q => q.gt(q.field("_id"), lastId));
      }
      
      const leads = await query.order("asc").take(args.limit);
      
      // Extract just the IDs
      return leads.map(lead => lead._id);
    } catch (error) {
      return [];
    }
  },
});

