"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import OpenAI from "openai";

// Initialize OpenAI client
const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable not set. Please set it in your Convex dashboard under Settings > Environment Variables.");
  }
  return new OpenAI({ apiKey });
};

/**
 * Generate embedding using OpenAI text-embedding-3-small model
 * This model produces 1536-dimensional vectors optimized for semantic search
 * More cost-effective and reliable than Google AI
 */
export const generateEmbedding = action({
  args: {
    text: v.string(),
    model: v.optional(v.union(v.literal("text-embedding-3-small"), v.literal("text-embedding-3-large"), v.literal("text-embedding-ada-002"))),
  },
  handler: async (ctx, { text, model = "text-embedding-3-small" }): Promise<{
    embedding: number[];
    model: string;
    dimensions: number;
    generatedAt: number;
  }> => {
    if (!text || text.trim().length === 0) {
      throw new Error("Empty text provided for embedding");
    }

    try {
      const openai = getOpenAI();
      
      // Generate embedding using OpenAI
      const response = await openai.embeddings.create({
        model: model,
        input: text.trim(),
      });
      
      const embedding = response.data[0].embedding;
      
      // Validate embedding
      if (!embedding || embedding.length === 0) {
        throw new Error("Received empty embedding from OpenAI");
      }

      return {
        embedding: embedding,
        model: model,
        dimensions: embedding.length,
        generatedAt: Date.now()
      };
    } catch (error) {
      console.error("Error generating OpenAI embedding:", error);
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
