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
