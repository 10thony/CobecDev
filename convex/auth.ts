import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

/**
 * Get the current user's Clerk ID from the request context
 * This function should be used in queries and mutations to get the authenticated user
 */
export const getCurrentUserId = async (ctx: any): Promise<string> => {
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.error("Authentication failed: No user identity found");
      throw new ConvexError("Not authenticated");
    }
    console.log("User authenticated successfully:", identity.subject);
    return identity.subject;
  } catch (error) {
    console.error("Authentication error:", error);
    throw new ConvexError("Not authenticated");
  }
};

/**
 * Query to get the current user's information
 * Returns null if not authenticated
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      userId: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    return {
      userId: identity.subject,
      email: identity.email,
      name: identity.name,
      imageUrl: identity.pictureUrl,
    };
  },
});

/**
 * Query to check if the current user has admin role
 */
export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }
    
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    
    return userRole?.role === "admin";
  },
});

/**
 * Mutation to assign a role to a user (admin only)
 */
export const assignUserRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Check if current user is admin
    const currentUserId = await getCurrentUserId(ctx);
    const currentUserRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .unique();
    
    if (currentUserRole?.role !== "admin") {
      return false;
    }
    
    // Check if user already has a role
    const existingRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    
    if (existingRole) {
      // Update existing role
      await ctx.db.patch(existingRole._id, {
        role: args.role,
        updatedAt: Date.now(),
      });
    } else {
      // Create new role
      await ctx.db.insert("userRoles", {
        userId: args.userId,
        role: args.role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    return true;
  },
});
