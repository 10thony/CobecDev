import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Insert a new semantic question
export const insert = mutation({
  args: {
    question: v.string(),
    category: v.string(),
    subCategory: v.optional(v.string()),
    description: v.string(),
    weight: v.number(),
    isActive: v.boolean(),
    exampleAnswer: v.optional(v.string()),
    tags: v.array(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const questionId = await ctx.db.insert("semanticQuestions", {
      ...args,
      usageCount: 0,
      effectiveness: undefined,
      createdAt: now,
      updatedAt: now,
    });
    return questionId;
  },
});

// List all semantic questions
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("semanticQuestions").order("desc").collect();
  },
});

// List active semantic questions
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("semanticQuestions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();
  },
});

// List questions by category
export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    return await ctx.db
      .query("semanticQuestions")
      .withIndex("by_category", (q) => q.eq("category", category))
      .order("desc")
      .collect();
  },
});

// List questions by subcategory
export const listBySubCategory = query({
  args: { subCategory: v.string() },
  handler: async (ctx, { subCategory }) => {
    return await ctx.db
      .query("semanticQuestions")
      .withIndex("by_subcategory", (q) => q.eq("subCategory", subCategory))
      .order("desc")
      .collect();
  },
});

// Get question by ID
export const get = query({
  args: { id: v.id("semanticQuestions") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Update semantic question
export const update = mutation({
  args: {
    id: v.id("semanticQuestions"),
    question: v.optional(v.string()),
    category: v.optional(v.string()),
    subCategory: v.optional(v.string()),
    description: v.optional(v.string()),
    weight: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    effectiveness: v.optional(v.number()),
    exampleAnswer: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(id, {
      ...filtered,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Increment usage count
export const incrementUsage = mutation({
  args: { id: v.id("semanticQuestions") },
  handler: async (ctx, { id }) => {
    const question = await ctx.db.get(id);
    if (!question) return null;
    
    await ctx.db.patch(id, {
      usageCount: question.usageCount + 1,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Update effectiveness score
export const updateEffectiveness = mutation({
  args: {
    id: v.id("semanticQuestions"),
    effectiveness: v.number(),
  },
  handler: async (ctx, { id, effectiveness }) => {
    await ctx.db.patch(id, {
      effectiveness,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Delete semantic question
export const remove = mutation({
  args: { id: v.id("semanticQuestions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return { success: true };
  },
});

// Toggle active status
export const toggleActive = mutation({
  args: { id: v.id("semanticQuestions") },
  handler: async (ctx, { id }) => {
    const question = await ctx.db.get(id);
    if (!question) return null;
    
    await ctx.db.patch(id, {
      isActive: !question.isActive,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Bulk insert semantic questions (for initial seeding)
export const bulkInsert = mutation({
  args: {
    questions: v.array(v.object({
      question: v.string(),
      category: v.string(),
      subCategory: v.optional(v.string()),
      description: v.string(),
      weight: v.number(),
      isActive: v.boolean(),
      exampleAnswer: v.optional(v.string()),
      tags: v.array(v.string()),
    })),
  },
  handler: async (ctx, { questions }) => {
    const now = Date.now();
    const ids = [];
    
    for (const question of questions) {
      const id = await ctx.db.insert("semanticQuestions", {
        ...question,
        usageCount: 0,
        effectiveness: undefined,
        createdBy: undefined,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }
    
    return ids;
  },
});

// Get statistics about questions
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allQuestions = await ctx.db.query("semanticQuestions").collect();
    
    const stats = {
      total: allQuestions.length,
      active: allQuestions.filter(q => q.isActive).length,
      byCategory: {} as Record<string, number>,
      totalUsage: allQuestions.reduce((sum, q) => sum + q.usageCount, 0),
      averageEffectiveness: 0,
      highestWeight: 0,
    };
    
    // Calculate by category
    allQuestions.forEach(q => {
      stats.byCategory[q.category] = (stats.byCategory[q.category] || 0) + 1;
    });
    
    // Calculate average effectiveness
    const questionsWithEffectiveness = allQuestions.filter(q => q.effectiveness !== undefined);
    if (questionsWithEffectiveness.length > 0) {
      stats.averageEffectiveness = questionsWithEffectiveness.reduce(
        (sum, q) => sum + (q.effectiveness || 0), 0
      ) / questionsWithEffectiveness.length;
    }
    
    // Find highest weight
    stats.highestWeight = Math.max(...allQuestions.map(q => q.weight), 0);
    
    return stats;
  },
});

