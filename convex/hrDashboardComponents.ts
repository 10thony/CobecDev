import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";

// Check if user is admin
async function checkAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getCurrentUserId(ctx);
  
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  
  const isCobecAdmin = await ctx.db
    .query("cobecadmins")
    .withIndex("by_clerkUserId", (q: any) => q.eq("clerkUserId", userId))
    .first();
  
  if (!userRole || userRole.role !== "admin") {
    if (!isCobecAdmin) {
      throw new Error("Admin access required");
    }
  }
}

// Get all HR dashboard component visibility settings
export const getAllComponents = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("hrDashboardComponents"),
      componentId: v.string(),
      componentName: v.string(),
      isVisible: v.boolean(),
      requiresAuth: v.optional(v.boolean()),
      description: v.optional(v.string()),
      order: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      _creationTime: v.optional(v.number()), // Convex automatically adds this field
    })
  ),
  handler: async (ctx) => {
    const components = await ctx.db
      .query("hrDashboardComponents")
      .collect();
    
    // Sort by order if available, otherwise by creation time
    return components.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.createdAt - b.createdAt;
    });
  },
});

// Get visible components only (for HR dashboard page)
export const getVisibleComponents = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const components = await ctx.db
      .query("hrDashboardComponents")
      .withIndex("by_visible", (q) => q.eq("isVisible", true))
      .collect();
    
    // Return sorted component IDs
    return components
      .sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.createdAt - b.createdAt;
      })
      .map(c => c.componentId);
  },
});

// Set component visibility (admin only)
export const setComponentVisibility = mutation({
  args: {
    componentId: v.string(),
    isVisible: v.boolean(),
  },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    
    const existing = await ctx.db
      .query("hrDashboardComponents")
      .withIndex("by_component_id", (q) => q.eq("componentId", args.componentId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        isVisible: args.isVisible,
        updatedAt: Date.now(),
      });
    } else {
      // Component doesn't exist yet, create it with default values
      await ctx.db.insert("hrDashboardComponents", {
        componentId: args.componentId,
        componentName: args.componentId, // Default name, should be updated
        isVisible: args.isVisible,
        requiresAuth: true, // Default to requiring auth
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Update component details (admin only)
export const updateComponent = mutation({
  args: {
    componentId: v.string(),
    componentName: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    isVisible: v.optional(v.boolean()),
    requiresAuth: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    
    const existing = await ctx.db
      .query("hrDashboardComponents")
      .withIndex("by_component_id", (q) => q.eq("componentId", args.componentId))
      .first();
    
    const updateData: any = {
      updatedAt: Date.now(),
    };
    
    if (args.componentName !== undefined) {
      updateData.componentName = args.componentName;
    }
    if (args.description !== undefined) {
      updateData.description = args.description;
    }
    if (args.order !== undefined) {
      updateData.order = args.order;
    }
    if (args.isVisible !== undefined) {
      updateData.isVisible = args.isVisible;
    }
    if (args.requiresAuth !== undefined) {
      updateData.requiresAuth = args.requiresAuth;
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, updateData);
    } else {
      // Create new component if it doesn't exist
      await ctx.db.insert("hrDashboardComponents", {
        componentId: args.componentId,
        componentName: args.componentName || args.componentId,
        description: args.description,
        order: args.order,
        isVisible: args.isVisible !== undefined ? args.isVisible : true,
        requiresAuth: args.requiresAuth !== undefined ? args.requiresAuth : true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Initialize default components (admin only)
export const initializeDefaultComponents = mutation({
  args: {},
  handler: async (ctx) => {
    await checkAdmin(ctx);
    
    const defaultComponents = [
      { id: "overview", name: "HR Overview", description: "Job-resume matching and business insights", order: 1, requiresAuth: true },
      { id: "search", name: "Semantic Search", description: "AI-powered search across jobs and resumes", order: 2, requiresAuth: true },
      { id: "leads-management", name: "Leads Management", description: "Manage procurement opportunity leads", order: 3, requiresAuth: true },
      { id: "procurement-links", name: "Procurement Links", description: "Import and verify procurement URLs for the map", order: 4, requiresAuth: false },
      { id: "kfc-management", name: "KFC Management", description: "Manage KFC points and employee nominations", order: 5, requiresAuth: true },
      { id: "data-management", name: "Data Management", description: "Import, export, and manage job postings and resumes", order: 6, requiresAuth: true },
      { id: "embeddings", name: "Embedding Management", description: "Manage AI embeddings and system optimization", order: 7, requiresAuth: true },
    ];
    
    for (const component of defaultComponents) {
      const existing = await ctx.db
        .query("hrDashboardComponents")
        .withIndex("by_component_id", (q) => q.eq("componentId", component.id))
        .first();
      
      if (!existing) {
        await ctx.db.insert("hrDashboardComponents", {
          componentId: component.id,
          componentName: component.name,
          description: component.description,
          isVisible: true,
          requiresAuth: component.requiresAuth,
          order: component.order,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        // Update existing component to include requiresAuth if not set
        if (existing.requiresAuth === undefined) {
          await ctx.db.patch(existing._id, {
            requiresAuth: component.requiresAuth,
            updatedAt: Date.now(),
          });
        }
      }
    }
  },
});

// Get component auth requirement (public query - no auth needed)
export const getComponentAuthRequirement = query({
  args: {
    componentId: v.string(),
  },
  returns: v.union(v.boolean(), v.null()),
  handler: async (ctx, args) => {
    const component = await ctx.db
      .query("hrDashboardComponents")
      .withIndex("by_component_id", (q) => q.eq("componentId", args.componentId))
      .first();
    
    // Default to requiring auth if component doesn't exist or requiresAuth is undefined
    return component?.requiresAuth ?? true;
  },
});

// Bulk update component visibility (admin only)
export const bulkUpdateVisibility = mutation({
  args: {
    updates: v.array(
      v.object({
        componentId: v.string(),
        isVisible: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    
    for (const update of args.updates) {
      const existing = await ctx.db
        .query("hrDashboardComponents")
        .withIndex("by_component_id", (q) => q.eq("componentId", update.componentId))
        .first();
      
      if (existing) {
        await ctx.db.patch(existing._id, {
          isVisible: update.isVisible,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

