import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";
import { components } from "./_generated/api";

// List all chat sessions for the current user
export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    anonymousId: v.optional(v.string()), // For unauthenticated users
  },
  handler: async (ctx, args) => {
    let userId: string | undefined;
    let anonymousId: string | undefined;
    
    try {
      userId = await getCurrentUserId(ctx);
    } catch {
      // Not authenticated - use anonymous ID if provided
      if (args.anonymousId) {
        anonymousId = args.anonymousId;
      } else {
        // Not authenticated and no anonymous ID, return empty array
        return [];
      }
    }
    
    if (userId) {
      // Authenticated user - query by userId
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
    } else if (anonymousId) {
      // Unauthenticated user - query by anonymousId
      const allSessions = await ctx.db
        .query("procurementChatSessions")
        .withIndex("by_anonymous", (q) => q.eq("anonymousId", anonymousId))
        .collect();
      
      if (args.includeArchived) {
        return allSessions.sort((a, b) => b.createdAt - a.createdAt);
      }
      
      return allSessions
        .filter(s => !s.isArchived)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    
    return [];
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
    anonymousId: v.optional(v.string()), // For unauthenticated users
  },
  handler: async (ctx, args) => {
    let userId: string | undefined;
    let anonymousId: string | undefined;
    
    try {
      userId = await getCurrentUserId(ctx);
    } catch {
      // Not authenticated - use anonymous ID if provided
      if (args.anonymousId) {
        anonymousId = args.anonymousId;
      } else {
        throw new Error("Authentication required or anonymousId must be provided");
      }
    }
    
    const now = Date.now();
    
    return await ctx.db.insert("procurementChatSessions", {
      userId,
      anonymousId,
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

// Internal query to get session with threadId
export const getSessionInternal = internalQuery({
  args: { sessionId: v.id("procurementChatSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// Internal mutation to update threadId in session
export const updateThreadId = internalMutation({
  args: {
    sessionId: v.id("procurementChatSessions"),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // If threadId is empty, clear it by setting to undefined
    await ctx.db.patch(args.sessionId, {
      threadId: args.threadId || undefined,
    });
  },
});

// Utility mutation to clear all corrupted threadIds from sessions
// Call this once to clean up any sessions with invalid thread IDs
export const clearCorruptedThreadIds = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    
    // Get all sessions for the current user
    const sessions = await ctx.db
      .query("procurementChatSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    let cleared = 0;
    
    for (const session of sessions) {
      // Clear threadId for all sessions - this forces creation of new threads
      // You could add more specific checks here if needed
      if (session.threadId) {
        await ctx.db.patch(session._id, {
          threadId: undefined,
        });
        cleared++;
      }
    }
    
    return { cleared };
  },
});
