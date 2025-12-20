import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";

// Response data validator for reuse
const responseDataValidator = v.object({
  search_metadata: v.object({
    target_regions: v.array(v.string()),
    count_found: v.number(),
    timestamp: v.optional(v.string()),
  }),
  procurement_links: v.array(v.object({
    state: v.string(),
    capital: v.string(),
    official_website: v.string(),
    procurement_link: v.string(),
    entity_type: v.optional(v.string()),
    link_type: v.optional(v.string()),
    confidence_score: v.optional(v.number()),
  })),
});

// Get all messages for a chat session
export const list = query({
  args: { sessionId: v.id("procurementChatSessions") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      return [];
    }
    
    return await ctx.db
      .query("procurementChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

// Add a user message to a session
export const addUserMessage = mutation({
  args: {
    sessionId: v.id("procurementChatSessions"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Chat session not found");
    }
    
    const now = Date.now();
    
    // Update session's lastMessageAt
    await ctx.db.patch(args.sessionId, {
      lastMessageAt: now,
      updatedAt: now,
    });
    
    // Auto-update title if this is the first message and title is default
    if (session.title === "New Procurement Search") {
      // Generate a title from the first 50 chars of the prompt
      const newTitle = args.content.substring(0, 50) + (args.content.length > 50 ? "..." : "");
      await ctx.db.patch(args.sessionId, { title: newTitle });
    }
    
    return await ctx.db.insert("procurementChatMessages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.content,
      createdAt: now,
    });
  },
});

// Add an assistant response to a session
export const addAssistantMessage = mutation({
  args: {
    sessionId: v.id("procurementChatSessions"),
    content: v.string(),
    responseData: v.optional(responseDataValidator),
    isError: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Chat session not found");
    }
    
    const now = Date.now();
    
    // Update session's lastMessageAt
    await ctx.db.patch(args.sessionId, {
      lastMessageAt: now,
      updatedAt: now,
    });
    
    return await ctx.db.insert("procurementChatMessages", {
      sessionId: args.sessionId,
      role: "assistant",
      content: args.content,
      responseData: args.responseData,
      isError: args.isError,
      createdAt: now,
    });
  },
});

// Internal mutation for adding assistant message (used by actions)
export const addAssistantMessageInternal = internalMutation({
  args: {
    sessionId: v.id("procurementChatSessions"),
    content: v.string(),
    responseData: v.optional(responseDataValidator),
    isError: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Update session's lastMessageAt
    await ctx.db.patch(args.sessionId, {
      lastMessageAt: now,
      updatedAt: now,
    });
    
    return await ctx.db.insert("procurementChatMessages", {
      sessionId: args.sessionId,
      role: "assistant",
      content: args.content,
      responseData: args.responseData,
      isError: args.isError,
      createdAt: now,
    });
  },
});

// Internal mutation to delete a message and its following response (for retry functionality)
export const deleteMessagePairInternal = internalMutation({
  args: {
    messageId: v.id("procurementChatMessages"),
    sessionId: v.id("procurementChatSessions"),
  },
  handler: async (ctx, args) => {
    // Get the message to delete
    const message = await ctx.db.get(args.messageId);
    if (!message || message.sessionId !== args.sessionId) {
      return { deleted: 0 };
    }
    
    // Get all messages in the session
    const allMessages = await ctx.db
      .query("procurementChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
    
    // Find the index of the message to delete
    const messageIndex = allMessages.findIndex((m) => m._id === args.messageId);
    if (messageIndex === -1) {
      return { deleted: 0 };
    }
    
    // Delete the message
    await ctx.db.delete(args.messageId);
    let deleted = 1;
    
    // If this was a user message, also delete the next message if it's an assistant response
    if (message.role === "user" && messageIndex + 1 < allMessages.length) {
      const nextMessage = allMessages[messageIndex + 1];
      if (nextMessage.role === "assistant") {
        await ctx.db.delete(nextMessage._id);
        deleted++;
      }
    }
    
    return { deleted };
  },
});

// Public mutation to delete a message pair (for retry functionality)
export const deleteMessagePair = mutation({
  args: {
    messageId: v.id("procurementChatMessages"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    
    // Verify user owns the session
    const session = await ctx.db.get(message.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Message not found");
    }
    
    // Get all messages in the session
    const allMessages = await ctx.db
      .query("procurementChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", message.sessionId))
      .order("asc")
      .collect();
    
    // Find the index of the message to delete
    const messageIndex = allMessages.findIndex((m) => m._id === args.messageId);
    if (messageIndex === -1) {
      return { deleted: 0 };
    }
    
    // Delete the message
    await ctx.db.delete(args.messageId);
    let deleted = 1;
    
    // If this was a user message, also delete the next message if it's an assistant response
    if (message.role === "user" && messageIndex + 1 < allMessages.length) {
      const nextMessage = allMessages[messageIndex + 1];
      if (nextMessage.role === "assistant") {
        await ctx.db.delete(nextMessage._id);
        deleted++;
      }
    }
    
    return { deleted };
  },
});

// Get session with recent message preview (for sidebar)
export const getSessionPreview = query({
  args: { sessionId: v.id("procurementChatSessions") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      return null;
    }
    
    // Get the first user message as preview
    const messages = await ctx.db
      .query("procurementChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .take(1);
    
    return {
      ...session,
      preview: messages[0]?.content.substring(0, 100) || "",
    };
  },
});
