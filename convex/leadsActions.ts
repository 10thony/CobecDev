import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Action to import leads from JSON data (generic - handles both old and new formats)
export const importLeadsFromJson = action({
  args: {
    leadsData: v.array(v.any()),
    sourceFile: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Check if this is the new Texas leads format (has opportunities array)
    if (args.leadsData.length > 0 && args.leadsData[0].opportunities) {
      // This is the new format - extract the opportunities array
      const opportunities = args.leadsData[0].opportunities;
      return await ctx.runAction(api.leadsActions.importTexasLeadsFromJson, {
        leadsData: opportunities,
        sourceFile: args.sourceFile,
      });
    }
    
    // Process the leads data to add additional fields (legacy format)
    const processedLeads = args.leadsData.map((lead: any, index: number) => {
      // Handle null values by converting to undefined
      const cleanLead = {
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
        contacts: (lead.contacts || []).map((contact: any) => ({
          name: contact.name === null ? undefined : (contact.name || undefined),
          title: contact.title || "Unknown Title",
          email: contact.email === null ? undefined : (contact.email || undefined),
          phone: contact.phone === null ? undefined : (contact.phone || undefined),
          url: contact.url === null ? undefined : (contact.url || undefined),
        })),
        summary: lead.summary || "No summary available",
        verificationStatus: lead.verificationStatus || undefined,
        category: lead.category || undefined,
        subcategory: lead.subcategory || undefined,
      };
      
      // Create searchable text
      const searchableText = [
        cleanLead.opportunityTitle,
        cleanLead.summary,
        cleanLead.issuingBody.name,
        cleanLead.location.region,
        cleanLead.status,
        cleanLead.opportunityType,
        cleanLead.contractID || '',
      ].join(" ").toLowerCase();
      
      return {
        ...cleanLead,
        searchableText,
        isActive: true,
      };
    });
    
    // Use the bulk create mutation
    const result = await ctx.runMutation(api.leads.bulkCreateLeads, {
      leads: processedLeads,
      sourceFile: args.sourceFile,
    });
    
    return {
      success: true,
      importedCount: result.length,
      leadIds: result,
    };
  },
});

// Action to clear all leads (useful for testing or reset)
export const clearAllLeads = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    deletedCount: number;
  }> => {
    const allLeads: any[] = await ctx.runQuery(api.leads.getAllLeads, {});
    
    for (const lead of allLeads) {
      await ctx.runMutation(api.leads.deleteLead, { id: lead._id });
    }
    
    return {
      success: true,
      deletedCount: allLeads.length,
    };
  },
});

// Action to update lead embeddings (for future semantic search)
export const updateLeadEmbeddings = action({
  args: {
    leadIds: v.optional(v.array(v.id("leads"))),
    embeddingModel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    processedCount: number;
    message: string;
  }> => {
    // This is a placeholder for future embedding functionality
    // When you implement semantic search, you can use this action
    // to generate embeddings for leads
    
    const leads: any[] = args.leadIds 
      ? await Promise.all(args.leadIds.map((id: any) => ctx.runQuery(api.leads.getLeadById, { id })))
      : await ctx.runQuery(api.leads.getAllLeads, {});
    
    const validLeads: any[] = leads.filter((lead: any) => lead !== null);
    
    // TODO: Implement actual embedding generation
    // For now, just return the leads that would be processed
    return {
      success: true,
      processedCount: validLeads.length,
      message: "Embedding update not yet implemented",
    };
  },
});

