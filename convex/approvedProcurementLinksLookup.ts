import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Type for the formatted link structure
type FormattedLink = {
  state: string;
  capital: string;
  officialWebsite: string;
  procurementLink: string;
  entityType: string | null;
  linkType: string | null;
  requiresRegistration: boolean | null;
};

/**
 * Shared helper function to refresh the lookup table
 * This is a private helper function used internally within this file.
 * External files should call the refreshLookup internal mutation instead.
 * 
 * IMPORTANT: This function MUST use null (not undefined) for optional fields
 * to match the schema's v.union(v.string(), v.null()) validators
 */
async function refreshLookupHelper(
  ctx: MutationCtx,
  approvedBy: string
): Promise<void> {
  // Get all approved procurement links directly from database
  const approvedLinks = await ctx.db
    .query("procurementUrls")
    .withIndex("by_status", (q) => q.eq("status", "approved"))
    .collect();
  
  // Transform to lookup format
  // CRITICAL: Use null instead of undefined for optional fields
  const formattedLinks: FormattedLink[] = approvedLinks.map((link: Doc<"procurementUrls">) => ({
    state: link.state,
    capital: link.capital,
    officialWebsite: link.officialWebsite,
    procurementLink: link.procurementLink,
    entityType: null, // Not stored in procurementUrls table
    linkType: null, // Not stored in procurementUrls table
    requiresRegistration: link.requiresRegistration ?? null, // Convert undefined to null
  }));
  
  const now = Date.now();
  
  // Check if lookup exists (singleton pattern)
  const existing = await ctx.db
    .query("approvedProcurementLinksLookUp")
    .first();
  
  if (existing) {
    // Update existing record
    await ctx.db.patch(existing._id, {
      lastApprovedBy: approvedBy,
      lastApprovedAt: now,
      approvedProcurementLinks: formattedLinks,
      updatedAt: now,
    });
  } else {
    // Create new record
    await ctx.db.insert("approvedProcurementLinksLookUp", {
      dateCreated: now,
      lastApprovedBy: approvedBy,
      lastApprovedAt: now,
      approvedProcurementLinks: formattedLinks,
      updatedAt: now,
    });
  }
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the current lookup record (public query)
 */
export const getLookup = query({
  args: {},
  handler: async (ctx) => {
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    return lookup;
  },
});

/**
 * Get approved links formatted for the system prompt (public query)
 */
export const getApprovedLinksForPrompt = query({
  args: {},
  handler: async (ctx) => {
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    if (!lookup) {
      // Return empty array if lookup doesn't exist yet
      return [];
    }
    
    return lookup.approvedProcurementLinks;
  },
});

/**
 * Get approved links for system prompt (internal query for use in actions)
 * 
 * CRITICAL: This function MUST handle null gracefully since the lookup
 * table may not exist before initialization. Returns empty array to
 * prevent errors in system prompt generation.
 */
export const getApprovedLinksForPromptInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    // Gracefully handle null/undefined lookup (e.g., before initialization)
    // Return empty array to prevent errors in system prompt generation
    return lookup?.approvedProcurementLinks || [];
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Internal mutation to refresh the lookup table
 * Called from other mutations when links are approved
 */
export const refreshLookup = internalMutation({
  args: {
    approvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await refreshLookupHelper(ctx, args.approvedBy);
  },
});

/**
 * Initialize the lookup table with current approved links
 * This should be run once after schema deployment to populate initial data
 * 
 * Can be called from the Convex Dashboard:
 * 1. Go to your Convex Dashboard
 * 2. Navigate to Functions
 * 3. Find approvedProcurementLinksLookup:initialize
 * 4. Click "Run" with no arguments
 */
export const initialize = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    count: v.number(),
    isUpdate: v.boolean(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    // Use "Migration" for initialization to distinguish from runtime updates
    const approvedBy = identity?.subject || "Migration";
    
    // Get all approved links from procurementUrls table
    const approvedLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    
    // Transform to lookup format
    // CRITICAL: Use null instead of undefined for optional fields
    const formattedLinks: FormattedLink[] = approvedLinks.map((link: Doc<"procurementUrls">) => ({
      state: link.state,
      capital: link.capital,
      officialWebsite: link.officialWebsite,
      procurementLink: link.procurementLink,
      entityType: null,
      linkType: null,
      requiresRegistration: link.requiresRegistration ?? null,
    }));
    
    const now = Date.now();
    
    // Check if lookup exists
    const existing = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        lastApprovedBy: approvedBy,
        lastApprovedAt: now,
        approvedProcurementLinks: formattedLinks,
        updatedAt: now,
      });
      return {
        success: true,
        message: `Updated existing lookup with ${formattedLinks.length} approved links`,
        count: formattedLinks.length,
        isUpdate: true,
      };
    } else {
      // Create new record
      await ctx.db.insert("approvedProcurementLinksLookUp", {
        dateCreated: now,
        lastApprovedBy: approvedBy,
        lastApprovedAt: now,
        approvedProcurementLinks: formattedLinks,
        updatedAt: now,
      });
      return {
        success: true,
        message: `Created lookup with ${formattedLinks.length} approved links`,
        count: formattedLinks.length,
        isUpdate: false,
      };
    }
  },
});

/**
 * Force refresh the lookup table (admin utility)
 * Useful if the lookup gets out of sync with procurementUrls
 */
export const forceRefresh = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    count: v.number(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const approvedBy = identity?.subject || "System";
    
    await refreshLookupHelper(ctx, approvedBy);
    
    // Get count for response
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    return {
      success: true,
      count: lookup?.approvedProcurementLinks.length || 0,
    };
  },
});

/**
 * Get statistics about the lookup table
 */
export const getStats = query({
  args: {},
  returns: v.union(
    v.object({
      exists: v.literal(true),
      linkCount: v.number(),
      lastUpdatedAt: v.number(),
      lastApprovedBy: v.string(),
      stateCount: v.number(),
    }),
    v.object({
      exists: v.literal(false),
    })
  ),
  handler: async (ctx) => {
    const lookup = await ctx.db
      .query("approvedProcurementLinksLookUp")
      .first();
    
    if (!lookup) {
      return { exists: false as const };
    }
    
    // Count unique states
    const uniqueStates = new Set(
      lookup.approvedProcurementLinks.map((link) => link.state)
    );
    
    return {
      exists: true as const,
      linkCount: lookup.approvedProcurementLinks.length,
      lastUpdatedAt: lookup.updatedAt,
      lastApprovedBy: lookup.lastApprovedBy,
      stateCount: uniqueStates.size,
    };
  },
});
