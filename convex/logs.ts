import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserId } from "./auth";

// Create a new log entry
export const createLog = mutation({
  args: {
    action: v.string(),
    type: v.union(v.literal("action"), v.literal("error")),
    details: v.object({
      provider: v.optional(v.string()),
      model: v.optional(v.string()),
      messageId: v.optional(v.id("messages")),
      errorMessage: v.optional(v.string()),
      stackTrace: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    return await ctx.db.insert("logs", {
      userId,
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Get logs for the current user
export const getCurrentUserLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("logs")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(limit);
  },
});

// Get all logs (admin only)
export const getAllLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    
    // Check if user is admin
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    
    if (userRole?.role !== "admin") {
      return [];
    }
    
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("logs")
      .withIndex("by_creation")
      .order("desc")
      .take(limit);
  },
});

// Get logs by type (admin only)
export const getLogsByType = query({
  args: {
    type: v.union(v.literal("action"), v.literal("error")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    
    // Check if user is admin
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    
    if (userRole?.role !== "admin") {
      return [];
    }
    
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("logs")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .take(limit);
  },
}); 