// Action to export leads data
export const exportLeads = action({
  args: {
    filters: v.optional(v.any()),
    format: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const leads: any[] = args.filters
      ? await ctx.runQuery(api.leads.getLeadsByFilters, args.filters)
      : await ctx.runQuery(api.leads.getAllLeads, {});
    
    if (args.format === "csv") {
      // Convert to CSV format
      const headers = ["name", "url", "level", "updateFrequency", "keywordDateFilteringAvailable", "category", "region", "isActive"];
      const csvRows: string[] = [
        headers.join(","),
        ...leads.map((lead: any) => 
          headers.map((header: string) => {
            const value = lead[header as keyof typeof lead];
            // Escape commas and quotes in CSV
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(",")
        )
      ];
      
      return {
        success: true,
        data: csvRows.join("\n"),
        format: "csv",
        count: leads.length,
      };
    }
    
    // Default to JSON format
    return {
      success: true,
      data: leads,
      format: "json",
      count: leads.length,
    };
  },
});

// Action to sync leads from external source (placeholder for future API integration)
export const syncLeadsFromExternalSource = action({
  args: {
    sourceUrl: v.string(),
    sourceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

// Action to get leads analytics
export const getLeadsAnalytics = action({
  args: {
    timeRange: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<any> => {
    const stats: any = await ctx.runQuery(api.leads.getLeadsStats, {});
    const allLeads: any[] = await ctx.runQuery(api.leads.getAllLeads, {});
    
    // Filter by time range if provided
    let filteredLeads: any[] = allLeads;
    if (args.timeRange) {
      filteredLeads = allLeads.filter((lead: any) => 
        lead.createdAt >= args.timeRange!.startDate && 
        lead.createdAt <= args.timeRange!.endDate
      );
    }
    
    // Calculate additional analytics
    const analytics: any = {
      ...stats,
      timeRange: args.timeRange,
      filteredCount: filteredLeads.length,
      averageUpdateFrequency: calculateAverageUpdateFrequency(filteredLeads),
      mostCommonLevel: getMostCommonValue(filteredLeads, "level"),
      mostCommonCategory: getMostCommonValue(filteredLeads, "category"),
      mostCommonRegion: getMostCommonValue(filteredLeads, "region"),
    };
    
    return analytics;
  },
});

// Action to bulk update leads
export const bulkUpdateLeads = action({
  args: {
    leadIds: v.array(v.id("leads")),
    updates: v.any(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    updatedCount: number;
    errors: string[];
  }> => {
    const errors: string[] = [];
    let updatedCount = 0;
    
    for (const leadId of args.leadIds) {
      try {
        await ctx.runMutation(api.leads.updateLead, {
          id: leadId,
          ...args.updates,
        });
        updatedCount++;
      } catch (error) {
        errors.push(`Failed to update lead ${leadId}: ${error}`);
      }
    }
    
    return {
      success: errors.length === 0,
      updatedCount,
      errors,
    };
  },
});

// Action to bulk delete leads
export const bulkDeleteLeads = action({
  args: {
    leadIds: v.array(v.id("leads")),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    deletedCount: number;
    errors: string[];
  }> => {
    const errors: string[] = [];
    let deletedCount = 0;
    
    for (const leadId of args.leadIds) {
      try {
        await ctx.runMutation(api.leads.deleteLead, { id: leadId });
        deletedCount++;
      } catch (error) {
        errors.push(`Failed to delete lead ${leadId}: ${error}`);
      }
    }
    
    return {
      success: errors.length === 0,
      deletedCount,
      errors,
    };
  },
});

// Action to bulk toggle active status
export const bulkToggleActiveStatus = action({
  args: {
    leadIds: v.array(v.id("leads")),
    isActive: v.boolean(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    updatedCount: number;
    errors: string[];
  }> => {
    const errors: string[] = [];
    let updatedCount = 0;
    
    for (const leadId of args.leadIds) {
      try {
        await ctx.runMutation(api.leads.updateLead, {
          id: leadId,
          isActive: args.isActive,
        });
        updatedCount++;
      } catch (error) {
        errors.push(`Failed to update lead ${leadId}: ${error}`);
      }
    }
    
    return {
      success: errors.length === 0,
      updatedCount,
      errors,
    };
  },
});

// Action to import leads from Texas leads JSON
export const importTexasLeadsFromJson = action({
  args: {
    leadsData: v.array(v.any()),
    sourceFile: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    importedCount: number;
    leadIds: any[];
  }> => {
    // Process the Texas leads data to match our schema
    const processedLeads = args.leadsData.map((lead: any, index: number) => {
      // Handle null values by converting to undefined
      const cleanLead = {
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
        contacts: (lead.contacts || []).map((contact: any) => ({
          name: contact.name === null ? undefined : (contact.name || undefined),
          title: contact.title || "Unknown Title",
          email: contact.email === null ? undefined : (contact.email || undefined),
          phone: contact.phone === null ? undefined : (contact.phone || undefined),
          url: contact.url === null ? undefined : (contact.url || undefined),
        })),
        summary: lead.summary || "No summary available",
        verificationStatus: lead.verificationStatus || undefined,
        category: lead.category || undefined,
        subcategory: lead.subcategory || undefined,
      };
      
      // Create searchable text
      const searchableText = [
        cleanLead.opportunityTitle,
        cleanLead.summary,
        cleanLead.issuingBody.name,
        cleanLead.location.region,
        cleanLead.status,
        cleanLead.opportunityType,
        cleanLead.contractID || '',
      ].join(" ").toLowerCase();
      
      return {
        ...cleanLead,
        searchableText,
        isActive: true,
      };
    });
    
    // Use the bulk create mutation
    const result = await ctx.runMutation(api.leads.bulkCreateLeads, {
      leads: processedLeads,
      sourceFile: args.sourceFile,
    });
    
    return {
      success: true,
      importedCount: result.length,
      leadIds: result,
    };
  },
});

// Helper function to calculate average update frequency
function calculateAverageUpdateFrequency(leads: any[]): string {
  const frequencies = leads.map(lead => lead.updateFrequency);
  const frequencyCounts: Record<string, number> = {};
  
  frequencies.forEach(freq => {
    frequencyCounts[freq] = (frequencyCounts[freq] || 0) + 1;
  });
  
  const mostCommon = Object.entries(frequencyCounts)
    .sort(([,a], [,b]) => b - a)[0];
  
  return mostCommon ? mostCommon[0] : "Unknown";
}

// Action for dynamic JSON import with schema evolution
export const importJsonWithSchemaEvolution = action({
  args: {
    jsonData: v.array(v.any()),
    sourceFile: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    importedCount: number;
    leadIds: any[];
    schemaChanges: string[];
  }> => {
    const schemaChanges: string[] = [];
    
    if (!args.jsonData || args.jsonData.length === 0) {
      throw new Error("No data provided for import");
    }

    // Get expected schema fields from the first item in the current database
    const existingLeads = await ctx.runQuery(api.leads.getAllLeads, {});
    let expectedFields: Set<string> = new Set();
    
    if (existingLeads.length > 0) {
      expectedFields = new Set(Object.keys(existingLeads[0]));
    } else {
      // Default schema fields if no existing leads
      expectedFields = new Set([
        'opportunityType', 'opportunityTitle', 'contractID', 'issuingBody',
        'location', 'status', 'estimatedValueUSD', 'keyDates', 'source',
        'contacts', 'summary', 'verificationStatus', 'category', 'subcategory'
      ]);
    }

    // Analyze incoming data structure
    const incomingFields = new Set<string>();
    args.jsonData.forEach(item => {
      Object.keys(item).forEach(key => incomingFields.add(key));
    });

    // Check for missing or new fields
    const missingFields = Array.from(expectedFields).filter(field => !incomingFields.has(field));
    const newFields = Array.from(incomingFields).filter(field => !expectedFields.has(field));

    if (newFields.length > 0) {
      schemaChanges.push(`New fields detected: ${newFields.join(', ')}`);
    }

    // Helper function to sanitize field names for use as object keys
    const sanitizeFieldName = (name: string): string => {
      if (!name || typeof name !== 'string') return name;
      return name.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    };

    // Process and normalize the data
    const processedLeads = args.jsonData.map((lead: any, index: number) => {
      const cleanLead: any = {};

      // Handle core required fields with defaults (sanitize text fields that might be used as keys)
      cleanLead.opportunityType = lead.opportunityType || "Unknown";
      cleanLead.opportunityTitle = lead.opportunityTitle || "Untitled Opportunity";
      cleanLead.contractID = lead.contractID || undefined;
      
      // Handle nested objects with proper structure
      cleanLead.issuingBody = {
        name: lead.issuingBody?.name || "Unknown Organization",
        level: lead.issuingBody?.level || "Unknown",
      };
      
      cleanLead.location = {
        city: lead.location?.city || undefined,
        county: lead.location?.county || undefined,
        region: lead.location?.region || "Unknown",
      };
      
      cleanLead.status = lead.status || "Unknown";
      cleanLead.estimatedValueUSD = lead.estimatedValueUSD || undefined;
      
      cleanLead.keyDates = {
        publishedDate: lead.keyDates?.publishedDate || undefined,
        bidDeadline: lead.keyDates?.bidDeadline || undefined,
        projectedStartDate: lead.keyDates?.projectedStartDate || undefined,
      };
      
      cleanLead.source = {
        documentName: lead.source?.documentName || "Unknown Document",
        url: lead.source?.url || "",
      };
      
      // Handle contacts array
      cleanLead.contacts = Array.isArray(lead.contacts) 
        ? lead.contacts.map((contact: any) => ({
            name: contact.name === null ? undefined : (contact.name || undefined),
            title: contact.title || "Unknown Title",
            email: contact.email === null ? undefined : (contact.email || undefined),
            phone: contact.phone === null ? undefined : (contact.phone || undefined),
            url: contact.url === null ? undefined : (contact.url || undefined),
          }))
        : [];
      
      cleanLead.summary = lead.summary || "No summary available";
      cleanLead.verificationStatus = lead.verificationStatus || undefined;
      cleanLead.category = lead.category || undefined;
      cleanLead.subcategory = lead.subcategory || undefined;

      // Handle any additional fields from the imported data
      newFields.forEach(field => {
        if (lead[field] !== undefined) {
          cleanLead[field] = lead[field];
        }
      });

      // Add missing fields with default values
      missingFields.forEach(field => {
        if (cleanLead[field] === undefined) {
          switch (field) {
            case 'isActive':
              cleanLead[field] = true;
              break;
            case 'lastChecked':
              cleanLead[field] = undefined;
              break;
            default:
              cleanLead[field] = undefined;
          }
        }
      });

      // Handle adHoc field specially if it exists
      if (lead.adHoc) {
        cleanLead.adHoc = lead.adHoc;
      }

      // Create searchable text
      const searchableText = [
        cleanLead.opportunityTitle,
        cleanLead.summary,
        cleanLead.issuingBody.name,
        cleanLead.location.region,
        cleanLead.status,
        cleanLead.opportunityType,
        cleanLead.contractID || '',
      ].join(" ").toLowerCase();
      
      cleanLead.searchableText = searchableText;
      cleanLead.isActive = cleanLead.isActive !== undefined ? cleanLead.isActive : true;
      
      return cleanLead;
    });
    
    // Use the bulk create mutation
    const result = await ctx.runMutation(api.leads.bulkCreateLeads, {
      leads: processedLeads,
      sourceFile: args.sourceFile,
    });
    
    return {
      success: true,
      importedCount: result.length,
      leadIds: result,
      schemaChanges,
    };
  },
});

// Helper function to get most common value for a field
function getMostCommonValue(leads: any[], field: string): string {
  const values = leads.map(lead => lead[field]).filter(Boolean);
  const valueCounts: Record<string, number> = {};
  
  values.forEach(value => {
    valueCounts[value] = (valueCounts[value] || 0) + 1;
  });
  
  const mostCommon = Object.entries(valueCounts)
    .sort(([,a], [,b]) => b - a)[0];
  
  return mostCommon ? mostCommon[0] : "Unknown";
}
