import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";

// Get current user's role
export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    return userRole?.role || "user";
  },
});

// Set user role (admin only)
export const setUserRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    
    const currentUserRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .first();
    
    if (!currentUserRole || currentUserRole.role !== "admin") {
      throw new Error("Admin access required");
    }
    
    const existingRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (existingRole) {
      await ctx.db.patch(existingRole._id, { 
        role: args.role,
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.insert("userRoles", {
        userId: args.userId,
        role: args.role,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  },
});

// Make current user admin (for initial setup)
export const makeCurrentUserAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    
    const existingRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (existingRole) {
      await ctx.db.patch(existingRole._id, { 
        role: "admin",
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.insert("userRoles", {
        userId, 
        role: "admin",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  },
});
