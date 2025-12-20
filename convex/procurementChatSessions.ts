import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";

// List all chat sessions for the current user
export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    if (args.includeArchived) {
      return await ctx.db
        .query("procurementChatSessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }
    
    return await ctx.db
      .query("procurementChatSessions")
      .withIndex("by_user_archived", (q) => 
        q.eq("userId", userId).eq("isArchived", false)
      )
      .order("desc")
      .collect();
  },
});

// Get a specific chat session
export const get = query({
  args: { id: v.id("procurementChatSessions") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      return null;
    }
    
    return session;
  },
});

// Create a new chat session
export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const now = Date.now();
    
    return await ctx.db.insert("procurementChatSessions", {
      userId,
      title: args.title || "New Procurement Search",
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    });
  },
});

// Update chat session title
export const updateTitle = mutation({
  args: {
    id: v.id("procurementChatSessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error("Chat session not found");
    }
    
    await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

// Archive a chat session
export const archive = mutation({
  args: { id: v.id("procurementChatSessions") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error("Chat session not found");
    }
    
    await ctx.db.patch(args.id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  },
});

// Delete a chat session and all its messages
export const deleteSession = mutation({
  args: { id: v.id("procurementChatSessions") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error("Chat session not found");
    }
    
    // Delete all messages in the session
    const messages = await ctx.db
      .query("procurementChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();
    
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    
    // Delete the session
    await ctx.db.delete(args.id);
  },
});
