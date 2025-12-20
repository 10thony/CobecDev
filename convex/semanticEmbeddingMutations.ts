import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Mutation to update document with semantic embedding
 */
export const updateDocumentWithSemanticEmbedding = mutation({
  args: {
    documentId: v.string(),
    collection: v.union(v.literal("jobpostings"), v.literal("resumes")),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    embeddingGeneratedAt: v.number(),
    enhancedText: v.string(),
    semanticAnswers: v.array(v.object({
      question: v.string(),
      answer: v.string(),
      weight: v.number()
    })),
    questionsUsed: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Find the document by ID
      const documents = await ctx.db.query(args.collection).collect();
      const document = documents.find(d => d._id === args.documentId);

      if (!document) {
        throw new Error(`Document ${args.documentId} not found in ${args.collection}`);
      }

      // Update with new embedding and semantic data
      await ctx.db.patch(document._id, {
        embedding: args.embedding,
        embeddingModel: args.embeddingModel,
        embeddingGeneratedAt: args.embeddingGeneratedAt,
        completeSearchableText: args.enhancedText,
        updatedAt: Date.now()
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating document with semantic embedding:", error);
      throw error;
    }
  },
});

