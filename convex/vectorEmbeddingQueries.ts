import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Store user query for future prompt learning
 */
export const storeUserQuery = mutation({
  args: {
    query: v.string(),
    promptsUsed: v.array(v.string()),
    confidence: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, { query, promptsUsed, confidence, timestamp }): Promise<void> => {
    try {
      // Store user query for future prompt learning
      await ctx.db.insert("userQueries", {
        query,
        promptsUsed,
        confidence,
        timestamp,
        addedToPrompts: false,
      });
    } catch (error) {
      console.error("Error storing user query:", error);
    }
  },
});

/**
 * Update document with new embedding data
 */
export const updateDocumentEmbedding = mutation({
  args: {
    collectionName: v.string(),
    documentId: v.string(),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    embeddingGeneratedAt: v.number(),
    extractedSkills: v.array(v.string()),
    confidence: v.number(),
    promptsUsed: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Find document by identifier
      let document;
      if (args.collectionName === "resumes") {
        document = await ctx.db.query("resumes")
          .filter(q => q.eq(q.field("filename"), args.documentId))
          .first();
      } else {
        document = await ctx.db.query("jobpostings")
          .filter(q => q.eq(q.field("jobTitle"), args.documentId))
          .first();
      }

      if (!document) {
        throw new Error(`Document not found: ${args.documentId}`);
      }

      // Update with new embedding data
      await ctx.db.patch(document._id, {
        embedding: args.embedding,
        embeddingModel: args.embeddingModel,
        embeddingGeneratedAt: args.embeddingGeneratedAt,
        extractedSkills: args.extractedSkills,
      });

      return { success: true, documentId: document._id };
    } catch (error) {
      console.error("Error updating document embedding:", error);
      throw error;
    }
  },
});

/**
 * Get novel user queries for prompt learning
 */
export const getNovelUserQueries = query({
  args: {
    minUsageCount: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { minUsageCount = 3, limit = 50 }): Promise<any[]> => {
    // Get user queries that appear frequently but aren't in static prompts
    const queries: any[] = await ctx.db.query("userQueries")
      .filter(q => q.eq(q.field("addedToPrompts"), false))
      .collect();

    // Group by similar queries and count usage
    const queryGroups = new Map<string, { queries: any[]; count: number }>();
    
    queries.forEach((query: any) => {
      const normalized = query.query.toLowerCase().trim();
      if (queryGroups.has(normalized)) {
        const group = queryGroups.get(normalized)!;
        group.queries.push(query);
        group.count++;
      } else {
        queryGroups.set(normalized, { queries: [query], count: 1 });
      }
    });

    // Return frequently used novel queries
    return Array.from(queryGroups.entries())
      .filter(([_, group]: [string, any]) => group.count >= minUsageCount)
      .sort((a: [string, any], b: [string, any]) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([query, group]: [string, any]) => ({
        query,
        usageCount: group.count,
        firstSeen: Math.min(...group.queries.map((q: any) => q.timestamp)),
        lastSeen: Math.max(...group.queries.map((q: any) => q.timestamp)),
        averageConfidence: group.queries.reduce((sum: number, q: any) => sum + q.confidence, 0) / group.queries.length
      }));
  },
});