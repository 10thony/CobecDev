import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";

// Check if the current user is in the cobecadmins collection
export const checkIfUserIsCobecAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    try {
      const userId = await getCurrentUserId(ctx);
      
      if (!userId) {
        console.log("No user ID found, returning false for admin check");
        return false;
      }
      
      console.log(`🔍 Checking if user ${userId} is in cobecadmins collection...`);
      
      // Query the cobecadmins collection to check if the user exists
      const adminUser = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
        .first();
      
      const isAdmin = adminUser !== null;
      console.log(`✅ User ${userId} admin status: ${isAdmin}`);
      
      return isAdmin;
    } catch (error) {
      console.error("Error checking cobec admin status:", error);
      return false;
    }
  },
});

// Get the current user's cobec admin information
export const getCurrentUserCobecAdmin = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("cobecadmins"),
      clerkUserId: v.string(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      role: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    try {
      const userId = await getCurrentUserId(ctx);
      
      const adminUser = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
        .first();
      
      return adminUser;
    } catch (error) {
      console.error("Error getting cobec admin user:", error);
      return null;
    }
  },
});

// Get all cobec admins (admin only)
export const getAllCobecAdmins = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("cobecadmins"),
      clerkUserId: v.string(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      role: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    try {
      // Check if current user is a cobec admin
      const userId = await getCurrentUserId(ctx);
      const currentUser = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
        .first();
      
      if (!currentUser) {
        throw new Error("Unauthorized: Only cobec admins can view all admins");
      }
      
      const allAdmins = await ctx.db.query("cobecadmins").collect();
      return allAdmins;
    } catch (error) {
      console.error("Error getting all cobec admins:", error);
      throw error;
    }
  },
});

// Add a new cobec admin (admin only)
export const addCobecAdmin = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  returns: v.id("cobecadmins"),
  handler: async (ctx, args) => {
    try {
      // Check if current user is a cobec admin
      const userId = await getCurrentUserId(ctx);
      const currentUser = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
        .first();
      
      if (!currentUser) {
        throw new Error("Unauthorized: Only cobec admins can add new admins");
      }
      
      // Check if user already exists
      const existingAdmin = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
        .first();
      
      if (existingAdmin) {
        throw new Error("User is already a cobec admin");
      }
      
      const adminId = await ctx.db.insert("cobecadmins", {
        clerkUserId: args.clerkUserId,
        name: args.name,
        email: args.email,
        role: args.role || "admin",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      return adminId;
    } catch (error) {
      console.error("Error adding cobec admin:", error);
      throw error;
    }
  },
});

// Remove a cobec admin (admin only)
export const removeCobecAdmin = mutation({
  args: {
    clerkUserId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    try {
      // Check if current user is a cobec admin
      const userId = await getCurrentUserId(ctx);
      const currentUser = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
        .first();
      
      if (!currentUser) {
        throw new Error("Unauthorized: Only cobec admins can remove admins");
      }
      
      // Find the admin to remove
      const adminToRemove = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
        .first();
      
      if (!adminToRemove) {
        throw new Error("User is not a cobec admin");
      }
      
      // Prevent removing yourself
      if (adminToRemove.clerkUserId === userId) {
        throw new Error("Cannot remove yourself from cobec admins");
      }
      
      await ctx.db.delete(adminToRemove._id);
      return true;
    } catch (error) {
      console.error("Error removing cobec admin:", error);
      throw error;
    }
  },
}); 