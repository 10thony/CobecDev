import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  action,
} from "./_generated/server";
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
    contacts: v.array(
      v.object({
        name: v.optional(v.string()),
        title: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        url: v.optional(v.string()),
      }),
    ),
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
    issuingBody: v.optional(
      v.object({
        name: v.string(),
        level: v.string(),
      }),
    ),
    location: v.optional(
      v.object({
        city: v.optional(v.string()),
        county: v.optional(v.string()),
        region: v.string(),
      }),
    ),
    status: v.optional(v.string()),
    estimatedValueUSD: v.optional(v.number()),
    keyDates: v.optional(
      v.object({
        publishedDate: v.optional(v.string()),
        bidDeadline: v.optional(v.string()),
        projectedStartDate: v.optional(v.string()),
      }),
    ),
    source: v.optional(
      v.object({
        documentName: v.string(),
        url: v.string(),
      }),
    ),
    contacts: v.optional(
      v.array(
        v.object({
          name: v.optional(v.string()),
          title: v.string(),
          email: v.optional(v.string()),
          phone: v.optional(v.string()),
          url: v.optional(v.string()),
        }),
      ),
    ),
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

// Internal mutation to create a lead from lead hunt workflow
export const createLeadFromHunt = internalMutation({
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
    contacts: v.array(
      v.object({
        name: v.optional(v.string()),
        title: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        url: v.optional(v.string()),
      }),
    ),
    summary: v.string(),
    verificationStatus: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    searchableText: v.optional(v.string()),
    leadHuntWorkflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("leads", {
      opportunityType: args.opportunityType,
      opportunityTitle: args.opportunityTitle,
      contractID: args.contractID,
      issuingBody: args.issuingBody,
      location: args.location,
      status: args.status,
      estimatedValueUSD: args.estimatedValueUSD,
      keyDates: args.keyDates,
      source: args.source,
      contacts: args.contacts,
      summary: args.summary,
      verificationStatus: args.verificationStatus,
      category: args.category,
      subcategory: args.subcategory,
      isActive: args.isActive ?? true,
      searchableText: args.searchableText,
      leadHuntWorkflowId: args.leadHuntWorkflowId,
      viabilityStatus: "pending",
      lastChecked: now,
      createdAt: now,
      updatedAt: now,
      metadata: {
        importedAt: now,
        dataType: "lead_hunt",
      },
    });
  },
});

