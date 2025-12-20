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

// Mutation to ensure admin exists (auto-promotes first user if no admins)
export const ensureAdminExists = mutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const currentUserId = await getCurrentUserId(ctx);
    
    // Check if there are any admins in userRoles table
    const adminRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();
    
    // Check if there are any admins in cobecadmins table
    const cobecAdmins = await ctx.db.query("cobecadmins").collect();
    
    // If no admins exist in either table, promote the current user
    if (adminRoles.length === 0 && cobecAdmins.length === 0) {
      console.log(`No admins found. Auto-promoting user ${currentUserId} to admin.`);
      
      // Check if user already has a role
      const existingRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user", (q) => q.eq("userId", currentUserId))
        .first();
      
      if (existingRole) {
        await ctx.db.patch(existingRole._id, {
          role: "admin",
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("userRoles", {
          userId: currentUserId,
          role: "admin",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      
      // Also add to cobecadmins for consistency
      const existingCobecAdmin = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", currentUserId))
        .first();
      
      if (!existingCobecAdmin) {
        await ctx.db.insert("cobecadmins", {
          clerkUserId: currentUserId,
          role: "admin",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      
      return true; // User was promoted
    }
    
    return false; // Admins already exist
  },
});

// Get all user roles (admin only)
// If no admins exist, allows access to enable auto-promotion
export const getAllUserRoles = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("userRoles"),
      userId: v.string(),
      role: v.union(v.literal("admin"), v.literal("user")),
      createdAt: v.number(),
      updatedAt: v.number(),
      _creationTime: v.optional(v.number()), // Convex automatically adds this field
    })
  ),
  handler: async (ctx) => {
    const currentUserId = await getCurrentUserId(ctx);
    
    // Check if there are any admins in the system
    const adminRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();
    
    const cobecAdmins = await ctx.db.query("cobecadmins").collect();
    
    // If no admins exist, allow access (frontend will call ensureAdminExists mutation)
    if (adminRoles.length === 0 && cobecAdmins.length === 0) {
      console.log("No admins found. Allowing access to enable auto-promotion.");
      // Return empty array - frontend should call ensureAdminExists mutation
      return [];
    }
    
    // Normal admin check
    const currentUserRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .first();
    
    if (!currentUserRole || currentUserRole.role !== "admin") {
      throw new Error("Admin access required");
    }
    
    const allRoles = await ctx.db.query("userRoles").collect();
    return allRoles;
  },
});
