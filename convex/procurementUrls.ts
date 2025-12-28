import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Type for procurement link from JSON
const procurementLinkValidator = v.object({
  state: v.string(),
  capital: v.string(),
  official_website: v.string(),
  procurement_link: v.string(),
});

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
 * Local helper function to refresh the lookup table
 * This is used within mutations in this file.
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

// Queries

/**
 * Get all procurement URLs with optional status filter
 */
export const list = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"))),
  },
  returns: v.array(v.object({
    _id: v.id("procurementUrls"),
    _creationTime: v.number(),
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()),
    importedAt: v.number(),
    sourceFile: v.optional(v.string()),
    requiresRegistration: v.optional(v.boolean()),
    aiReviewStatus: v.optional(v.union(v.literal("idle"), v.literal("processing"), v.literal("completed"), v.literal("failed"))),
    aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
    aiReasoning: v.optional(v.string()),
    lastAgentAttempt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("procurementUrls")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("procurementUrls").collect();
  },
});

/**
 * Get pending procurement URLs
 */
export const getPending = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("procurementUrls"),
    _creationTime: v.number(),
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()),
    importedAt: v.number(),
    sourceFile: v.optional(v.string()),
    requiresRegistration: v.optional(v.boolean()),
    aiReviewStatus: v.optional(v.union(v.literal("idle"), v.literal("processing"), v.literal("completed"), v.literal("failed"))),
    aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
    aiReasoning: v.optional(v.string()),
    lastAgentAttempt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    return await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

/**
 * Get pending procurement URLs for AI agent processing
 * Returns URLs that are pending and haven't been processed by AI yet (or failed)
 */
export const getPendingForAgent = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("procurementUrls"),
    _creationTime: v.number(),
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()),
    importedAt: v.number(),
    sourceFile: v.optional(v.string()),
    requiresRegistration: v.optional(v.boolean()),
    aiReviewStatus: v.optional(v.union(v.literal("idle"), v.literal("processing"), v.literal("completed"), v.literal("failed"))),
    aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
    aiReasoning: v.optional(v.string()),
    lastAgentAttempt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // IMPORTANT: Only get URLs with status "pending" - never process approved or denied links
    const allPending = await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    
    // Filter to only those that need AI review:
    // - Never processed (no aiReviewStatus)
    // - Idle (waiting to be processed)
    // - Failed (can retry)
    // - Exclude "completed" and "processing" statuses
    const needsReview = allPending.filter((url) => {
      // Only process if status is pending AND hasn't been completed by AI
      if (url.status !== "pending") {
        return false; // Double-check: should never happen due to index filter, but safety check
      }
      
      // Skip if already completed by AI
      if (url.aiReviewStatus === "completed") {
        return false;
      }
      
      // Skip if currently being processed
      if (url.aiReviewStatus === "processing") {
        return false;
      }
      
      // Process if: idle, failed, or never processed
      return !url.aiReviewStatus || url.aiReviewStatus === "idle" || url.aiReviewStatus === "failed";
    });
    
    // Sort by lastAgentAttempt (oldest first) or by creation time
    needsReview.sort((a, b) => {
      const aTime = a.lastAgentAttempt || a._creationTime;
      const bTime = b.lastAgentAttempt || b._creationTime;
      return aTime - bTime;
    });
    
    return needsReview.slice(0, limit);
  },
});

/**
 * Get approved procurement URLs - these are available for selection in the map
 */
export const getApproved = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("procurementUrls"),
    _creationTime: v.number(),
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()),
    importedAt: v.number(),
    sourceFile: v.optional(v.string()),
    requiresRegistration: v.optional(v.boolean()),
    aiReviewStatus: v.optional(v.union(v.literal("idle"), v.literal("processing"), v.literal("completed"), v.literal("failed"))),
    aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
    aiReasoning: v.optional(v.string()),
    lastAgentAttempt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    return await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
  },
});

/**
 * Get approved procurement URLs for a specific state (used in map pin creation)
 */
export const getApprovedByState = query({
  args: { state: v.string() },
  returns: v.array(v.object({
    _id: v.id("procurementUrls"),
    _creationTime: v.number(),
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()),
    importedAt: v.number(),
    sourceFile: v.optional(v.string()),
    requiresRegistration: v.optional(v.boolean()),
    aiReviewStatus: v.optional(v.union(v.literal("idle"), v.literal("processing"), v.literal("completed"), v.literal("failed"))),
    aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
    aiReasoning: v.optional(v.string()),
    lastAgentAttempt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("procurementUrls")
      .withIndex("by_state_status", (q) => q.eq("state", args.state).eq("status", "approved"))
      .collect();
  },
});

/**
 * Get stats about procurement URLs
 */
export const getStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    pending: v.number(),
    approved: v.number(),
    denied: v.number(),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query("procurementUrls").collect();
    return {
      total: all.length,
      pending: all.filter((url) => url.status === "pending").length,
      approved: all.filter((url) => url.status === "approved").length,
      denied: all.filter((url) => url.status === "denied").length,
    };
  },
});

