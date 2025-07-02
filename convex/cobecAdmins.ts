import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";

// Sync cobecadmins from MongoDB cluster to Convex (for initial setup)
export const syncCobecAdminsFromMongoDB = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    syncedCount: v.number(),
  }),
  handler: async (ctx) => {
    try {
      // This is a one-time setup function
      // In a real implementation, you would connect to MongoDB cluster here
      // For now, we'll add the known admin users from the JSON file
      
      const knownAdmins = [
        {
          clerkUserId: "user_2zK3951nbXRIwNsPwKYvVQAj0nu",
          name: "Admin User 0nu",
          email: "user_2zK3951nbXRIwNsPwKYvVQAj0nu@example.com",
          role: "admin"
        },
        {
          clerkUserId: "user_2yeq7o5pXddjNeLFDpoz5tTwkWS",
          name: "Admin User kWS",
          email: "user_2yeq7o5pXddjNeLFDpoz5tTwkWS@example.com",
          role: "admin"
        },
        {
          clerkUserId: "user_2zH6JiYnykjdwTcTpl7sRU0pKtW",
          name: "Admin User KtW",
          email: "user_2zH6JiYnykjdwTcTpl7sRU0pKtW@example.com",
          role: "admin"
        },
        {
          clerkUserId: "user_2yhAe3Cu7CnonTn4wyRUzZIqIaF",
          name: "Admin User qIaF",
          email: "user_2yhAe3Cu7CnonTn4wyRUzZIqIaF@example.com",
          role: "admin"
        }
      ];

      let syncedCount = 0;
      
      for (const admin of knownAdmins) {
        // Check if admin already exists
        const existingAdmin = await ctx.db
          .query("cobecadmins")
          .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", admin.clerkUserId))
          .first();
        
        if (!existingAdmin) {
          await ctx.db.insert("cobecadmins", {
            clerkUserId: admin.clerkUserId,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          syncedCount++;
        }
      }
      
      return {
        success: true,
        message: `Successfully synced ${syncedCount} cobec admins to Convex`,
        syncedCount
      };
    } catch (error) {
      console.error("Error syncing cobec admins:", error);
      return {
        success: false,
        message: `Error syncing cobec admins: ${error instanceof Error ? error.message : 'Unknown error'}`,
        syncedCount: 0
      };
    }
  },
});

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
      
      // First check Convex database
      const adminUser = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
        .first();
      
      if (adminUser) {
        console.log(`✅ User ${userId} found in Convex cobecadmins`);
        return true;
      }
      
      // If not found in Convex, check against known admin list (from MongoDB cluster)
      // This is a temporary solution until we can properly sync the data
      const knownAdmins = [
        "user_2zK3951nbXRIwNsPwKYvVQAj0nu",
        "user_2yeq7o5pXddjNeLFDpoz5tTwkWS", 
        "user_2zH6JiYnykjdwTcTpl7sRU0pKtW",
        "user_2yhAe3Cu7CnonTn4wyRUzZIqIaF"
      ];
      
      const isKnownAdmin = knownAdmins.includes(userId);
      console.log(`🔍 User ${userId} not in Convex, checking known admins: ${isKnownAdmin}`);
      
      if (isKnownAdmin) {
        console.log(`✅ User ${userId} is a known admin from MongoDB cluster`);
      }
      
      return isKnownAdmin;
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
        // Instead of throwing an error, return empty array for initial setup
        // This allows the UI to show the sync option
        console.log(`User ${userId} not found in Convex cobecadmins, returning empty array for initial setup`);
        return [];
      }
      
      const allAdmins = await ctx.db.query("cobecadmins").collect();
      return allAdmins;
    } catch (error) {
      console.error("Error getting all cobec admins:", error);
      // Return empty array instead of throwing error for better UX
      return [];
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
      
      // Check if there are any admins at all in the system
      const totalAdmins = await ctx.db.query("cobecadmins").collect();
      
      // Allow if user is admin OR if this is the first admin being added (initial setup)
      if (!currentUser && totalAdmins.length > 0) {
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

// Get all users from Clerk Admin API (admin only)
export const getClerkUsers = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    fullName: v.string(),
    email: v.string(),
    createdAt: v.number(),
    lastSignInAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    try {
      // Check if current user is a cobec admin
      const userId = await getCurrentUserId(ctx);
      const currentUser = await ctx.db
        .query("cobecadmins")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
        .first();
      
      if (!currentUser) {
        // Check against known admin list for initial setup
        const knownAdmins = [
          "user_2zK3951nbXRIwNsPwKYvVQAj0nu",
          "user_2yeq7o5pXddjNeLFDpoz5tTwkWS", 
          "user_2zH6JiYnykjdwTcTpl7sRU0pKtW",
          "user_2yhAe3Cu7CnonTn4wyRUzZIqIaF"
        ];
        
        if (!knownAdmins.includes(userId)) {
          throw new Error("Unauthorized: Only cobec admins can fetch user list");
        }
      }

      // Get Clerk secret key from environment
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (!clerkSecretKey) {
        throw new Error("CLERK_SECRET_KEY not configured");
      }

      // Fetch users from Clerk Admin API
      const response = await fetch("https://api.clerk.com/v1/users", {
        headers: {
          "Authorization": `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Clerk API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Transform Clerk user data to our format
      const users = data.map((user: any) => ({
        id: user.id,
        fullName: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : user.username || user.email_addresses?.[0]?.email_address || "Unknown User",
        email: user.email_addresses?.[0]?.email_address || "",
        createdAt: new Date(user.created_at).getTime(),
        lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : undefined,
      }));

      return users;
    } catch (error) {
      console.error("Error fetching Clerk users:", error);
      throw error;
    }
  },
}); 