// Bulk create leads from JSON data with duplicate detection
export const bulkCreateLeads = mutation({
  args: {
    leads: v.array(v.any()), // Use v.any() to allow dynamic fields
    sourceFile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = [];
    const skipped: Array<{ title: string; reason: string }> = [];
    
    // Get all existing leads to check for duplicates
    // We'll build a map of duplicate keys for fast lookup
    const existingLeads = await ctx.db.query("leads").collect();
    const duplicateKeys = new Set<string>();
    
    // Build set of existing duplicate keys
    for (const existingLead of existingLeads) {
      const normalizedUrl = normalizeUrl(existingLead.source?.url || "");
      const normalizedDocName = normalizeDocumentName(existingLead.source?.documentName || "");
      const normalizedContractID = normalizeContractID(existingLead.contractID || "");
      
      // Use same logic as deleteDuplicateLeads
      if (existingLead.contractID && normalizedDocName && normalizedUrl) {
        duplicateKeys.add(`contractID+source:${normalizedContractID}|${normalizedDocName}|${normalizedUrl}`);
      } else if (existingLead.contractID && normalizedUrl) {
        duplicateKeys.add(`contractID+url:${normalizedContractID}|${normalizedUrl}`);
      } else if (existingLead.contractID && normalizedDocName) {
        duplicateKeys.add(`contractID+doc:${normalizedContractID}|${normalizedDocName}`);
      } else if (normalizedDocName && normalizedUrl) {
        duplicateKeys.add(`source:${normalizedDocName}|${normalizedUrl}`);
      }
    }

    for (const lead of args.leads) {
      // Normalize fields for duplicate detection
      const normalizedUrl = normalizeUrl(lead.source?.url || "");
      const normalizedDocName = normalizeDocumentName(lead.source?.documentName || "");
      const normalizedContractID = normalizeContractID(lead.contractID || "");
      
      // Check for duplicate using same logic as deleteDuplicateLeads
      let duplicateKey: string | null = null;
      let duplicateReason = "";
      let isDuplicate = false;
      
      if (lead.contractID && normalizedDocName && normalizedUrl) {
        duplicateKey = `contractID+source:${normalizedContractID}|${normalizedDocName}|${normalizedUrl}`;
        duplicateReason = `contractID (${lead.contractID}) + source (${lead.source?.documentName})`;
      } else if (lead.contractID && normalizedUrl) {
        duplicateKey = `contractID+url:${normalizedContractID}|${normalizedUrl}`;
        duplicateReason = `contractID (${lead.contractID}) + URL`;
      } else if (lead.contractID && normalizedDocName) {
        duplicateKey = `contractID+doc:${normalizedContractID}|${normalizedDocName}`;
        duplicateReason = `contractID (${lead.contractID}) + documentName (${lead.source?.documentName})`;
      } else if (normalizedDocName && normalizedUrl) {
        duplicateKey = `source:${normalizedDocName}|${normalizedUrl}`;
        duplicateReason = `source (${lead.source?.documentName})`;
      }
      
      // Check if this is a duplicate
      if (duplicateKey && duplicateKeys.has(duplicateKey)) {
        isDuplicate = true;
        skipped.push({
          title: lead.opportunityTitle || "Untitled Opportunity",
          reason: duplicateReason,
        });
        continue; // Skip this lead
      }
      
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
          Object.entries(lead).filter(
            ([key]) =>
              ![
                "opportunityType",
                "opportunityTitle",
                "contractID",
                "issuingBody",
                "location",
                "status",
                "estimatedValueUSD",
                "keyDates",
                "source",
                "contacts",
                "summary",
                "verificationStatus",
                "category",
                "subcategory",
                "searchableText",
                "isActive",
                "adHoc",
              ].includes(key),
          ),
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
      
      // Add the new lead's key to the set to prevent duplicates within the same import batch
      if (duplicateKey) {
        duplicateKeys.add(duplicateKey);
      }
    }

    return {
      imported: results,
      skipped: skipped.length,
      skippedDetails: skipped.slice(0, 50), // Limit to first 50 for response size
    };
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

// Helper function to normalize URLs for duplicate detection
const normalizeUrl = (url: string): string => {
  if (!url) return "";
  return url.trim().toLowerCase().replace(/\/$/, ""); // Remove trailing slash
};

// Helper function to normalize document names for duplicate detection
const normalizeDocumentName = (docName: string): string => {
  if (!docName) return "";
  return docName.trim().toLowerCase();
};

// Helper function to normalize contract IDs for duplicate detection
const normalizeContractID = (contractID: string): string => {
  if (!contractID) return "";
  return contractID.trim().toLowerCase();
};

// Helper function to parse a date string and check if it's in the past
function isDateInPast(dateString: string | undefined): boolean {
  if (!dateString) return false;
  
  try {
    const parsedDate = new Date(dateString);
    // Check if date is valid
    if (isNaN(parsedDate.getTime())) return false;
    
    // Compare with current date (set time to midnight for date-only comparison)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    
    return parsedDate < now;
  } catch (error) {
    console.warn(`[cleanUpLeads] Failed to parse date: ${dateString}`, error);
    return false;
  }
}

// Clean up leads by removing duplicates and expired leads (past start time or deadline)
// Duplicates are detected by: contractID + source (documentName + url)
// Expired leads are those with bidDeadline or projectedStartDate in the past
// Invalid leads are those with source URLs matching invalid procurement links or hardcoded invalid domains
export const cleanUpLeads = mutation({
  args: {},
  handler: async (ctx) => {
    const allLeads = await ctx.db.query("leads").collect();
    const seen = new Map<string, string>(); // Map of normalized key -> first lead ID
    const duplicates: Array<{
      id: string;
      reason: string;
      duplicateOf: string;
    }> = [];
    const expired: Array<{
      id: string;
      reason: string;
    }> = [];
    const invalid: Array<{
      id: string;
      reason: string;
    }> = [];
    const deletedIds: string[] = [];

    // Get all invalid procurement links
    const invalidProcurementLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "invalid"))
      .collect();
    
    // Create a set of invalid URLs for fast lookup (normalized)
    const invalidUrls = new Set<string>();
    for (const link of invalidProcurementLinks) {
      const normalized = normalizeUrl(link.procurementLink);
      if (normalized) {
        invalidUrls.add(normalized);
      }
    }

    // Hardcoded invalid domains
    const invalidDomains = ["ssl.doas.ga.gov"];

    console.log(
      `[cleanUpLeads] Checking ${allLeads.length} leads for duplicates, expired dates, and invalid URLs...`,
      `Found ${invalidProcurementLinks.length} invalid procurement links`,
    );

    for (const lead of allLeads) {
      let shouldDelete = false;
      let deleteReason = "";
      let isExpired = false;
      let isDuplicate = false;
      let isInvalid = false;

      // Check if lead has an invalid source URL
      const sourceUrl = lead.source?.url || "";
      if (sourceUrl) {
        const normalizedSourceUrl = normalizeUrl(sourceUrl);
        
        // Check against invalid procurement links
        if (normalizedSourceUrl && invalidUrls.has(normalizedSourceUrl)) {
          isInvalid = true;
          shouldDelete = true;
          deleteReason = `invalid procurement link (${sourceUrl})`;
          invalid.push({
            id: lead._id,
            reason: deleteReason,
          });
        } else {
          // Check against hardcoded invalid domains
          const urlLower = sourceUrl.toLowerCase();
          for (const domain of invalidDomains) {
            if (urlLower.includes(domain)) {
              isInvalid = true;
              shouldDelete = true;
              deleteReason = `invalid domain (${domain})`;
              invalid.push({
                id: lead._id,
                reason: deleteReason,
              });
              break;
            }
          }
        }
      }

      // Check if lead has expired dates (bidDeadline or projectedStartDate in the past)
      // Only check if not already marked for deletion due to invalid URL
      if (!shouldDelete) {
        const bidDeadline = lead.keyDates?.bidDeadline;
        const projectedStartDate = lead.keyDates?.projectedStartDate;
        
        if (isDateInPast(bidDeadline)) {
          isExpired = true;
          shouldDelete = true;
          deleteReason = `expired bid deadline (${bidDeadline})`;
          expired.push({
            id: lead._id,
            reason: deleteReason,
          });
        } else if (isDateInPast(projectedStartDate)) {
          isExpired = true;
          shouldDelete = true;
          deleteReason = `expired projected start date (${projectedStartDate})`;
          expired.push({
            id: lead._id,
            reason: deleteReason,
          });
        }
      }

      // Check for duplicates (check all leads, even expired/invalid ones, for accurate duplicate tracking)
      // Only check if not already marked for deletion
      if (!shouldDelete) {
        let duplicateKey: string | null = null;
        let duplicateReason = "";

        // Normalize source fields
        const normalizedUrl = normalizeUrl(lead.source?.url || "");
        const normalizedDocName = normalizeDocumentName(lead.source?.documentName || "");

        // Match by contractID + source (documentName + url)
        // Both contractID and source must match for a duplicate
        if (lead.contractID && normalizedDocName && normalizedUrl) {
          const normalizedContractID = normalizeContractID(lead.contractID);
          duplicateKey = `contractID+source:${normalizedContractID}|${normalizedDocName}|${normalizedUrl}`;
          duplicateReason = `contractID (${lead.contractID}) + source (${lead.source.documentName})`;
        } else if (lead.contractID && normalizedUrl) {
          // Fallback: contractID + URL only (if documentName is missing)
          const normalizedContractID = normalizeContractID(lead.contractID);
          duplicateKey = `contractID+url:${normalizedContractID}|${normalizedUrl}`;
          duplicateReason = `contractID (${lead.contractID}) + URL`;
        } else if (lead.contractID && normalizedDocName) {
          // Fallback: contractID + documentName only (if URL is missing)
          const normalizedContractID = normalizeContractID(lead.contractID);
          duplicateKey = `contractID+doc:${normalizedContractID}|${normalizedDocName}`;
          duplicateReason = `contractID (${lead.contractID}) + documentName (${lead.source.documentName})`;
        } else if (normalizedDocName && normalizedUrl) {
          // Fallback: source only (if no contractID) - match by documentName + URL
          duplicateKey = `source:${normalizedDocName}|${normalizedUrl}`;
          duplicateReason = `source (${lead.source.documentName})`;
        }

        if (duplicateKey) {
          const firstLeadId = seen.get(duplicateKey);
          if (firstLeadId) {
            // This is a duplicate
            isDuplicate = true;
            shouldDelete = true;
            deleteReason = duplicateReason;
            duplicates.push({
              id: lead._id,
              reason: duplicateReason,
              duplicateOf: firstLeadId,
            });
          } else {
            // First occurrence - keep it (unless it's expired or invalid)
            if (!isExpired && !isInvalid) {
              seen.set(duplicateKey, lead._id);
            }
          }
        }
      }

      // Delete the lead if it's a duplicate or expired
      if (shouldDelete) {
        await ctx.db.delete(lead._id);
        deletedIds.push(lead._id);
        console.log(
          `[cleanUpLeads] Deleted lead ${lead._id} - ${deleteReason}`,
        );
      }
    }

    console.log(
      `[cleanUpLeads] Deleted ${deletedIds.length} leads (${duplicates.length} duplicates, ${expired.length} expired, ${invalid.length} invalid) out of ${allLeads.length} total`,
    );

    return {
      totalChecked: allLeads.length,
      duplicatesFound: duplicates.length,
      expiredFound: expired.length,
      invalidFound: invalid.length,
      deleted: deletedIds.length,
      duplicateDetails: duplicates.slice(0, 50), // Limit to first 50 for response size
      expiredDetails: expired.slice(0, 50), // Limit to first 50 for response size
      invalidDetails: invalid.slice(0, 50), // Limit to first 50 for response size
    };
  },
});

// Legacy export for backwards compatibility
export const deleteDuplicateLeads = cleanUpLeads;

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
// Uses compound cursor (createdAt + _id) to handle duplicate timestamps correctly
export const getLeadsPaginated = query({
  args: {
    limit: v.number(),
    lastCreatedAt: v.optional(v.number()), // Use createdAt for cursor
    lastId: v.optional(v.id("leads")), // Use _id as secondary cursor for duplicate timestamps
    includeTotal: v.optional(v.boolean()), // Optionally include total count
  },
  handler: async (ctx, args) => {
    const limit = args.limit;
    const batchNumber =
      args.lastCreatedAt === undefined && args.lastId === undefined
        ? 1
        : "subsequent";

    console.log(`[getLeadsPaginated] Starting batch fetch:`, {
      limit,
      lastCreatedAt: args.lastCreatedAt,
      lastId: args.lastId,
      includeTotal: args.includeTotal,
      batchNumber,
    });

    // Cursor-based pagination using compound cursor (createdAt + _id)
    // This handles duplicate timestamps correctly by using _id as tiebreaker
    let leads;
    if (args.lastCreatedAt !== undefined) {
      // Compound cursor: createdAt < lastCreatedAt OR (createdAt === lastCreatedAt AND _id < lastId)
      if (args.lastId !== undefined) {
        // We have both cursor values - use two-step query to handle compound cursor
        // Step 1: Get leads with createdAt < lastCreatedAt
        const leadsBefore = await ctx.db
          .query("leads")
          .withIndex("by_creation")
          .order("desc")
          .filter((q) => q.lt(q.field("createdAt"), args.lastCreatedAt!))
          .take(limit);

        console.log(
          `[getLeadsPaginated] Step 1 - Found ${leadsBefore.length} leads with createdAt < ${args.lastCreatedAt}`,
        );

        // Step 2: If we need more, get leads with same createdAt and filter by _id in memory
        // Collect ALL same-timestamp leads at once, then filter and sort in memory
        if (leadsBefore.length < limit) {
          const remaining = limit - leadsBefore.length;
          console.log(
            `[getLeadsPaginated] Step 2 - Need ${remaining} more leads, fetching same-timestamp leads`,
          );
          try {
            // Collect ALL leads with the same timestamp at once
            // This avoids pagination issues since we can't use a cursor for same-timestamp queries
            const allLeadsSameTime = await ctx.db
              .query("leads")
              .withIndex("by_creation")
              .order("desc")
              .filter((q) => q.eq(q.field("createdAt"), args.lastCreatedAt!))
              .collect(); // Get ALL same-timestamp leads

            console.log(
              `[getLeadsPaginated] Step 2 - Fetched ${allLeadsSameTime.length} total leads with same createdAt`,
            );

            // Filter to only those with _id < lastFetchedId, sort by _id descending, and take what we need
            const filteredSameTime = allLeadsSameTime
              .filter((lead) => lead._id < args.lastId!)
              .sort((a, b) => b._id.localeCompare(a._id))
              .slice(0, remaining); // Only take as many as we need

            console.log(
              `[getLeadsPaginated] Step 2 - After filtering by _id < ${args.lastId}, got ${filteredSameTime.length} leads (needed ${remaining})`,
            );

            // Combine and sort (by createdAt desc, then _id desc)
            leads = [...leadsBefore, ...filteredSameTime].sort((a, b) => {
              if (b.createdAt !== a.createdAt) {
                return b.createdAt - a.createdAt;
              }
              // For same createdAt, sort by _id descending
              return b._id.localeCompare(a._id);
            });
          } catch (error) {
            // If we hit byte limit or other error, just return what we have
            // The next pagination call will continue from where we left off
            console.error(
              `[getLeadsPaginated] ERROR in Step 2 (same-timestamp fetch):`,
              {
                error: error instanceof Error ? error.message : String(error),
                errorType:
                  error instanceof Error
                    ? error.constructor.name
                    : typeof error,
                leadsBeforeCount: leadsBefore.length,
                remaining,
                lastCreatedAt: args.lastCreatedAt,
                lastId: args.lastId,
              },
            );
            leads = leadsBefore;
          }
        } else {
          leads = leadsBefore;
        }
      } else {
        // Only createdAt provided (backward compatibility) - use simple filter
        console.log(
          `[getLeadsPaginated] Using simple filter (only createdAt provided)`,
        );
        leads = await ctx.db
          .query("leads")
          .withIndex("by_creation")
          .order("desc")
          .filter((q) => q.lt(q.field("createdAt"), args.lastCreatedAt!))
          .take(limit);
        console.log(
          `[getLeadsPaginated] Simple filter returned ${leads.length} leads`,
        );
      }
    } else if (args.lastId !== undefined) {
      // Legacy approach: get the lead first to find its createdAt
      const lastLead = await ctx.db.get(args.lastId);
      if (lastLead) {
        // Use compound cursor with the lead's createdAt
        // Step 1: Get leads with createdAt < lastLead.createdAt
        const leadsBefore = await ctx.db
          .query("leads")
          .withIndex("by_creation")
          .order("desc")
          .filter((q) => q.lt(q.field("createdAt"), lastLead.createdAt))
          .take(limit);

        // Step 2: If we need more, get leads with same createdAt and filter by _id in memory
        // Collect ALL same-timestamp leads at once, then filter and sort in memory
        if (leadsBefore.length < limit) {
          const remaining = limit - leadsBefore.length;
          console.log(
            `[getLeadsPaginated] Step 2 (legacy) - Need ${remaining} more leads, fetching same-timestamp leads`,
          );
          try {
            // Collect ALL leads with the same timestamp at once
            const allLeadsSameTime = await ctx.db
              .query("leads")
              .withIndex("by_creation")
              .order("desc")
              .filter((q) => q.eq(q.field("createdAt"), lastLead.createdAt))
              .collect(); // Get ALL same-timestamp leads

            console.log(
              `[getLeadsPaginated] Step 2 (legacy) - Fetched ${allLeadsSameTime.length} total leads with same createdAt`,
            );

            // Filter to only those with _id < lastId, sort by _id descending, and take what we need
            const filteredSameTime = allLeadsSameTime
              .filter((lead) => lead._id < args.lastId!)
              .sort((a, b) => b._id.localeCompare(a._id))
              .slice(0, remaining); // Only take as many as we need

            console.log(
              `[getLeadsPaginated] Step 2 (legacy) - After filtering by _id < ${args.lastId}, got ${filteredSameTime.length} leads (needed ${remaining})`,
            );

            // Combine and sort
            leads = [...leadsBefore, ...filteredSameTime].sort((a, b) => {
              if (b.createdAt !== a.createdAt) {
                return b.createdAt - a.createdAt;
              }
              return b._id.localeCompare(a._id);
            });
          } catch (error) {
            // If we hit byte limit or other error, just return what we have
            // The next pagination call will continue from where we left off
            console.error(
              `[getLeadsPaginated] ERROR in Step 2 (legacy same-timestamp fetch):`,
              {
                error: error instanceof Error ? error.message : String(error),
                errorType:
                  error instanceof Error
                    ? error.constructor.name
                    : typeof error,
                leadsBeforeCount: leadsBefore.length,
                remaining,
                lastCreatedAt: lastLead.createdAt,
                lastId: args.lastId,
              },
            );
            leads = leadsBefore;
          }
        } else {
          leads = leadsBefore;
        }
      } else {
        // If lastId not found, start from beginning
        console.log(
          `[getLeadsPaginated] lastId not found, starting from beginning`,
        );
        leads = await ctx.db
          .query("leads")
          .withIndex("by_creation")
          .order("desc")
          .take(limit);
        console.log(
          `[getLeadsPaginated] Starting from beginning returned ${leads.length} leads`,
        );
      }
    } else {
      // First batch: just take the limit
      console.log(
        `[getLeadsPaginated] First batch - fetching initial ${limit} leads`,
      );
      leads = await ctx.db
        .query("leads")
        .withIndex("by_creation")
        .order("desc")
        .take(limit);
      console.log(
        `[getLeadsPaginated] First batch returned ${leads.length} leads`,
      );
    }

    const lastId = leads.length > 0 ? leads[leads.length - 1]._id : undefined;
    const lastCreatedAt =
      leads.length > 0 ? leads[leads.length - 1].createdAt : undefined;

    // Validate and log problematic leads
    const problematicLeads: Array<{ id: string; issues: string[] }> = [];
    leads.forEach((lead, index) => {
      const issues: string[] = [];

      // Check required fields
      if (!lead._id) issues.push("missing _id");
      if (!lead.opportunityTitle) issues.push("missing opportunityTitle");
      if (!lead.opportunityType) issues.push("missing opportunityType");
      if (!lead.issuingBody) issues.push("missing issuingBody");
      if (!lead.issuingBody?.name) issues.push("missing issuingBody.name");
      if (!lead.issuingBody?.level) issues.push("missing issuingBody.level");
      if (!lead.location) issues.push("missing location");
      if (!lead.location?.region) issues.push("missing location.region");
      if (!lead.status) issues.push("missing status");
      if (!lead.summary) issues.push("missing summary");
      if (!lead.source) issues.push("missing source");
      if (!lead.source?.documentName)
        issues.push("missing source.documentName");
      if (!lead.source?.url) issues.push("missing source.url");
      if (!lead.contacts || !Array.isArray(lead.contacts))
        issues.push("missing or invalid contacts");
      if (typeof lead.createdAt !== "number")
        issues.push("invalid createdAt (not a number)");
      if (typeof lead.updatedAt !== "number")
        issues.push("invalid updatedAt (not a number)");

      // Check for unusually large fields that might cause serialization issues
      const summaryLength = lead.summary?.length || 0;
      if (summaryLength > 100000)
        issues.push(`summary too long (${summaryLength} chars)`);

      if (issues.length > 0) {
        problematicLeads.push({ id: lead._id, issues });
      }
    });

    if (problematicLeads.length > 0) {
      console.warn(
        `[getLeadsPaginated] Found ${problematicLeads.length} leads with issues:`,
        problematicLeads,
      );
    }

    // Only get total count if explicitly requested (to avoid expensive operation)
    // Note: This can be expensive for large datasets, so we skip it if it might cause issues
    let total: number | undefined = undefined;
    if (
      args.includeTotal &&
      args.lastCreatedAt === undefined &&
      args.lastId === undefined
    ) {
      // Only calculate total on first batch if requested
      // For very large datasets, this might hit byte limits, so we wrap in try-catch
      console.log(`[getLeadsPaginated] Calculating total count...`);
      try {
        // Use a simple approach but with error handling
        // If this fails, we'll just skip the total count
        const allLeads = await ctx.db.query("leads").collect();
        total = allLeads.length;
        console.log(
          `[getLeadsPaginated] Total count calculated: ${total} leads`,
        );

        // Log any issues with the total count calculation
        const totalProblematic = allLeads.filter((lead) => {
          return (
            !lead._id ||
            !lead.opportunityTitle ||
            !lead.issuingBody ||
            !lead.location ||
            !lead.status
          );
        }).length;
        if (totalProblematic > 0) {
          console.warn(
            `[getLeadsPaginated] Found ${totalProblematic} leads with missing required fields in total count`,
          );
        }
      } catch (error) {
        // If counting fails due to byte limit, just skip it
        // The UI can work without the total count - it will show "X of ? leads"
        console.error(`[getLeadsPaginated] ERROR calculating total count:`, {
          error: error instanceof Error ? error.message : String(error),
          errorType:
            error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        });
        total = undefined;
      }
    }

    // Determine if there are more leads based on batch size
    // If we got a full batch, there might be more
    let hasMore = leads.length === limit;

    // If we got less than the limit, check if there are actually more leads available
    if (leads.length < limit && lastCreatedAt !== undefined) {
      try {
        // First, check if there are any more leads with createdAt < lastCreatedAt (earlier timestamps)
        const checkMore = await ctx.db
          .query("leads")
          .withIndex("by_creation")
          .order("desc")
          .filter((q) => q.lt(q.field("createdAt"), lastCreatedAt))
          .take(1);

        if (checkMore.length > 0) {
          hasMore = true;
          console.log(
            `[getLeadsPaginated] Found ${checkMore.length} more leads with earlier timestamps, hasMore=true`,
          );
        } else if (lastId !== undefined) {
          // If no earlier timestamps, check if there are more leads with the same timestamp but smaller _id
          // Collect ALL same-timestamp leads to check thoroughly
          const allSameTime = await ctx.db
            .query("leads")
            .withIndex("by_creation")
            .order("desc")
            .filter((q) => q.eq(q.field("createdAt"), lastCreatedAt))
            .collect();

          const hasMoreSameTime = allSameTime.some((lead) => lead._id < lastId);

          if (hasMoreSameTime) {
            hasMore = true;
            const count = allSameTime.filter((l) => l._id < lastId).length;
            console.log(
              `[getLeadsPaginated] Found more leads with same timestamp (${count} found out of ${allSameTime.length}), hasMore=true`,
            );
          } else {
            console.log(
              `[getLeadsPaginated] No more leads found (checked ${allSameTime.length} same-timestamp leads), hasMore=false`,
            );
          }
        }
      } catch (error) {
        // If check fails, be more aggressive - if we got a partial batch, assume there might be more
        console.warn(
          `[getLeadsPaginated] Could not verify if more leads exist:`,
          {
            error: error instanceof Error ? error.message : String(error),
            leadsReturned: leads.length,
            limit,
          },
        );
        // If we got a partial batch, assume there might be more (be more optimistic)
        // This helps avoid stopping early due to query errors
        if (leads.length > 0 && leads.length < limit) {
          hasMore = true; // Assume there might be more if we got a partial batch
          console.log(
            `[getLeadsPaginated] Assuming hasMore=true due to partial batch (${leads.length}/${limit})`,
          );
        }
      }
    } else if (
      leads.length === 0 &&
      (lastCreatedAt !== undefined || lastId !== undefined)
    ) {
      // If we got zero leads but have a cursor, there might still be more (edge case)
      // This can happen if the cursor points to a deleted lead
      hasMore = false; // No leads returned, so no more
    }

    console.log(`[getLeadsPaginated] Batch complete:`, {
      leadsReturned: leads.length,
      hasMore,
      total,
      lastId,
      lastCreatedAt,
      problematicLeadsCount: problematicLeads.length,
      leadIds: leads.slice(0, 5).map((l) => l._id), // Log first 5 IDs for debugging
    });

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
      .withIndex("by_issuing_level", (q) =>
        q.eq("issuingBody.level", args.level),
      )
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
      .withIndex("by_opportunity_type", (q) =>
        q.eq("opportunityType", args.opportunityType),
      )
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
      .withIndex("by_verification_status", (q) =>
        q.eq("verificationStatus", args.verificationStatus),
      )
      .order("desc")
      .collect();
  },
});

// Search leads by title, summary, or searchable text
export const searchLeads = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const allLeads = await ctx.db.query("leads").collect();

    return allLeads.filter(
      (lead) =>
        lead.opportunityTitle
          .toLowerCase()
          .includes(args.searchTerm.toLowerCase()) ||
        lead.summary.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
        (lead.searchableText &&
          lead.searchableText
            .toLowerCase()
            .includes(args.searchTerm.toLowerCase())),
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
      leads = await ctx.db
        .query("leads")
        .withIndex("by_issuing_level", (q) =>
          q.eq("issuingBody.level", args.level!),
        )
        .order("desc")
        .collect();
    } else if (args.category) {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .collect();
    } else if (args.region) {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_region", (q) => q.eq("location.region", args.region!))
        .order("desc")
        .collect();
    } else if (args.isActive !== undefined) {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!))
        .order("desc")
        .collect();
    } else if (args.opportunityType) {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_opportunity_type", (q) =>
          q.eq("opportunityType", args.opportunityType!),
        )
        .order("desc")
        .collect();
    } else if (args.status) {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.verificationStatus) {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_verification_status", (q) =>
          q.eq("verificationStatus", args.verificationStatus!),
        )
        .order("desc")
        .collect();
    } else {
      leads = await ctx.db.query("leads").order("desc").collect();
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
      active: allLeads.filter((lead) => lead.isActive).length,
      inactive: allLeads.filter((lead) => !lead.isActive).length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byRegion: {} as Record<string, number>,
      byOpportunityType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byVerificationStatus: {} as Record<string, number>,
    };

    // Helper function to sanitize field names for use as object keys
    const sanitizeFieldName = (name: string): string => {
      return name
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, "_");
    };

    // Store original names for display purposes
    const originalNames: Record<string, string> = {};

    // Count by issuing body level
    allLeads.forEach((lead) => {
      const originalLevel = lead.issuingBody.level;
      const sanitizedLevel = sanitizeFieldName(originalLevel);
      originalNames[sanitizedLevel] = originalLevel;
      stats.byLevel[sanitizedLevel] = (stats.byLevel[sanitizedLevel] || 0) + 1;
    });

    // Count by category
    allLeads.forEach((lead) => {
      if (lead.category) {
        const originalCategory = lead.category;
        const sanitizedCategory = sanitizeFieldName(originalCategory);
        originalNames[sanitizedCategory] = originalCategory;
        stats.byCategory[sanitizedCategory] =
          (stats.byCategory[sanitizedCategory] || 0) + 1;
      }
    });

    // Count by region
    allLeads.forEach((lead) => {
      const originalRegion = lead.location.region;
      const sanitizedRegion = sanitizeFieldName(originalRegion);
      originalNames[sanitizedRegion] = originalRegion;
      stats.byRegion[sanitizedRegion] =
        (stats.byRegion[sanitizedRegion] || 0) + 1;
    });

    // Count by opportunity type
    allLeads.forEach((lead) => {
      const originalType = lead.opportunityType;
      const sanitizedType = sanitizeFieldName(originalType);
      originalNames[sanitizedType] = originalType;
      stats.byOpportunityType[sanitizedType] =
        (stats.byOpportunityType[sanitizedType] || 0) + 1;
    });

    // Count by status
    allLeads.forEach((lead) => {
      const originalStatus = lead.status;
      const sanitizedStatus = sanitizeFieldName(originalStatus);
      originalNames[sanitizedStatus] = originalStatus;
      stats.byStatus[sanitizedStatus] =
        (stats.byStatus[sanitizedStatus] || 0) + 1;
    });

    // Count by verification status
    allLeads.forEach((lead) => {
      if (lead.verificationStatus) {
        const originalVerificationStatus = lead.verificationStatus;
        const sanitizedVerificationStatus = sanitizeFieldName(
          originalVerificationStatus,
        );
        originalNames[sanitizedVerificationStatus] = originalVerificationStatus;
        stats.byVerificationStatus[sanitizedVerificationStatus] =
          (stats.byVerificationStatus[sanitizedVerificationStatus] || 0) + 1;
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
        errors.push(
          `Approaching timeout, stopping early. Processed ${batchCount} batches.`,
        );
        break;
      }

      try {
        // Get a batch of lead IDs that have embeddings (using the index)
        const leadData = await ctx.runQuery(
          internal.leads.getLeadIdsWithEmbeddings,
          {
            limit: batchSize,
            lastEmbeddingGeneratedAt: lastEmbeddingGeneratedAt ?? undefined,
          },
        );

        if (!leadData || leadData.length === 0) {
          hasMoreEmbeddingGenerated = false;
          break;
        }

        // Process each lead ID - patch directly without reading the document
        for (const { id, embeddingGeneratedAt } of leadData) {
          try {
            // Patch the lead directly - this doesn't require reading the document
            await ctx.runMutation(internal.leads.clearLeadEmbedding, {
              leadId: id,
            });
            clearedCount++;
            processedCount++;
            lastEmbeddingGeneratedAt = embeddingGeneratedAt;
          } catch (error) {
            // If patching fails, log and continue
            errorCount++;
            const errorMsg =
              error instanceof Error ? error.message : String(error);
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
    if (!args.skipModelIndex && Date.now() - startTime < maxDuration) {
      modelIndexHasMore = true;
      let modelBatchCount = 0;
      const maxModelBatches = 5; // Limit model index batches too

      while (
        modelIndexHasMore &&
        modelBatchCount < maxModelBatches &&
        processedCount < 10000
      ) {
        // Check timeout again
        if (Date.now() - startTime > maxDuration) {
          break;
        }

        try {
          const leadIds = await ctx.runQuery(
            internal.leads.getLeadIdsWithEmbeddingModel,
            {
              limit: batchSize,
              lastId: lastModelIndexId,
            },
          );

          if (!leadIds || leadIds.length === 0) {
            modelIndexHasMore = false;
            break;
          }

          for (const leadId of leadIds) {
            try {
              await ctx.runMutation(internal.leads.clearLeadEmbedding, {
                leadId,
              });
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
      message: `Cleared embedding data from ${clearedCount} lead(s) in ${batchCount} batch(es)${hasMore ? " (more remaining - run again to continue)" : " (complete)"}${errorCount > 0 ? ` (${errorCount} errors)` : ""}`,
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
      let query = ctx.db.query("leads").withIndex("by_embedding_generated");

      // If we have a last timestamp, filter to get next batch
      if (args.lastEmbeddingGeneratedAt !== undefined) {
        query = query.filter((q) =>
          q.gt(q.field("embeddingGeneratedAt"), args.lastEmbeddingGeneratedAt!),
        );
      }

      const leads = await query.order("asc").take(args.limit);

      // Extract just the IDs and timestamps (minimal data)
      return leads.map((lead) => ({
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
      let query = ctx.db.query("leads").withIndex("by_embedding_model");

      if (lastId !== undefined) {
        query = query.filter((q) => q.gt(q.field("_id"), lastId));
      }

      const leads = await query.order("asc").take(args.limit);

      // Extract just the IDs
      return leads.map((lead) => lead._id);
    } catch (error) {
      return [];
    }
  },
});

// Get all source links from all leads
// Uses index on source.url for fast and reliable access
export const getAllSourceLinks = query({
  args: {},
  handler: async (ctx) => {
    // Use the by_source_url index if available, otherwise fall back to full query
    try {
      // Try to use index for better performance
      const allLeads = await ctx.db
        .query("leads")
        .withIndex("by_source_url")
        .collect();

      // Extract unique source links with metadata
      const sourceLinksMap = new Map<
        string,
        {
          url: string;
          documentName: string;
          leadIds: string[];
          count: number;
        }
      >();

      allLeads.forEach((lead) => {
        if (lead.source?.url) {
          const url = lead.source.url;
          if (sourceLinksMap.has(url)) {
            const existing = sourceLinksMap.get(url)!;
            existing.leadIds.push(lead._id);
            existing.count++;
          } else {
            sourceLinksMap.set(url, {
              url,
              documentName: lead.source.documentName || "Unknown",
              leadIds: [lead._id],
              count: 1,
            });
          }
        }
      });

      return Array.from(sourceLinksMap.values());
    } catch (error) {
      // Fallback: if index doesn't exist, use regular query
      // This handles the case where the index hasn't been deployed yet
      const allLeads = await ctx.db.query("leads").collect();

      const sourceLinksMap = new Map<
        string,
        {
          url: string;
          documentName: string;
          leadIds: string[];
          count: number;
        }
      >();

      allLeads.forEach((lead) => {
        if (lead.source?.url) {
          const url = lead.source.url;
          if (sourceLinksMap.has(url)) {
            const existing = sourceLinksMap.get(url)!;
            existing.leadIds.push(lead._id);
            existing.count++;
          } else {
            sourceLinksMap.set(url, {
              url,
              documentName: lead.source.documentName || "Unknown",
              leadIds: [lead._id],
              count: 1,
            });
          }
        }
      });

      return Array.from(sourceLinksMap.values());
    }
  },
});

// Get all source links as a simple array of URLs (lightweight version)
export const getAllSourceUrls = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Use index if available
      const allLeads = await ctx.db
        .query("leads")
        .withIndex("by_source_url")
        .collect();

      // Extract unique URLs
      const urls = new Set<string>();
      allLeads.forEach((lead) => {
        if (lead.source?.url) {
          urls.add(lead.source.url);
        }
      });

      return Array.from(urls);
    } catch (error) {
      // Fallback: regular query
      const allLeads = await ctx.db.query("leads").collect();
      const urls = new Set<string>();
      allLeads.forEach((lead) => {
        if (lead.source?.url) {
          urls.add(lead.source.url);
        }
      });
      return Array.from(urls);
    }
  },
});

// Get lead count for a specific state
// Maps state name to lead regions and returns the count
export const getLeadCountByState = query({
  args: {
    stateName: v.string(),
  },
  handler: async (ctx, args): Promise<number> => {
    const allLeads = await ctx.db.query("leads").collect();

    if (!allLeads || allLeads.length === 0) return 0;

    const stateLower = args.stateName.toLowerCase();

    // Map of state names to common region patterns
    const stateToRegionPatterns: Record<string, string[]> = {
      texas: [
        "texas",
        "dallas",
        "houston",
        "austin",
        "san antonio",
        "el paso",
        "fort worth",
      ],
      florida: [
        "florida",
        "miami",
        "tampa",
        "orlando",
        "jacksonville",
        "tallahassee",
      ],
      california: [
        "california",
        "los angeles",
        "san francisco",
        "san diego",
        "sacramento",
        "oakland",
      ],
      "new york": ["new york", "nyc", "albany", "buffalo", "rochester"],
      // Add more mappings as needed
    };

    // Get patterns for this state
    const patterns = stateToRegionPatterns[stateLower] || [stateLower];

    // Filter leads where region matches any pattern
    const matchingLeads = allLeads.filter((lead) => {
      if (!lead.location?.region) return false;
      const regionLower = lead.location.region.toLowerCase();
      return patterns.some((pattern) => regionLower.includes(pattern));
    });

    return matchingLeads.length;
  },
});

// Get leads for resume generation - returns only essential fields to avoid loading large data
// This query is optimized to exclude large fields like searchableText and adHoc
export const getLeadsForResumeGeneration = query({
  args: {
    limit: v.number(),
    offset: v.optional(v.number()),
    filters: v.optional(v.object({
      region: v.optional(v.string()),
      category: v.optional(v.string()),
      opportunityType: v.optional(v.string()),
      status: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const limit = args.limit;
    const offset = args.offset ?? 0;
    
    // Get leads with filters if provided
    let allLeads;
    
    if (args.filters) {
      if (args.filters.region) {
        allLeads = await ctx.db
          .query("leads")
          .withIndex("by_region", (q) => 
            q.eq("location.region", args.filters!.region!)
          )
          .order("desc")
          .collect();
      } else if (args.filters.category) {
        allLeads = await ctx.db
          .query("leads")
          .withIndex("by_category", (q) => 
            q.eq("category", args.filters!.category!)
          )
          .order("desc")
          .collect();
      } else if (args.filters.opportunityType) {
        allLeads = await ctx.db
          .query("leads")
          .withIndex("by_opportunity_type", (q) => 
            q.eq("opportunityType", args.filters!.opportunityType!)
          )
          .order("desc")
          .collect();
      } else if (args.filters.status) {
        allLeads = await ctx.db
          .query("leads")
          .withIndex("by_status", (q) => 
            q.eq("status", args.filters!.status!)
          )
          .order("desc")
          .collect();
      } else {
        allLeads = await ctx.db.query("leads").order("desc").collect();
      }
    } else {
      allLeads = await ctx.db.query("leads").order("desc").collect();
    }
    
    // Additional filtering is already handled by the index queries above
    const filteredLeads = allLeads;
    
    // Paginate
    const paginatedLeads = filteredLeads.slice(offset, offset + limit);
    
    // Return only essential fields, truncating large text fields
    return paginatedLeads.map(lead => ({
      _id: lead._id,
      opportunityTitle: lead.opportunityTitle,
      opportunityType: lead.opportunityType,
      issuingBody: {
        name: lead.issuingBody?.name || "",
        level: lead.issuingBody?.level || "",
      },
      location: {
        region: lead.location?.region || "",
        city: lead.location?.city || undefined,
        county: lead.location?.county || undefined,
      },
      status: lead.status,
      category: lead.category || undefined,
      subcategory: lead.subcategory || undefined,
      summary: lead.summary ? (lead.summary.length > 2000 ? lead.summary.substring(0, 2000) + "..." : lead.summary) : "",
      keyDates: lead.keyDates || {
        publishedDate: undefined,
        bidDeadline: undefined,
        projectedStartDate: undefined,
      },
      estimatedValueUSD: lead.estimatedValueUSD || undefined,
      contractID: lead.contractID || undefined,
      // Exclude: searchableText, adHoc, contacts (can be large)
    }));
  },
});

// Get minimal lead summary for single lead generation
// Returns only essential fields with truncated text
export const getLeadSummaryForGeneration = query({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    
    if (!lead) {
      return null;
    }
    
    // Return only essential fields, truncating large text fields
    return {
      _id: lead._id,
      opportunityTitle: lead.opportunityTitle,
      opportunityType: lead.opportunityType,
      issuingBody: {
        name: lead.issuingBody?.name || "",
        level: lead.issuingBody?.level || "",
      },
      location: {
        region: lead.location?.region || "",
        city: lead.location?.city || undefined,
        county: lead.location?.county || undefined,
      },
      status: lead.status,
      category: lead.category || undefined,
      subcategory: lead.subcategory || undefined,
      summary: lead.summary ? (lead.summary.length > 2000 ? lead.summary.substring(0, 2000) + "..." : lead.summary) : "",
      keyDates: lead.keyDates || {
        publishedDate: undefined,
        bidDeadline: undefined,
        projectedStartDate: undefined,
      },
      estimatedValueUSD: lead.estimatedValueUSD || undefined,
      contractID: lead.contractID || undefined,
    };
  },
});
