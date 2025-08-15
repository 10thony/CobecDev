"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI with MRL 2048 model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

/**
 * Generate embedding using Gemini text-embedding-004 model
 * This model produces 768-dimensional vectors optimized for semantic search
 * (We accept both 768 and 2048 dimensions for flexibility)
 */
export const generateEmbedding = action({
  args: {
    text: v.string(),
    model: v.optional(v.literal("gemini-mrl-2048")),
  },
  handler: async (ctx, { text, model = "gemini-mrl-2048" }): Promise<{
    embedding: number[];
    model: string;
    dimensions: number;
    generatedAt: number;
  }> => {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY environment variable not set. Please set it in your Convex dashboard under Settings > Environment Variables.");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Empty text provided for embedding");
    }

    try {
      // Use the text-embedding-004 model which produces 2048-dimensional vectors
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      
      // Generate embedding
      const result = await embeddingModel.embedContent(text.trim());
      const embedding = result.embedding;
      
      // Validate embedding dimensions - accept both 768 and 2048 for flexibility
      if (!embedding.values || (embedding.values.length !== 768 && embedding.values.length !== 2048)) {
        throw new Error(`Invalid embedding dimensions. Expected 768 or 2048, got ${embedding.values?.length || 0}`);
      }

      return {
        embedding: embedding.values,
        model: model,
        dimensions: embedding.values.length,
        generatedAt: Date.now()
      };
    } catch (error) {
      console.error("Error generating Gemini embedding:", error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Calculate cosine similarity between two vectors
 */
export const calculateCosineSimilarity = action({
  args: {
    vectorA: v.array(v.number()),
    vectorB: v.array(v.number()),
  },
  handler: async (ctx, { vectorA, vectorB }): Promise<number> => {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  },
});