/**
 * Search procurement URLs by state and optionally by city
 * Used by the procurement agent to find verified URLs
 */
export const searchByStateCity = query({
  args: {
    state: v.string(),
    city: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"))),
  },
  returns: v.array(v.object({
    _id: v.id("procurementUrls"),
    _creationTime: v.number(),
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()),
    importedAt: v.number(),
    sourceFile: v.optional(v.string()),
    requiresRegistration: v.optional(v.boolean()),
    aiReviewStatus: v.optional(v.union(v.literal("idle"), v.literal("processing"), v.literal("completed"), v.literal("failed"))),
    aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
    aiReasoning: v.optional(v.string()),
    lastAgentAttempt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    let results;
    
    if (args.status) {
      results = await ctx.db
        .query("procurementUrls")
        .withIndex("by_state_status", (q) => 
          q.eq("state", args.state).eq("status", args.status!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("procurementUrls")
        .withIndex("by_state", (q) => q.eq("state", args.state))
        .collect();
    }
    
    // Filter by city if provided
    if (args.city) {
      return results.filter(r => 
        r.capital.toLowerCase().includes(args.city!.toLowerCase())
      );
    }
    
    return results;
  },
});

// Mutations

/**
 * Import procurement URLs from JSON data
 */
export const importFromJson = mutation({
  args: {
    links: v.array(procurementLinkValidator),
    sourceFile: v.optional(v.string()),
  },
  returns: v.object({
    imported: v.number(),
    skipped: v.number(),
    duplicates: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const importedAt = Date.now();
    let imported = 0;
    let skipped = 0;
    const duplicates: string[] = [];

    for (const link of args.links) {
      // Check if this state+city combination already exists in any status
      // This allows multiple cities per state (not just capitals)
      const existing = await ctx.db
        .query("procurementUrls")
        .withIndex("by_state_capital", (q) => 
          q.eq("state", link.state).eq("capital", link.capital)
        )
        .first();

      if (existing) {
        skipped++;
        duplicates.push(`${link.state} - ${link.capital}`);
        continue;
      }

      await ctx.db.insert("procurementUrls", {
        state: link.state,
        capital: link.capital,
        officialWebsite: link.official_website,
        procurementLink: link.procurement_link,
        status: "pending",
        importedAt,
        sourceFile: args.sourceFile,
        aiReviewStatus: "idle", // New imports start as idle for AI review
      });
      imported++;
    }

    return { imported, skipped, duplicates };
  },
});

/**
 * Approve a procurement URL
 */
export const approve = mutation({
  args: { 
    id: v.id("procurementUrls"),
    requiresRegistration: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    const updateData: any = {
      status: "approved",
      verifiedBy: identity?.subject ?? undefined,
      verifiedAt: Date.now(),
      // Clear AI decision when manually approving (overrides AI denial)
      aiDecision: undefined,
    };
    
    if (args.requiresRegistration !== undefined) {
      updateData.requiresRegistration = args.requiresRegistration;
    }
    
    await ctx.db.patch(args.id, updateData);
    
    // Refresh the approved procurement links lookup table
    const approvedBy = identity?.subject || "System";
    await refreshLookupHelper(ctx, approvedBy);
  },
});

/**
 * Deny a procurement URL
 */
export const deny = mutation({
  args: {
    id: v.id("procurementUrls"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    await ctx.db.patch(args.id, {
      status: "denied",
      verifiedBy: identity?.subject ?? undefined,
      verifiedAt: Date.now(),
      denialReason: args.reason,
    });
  },
});

/**
 * Reset a URL back to pending status
 */
export const resetToPending = mutation({
  args: { id: v.id("procurementUrls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "pending",
      verifiedBy: undefined,
      verifiedAt: undefined,
      denialReason: undefined,
    });
  },
});

/**
 * Delete a procurement URL
 */
export const remove = mutation({
  args: { id: v.id("procurementUrls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Clear all procurement URLs (use with caution)
 */
export const clearAll = mutation({
  args: { confirm: v.boolean() },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (!args.confirm) {
      return 0;
    }
    
    const all = await ctx.db.query("procurementUrls").collect();
    for (const url of all) {
      await ctx.db.delete(url._id);
    }
    return all.length;
  },
});

/**
 * Bulk approve all pending URLs
 */
export const approveAll = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const now = Date.now();
    
    const pending = await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    
    for (const url of pending) {
      await ctx.db.patch(url._id, {
        status: "approved",
        verifiedBy: identity?.subject ?? undefined,
        verifiedAt: now,
        // Clear AI decision when bulk approving (overrides AI denial)
        aiDecision: undefined,
      });
    }
    
    // Refresh the lookup table after bulk approval
    if (pending.length > 0) {
      const approvedBy = identity?.subject || "System";
      await refreshLookupHelper(ctx, approvedBy);
    }
    
    return pending.length;
  },
});

/**
 * Update a procurement URL's details
 */
export const update = mutation({
  args: {
    id: v.id("procurementUrls"),
    officialWebsite: v.optional(v.string()),
    procurementLink: v.optional(v.string()),
    requiresRegistration: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }
  },
});

/**
 * Manually add a procurement URL with automatic approval.
 * Used when users manually enter links they have verified themselves.
 */
export const addManual = mutation({
  args: {
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
    requiresRegistration: v.optional(v.boolean()),
  },
  returns: v.id("procurementUrls"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const now = Date.now();
    
    // Check if this state+city combination already exists
    // This allows multiple cities per state (not just capitals)
    const existing = await ctx.db
      .query("procurementUrls")
      .withIndex("by_state_capital", (q) => 
        q.eq("state", args.state).eq("capital", args.capital)
      )
      .first();

    if (existing) {
      // Update the existing record instead of creating a duplicate
      const updateData: any = {
        capital: args.capital,
        officialWebsite: args.officialWebsite,
        procurementLink: args.procurementLink,
        status: "approved",
        verifiedBy: identity?.subject ?? undefined,
        verifiedAt: now,
        // Clear AI decision when manually adding/updating (overrides AI denial)
        aiDecision: undefined,
      };
      
      if (args.requiresRegistration !== undefined) {
        updateData.requiresRegistration = args.requiresRegistration;
      }
      
      await ctx.db.patch(existing._id, updateData);
      
      // Refresh the approved procurement links lookup table
      const approvedBy = identity?.subject || "System";
      await refreshLookupHelper(ctx, approvedBy);
      
      return existing._id;
    }

    // Create a new approved link
    const insertData: any = {
      state: args.state,
      capital: args.capital,
      officialWebsite: args.officialWebsite,
      procurementLink: args.procurementLink,
      status: "approved",
      verifiedBy: identity?.subject ?? undefined,
      verifiedAt: now,
      importedAt: now,
      sourceFile: "manual-entry",
    };
    
    if (args.requiresRegistration !== undefined) {
      insertData.requiresRegistration = args.requiresRegistration;
    }

    const id = await ctx.db.insert("procurementUrls", insertData);
    
    // Refresh the approved procurement links lookup table
    const approvedBy = identity?.subject || "System";
    await refreshLookupHelper(ctx, approvedBy);

    return id;
  },
});

/**
 * Internal mutation to add a pending URL (used by the agent)
 */
export const addPendingUrl = internalMutation({
  args: {
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("procurementUrls", {
      state: args.state,
      capital: args.capital,
      officialWebsite: args.officialWebsite,
      procurementLink: args.procurementLink,
      status: "pending",
      importedAt: Date.now(),
      aiReviewStatus: "idle", // New imports start as idle for AI review
    });
  },
});

/**
 * Report agent verification result
 * Internal mutation called by the AI agent after verification
 */
export const reportAgentResult = internalMutation({
  args: {
    id: v.id("procurementUrls"),
    status: v.union(v.literal("approved"), v.literal("denied")),
    reason: v.string(),
    requiresRegistration: v.optional(v.boolean()),
    correctedLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
      verifiedBy: "GPT-5-Mini-Agent",
      verifiedAt: Date.now(),
      aiReviewStatus: "completed",
      aiDecision: args.status === "approved" ? "approve" : "deny",
      aiReasoning: args.reason,
      lastAgentAttempt: Date.now(),
    };

    if (args.requiresRegistration !== undefined) {
      updateData.requiresRegistration = args.requiresRegistration;
    }

    if (args.status === "denied") {
      updateData.denialReason = args.reason;
    }

    // If agent found a corrected link, update the procurementLink
    if (args.correctedLink && args.status === "approved") {
      updateData.procurementLink = args.correctedLink;
    }

    await ctx.db.patch(args.id, updateData);
    
    // If approved, refresh the lookup table
    if (args.status === "approved") {
      await refreshLookupHelper(ctx, "AI Agent");
    }
  },
});

/**
 * Update AI review status
 * Internal mutation to track AI processing status
 */
export const updateAiReviewStatus = internalMutation({
  args: {
    id: v.id("procurementUrls"),
    status: v.union(v.literal("idle"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      aiReviewStatus: args.status,
      lastAgentAttempt: Date.now(),
    });
  },
});

/**
 * Migration: Reset all AI-denied or AI-failed links back to pending
 * This is used to recover from errors where the AI agent incorrectly denied links
 * or encountered errors during verification (e.g., Chrome not installed).
 * 
 * Resets links that:
 * 1. Were explicitly denied by AI (verifiedBy === "GPT-5-Mini-Agent" && status === "denied")
 * 2. Have failed AI review status (aiReviewStatus === "failed") - these show "AI Failed" in UI
 */
export const resetAiDeniedLinks = mutation({
  args: {
    confirm: v.boolean(),
  },
  returns: v.object({
    reset: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    if (!args.confirm) {
      return {
        reset: 0,
        message: "Migration cancelled. Set confirm to true to proceed.",
      };
    }

    // Find all links that were denied by AI OR have failed AI review status
    // This includes:
    // 1. Links explicitly denied by AI (verifiedBy === "GPT-5-Mini-Agent" && status === "denied")
    // 2. Links with failed AI review status (aiReviewStatus === "failed") - these show "AI Failed" in UI
    const allUrls = await ctx.db.query("procurementUrls").collect();
    const aiDeniedUrls = allUrls.filter(
      (url) => 
        (url.verifiedBy === "GPT-5-Mini-Agent" && url.status === "denied") ||
        url.aiReviewStatus === "failed"
    );

    let resetCount = 0;
    for (const url of aiDeniedUrls) {
      await ctx.db.patch(url._id, {
        status: "pending",
        verifiedBy: undefined,
        verifiedAt: undefined,
        denialReason: undefined,
        aiReviewStatus: "idle", // Reset to idle so AI can try again
        aiDecision: undefined,
        aiReasoning: undefined,
        // Keep lastAgentAttempt for tracking purposes
      });
      resetCount++;
    }

    return {
      reset: resetCount,
      message: `Successfully reset ${resetCount} AI-denied or AI-failed links back to pending status.`,
    };
  },
});

/**
 * Import procurement links from AI chat response.
 * This is used to export links from the chat component to the link verifier.
 * Links are imported as "pending" status for human verification.
 */
export const importFromChatResponse = mutation({
  args: {
    links: v.array(v.object({
      state: v.string(),
      capital: v.string(),
      official_website: v.string(),
      procurement_link: v.string(),
      entity_type: v.optional(v.string()),
      link_type: v.optional(v.string()),
      confidence_score: v.optional(v.number()),
    })),
    sessionId: v.optional(v.id("procurementChatSessions")),
  },
  returns: v.object({
    imported: v.number(),
    skipped: v.number(),
    duplicates: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const importedAt = Date.now();
    let imported = 0;
    let skipped = 0;
    const duplicates: string[] = [];

    for (const link of args.links) {
      // Normalize URLs for comparison (remove trailing slashes, convert to lowercase)
      const normalizeUrl = (url: string) => url.trim().toLowerCase().replace(/\/$/, '');
      const normalizedProcurementLink = normalizeUrl(link.procurement_link);
      
      // Check if this exact procurement link URL already exists
      // This allows state and city links for the same location to both be imported
      const allUrls = await ctx.db
        .query("procurementUrls")
        .collect();
      
      const exactUrlMatch = allUrls.find(
        (existing) => normalizeUrl(existing.procurementLink) === normalizedProcurementLink
      );

      if (exactUrlMatch) {
        skipped++;
        duplicates.push(`${link.state} - ${link.capital} (${link.procurement_link})`);
        continue;
      }

      await ctx.db.insert("procurementUrls", {
        state: link.state,
        capital: link.capital,
        officialWebsite: link.official_website,
        procurementLink: link.procurement_link,
        status: "pending",
        importedAt,
        sourceFile: args.sessionId ? `chat-export-${args.sessionId}` : "chat-export",
        aiReviewStatus: "idle", // New imports start as idle for AI review
      });
      imported++;
    }

    return { imported, skipped, duplicates };
  },
});

