import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all visible public navigation items, ordered by order field
export const getVisible = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("publicNavigationItems")
      .withIndex("by_visible", (q) => q.eq("isVisible", true))
      .collect();

    // Sort by order field
    return items.sort((a, b) => a.order - b.order);
  },
});

// Get all public navigation items (admin only - includes hidden items)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("publicNavigationItems")
      .collect();

    // Sort by order field
    return items.sort((a, b) => a.order - b.order);
  },
});

// Create a new public navigation item
export const create = mutation({
  args: {
    path: v.string(),
    label: v.string(),
    icon: v.string(),
    order: v.number(),
    isVisible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("publicNavigationItems", {
      path: args.path,
      label: args.label,
      icon: args.icon,
      order: args.order,
      isVisible: args.isVisible,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Update a public navigation item
export const update = mutation({
  args: {
    id: v.id("publicNavigationItems"),
    path: v.optional(v.string()),
    label: v.optional(v.string()),
    icon: v.optional(v.string()),
    order: v.optional(v.number()),
    isVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Navigation item not found");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a public navigation item
export const remove = mutation({
  args: {
    id: v.id("publicNavigationItems"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Initialize default navigation items
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if any items already exist
    const existing = await ctx.db.query("publicNavigationItems").collect();
    if (existing.length > 0) {
      return { message: "Default items already exist" };
    }

    const now = Date.now();
    const defaults = [
      { path: "/", label: "Procurement Links", icon: "Globe", order: 0, isVisible: true },
      { path: "/government-links", label: "Government Links", icon: "Map", order: 1, isVisible: true },
    ];

    const ids: Id<"publicNavigationItems">[] = [];
    for (const item of defaults) {
      const id = await ctx.db.insert("publicNavigationItems", {
        ...item,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }

    return { message: "Default items initialized", ids };
  },
});
