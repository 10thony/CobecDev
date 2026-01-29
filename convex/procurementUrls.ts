import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { getCurrentUserId } from "./auth";

// Type for procurement link from JSON
const procurementLinkValidator = v.object({
  state: v.string(),
  capital: v.string(),
  official_website: v.string(),
  procurement_link: v.string(),
  entity_type: v.optional(v.string()),
  link_type: v.optional(v.string()),
  confidence_score: v.optional(v.number()),
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
  approvedBy: string,
): Promise<void> {
  // Get all approved procurement links directly from database
  const approvedLinks = await ctx.db
    .query("procurementUrls")
    .withIndex("by_status", (q) => q.eq("status", "approved"))
    .collect();

  // Transform to lookup format
  // CRITICAL: Use null instead of undefined for optional fields
  const formattedLinks: FormattedLink[] = approvedLinks.map(
    (link: Doc<"procurementUrls">) => ({
      state: link.state,
      capital: link.capital,
      officialWebsite: link.officialWebsite,
      procurementLink: link.procurementLink,
      entityType: null, // Not stored in procurementUrls table
      linkType: null, // Not stored in procurementUrls table
      requiresRegistration: link.requiresRegistration ?? null, // Convert undefined to null
    }),
  );

  const now = Date.now();

  // Check if lookup exists (singleton pattern)
  const existing = await ctx.db.query("approvedProcurementLinksLookUp").first();

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

async function requireProcurementAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const userId = await getCurrentUserId(ctx);

  // Check if there are any admins in the system
  const adminRoles = await ctx.db
    .query("userRoles")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .collect();

  const cobecAdmins = await ctx.db.query("cobecadmins").collect();

  // If no admins exist, allow access so the UI can bootstrap.
  if (adminRoles.length === 0 && cobecAdmins.length === 0) {
    return userId;
  }

  // Check userRoles table
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (userRole?.role === "admin") {
    return userId;
  }

  // Also check cobecadmins table
  const cobecAdmin = await ctx.db
    .query("cobecadmins")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
    .first();

  if (!cobecAdmin) {
    throw new Error("Admin access required");
  }

  return userId;
}

// Queries

/**
 * Get all procurement URLs with optional status filter
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"), v.literal("invalid")),
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("procurementUrls"),
      _creationTime: v.number(),
      state: v.string(),
      capital: v.string(),
      officialWebsite: v.string(),
      procurementLink: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("invalid"),
      ),
      verifiedBy: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
      denialReason: v.optional(v.string()),
      importedAt: v.number(),
      sourceFile: v.optional(v.string()),
      requiresRegistration: v.optional(v.boolean()),
      aiReviewStatus: v.optional(
        v.union(
          v.literal("idle"),
          v.literal("processing"),
          v.literal("completed"),
          v.literal("failed"),
        ),
      ),
      aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
      aiReasoning: v.optional(v.string()),
      lastAgentAttempt: v.optional(v.number()),
    }),
  ),
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
  returns: v.array(
    v.object({
      _id: v.id("procurementUrls"),
      _creationTime: v.number(),
      state: v.string(),
      capital: v.string(),
      officialWebsite: v.string(),
      procurementLink: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("invalid"),
      ),
      verifiedBy: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
      denialReason: v.optional(v.string()),
      importedAt: v.number(),
      sourceFile: v.optional(v.string()),
      requiresRegistration: v.optional(v.boolean()),
      aiReviewStatus: v.optional(
        v.union(
          v.literal("idle"),
          v.literal("processing"),
          v.literal("completed"),
          v.literal("failed"),
        ),
      ),
      aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
      aiReasoning: v.optional(v.string()),
      lastAgentAttempt: v.optional(v.number()),
    }),
  ),
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
  returns: v.array(
    v.object({
      _id: v.id("procurementUrls"),
      _creationTime: v.number(),
      state: v.string(),
      capital: v.string(),
      officialWebsite: v.string(),
      procurementLink: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("invalid"),
      ),
      verifiedBy: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
      denialReason: v.optional(v.string()),
      importedAt: v.number(),
      sourceFile: v.optional(v.string()),
      requiresRegistration: v.optional(v.boolean()),
      aiReviewStatus: v.optional(
        v.union(
          v.literal("idle"),
          v.literal("processing"),
          v.literal("completed"),
          v.literal("failed"),
        ),
      ),
      aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
      aiReasoning: v.optional(v.string()),
      lastAgentAttempt: v.optional(v.number()),
    }),
  ),
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
      return (
        !url.aiReviewStatus ||
        url.aiReviewStatus === "idle" ||
        url.aiReviewStatus === "failed"
      );
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
  returns: v.array(
    v.object({
      _id: v.id("procurementUrls"),
      _creationTime: v.number(),
      state: v.string(),
      capital: v.string(),
      officialWebsite: v.string(),
      procurementLink: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("invalid"),
      ),
      verifiedBy: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
      denialReason: v.optional(v.string()),
      importedAt: v.number(),
      sourceFile: v.optional(v.string()),
      requiresRegistration: v.optional(v.boolean()),
      aiReviewStatus: v.optional(
        v.union(
          v.literal("idle"),
          v.literal("processing"),
          v.literal("completed"),
          v.literal("failed"),
        ),
      ),
      aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
      aiReasoning: v.optional(v.string()),
      lastAgentAttempt: v.optional(v.number()),
    }),
  ),
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
  returns: v.array(
    v.object({
      _id: v.id("procurementUrls"),
      _creationTime: v.number(),
      state: v.string(),
      capital: v.string(),
      officialWebsite: v.string(),
      procurementLink: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("invalid"),
      ),
      verifiedBy: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
      denialReason: v.optional(v.string()),
      importedAt: v.number(),
      sourceFile: v.optional(v.string()),
      requiresRegistration: v.optional(v.boolean()),
      aiReviewStatus: v.optional(
        v.union(
          v.literal("idle"),
          v.literal("processing"),
          v.literal("completed"),
          v.literal("failed"),
        ),
      ),
      aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
      aiReasoning: v.optional(v.string()),
      lastAgentAttempt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("procurementUrls")
      .withIndex("by_state_status", (q) =>
        q.eq("state", args.state).eq("status", "approved"),
      )
      .collect();
  },
});

/**
 * Get count of approved procurement URLs for a specific state
 * Used for displaying procurement link count badges on system prompt cards
 */
export const getApprovedProcurementLinkCountByState = query({
  args: { stateName: v.string() },
  handler: async (ctx, args): Promise<number> => {
    const approvedLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_state_status", (q) =>
        q.eq("state", args.stateName).eq("status", "approved"),
      )
      .collect();
    return approvedLinks.length;
  },
});

