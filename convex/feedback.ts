import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Normalization function (same as frontend)
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'whose',
  'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'now', 'then', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')      // Remove punctuation
    .replace(/\s+/g, ' ')          // Collapse whitespace
    .split(' ')
    .filter(word => !STOP_WORDS.has(word) && word.length > 2)
    .sort()
    .join(' ');
}

function detectSentiment(text: string): "positive" | "neutral" | "negative" | "suggestion" {
  const lower = text.toLowerCase();
  if (/love|great|awesome|amazing|thanks|thank|good|helpful|excellent|fantastic|wonderful|perfect/.test(lower)) {
    return 'positive';
  }
  if (/bug|broken|doesn't work|error|crash|issue|problem|fix|broken|fails|fail|wrong|bad|terrible|horrible/.test(lower)) {
    return 'negative';
  }
  if (/add|could|should|would be nice|feature|suggestion|please|maybe|consider|wish|hope/.test(lower)) {
    return 'suggestion';
  }
  return 'neutral';
}

function calculateHeat(count: number, lastSubmittedAt: number): number {
  const now = Date.now();
  const daysSinceLastSubmission = (now - lastSubmittedAt) / (24 * 60 * 60 * 1000);
  const recencyFactor = Math.exp(-daysSinceLastSubmission / 7); // 7-day half-life
  return count * recencyFactor;
}

// Get all feedback entries (public query - no auth needed)
export const getAllFeedback = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("feedback"),
      _creationTime: v.number(),
      text: v.string(),
      normalizedText: v.optional(v.string()),
      submittedBy: v.optional(v.string()),
      createdAt: v.number(),
      clusterId: v.optional(v.id("feedbackClusters")),
      sentiment: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
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

// Get all feedback clusters
export const getAllClusters = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("feedbackClusters"),
      _creationTime: v.number(),
      canonicalText: v.string(),
      normalizedKey: v.string(),
      count: v.number(),
      uniqueUsers: v.number(),
      firstSubmittedAt: v.number(),
      lastSubmittedAt: v.number(),
      heat: v.number(),
      position: v.optional(v.object({
        x: v.number(),
        y: v.number(),
      })),
    })
  ),
  handler: async (ctx) => {
    const clusters = await ctx.db
      .query("feedbackClusters")
      .collect();
    
    // Calculate current heat for all clusters (heat is computed on-the-fly)
    // Return sorted by heat (hottest first)
    return clusters
      .map(cluster => ({
        ...cluster,
        heat: calculateHeat(cluster.count, cluster.lastSubmittedAt),
      }))
      .sort((a, b) => b.heat - a.heat);
  },
});

// Submit feedback (public mutation - no auth needed)
export const submitFeedback = mutation({
  args: {
    text: v.string(),
    tags: v.optional(v.array(v.string())),
    sentiment: v.optional(v.string()),
  },
  returns: v.object({
    feedbackId: v.id("feedback"),
    clusterId: v.id("feedbackClusters"),
    isNewCluster: v.boolean(),
  }),
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
    
    const normalized = normalizeText(args.text);
    const detectedSentiment = args.sentiment || detectSentiment(args.text);
    const now = Date.now();
    
    // Check for existing cluster with same normalized key
    const existingCluster = await ctx.db
      .query("feedbackClusters")
      .withIndex("by_normalized_key", (q) => q.eq("normalizedKey", normalized))
      .first();
    
    let clusterId: Id<"feedbackClusters">;
    let isNewCluster = false;
    
    if (existingCluster) {
      // Update existing cluster
      clusterId = existingCluster._id;
      
      // Get unique users count
      const existingFeedback = await ctx.db
        .query("feedback")
        .withIndex("by_cluster", (q) => q.eq("clusterId", clusterId))
        .collect();
      
      const uniqueUsers = new Set(
        existingFeedback
          .map(f => f.submittedBy)
          .filter((id): id is string => !!id)
      );
      if (userId) {
        uniqueUsers.add(userId);
      }
      
      const newHeat = calculateHeat(existingCluster.count + 1, now);
      
      await ctx.db.patch(clusterId, {
        count: existingCluster.count + 1,
        uniqueUsers: uniqueUsers.size,
        lastSubmittedAt: now,
        heat: newHeat,
      });
    } else {
      // Create new cluster
      isNewCluster = true;
      clusterId = await ctx.db.insert("feedbackClusters", {
        canonicalText: args.text,
        normalizedKey: normalized,
        count: 1,
        uniqueUsers: userId ? 1 : 0,
        firstSubmittedAt: now,
        lastSubmittedAt: now,
        heat: calculateHeat(1, now),
      });
    }
    
    // Insert feedback entry
    const feedbackId = await ctx.db.insert("feedback", {
      text: args.text,
      normalizedText: normalized,
      submittedBy: userId,
      createdAt: now,
      clusterId,
      sentiment: detectedSentiment,
      tags: args.tags || [],
    });
    
    return {
      feedbackId,
      clusterId,
      isNewCluster,
    };
  },
});

// "Me too" - increment cluster count without creating new feedback entry
export const meToo = mutation({
  args: {
    clusterId: v.id("feedbackClusters"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Try to get user ID if authenticated
    let userId: string | undefined;
    try {
      const identity = await ctx.auth.getUserIdentity();
      userId = identity?.subject;
    } catch {
      userId = undefined;
    }
    
    const cluster = await ctx.db.get(args.clusterId);
    if (!cluster) {
      throw new Error("Cluster not found");
    }
    
    // Check if user already submitted feedback in this cluster
    if (userId) {
      const existingFeedback = await ctx.db
        .query("feedback")
        .withIndex("by_cluster", (q) => q.eq("clusterId", args.clusterId))
        .filter((q) => q.eq("submittedBy", userId))
        .first();
      
      if (existingFeedback) {
        // User already submitted, don't increment
        return null;
      }
    }
    
    // Get unique users count
    const existingFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_cluster", (q) => q.eq("clusterId", args.clusterId))
      .collect();
    
    const uniqueUsers = new Set(
      existingFeedback
        .map(f => f.submittedBy)
        .filter((id): id is string => !!id)
    );
    if (userId) {
      uniqueUsers.add(userId);
    }
    
    const now = Date.now();
    const newHeat = calculateHeat(cluster.count + 1, now);
    
    // Update cluster
    await ctx.db.patch(args.clusterId, {
      count: cluster.count + 1,
      uniqueUsers: uniqueUsers.size,
      lastSubmittedAt: now,
      heat: newHeat,
    });
    
    // Create a feedback entry for "me too" (optional, but helps track)
    if (userId) {
      await ctx.db.insert("feedback", {
        text: cluster.canonicalText, // Use canonical text
        normalizedText: cluster.normalizedKey,
        submittedBy: userId,
        createdAt: now,
        clusterId: args.clusterId,
        sentiment: undefined, // Inherit from cluster
        tags: [],
      });
    }
    
    return null;
  },
});

// Update cluster position (for physics simulation)
export const updateClusterPosition = mutation({
  args: {
    clusterId: v.id("feedbackClusters"),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clusterId, {
      position: args.position,
    });
    return null;
  },
});
