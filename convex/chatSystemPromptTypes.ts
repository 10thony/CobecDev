import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Default types that should exist
const DEFAULT_TYPES = [
  { name: "basic", displayName: "Basic", description: "Default basic chat system prompt", isDefault: true, order: 0 },
  { name: "leads", displayName: "Leads", description: "System prompt for lead generation", isDefault: false, order: 1 },
  { name: "procurementHubs", displayName: "Procurement Hubs", description: "System prompt for procurement hub discovery", isDefault: false, order: 2 },
];

// Get all prompt types
export const list = query({
  args: {},
  handler: async (ctx) => {
    const types = await ctx.db
      .query("chatSystemPromptTypes")
      .withIndex("by_order")
      .collect();
    return types;
  },
});

// Get a single type by ID
export const get = query({
  args: { id: v.id("chatSystemPromptTypes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get a type by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatSystemPromptTypes")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// Get the default type
export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    const types = await ctx.db
      .query("chatSystemPromptTypes")
      .collect();
    return types.find(t => t.isDefault) || types[0] || null;
  },
});

// Create a new prompt type
export const create = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // If setting as default, unset any existing default
    if (args.isDefault) {
      const existingDefault = await ctx.db
        .query("chatSystemPromptTypes")
        .collect();
      
      for (const type of existingDefault) {
        if (type.isDefault) {
          await ctx.db.patch(type._id, {
            isDefault: false,
            updatedAt: now,
          });
        }
      }
    }
    
    // Get max order if not provided
    let order = args.order;
    if (order === undefined) {
      const allTypes = await ctx.db
        .query("chatSystemPromptTypes")
        .withIndex("by_order")
        .collect();
      order = allTypes.length > 0 
        ? Math.max(...allTypes.map(t => t.order)) + 1 
        : 0;
    }
    
    const id = await ctx.db.insert("chatSystemPromptTypes", {
      name: args.name,
      displayName: args.displayName,
      description: args.description,
      isDefault: args.isDefault ?? false,
      order: order,
      createdAt: now,
      updatedAt: now,
    });
    
    return id;
  },
});

// Update an existing prompt type
export const update = mutation({
  args: {
    id: v.id("chatSystemPromptTypes"),
    name: v.optional(v.string()),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { id, ...updates } = args;
    
    // If setting as default, unset any existing default
    if (updates.isDefault) {
      const existingDefault = await ctx.db
        .query("chatSystemPromptTypes")
        .collect();
      
      for (const type of existingDefault) {
        if (type.isDefault && type._id !== id) {
          await ctx.db.patch(type._id, {
            isDefault: false,
            updatedAt: now,
          });
        }
      }
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });
    
    return id;
  },
});

// Delete a prompt type
export const remove = mutation({
  args: { id: v.id("chatSystemPromptTypes") },
  handler: async (ctx, args) => {
    // Check if any prompts are using this type
    const promptsUsingType = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_type", (q) => q.eq("type", args.id))
      .first();
    
    if (promptsUsingType) {
      throw new Error("Cannot delete type: prompts are still using it. Please reassign or delete those prompts first.");
    }
    
    await ctx.db.delete(args.id);
  },
});

// Initialize default types
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existingTypes = await ctx.db
      .query("chatSystemPromptTypes")
      .collect();
    
    const existingNames = new Set(existingTypes.map(t => t.name));
    const created: string[] = [];
    
    for (const defaultType of DEFAULT_TYPES) {
      if (!existingNames.has(defaultType.name)) {
        const id = await ctx.db.insert("chatSystemPromptTypes", {
          name: defaultType.name,
          displayName: defaultType.displayName,
          description: defaultType.description,
          isDefault: defaultType.isDefault,
          order: defaultType.order,
          createdAt: now,
          updatedAt: now,
        });
        created.push(id);
      }
    }
    
    return { created: created.length, ids: created };
  },
});
