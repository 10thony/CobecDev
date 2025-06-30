import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";

// Check if user is admin
async function requireAdmin(ctx: QueryCtx) {
  const userId = await getCurrentUserId(ctx);
  
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  
  if (!userRole || userRole.role !== "admin") {
    throw new Error("Admin access required");
  }
  
  return userId;
}

// Get all active AI models
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiModels")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get all AI models (admin only)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("aiModels").collect();
  },
});

// Create new AI model (admin only)
export const create = mutation({
  args: {
    name: v.string(),
    provider: v.string(),
    modelId: v.string(),
    apiKeyEnvVar: v.string(),
    description: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    helpLinks: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      description: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    return await ctx.db.insert("aiModels", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  },
});

// Update AI model (admin only)
export const update = mutation({
  args: {
    id: v.id("aiModels"),
    name: v.optional(v.string()),
    provider: v.optional(v.string()),
    modelId: v.optional(v.string()),
    apiKeyEnvVar: v.optional(v.string()),
    description: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    helpLinks: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      description: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },
});

// Delete AI model (admin only)
export const remove = mutation({
  args: { id: v.id("aiModels") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// Seed initial AI models
export const seedModels = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("aiModels").collect();
    if (existing.length > 0) return;

    const models = [
      // OpenAI Models
      {
        name: "GPT-4 Turbo (Latest)",
        provider: "openai",
        modelId: "gpt-4-turbo-preview",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "Latest GPT-4 Turbo model with improved performance",
        isActive: true,
      },
      {
        name: "GPT-4",
        provider: "openai",
        modelId: "gpt-4",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "Most capable GPT-4 model",
        isActive: true,
      },
      {
        name: "GPT-3.5 Turbo",
        provider: "openai",
        modelId: "gpt-3.5-turbo",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "Fast and efficient GPT-3.5 model",
        isActive: true,
      },
      {
        name: "GPT-3.5 Turbo 16K",
        provider: "openai",
        modelId: "gpt-3.5-turbo-16k",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "GPT-3.5 Turbo with extended context window",
        isActive: true,
      },
      // OpenAI o3 Models
      {
        name: "o3-mini",
        provider: "openai",
        modelId: "o3-mini",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "OpenAI's o3-mini model - uses max_completion_tokens parameter",
        isActive: true,
      },
      {
        name: "o3-mini-preview",
        provider: "openai",
        modelId: "o3-mini-preview",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "OpenAI's o3-mini-preview model - uses max_completion_tokens parameter",
        isActive: true,
      },
      // Anthropic Models
      {
        name: "Claude 3 Opus",
        provider: "anthropic",
        modelId: "claude-3-opus-20240229",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        description: "Anthropic's most capable model",
        isActive: true,
      },
      {
        name: "Claude 3 Sonnet",
        provider: "anthropic",
        modelId: "claude-3-sonnet-20240229",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        description: "Balanced performance and speed",
        isActive: true,
      },
      {
        name: "Claude 3 Haiku",
        provider: "anthropic",
        modelId: "claude-3-haiku-20240307",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        description: "Fastest and most compact Claude model",
        isActive: true,
      },
      {
        name: "Claude 2.1",
        provider: "anthropic",
        modelId: "claude-2.1",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        description: "Previous generation Claude model",
        isActive: true,
      },
      // Google Models
      {
        name: "Gemini Pro",
        provider: "google",
        modelId: "gemini-pro",
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
        description: "Google's most capable text generation model",
        isActive: true,
      },
      {
        name: "Gemini Pro Vision",
        provider: "google",
        modelId: "gemini-pro-vision",
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
        description: "Gemini Pro with vision capabilities",
        isActive: true,
      },
      {
        name: "Gemini 1.5 Pro",
        provider: "google",
        modelId: "gemini-1.5-pro",
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
        description: "Latest Gemini 1.5 Pro model",
        isActive: true,
      },
      {
        name: "Gemini 1.5 Pro Vision",
        provider: "google",
        modelId: "gemini-1.5-pro-vision",
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
        description: "Gemini 1.5 Pro with vision capabilities",
        isActive: true,
      },
      // Hugging Face Models
      {
        name: "Mistral 7B Instruct",
        provider: "huggingface",
        modelId: "mistralai/Mistral-7B-Instruct-v0.2",
        apiKeyEnvVar: "HF_API_KEY",
        description: "Mistral AI's 7B instruction-tuned model",
        isActive: true,
      },
      {
        name: "Llama 2 70B Chat",
        provider: "huggingface",
        modelId: "meta-llama/Llama-2-70b-chat-hf",
        apiKeyEnvVar: "HF_API_KEY",
        description: "Meta's large 70B Llama 2 chat model",
        isActive: true,
      },
      {
        name: "FLAN-T5 XXL",
        provider: "huggingface",
        modelId: "google/flan-t5-xxl",
        apiKeyEnvVar: "HF_API_KEY",
        description: "Google's large instruction-tuned T5 model",
        isActive: true,
      },
      {
        name: "BLOOM",
        provider: "huggingface",
        modelId: "bigscience/bloom",
        apiKeyEnvVar: "HF_API_KEY",
        description: "Large multilingual language model",
        isActive: true,
      }
    ];
    for (const model of models) {
      await ctx.db.insert("aiModels", {
        ...model,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  },
});

// Update existing models to match the correct model names
export const updateModelNames = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    // Get all existing models
    const existingModels = await ctx.db.query("aiModels").collect();
    
    // Define the correct model mappings
    const modelUpdates = [
      // OpenAI Models
      { oldId: "gpt-4", newId: "gpt-4", newName: "GPT-4" },
      { oldId: "gpt-3.5-turbo", newId: "gpt-3.5-turbo", newName: "GPT-3.5 Turbo" },
      { oldId: "gpt-4-turbo", newId: "gpt-4-turbo-preview", newName: "GPT-4 Turbo (Latest)" },
      { oldId: "gpt-3.5-turbo-16k", newId: "gpt-3.5-turbo-16k", newName: "GPT-3.5 Turbo 16K" },
      
      // Anthropic Models
      { oldId: "claude-3-sonnet", newId: "claude-3-sonnet-20240229", newName: "Claude 3 Sonnet" },
      { oldId: "claude-3-opus", newId: "claude-3-opus-20240229", newName: "Claude 3 Opus" },
      { oldId: "claude-3-haiku", newId: "claude-3-haiku-20240307", newName: "Claude 3 Haiku" },
      { oldId: "claude-2.1", newId: "claude-2.1", newName: "Claude 2.1" },
      
      // Google Models
      { oldId: "gemini-pro", newId: "gemini-pro", newName: "Gemini Pro" },
      { oldId: "gemini-pro-vision", newId: "gemini-pro-vision", newName: "Gemini Pro Vision" },
      { oldId: "gemini-1.5-pro", newId: "gemini-1.5-pro", newName: "Gemini 1.5 Pro" },
      { oldId: "gemini-1.5-pro-vision", newId: "gemini-1.5-pro-vision", newName: "Gemini 1.5 Pro Vision" },
      
      // Hugging Face Models
      { oldId: "llama2", newId: "meta-llama/Llama-2-70b-chat-hf", newName: "Llama 2 70B Chat" },
      { oldId: "mistral", newId: "mistralai/Mistral-7B-Instruct-v0.2", newName: "Mistral 7B Instruct" },
      { oldId: "codellama", newId: "meta-llama/Llama-2-70b-chat-hf", newName: "Llama 2 70B Chat" },
      { oldId: "phi-2", newId: "bigscience/bloom", newName: "BLOOM" },
    ];
    
    // Update each existing model
    for (const model of existingModels) {
      const update = modelUpdates.find(u => u.oldId === model.modelId);
      if (update) {
        await ctx.db.patch(model._id, {
          modelId: update.newId,
          name: update.newName,
          updatedAt: Date.now()
        });
      }
    }
  },
});

// Reset and reseed all models (admin only)
export const resetAndReseedModels = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    // Delete all existing models
    const existingModels = await ctx.db.query("aiModels").collect();
    for (const model of existingModels) {
      await ctx.db.delete(model._id);
    }
    
    // Recreate models with the correct names
    const models = [
      // OpenAI Models
      {
        name: "GPT-4 Turbo (Latest)",
        provider: "openai",
        modelId: "gpt-4-turbo-preview",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "Latest GPT-4 Turbo model with improved performance",
        isActive: true,
      },
      {
        name: "GPT-4",
        provider: "openai",
        modelId: "gpt-4",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "Most capable GPT-4 model",
        isActive: true,
      },
      {
        name: "GPT-3.5 Turbo",
        provider: "openai",
        modelId: "gpt-3.5-turbo",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "Fast and efficient GPT-3.5 model",
        isActive: true,
      },
      {
        name: "GPT-3.5 Turbo 16K",
        provider: "openai",
        modelId: "gpt-3.5-turbo-16k",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "GPT-3.5 Turbo with extended context window",
        isActive: true,
      },
      // OpenAI o3 Models
      {
        name: "o3-mini",
        provider: "openai",
        modelId: "o3-mini",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "OpenAI's o3-mini model - uses max_completion_tokens parameter",
        isActive: true,
      },
      {
        name: "o3-mini-preview",
        provider: "openai",
        modelId: "o3-mini-preview",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "OpenAI's o3-mini-preview model - uses max_completion_tokens parameter",
        isActive: true,
      },
      // Anthropic Models
      {
        name: "Claude 3 Opus",
        provider: "anthropic",
        modelId: "claude-3-opus-20240229",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        description: "Anthropic's most capable model",
        isActive: true,
      },
      {
        name: "Claude 3 Sonnet",
        provider: "anthropic",
        modelId: "claude-3-sonnet-20240229",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        description: "Balanced performance and speed",
        isActive: true,
      },
      {
        name: "Claude 3 Haiku",
        provider: "anthropic",
        modelId: "claude-3-haiku-20240307",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        description: "Fastest and most compact Claude model",
        isActive: true,
      },
      {
        name: "Claude 2.1",
        provider: "anthropic",
        modelId: "claude-2.1",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        description: "Previous generation Claude model",
        isActive: true,
      },
      // Google Models
      {
        name: "Gemini Pro",
        provider: "google",
        modelId: "gemini-pro",
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
        description: "Google's most capable text generation model",
        isActive: true,
      },
      {
        name: "Gemini Pro Vision",
        provider: "google",
        modelId: "gemini-pro-vision",
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
        description: "Gemini Pro with vision capabilities",
        isActive: true,
      },
      {
        name: "Gemini 1.5 Pro",
        provider: "google",
        modelId: "gemini-1.5-pro",
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
        description: "Latest Gemini 1.5 Pro model",
        isActive: true,
      },
      {
        name: "Gemini 1.5 Pro Vision",
        provider: "google",
        modelId: "gemini-1.5-pro-vision",
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
        description: "Gemini 1.5 Pro with vision capabilities",
        isActive: true,
      },
      // Hugging Face Models
      {
        name: "Mistral 7B Instruct",
        provider: "huggingface",
        modelId: "mistralai/Mistral-7B-Instruct-v0.2",
        apiKeyEnvVar: "HF_API_KEY",
        description: "Mistral AI's 7B instruction-tuned model",
        isActive: true,
      },
      {
        name: "Llama 2 70B Chat",
        provider: "huggingface",
        modelId: "meta-llama/Llama-2-70b-chat-hf",
        apiKeyEnvVar: "HF_API_KEY",
        description: "Meta's large 70B Llama 2 chat model",
        isActive: true,
      },
      {
        name: "FLAN-T5 XXL",
        provider: "huggingface",
        modelId: "google/flan-t5-xxl",
        apiKeyEnvVar: "HF_API_KEY",
        description: "Google's large instruction-tuned T5 model",
        isActive: true,
      },
      {
        name: "BLOOM",
        provider: "huggingface",
        modelId: "bigscience/bloom",
        apiKeyEnvVar: "HF_API_KEY",
        description: "Large multilingual language model",
        isActive: true,
      }
    ];
    
    for (const model of models) {
      await ctx.db.insert("aiModels", {
        ...model,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  },
});
