import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Type for procurement link from JSON
const procurementLinkValidator = v.object({
  state: v.string(),
  capital: v.string(),
  official_website: v.string(),
  procurement_link: v.string(),
});

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
  })),
  handler: async (ctx) => {
    return await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
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
      // Check if this state already exists in any status
      const existing = await ctx.db
        .query("procurementUrls")
        .withIndex("by_state", (q) => q.eq("state", link.state))
        .first();

      if (existing) {
        skipped++;
        duplicates.push(link.state);
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
    };
    
    if (args.requiresRegistration !== undefined) {
      updateData.requiresRegistration = args.requiresRegistration;
    }
    
    await ctx.db.patch(args.id, updateData);
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
      });
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
    
    // Check if this state already exists
    const existing = await ctx.db
      .query("procurementUrls")
      .withIndex("by_state", (q) => q.eq("state", args.state))
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
      };
      
      if (args.requiresRegistration !== undefined) {
        updateData.requiresRegistration = args.requiresRegistration;
      }
      
      await ctx.db.patch(existing._id, updateData);
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
    });
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
      // Check if this state + capital combination already exists
      const existingByState = await ctx.db
        .query("procurementUrls")
        .withIndex("by_state", (q) => q.eq("state", link.state))
        .collect();
      
      // Check for exact match (same state and capital)
      const exactMatch = existingByState.find(
        (existing) => existing.capital.toLowerCase() === link.capital.toLowerCase()
      );

      if (exactMatch) {
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
        sourceFile: args.sessionId ? `chat-export-${args.sessionId}` : "chat-export",
      });
      imported++;
    }

    return { imported, skipped, duplicates };
  },
});