/**
 * Get total count of all approved procurement URLs
 * Used for displaying procurement link count badges on default system prompt cards
 */
export const getTotalApprovedProcurementLinkCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const approvedLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    return approvedLinks.length;
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
    invalid: v.number(),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query("procurementUrls").collect();
    return {
      total: all.length,
      pending: all.filter((url) => url.status === "pending").length,
      approved: all.filter((url) => url.status === "approved").length,
      denied: all.filter((url) => url.status === "denied").length,
      invalid: all.filter((url) => url.status === "invalid").length,
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
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"), v.literal("invalid")),
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("procurementUrls"),
      _creationTime: v.number(),
      state: v.string(),
      capital: v.string(),
      officialWebsite: v.string(),
      procurementLink: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("invalid"),
      ),
      verifiedBy: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
      denialReason: v.optional(v.string()),
      importedAt: v.number(),
      sourceFile: v.optional(v.string()),
      requiresRegistration: v.optional(v.boolean()),
      aiReviewStatus: v.optional(
        v.union(
          v.literal("idle"),
          v.literal("processing"),
          v.literal("completed"),
          v.literal("failed"),
        ),
      ),
      aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))),
      aiReasoning: v.optional(v.string()),
      lastAgentAttempt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    let results;

    if (args.status) {
      results = await ctx.db
        .query("procurementUrls")
        .withIndex("by_state_status", (q) =>
          q.eq("state", args.state).eq("status", args.status!),
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
      return results.filter((r) =>
        r.capital.toLowerCase().includes(args.city!.toLowerCase()),
      );
    }

    return results;
  },
});

