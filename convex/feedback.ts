import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all feedback entries (public query - no auth needed)
export const getAllFeedback = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("feedback"),
      _creationTime: v.number(),
      text: v.string(),
      submittedBy: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const feedback = await ctx.db
      .query("feedback")
      .collect();
    
    // Sort by creation date, newest first
    return feedback.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Submit feedback (public mutation - no auth needed)
export const submitFeedback = mutation({
  args: {
    text: v.string(),
  },
  returns: v.id("feedback"),
  handler: async (ctx, args) => {
    // Try to get user ID if authenticated, but don't require it
    let userId: string | undefined;
    try {
      const identity = await ctx.auth.getUserIdentity();
      userId = identity?.subject;
    } catch {
      // Not authenticated, that's fine - feedback can be anonymous
      userId = undefined;
    }
    
    const feedbackId = await ctx.db.insert("feedback", {
      text: args.text,
      submittedBy: userId,
      createdAt: Date.now(),
    });
    
    return feedbackId;
  },
});

