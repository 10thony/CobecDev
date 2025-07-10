import { internalQuery, internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Get model info (internal)
export const getModelInfo = internalQuery({
  args: { modelId: v.id("aiModels") },
  returns: v.union(v.object({
    _id: v.id("aiModels"),
    _creationTime: v.number(),
    name: v.string(),
    provider: v.string(),
    modelId: v.string(),
    apiKeyEnvVar: v.string(),
    isActive: v.boolean(),
    description: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    helpLinks: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      description: v.optional(v.string()),
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.modelId);
  },
});

// Send message with vector search (simplified since search is now client-side)
export const sendMessageWithVectorSearch = internalAction({
  args: {
    message: v.string(),
    modelId: v.string(),
    apiKey: v.string(),
    searchType: v.optional(v.union(v.literal("jobs"), v.literal("resumes"), v.literal("both"))),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      // Since vector search is now handled client-side, we'll just send the message directly
      // Determine provider and call appropriate API
      const provider = getProviderFromModelId(args.modelId);
      let response = "";

      switch (provider) {
        case "openai":
          const openaiResponse = await ctx.runAction(internal.nodeActions.sendOpenAIMessageWithKey, {
            message: args.message,
            modelId: args.modelId,
            apiKey: args.apiKey
          });
          response = openaiResponse.content;
          break;
        case "anthropic":
          const anthropicResponse = await ctx.runAction(internal.nodeActions.sendAnthropicMessageWithKey, {
            message: args.message,
            modelId: args.modelId,
            apiKey: args.apiKey
          });
          response = anthropicResponse.content;
          break;
        case "google":
          const googleResponse = await ctx.runAction(internal.nodeActions.sendGeminiMessageWithKey, {
            message: args.message,
            modelId: args.modelId,
            apiKey: args.apiKey
          });
          response = googleResponse.content;
          break;
        default:
          response = "Sorry, I don't support this model provider yet.";
      }

      return response;
    } catch (error) {
      console.error("Error in sendMessageWithVectorSearch:", error);
      return "Sorry, I encountered an error while processing your request.";
    }
  },
});

// Fetch models for a specific provider using API key
export const fetchModelsForProvider = action({
  args: {
    provider: v.string(),
    apiKey: v.string(),
  },
  returns: v.array(v.object({
    id: v.string(),
    name: v.string(),
    provider: v.string(),
  })),
  handler: async (ctx, args) => {
    try {
      const { provider, apiKey } = args;
      
      switch (provider.toLowerCase()) {
        case "openai":
          return await fetchOpenAIModels(apiKey);
        case "anthropic":
          return await fetchAnthropicModels(apiKey);
        case "google":
          return await fetchGoogleModels(apiKey);
        case "huggingface":
          return await fetchHuggingFaceModels(apiKey);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error("Error fetching models for provider:", error);
      throw new Error(`Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Helper function to fetch OpenAI models
async function fetchOpenAIModels(apiKey: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.data || [];
    
    // Filter for chat completion models and map to our format
    return models
      .filter((model: any) => 
        model.id.startsWith("gpt-") || 
        model.id.startsWith("o1-") || 
        model.id.startsWith("o2-") || 
        model.id.startsWith("o3-")
      )
      .map((model: any) => ({
        id: model.id,
        name: model.id, // OpenAI doesn't provide friendly names, use ID
        provider: "openai",
      }));
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    throw error;
  }
}

// Helper function to fetch Anthropic models
async function fetchAnthropicModels(apiKey: string) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.data || [];
    
    // Filter for Claude models and map to our format
    return models
      .filter((model: any) => model.id.startsWith("claude-"))
      .map((model: any) => ({
        id: model.id,
        name: model.id, // Anthropic doesn't provide friendly names, use ID
        provider: "anthropic",
      }));
  } catch (error) {
    console.error("Error fetching Anthropic models:", error);
    throw error;
  }
}

// Helper function to fetch Google models
async function fetchGoogleModels(apiKey: string) {
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.models || [];
    
    // Filter for Gemini models and map to our format
    return models
      .filter((model: any) => model.name.includes("gemini"))
      .map((model: any) => ({
        id: model.name.split("/").pop() || model.name, // Extract model ID from full name
        name: model.displayName || model.name.split("/").pop() || model.name,
        provider: "google",
      }));
  } catch (error) {
    console.error("Error fetching Google models:", error);
    throw error;
  }
}

// Helper function to fetch Hugging Face models
async function fetchHuggingFaceModels(apiKey: string) {
  try {
    const response = await fetch("https://huggingface.co/api/models?filter=text-generation&sort=downloads&direction=-1&limit=20", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
    }

    const models = await response.json();
    
    // Map to our format
    return models
      .slice(0, 10) // Limit to top 10 models
      .map((model: any) => ({
        id: model.id,
        name: model.id, // Use model ID as name
        provider: "huggingface",
      }));
  } catch (error) {
    console.error("Error fetching Hugging Face models:", error);
    throw error;
  }
}

// Helper function to determine provider from model ID
function getProviderFromModelId(modelId: string): string {
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1-") || modelId.startsWith("o2-") || modelId.startsWith("o3-")) {
    return "openai";
  } else if (modelId.startsWith("claude-")) {
    return "anthropic";
  } else if (modelId.startsWith("gemini-")) {
    return "google";
  } else {
    return "huggingface";
  }
} 