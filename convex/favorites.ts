import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get current user ID from Clerk
async function getCurrentUserId(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

// Add a favorite
export const add = mutation({
  args: {
    entityType: v.union(v.literal("resume"), v.literal("jobposting")),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const now = Date.now();

    // Check if favorite already exists
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_entity", (q) => 
        q.eq("userId", userId).eq("entityType", args.entityType)
      )
      .filter((q) => q.eq(q.field("entityId"), args.entityId))
      .first();

    if (existing) {
      return { id: existing._id, alreadyExists: true };
    }

    const favoriteId = await ctx.db.insert("favorites", {
      userId,
      entityType: args.entityType,
      entityId: args.entityId,
      createdAt: now,
    });

    return { id: favoriteId, alreadyExists: false };
  },
});

// Remove a favorite
export const remove = mutation({
  args: {
    entityType: v.union(v.literal("resume"), v.literal("jobposting")),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_entity", (q) => 
        q.eq("userId", userId).eq("entityType", args.entityType)
      )
      .filter((q) => q.eq(q.field("entityId"), args.entityId))
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
      return { success: true };
    }

    return { success: false, notFound: true };
  },
});

// Check if an entity is favorited
export const isFavorited = query({
  args: {
    entityType: v.union(v.literal("resume"), v.literal("jobposting")),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return false;
      }
      
      const fibonacci = await ctx.db
        .query("favorites")
        .withIndex("by_user_entity", (q) => 
          q.eq("userId", identity.subject).eq("entityType", args.entityType)
        )
        .filter((q) => q.eq(q.field("entityId"), args.entityId))
        .first();

      return fibonacci !== null;
    } catch (error) {
      return false;
    }
  },
});

// Get all favorites for current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return [];
      }

      const favorites = await ctx.db
        .query("favorites")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject))
        .order("desc")
        .collect();

      return favorites;
    } catch (error) {
      return [];
    }
  },
});

// Get favorites by entity type
export const listByEntityType = query({
  args: {
    entityType: v.union(v.literal("resume"), v.literal("jobposting")),
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return [];
      }

      const favorites = await ctx.db
        .query("favorites")
        .withIndex("by_user_entity", (q) => 
          q.eq("userId", identity.subject).eq("entityType", args.entityType)
        )
        .order("desc")
        .collect();

      return favorites;
    } catch (error) {
      return [];
    }
  },
});

// Get favorite entity IDs by type
export const getFavoriteIds = query({
  args: {
    entityType: v.union(v.literal("resume"), v.literal("jobposting")),
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return [];
      }

      const favorites = await ctx.db
        .query("favorites")
        .withIndex("by_user_entity", (q) => 
          q.eq("userId", identity.subject).eq("entityType", args.entityType)
        )
        .order("desc")
        .collect();

      return favorites.map((f) => f.entityId);
    } catch (error) {
      return [];
    }
  },
});