// Helper function to sanitize URLs from markdown-style links
// Handles cases like "[https://example.com](https://example.com)" -> "https://example.com"
function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") {
    return url;
  }

  // Trim whitespace
  url = url.trim();

  // Check if it's a markdown link format: [text](url)
  const markdownLinkRegex = /^\[([^\]]*)\]\(([^)]+)\)$/;
  const match = url.match(markdownLinkRegex);

  if (match) {
    // Extract URL from parentheses (the actual link)
    return match[2].trim();
  }

  // If not markdown format, return as-is
  return url;
}

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
      // Sanitize URLs to extract from markdown-style links
      const sanitizedOfficialWebsite = sanitizeUrl(link.official_website);
      const sanitizedProcurementLink = sanitizeUrl(link.procurement_link);

      // Check if this state+city combination already exists in any status
      // This allows multiple cities per state (not just capitals)
      const existing = await ctx.db
        .query("procurementUrls")
        .withIndex("by_state_capital", (q) =>
          q.eq("state", link.state).eq("capital", link.capital),
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
        officialWebsite: sanitizedOfficialWebsite,
        procurementLink: sanitizedProcurementLink,
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
    const existing = await ctx.db.get(args.id);

    await ctx.db.patch(args.id, {
      status: "denied",
      verifiedBy: identity?.subject ?? undefined,
      verifiedAt: Date.now(),
      denialReason: args.reason,
    });

    if (existing?.status === "approved") {
      const approvedBy = identity?.subject || "System";
      await refreshLookupHelper(ctx, approvedBy);
    }
  },
});

/**
 * Reset a URL back to pending status
 */
export const resetToPending = mutation({
  args: { id: v.id("procurementUrls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const existing = await ctx.db.get(args.id);

    await ctx.db.patch(args.id, {
      status: "pending",
      verifiedBy: undefined,
      verifiedAt: undefined,
      denialReason: undefined,
    });

    if (existing?.status === "approved") {
      const approvedBy = identity?.subject || "System";
      await refreshLookupHelper(ctx, approvedBy);
    }
  },
});

/**
 * Delete a procurement URL
 */
export const remove = mutation({
  args: { id: v.id("procurementUrls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const existing = await ctx.db.get(args.id);

    await ctx.db.delete(args.id);

    if (existing?.status === "approved") {
      const approvedBy = identity?.subject || "System";
      await refreshLookupHelper(ctx, approvedBy);
    }
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

    const identity = await ctx.auth.getUserIdentity();

    const all = await ctx.db.query("procurementUrls").collect();
    for (const url of all) {
      await ctx.db.delete(url._id);
    }

    if (all.length > 0) {
      const approvedBy = identity?.subject || "System";
      await refreshLookupHelper(ctx, approvedBy);
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
    const existing = await ctx.db.get(id);

    if (!existing) {
      return null;
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined),
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);

      if (existing.status === "approved") {
        const identity = await ctx.auth.getUserIdentity();
        const approvedBy = identity?.subject || "System";
        await refreshLookupHelper(ctx, approvedBy);
      }
    }

    return null;
  },
});

/**
 * Admin-only override mutation.
 * Allows manual editing/clearing of all fields on a procurement URL.
 */
export const adminOverride = mutation({
  args: {
    id: v.id("procurementUrls"),
    state: v.optional(v.string()),
    capital: v.optional(v.string()),
    officialWebsite: v.optional(v.string()),
    procurementLink: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"), v.literal("invalid")),
    ),
    verifiedBy: v.optional(v.union(v.string(), v.null())),
    verifiedAt: v.optional(v.union(v.number(), v.null())),
    denialReason: v.optional(v.union(v.string(), v.null())),
    importedAt: v.optional(v.number()),
    sourceFile: v.optional(v.union(v.string(), v.null())),
    requiresRegistration: v.optional(v.union(v.boolean(), v.null())),
    aiReviewStatus: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.null(),
      ),
    ),
    aiDecision: v.optional(
      v.union(v.literal("approve"), v.literal("deny"), v.null()),
    ),
    aiReasoning: v.optional(v.union(v.string(), v.null())),
    lastAgentAttempt: v.optional(v.union(v.number(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireProcurementAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Procurement URL not found");
    }

    const { id, ...updates } = args;
    const patch: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      patch[key] = value === null ? undefined : value;
    }

    if (Object.keys(patch).length === 0) {
      return null;
    }

    const prevStatus = existing.status;
    const nextStatus = (patch.status ?? prevStatus) as
      | "pending"
      | "approved"
      | "denied";

    await ctx.db.patch(id, patch);

    if (prevStatus === "approved" || nextStatus === "approved") {
      await refreshLookupHelper(ctx, userId);
    }

    return null;
  },
});

