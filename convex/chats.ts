import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";

// Get user's chats
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user_archived", (q) => q.eq("userId", userId).eq("isArchived", false))
      .order("desc")
      .collect();
    
    return chats;
  },
});

// Get specific chat
export const get = query({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== userId) {
      return null;
    }
    
    return chat;
  },
});

// Create new chat
export const create = mutation({
  args: {
    title: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    return await ctx.db.insert("chats", {
      userId,
      title: args.title,
      modelId: args.modelId,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  },
});

// Update chat title
export const updateTitle = mutation({
  args: {
    id: v.id("chats"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }
    
    await ctx.db.patch(args.id, { 
      title: args.title,
      updatedAt: Date.now()
    });
  },
});

// Archive chat
export const archive = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }
    
    await ctx.db.patch(args.id, { 
      isArchived: true,
      updatedAt: Date.now()
    });
  },
});
