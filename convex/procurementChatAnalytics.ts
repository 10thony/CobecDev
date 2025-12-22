import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Pricing constants (in cents per 1K tokens) - based on December 2024 pricing
interface ModelPricing {
  input: number;
  output: number;
}

const MODEL_PRICING: Record<string, Record<string, ModelPricing>> = {
  "openai": {
    "gpt-4o-mini": { input: 0.015, output: 0.060 }, // $0.15/1M in, $0.60/1M out
    "gpt-5-mini": { input: 0.015, output: 0.060 }, // $0.15/1M in, $0.60/1M out (same as gpt-4o-mini)
    "gpt-4o": { input: 0.250, output: 1.000 }, // $2.50/1M in, $10/1M out
    "gpt-4-turbo": { input: 1.000, output: 3.000 }, // $10/1M in, $30/1M out
  },
  "anthropic": {
    "claude-3-5-sonnet": { input: 0.300, output: 1.500 }, // $3/1M in, $15/1M out
    "claude-3-haiku": { input: 0.025, output: 0.125 }, // $0.25/1M in, $1.25/1M out
  },
};

// Default pricing for unknown models
const DEFAULT_PRICING: ModelPricing = { input: 0.015, output: 0.060 };

// Calculate cost in cents
function calculateCost(tokens: number, pricePerK: number): number {
  return Math.round((tokens / 1000) * pricePerK * 100) / 100; // Round to 2 decimal cents
}

// Internal mutation to record analytics (called from actions)
export const recordAnalytics = internalMutation({
  args: {
    sessionId: v.id("procurementChatSessions"),
    messageId: v.optional(v.id("procurementChatMessages")),
    userId: v.string(),
    userPrompt: v.string(),
    assistantResponse: v.string(),
    model: v.string(),
    provider: v.string(),
    requestTokens: v.number(),
    responseTokens: v.number(),
    toolCallsCount: v.optional(v.number()),
    isError: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get pricing for the model
    const providerPricing = MODEL_PRICING[args.provider];
    const modelPricing: ModelPricing = providerPricing?.[args.model] ?? DEFAULT_PRICING;
    
    const requestCostCents = calculateCost(args.requestTokens, modelPricing.input);
    const responseCostCents = calculateCost(args.responseTokens, modelPricing.output);
    const totalCostCents = requestCostCents + responseCostCents;
    
    return await ctx.db.insert("procurementChatAnalytics", {
      sessionId: args.sessionId,
      messageId: args.messageId,
      userId: args.userId,
      userPrompt: args.userPrompt,
      assistantResponse: args.assistantResponse,
      model: args.model,
      provider: args.provider,
      requestTokens: args.requestTokens,
      responseTokens: args.responseTokens,
      totalTokens: args.requestTokens + args.responseTokens,
      requestCostCents,
      responseCostCents,
      totalCostCents,
      toolCallsCount: args.toolCallsCount,
      isError: args.isError,
      errorMessage: args.errorMessage,
      latencyMs: args.latencyMs,
      createdAt: Date.now(),
    });
  },
});

// Query: Get all analytics (admin only - paginated)
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    
    const results = await ctx.db
      .query("procurementChatAnalytics")
      .order("desc")
      .take(limit);
    
    return results;
  },
});

// Query: Get analytics by user
export const listByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    return await ctx.db
      .query("procurementChatAnalytics")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// Query: Get aggregated stats
export const getStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("procurementChatAnalytics")
      .order("desc")
      .collect();
    
    // Filter by date range if provided
    if (args.startDate) {
      results = results.filter(r => r.createdAt >= args.startDate!);
    }
    if (args.endDate) {
      results = results.filter(r => r.createdAt <= args.endDate!);
    }
    
    // Calculate aggregates
    const totalRequests = results.length;
    const totalTokens = results.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalCostCents = results.reduce((sum, r) => sum + r.totalCostCents, 0);
    const totalRequestTokens = results.reduce((sum, r) => sum + r.requestTokens, 0);
    const totalResponseTokens = results.reduce((sum, r) => sum + r.responseTokens, 0);
    const errorCount = results.filter(r => r.isError).length;
    
    // Group by user
    const userStats = results.reduce((acc, r) => {
      if (!acc[r.userId]) {
        acc[r.userId] = { requests: 0, tokens: 0, costCents: 0 };
      }
      acc[r.userId].requests++;
      acc[r.userId].tokens += r.totalTokens;
      acc[r.userId].costCents += r.totalCostCents;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; costCents: number }>);
    
    // Group by model
    const modelStats = results.reduce((acc, r) => {
      const key = `${r.provider}/${r.model}`;
      if (!acc[key]) {
        acc[key] = { requests: 0, tokens: 0, costCents: 0 };
      }
      acc[key].requests++;
      acc[key].tokens += r.totalTokens;
      acc[key].costCents += r.totalCostCents;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; costCents: number }>);
    
    return {
      totalRequests,
      totalTokens,
      totalRequestTokens,
      totalResponseTokens,
      totalCostCents,
      totalCostDollars: totalCostCents / 100,
      errorCount,
      errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
      avgTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0,
      avgCostPerRequest: totalRequests > 0 ? Math.round(totalCostCents / totalRequests) / 100 : 0,
      userStats,
      modelStats,
      uniqueUsers: Object.keys(userStats).length,
    };
  },
});

// Query: Get daily usage breakdown
export const getDailyStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.days || 30;
    const startDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    
    const results = await ctx.db
      .query("procurementChatAnalytics")
      .withIndex("by_creation")
      .order("desc")
      .collect();
    
    const filtered = results.filter(r => r.createdAt >= startDate);
    
    // Group by day
    const dailyStats = filtered.reduce((acc, r) => {
      const date = new Date(r.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { 
          requests: 0, 
          tokens: 0, 
          costCents: 0,
          requestTokens: 0,
          responseTokens: 0,
        };
      }
      acc[date].requests++;
      acc[date].tokens += r.totalTokens;
      acc[date].costCents += r.totalCostCents;
      acc[date].requestTokens += r.requestTokens;
      acc[date].responseTokens += r.responseTokens;
      return acc;
    }, {} as Record<string, { 
      requests: number; 
      tokens: number; 
      costCents: number;
      requestTokens: number;
      responseTokens: number;
    }>);
    
    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats,
      costDollars: stats.costCents / 100,
    })).sort((a, b) => a.date.localeCompare(b.date));
  },
});