/**
 * Manually add a procurement URL with specified status.
 * Used when users manually enter links they have verified themselves.
 */
export const addManual = mutation({
  args: {
    state: v.string(),
    capital: v.string(),
    officialWebsite: v.string(),
    procurementLink: v.string(),
    requiresRegistration: v.optional(v.boolean()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("invalid"),
      ),
    ),
  },
  returns: v.id("procurementUrls"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const now = Date.now();
    const status = args.status || "approved"; // Default to approved for backward compatibility

    // Check if this state+city combination already exists
    // This allows multiple cities per state (not just capitals)
    const existing = await ctx.db
      .query("procurementUrls")
      .withIndex("by_state_capital", (q) =>
        q.eq("state", args.state).eq("capital", args.capital),
      )
      .first();

    if (existing) {
      // Update the existing record instead of creating a duplicate
      const updateData: any = {
        capital: args.capital,
        officialWebsite: args.officialWebsite,
        procurementLink: args.procurementLink,
        status: status,
        verifiedBy: identity?.subject ?? undefined,
        verifiedAt: now,
        // Clear AI decision when manually adding/updating (overrides AI denial)
        aiDecision: undefined,
      };

      if (args.requiresRegistration !== undefined) {
        updateData.requiresRegistration = args.requiresRegistration;
      }

      await ctx.db.patch(existing._id, updateData);

      // Refresh the approved procurement links lookup table only if status is approved
      if (status === "approved") {
        const approvedBy = identity?.subject || "System";
        await refreshLookupHelper(ctx, approvedBy);
      }

      return existing._id;
    }

    // Create a new link with specified status
    const insertData: any = {
      state: args.state,
      capital: args.capital,
      officialWebsite: args.officialWebsite,
      procurementLink: args.procurementLink,
      status: status,
      verifiedBy: identity?.subject ?? undefined,
      verifiedAt: now,
      importedAt: now,
      sourceFile: "manual-entry",
    };

    if (args.requiresRegistration !== undefined) {
      insertData.requiresRegistration = args.requiresRegistration;
    }

    const id = await ctx.db.insert("procurementUrls", insertData);

    // Refresh the approved procurement links lookup table only if status is approved
    if (status === "approved") {
      const approvedBy = identity?.subject || "System";
      await refreshLookupHelper(ctx, approvedBy);
    }

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
    status: v.union(
      v.literal("idle"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
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
        url.aiReviewStatus === "failed",
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
 * Dedupe procurement URLs by procurementLink across all statuses.
 *
 * Duplicate detection matches the chat-import normalization:
 * trim, lowercase, remove trailing slash.
 *
 * Keeps:
 * - Prefer status: approved > pending > denied
 * - Tie-breaker: most recently created (_creationTime)
 *
 * Skips empty/invalid procurementLink values (after normalization).
 */
export const dedupeByProcurementLink = mutation({
  args: {
    confirm: v.boolean(),
  },
  returns: v.object({
    groupsScanned: v.number(),
    groupsDeduped: v.number(),
    removed: v.number(),
    kept: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    if (!args.confirm) {
      return {
        groupsScanned: 0,
        groupsDeduped: 0,
        removed: 0,
        kept: 0,
        message: "Dedupe cancelled. Set confirm to true to proceed.",
      };
    }

    const identity = await ctx.auth.getUserIdentity();
    const approvedBy = identity?.subject || "System";

    const normalizeUrl = (url: string) =>
      url.trim().toLowerCase().replace(/\/$/, "");
    const statusRank = (status: "pending" | "approved" | "denied" | "invalid") => {
      if (status === "approved") return 3;
      if (status === "pending") return 2;
      if (status === "denied") return 1;
      return 0; // invalid
    };

    const allUrls = await ctx.db.query("procurementUrls").collect();

    const groups = new Map<string, Doc<"procurementUrls">[]>();
    for (const url of allUrls) {
      const normalizedProcurementLink = normalizeUrl(url.procurementLink);
      if (!normalizedProcurementLink) {
        continue;
      }

      const existing = groups.get(normalizedProcurementLink);
      if (existing) {
        existing.push(url);
      } else {
        groups.set(normalizedProcurementLink, [url]);
      }
    }

    let groupsDeduped = 0;
    let removed = 0;

    for (const group of groups.values()) {
      if (group.length < 2) {
        continue;
      }

      groupsDeduped++;

      const sorted = [...group].sort((a, b) => {
        const rankDiff = statusRank(b.status) - statusRank(a.status);
        if (rankDiff !== 0) return rankDiff;
        return b._creationTime - a._creationTime;
      });

      const winner = sorted[0];

      for (const loser of sorted.slice(1)) {
        // Repoint procurementData references to the winner before deleting.
        const procurementDataRows = await ctx.db
          .query("procurementData")
          .withIndex("by_procurement_url", (q) =>
            q.eq("procurementUrlId", loser._id),
          )
          .collect();

        for (const row of procurementDataRows) {
          await ctx.db.patch(row._id, { procurementUrlId: winner._id });
        }

        await ctx.db.delete(loser._id);
        removed++;
      }
    }

    if (removed > 0) {
      await refreshLookupHelper(ctx, approvedBy);
    }

    return {
      groupsScanned: groups.size,
      groupsDeduped,
      removed,
      kept: groupsDeduped,
      message:
        removed > 0
          ? `Removed ${removed} duplicate procurement URL${removed === 1 ? "" : "s"} across ${groupsDeduped} URL group${groupsDeduped === 1 ? "" : "s"}.`
          : "No duplicate procurement URLs found.",
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
    links: v.array(
      v.object({
        state: v.string(),
        capital: v.string(),
        official_website: v.string(),
        procurement_link: v.string(),
        entity_type: v.optional(v.string()),
        link_type: v.optional(v.string()),
        confidence_score: v.optional(v.number()),
      }),
    ),
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
      // Sanitize URLs to extract from markdown-style links
      const sanitizedOfficialWebsite = sanitizeUrl(link.official_website);
      const sanitizedProcurementLink = sanitizeUrl(link.procurement_link);

      // Normalize URLs for comparison (remove trailing slashes, convert to lowercase)
      const normalizeUrl = (url: string) =>
        url.trim().toLowerCase().replace(/\/$/, "");
      const normalizedProcurementLink = normalizeUrl(sanitizedProcurementLink);

      // Check if this exact procurement link URL already exists
      // This allows state and city links for the same location to both be imported
      const allUrls = await ctx.db.query("procurementUrls").collect();

      const exactUrlMatch = allUrls.find(
        (existing) =>
          normalizeUrl(existing.procurementLink) === normalizedProcurementLink,
      );

      if (exactUrlMatch) {
        skipped++;
        duplicates.push(
          `${link.state} - ${link.capital} (${sanitizedProcurementLink})`,
        );
        continue;
      }

      await ctx.db.insert("procurementUrls", {
        state: link.state,
        capital: link.capital,
        officialWebsite: sanitizedOfficialWebsite,
        procurementLink: sanitizedProcurementLink,
        status: "pending",
        importedAt,
        sourceFile: args.sessionId
          ? `chat-export-${args.sessionId}`
          : "chat-export",
        aiReviewStatus: "idle", // New imports start as idle for AI review
      });
      imported++;
    }

    return { imported, skipped, duplicates };
  },
});
