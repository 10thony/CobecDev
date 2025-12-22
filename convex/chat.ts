"use node";
import { internalQuery, internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";



// Send message with vector search (simplified since search is now client-side)
export const sendMessageWithVectorSearch = action({
  args: {
    message: v.string(),
    modelId: v.string(),
    includeVectorSearch: v.optional(v.boolean()),
    searchType: v.optional(v.union(v.literal("jobs"), v.literal("resumes"), v.literal("both"))),
  },
  returns: v.object({
    response: v.string(),
  }),
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
            apiKey: process.env.OPENAI_API_KEY || ""
          });
          response = openaiResponse.content;
          break;
        case "anthropic":
          const anthropicResponse = await ctx.runAction(internal.nodeActions.sendAnthropicMessageWithKey, {
            message: args.message,
            modelId: args.modelId,
            apiKey: process.env.ANTHROPIC_API_KEY || ""
          });
          response = anthropicResponse.content;
          break;
        case "google":
          const googleResponse = await ctx.runAction(internal.nodeActions.sendGeminiMessageWithKey, {
            message: args.message,
            modelId: args.modelId,
            apiKey: process.env.GOOGLE_AI_API_KEY || ""
          });
          response = googleResponse.content;
          break;
        case "openrouter":
          const openrouterResponse = await ctx.runAction(internal.nodeActions.sendOpenRouterMessage, {
            messages: [{ role: "user", content: args.message }],
            modelId: args.modelId,
            apiKey: process.env.OPENROUTER_API_KEY || ""
          });
          response = openrouterResponse.content;
          break;
        default:
          response = "Sorry, I don't support this model provider yet.";
      }

      return { response };
    } catch (error) {
      console.error("Error in sendMessageWithVectorSearch:", error);
      return { response: "Sorry, I encountered an error while processing your request." };
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
    description: v.optional(v.string()),
    pricing: v.optional(v.object({
      prompt: v.number(),
      completion: v.number(),
    })),
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
        case "openrouter":
          return await fetchOpenRouterModels(apiKey);
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

// Helper function to fetch OpenRouter models
async function fetchOpenRouterModels(apiKey: string) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.data || [];
    
    // Filter for Google Gemini models specifically (google/gemini-*)
    // Also include other models if needed, but focus on Google models per spec
    const googleModels = models
      .filter((model: any) => model.id && model.id.startsWith("google/gemini-"))
      .map((model: any) => {
        // Extract pricing information if available
        const pricing = model.pricing;
        const promptPrice = pricing?.prompt || 0;
        const completionPrice = pricing?.completion || 0;
        
        // Use clean model name (pricing shown separately in UI)
        const name = model.name || model.id;
        
        return {
          id: model.id,
          name: name,
          provider: "openrouter",
          description: model.description || undefined,
          pricing: pricing ? {
            prompt: promptPrice,
            completion: completionPrice,
          } : undefined,
        };
      });
    
    return googleModels;
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
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
  } else if (modelId.startsWith("google/") || modelId.startsWith("openrouter/")) {
    return "openrouter";
  } else {
    return "huggingface";
  }
} 