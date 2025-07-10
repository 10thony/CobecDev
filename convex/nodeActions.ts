"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Generate embedding for search query
async function generateQueryEmbedding(query: string) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query.trim(),
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Get OpenAI token parameter for different models
const getOpenAITokenParameter = (modelId: string) => {
  switch (modelId) {
    case "gpt-4":
      return 4096;
    case "gpt-4-turbo":
      return 128000;
    case "gpt-3.5-turbo":
      return 4096;
    default:
      return 4096;
  }
};

// Get Anthropic token parameter for different models
const getAnthropicTokenParameter = (modelId: string) => {
  switch (modelId) {
    case "claude-3-opus-20240229":
      return 200000;
    case "claude-3-sonnet-20240229":
      return 200000;
    case "claude-3-haiku-20240307":
      return 200000;
    default:
      return 100000;
  }
};

// Get Google AI token parameter for different models
const getGoogleAITokenParameter = (modelId: string) => {
  switch (modelId) {
    case "gemini-pro":
      return 30720;
    case "gemini-pro-vision":
      return 30720;
    default:
      return 30720;
  }
};

// Enhanced chat completion with multiple AI models
export const enhancedChatCompletion = internalAction({
  args: {
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      content: v.string(),
    })),
    model: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
    modelId: v.string(),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
  },
  returns: v.object({
    content: v.string(),
    modelUsed: v.string(),
    tokensUsed: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  }),
  handler: async (ctx: any, args: any) => {
    try {
      const temperature = args.temperature || 0.7;
      let maxTokens = args.maxTokens;
      
      // Set default max tokens based on model
      if (!maxTokens) {
        switch (args.model) {
          case "openai":
            maxTokens = getOpenAITokenParameter(args.modelId);
            break;
          case "anthropic":
            maxTokens = getAnthropicTokenParameter(args.modelId);
            break;
          case "google":
            maxTokens = getGoogleAITokenParameter(args.modelId);
            break;
        }
      }
      
      switch (args.model) {
        case "openai":
          const openaiResponse = await openai.chat.completions.create({
            model: args.modelId,
            messages: args.messages,
            temperature,
            max_tokens: maxTokens,
          });
          
          return {
            content: openaiResponse.choices[0].message.content || "",
            modelUsed: args.modelId,
            tokensUsed: openaiResponse.usage?.total_tokens,
            finishReason: openaiResponse.choices[0].finish_reason || undefined,
          };
          
        case "anthropic":
          const anthropicResponse = await anthropic.messages.create({
            model: args.modelId,
            max_tokens: maxTokens,
            temperature,
            messages: args.messages.map((msg: any) => ({
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.content,
            })),
          });
          
          return {
            content: anthropicResponse.content[0].type === "text" ? anthropicResponse.content[0].text : "No text response",
            modelUsed: args.modelId,
            tokensUsed: (anthropicResponse.usage?.input_tokens || 0) + (anthropicResponse.usage?.output_tokens || 0),
            finishReason: anthropicResponse.stop_reason || undefined,
          };
          
        case "google":
          const model = genAI.getGenerativeModel({ model: args.modelId });
          
          const chat = model.startChat({
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          });
          
          const lastMessage = args.messages[args.messages.length - 1];
          const result = await chat.sendMessage(lastMessage.content);
          const response_text = result.response.text();
          
          return {
            content: response_text,
            modelUsed: args.modelId,
            finishReason: "stop",
          };
          
        default:
          throw new Error(`Unsupported model: ${args.model}`);
      }
      
    } catch (error) {
      console.error('Error in enhanced chat completion:', error);
      throw error;
    }
  },
});

// OpenAI message with API key
export const sendOpenAIMessageWithKey = internalAction({
  args: {
    message: v.string(),
    modelId: v.string(),
    apiKey: v.string(),
  },
  returns: v.object({
    content: v.string(),
    modelUsed: v.string(),
    tokensUsed: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  }),
  handler: async (ctx: any, args: any) => {
    try {
      const client = new OpenAI({
        apiKey: args.apiKey,
      });

      const response = await client.chat.completions.create({
        model: args.modelId,
        messages: [{ role: "user", content: args.message }],
        temperature: 0.7,
      });

      return {
        content: response.choices[0].message.content || "No response generated",
        modelUsed: args.modelId,
        tokensUsed: response.usage?.total_tokens,
        finishReason: response.choices[0].finish_reason || undefined,
      };
    } catch (error) {
      console.error('Error in OpenAI message:', error);
      throw new Error(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Anthropic message with API key
export const sendAnthropicMessageWithKey = internalAction({
  args: {
    message: v.string(),
    modelId: v.string(),
    apiKey: v.string(),
  },
  returns: v.object({
    content: v.string(),
    modelUsed: v.string(),
    tokensUsed: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  }),
  handler: async (ctx: any, args: any) => {
    try {
      const client = new Anthropic({
        apiKey: args.apiKey,
      });

      const response = await client.messages.create({
        model: args.modelId,
        max_tokens: 1000,
        messages: [{ role: "user", content: args.message }],
      });

      return {
        content: response.content[0].type === "text" ? response.content[0].text : "No text response",
        modelUsed: args.modelId,
        tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        finishReason: response.stop_reason || undefined,
      };
    } catch (error) {
      console.error('Error in Anthropic message:', error);
      throw new Error(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Google Gemini message with API key
export const sendGeminiMessageWithKey = internalAction({
  args: {
    message: v.string(),
    modelId: v.string(),
    apiKey: v.string(),
  },
  returns: v.object({
    content: v.string(),
    modelUsed: v.string(),
    tokensUsed: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  }),
  handler: async (ctx: any, args: any) => {
    try {
      const client = new GoogleGenerativeAI(args.apiKey);
      const model = client.getGenerativeModel({ model: args.modelId });
      
      const result = await model.generateContent(args.message);
      const response = result.response;
      
      return {
        content: response.text(),
        modelUsed: args.modelId,
        tokensUsed: undefined, // Gemini doesn't provide token usage in this context
        finishReason: "stop", // Default for Gemini
      };
    } catch (error) {
      console.error('Error in Google AI message:', error);
      throw new Error(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Generate embeddings for text
export const generateEmbeddings = internalAction({
  args: {
    text: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.array(v.number()),
  handler: async (ctx: any, args: any) => {
    try {
      const model = args.model || 'text-embedding-ada-002';
      const embedding = await generateQueryEmbedding(args.text);
      return embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  },
});

// Calculate similarity between two texts
export const calculateSimilarity = internalAction({
  args: {
    text1: v.string(),
    text2: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx: any, args: any) => {
    try {
      const [embedding1, embedding2] = await Promise.all([
        generateQueryEmbedding(args.text1),
        generateQueryEmbedding(args.text2),
      ]);
      
      return cosineSimilarity(embedding1, embedding2);
    } catch (error) {
      console.error('Error calculating similarity:', error);
      throw error;
    }
  },
}); 