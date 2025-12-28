import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Queries
export const getByState = query({
  args: { stateCode: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("govLinks"),
      _creationTime: v.number(),
      title: v.string(),
      url: v.string(),
      stateCode: v.string(),
      stateName: v.string(),
      category: v.string(),
      description: v.optional(v.string()),
      iconUrl: v.optional(v.string()),
      priority: v.optional(v.number()),
      isActive: v.boolean(),
      lastVerified: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("govLinks")
      .withIndex("by_state", (q) => q.eq("stateCode", args.stateCode))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getByStateAndCategory = query({
  args: {
    stateCode: v.string(),
    category: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("govLinks")
      .withIndex("by_state_category", (q) =>
        q.eq("stateCode", args.stateCode).eq("category", args.category)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getAllCategories = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      name: v.string(),
      slug: v.string(),
      icon: v.string(),
      color: v.string(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

export const getStateStats = query({
  args: {},
  returns: v.array(
    v.object({
      stateCode: v.string(),
      count: v.number(),
    })
  ),
  handler: async (ctx) => {
    const links = await ctx.db
      .query("govLinks")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const stats = links.reduce(
      (acc, link) => {
        acc[link.stateCode] = (acc[link.stateCode] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(stats).map(([stateCode, count]) => ({
      stateCode,
      count,
    }));
  },
});

export const getAllActiveLinks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("govLinks"),
      _creationTime: v.number(),
      title: v.string(),
      url: v.string(),
      stateCode: v.string(),
      stateName: v.string(),
      category: v.string(),
      description: v.optional(v.string()),
      iconUrl: v.optional(v.string()),
      priority: v.optional(v.number()),
      isActive: v.boolean(),
      lastVerified: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("govLinks")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Mutations
export const addLink = mutation({
  args: {
    title: v.string(),
    url: v.string(),
    stateCode: v.string(),
    stateName: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  returns: v.id("govLinks"),
  handler: async (ctx, args) => {
    const linkId = await ctx.db.insert("govLinks", {
      ...args,
      isActive: true,
      lastVerified: Date.now(),
    });

    await ctx.db.insert("auditLog", {
      action: "create",
      linkId,
      timestamp: Date.now(),
      details: `Created link: ${args.title}`,
    });

    return linkId;
  },
});

export const updateLink = mutation({
  args: {
    id: v.id("govLinks"),
    title: v.optional(v.string()),
    url: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    await ctx.db.insert("auditLog", {
      action: "update",
      linkId: id,
      timestamp: Date.now(),
      details: `Updated fields: ${Object.keys(updates).join(", ")}`,
    });
  },
});

export const deleteLink = mutation({
  args: { id: v.id("govLinks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);

    await ctx.db.insert("auditLog", {
      action: "delete",
      timestamp: Date.now(),
      details: `Deleted link: ${link?.title}`,
    });
  },
});

// State name to state code mapping
const stateNameToCode: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

/**
 * Clear all existing pins from the government links map
 * This deletes all active links (sets isActive to false for safety)
 */
export const clearAllPins = mutation({
  args: {},
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be authenticated");
    }

    // Get all active links
    const allLinks = await ctx.db
      .query("govLinks")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Delete all active links
    let deletedCount = 0;
    for (const link of allLinks) {
      await ctx.db.delete(link._id);
      deletedCount++;
    }

    // Log the bulk deletion
    await ctx.db.insert("auditLog", {
      action: "bulk_delete",
      timestamp: Date.now(),
      details: `Bulk deleted ${deletedCount} links by user ${identity.subject}`,
    });

    return { deletedCount };
  },
});

/**
 * Bulk import approved procurement links as pins on the government links map
 * This will:
 * 1. Clear all existing pins
 * 2. Create pins for each approved procurement link in the appropriate state
 */
export const bulkImportApprovedProcurementLinks = mutation({
  args: {},
  returns: v.object({
    clearedCount: v.number(),
    importedCount: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be authenticated");
    }

    // Step 1: Clear all existing pins
    const allLinks = await ctx.db
      .query("govLinks")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let clearedCount = 0;
    for (const link of allLinks) {
      await ctx.db.delete(link._id);
      clearedCount++;
    }

    // Step 2: Get all approved procurement links
    const approvedLinks = await ctx.db
      .query("procurementUrls")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    // Step 3: Create pins for each approved link
    let importedCount = 0;
    const errors: string[] = [];

    for (const procurementLink of approvedLinks) {
      try {
        // Map state name to state code
        const stateCode = stateNameToCode[procurementLink.state];
        
        if (!stateCode) {
          errors.push(`Unknown state: ${procurementLink.state} for link ${procurementLink.procurementLink}`);
          continue;
        }

        // Create a title for the pin
        const title = `${procurementLink.state} - ${procurementLink.capital} Procurement`;
        
        // Create description if available
        const description = procurementLink.requiresRegistration 
          ? `Requires registration: ${procurementLink.officialWebsite}`
          : undefined;

        // Insert the pin
        const linkId = await ctx.db.insert("govLinks", {
          title,
          url: procurementLink.procurementLink,
          stateCode,
          stateName: procurementLink.state,
          category: "Solicitations", // Default category for procurement links
          description,
          isActive: true,
          lastVerified: Date.now(),
        });

        importedCount++;

        // Log individual creation (optional, can be removed for performance)
        await ctx.db.insert("auditLog", {
          action: "bulk_create",
          linkId,
          timestamp: Date.now(),
          details: `Bulk imported: ${title}`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import ${procurementLink.procurementLink}: ${errorMessage}`);
      }
    }

    // Log the bulk import operation
    await ctx.db.insert("auditLog", {
      action: "bulk_import",
      timestamp: Date.now(),
      details: `Bulk imported ${importedCount} links from ${approvedLinks.length} approved procurement links by user ${identity.subject}. Errors: ${errors.length}`,
    });

    return {
      clearedCount,
      importedCount,
      errors,
    };
  },
});
