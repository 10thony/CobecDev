# 📊 Procurement AI Chat Analytics Enhancement Plan

## Executive Summary

This plan outlines the implementation of an analytics dashboard for the Procurement AI Chat assistant. The dashboard will be accessible exclusively via the Admin Panel page and provide comprehensive insights into chat usage, API costs, and token consumption.

---

## Current Architecture Overview

### Existing Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ProcurementChat` | `src/components/ProcurementChat.tsx` | Main chat UI component |
| `procurementAgent` | `convex/procurementAgent.ts` | Convex Agent with GPT-4o-mini |
| `procurementChat` | `convex/procurementChat.ts` | Actions for AI requests |
| `procurementChatSessions` | `convex/procurementChatSessions.ts` | Session management |
| `procurementChatMessages` | `convex/procurementChatMessages.ts` | Message storage |
| `AdminPanelPage` | `src/pages/AdminPanelPage.tsx` | Admin-only access control |

### Current Data Flow

```
User Input → createSession → addUserMessage → fetchAndSaveProcurementLinks → Agent → addAssistantMessageInternal
```

**Gap:** Token usage and cost data are not currently captured during AI requests.

---

## Analytics Data Requirements

### Data Points to Track

| Field | Description | Source |
|-------|-------------|--------|
| `userId` | Clerk User ID of requester | Session context |
| `userMessage` | The chat prompt sent | Existing `procurementChatMessages` |
| `assistantResponse` | The AI response content | Existing `procurementChatMessages` |
| `model` | AI model identifier (e.g., `gpt-4o-mini`) | Agent configuration |
| `provider` | AI provider (e.g., `openai`) | Agent configuration |
| `requestCost` | Monetary cost of input tokens | Calculated from token count |
| `responseCost` | Monetary cost of output tokens | Calculated from token count |
| `requestTokens` | Number of tokens in prompt | AI SDK usage data |
| `responseTokens` | Number of tokens in response | AI SDK usage data |
| `totalCost` | Combined request + response cost | Calculated |
| `timestamp` | When the request occurred | `createdAt` |
| `sessionId` | Reference to chat session | Existing |

---

## Phase 1: Schema Enhancement

### New Table: `procurementChatAnalytics`

Add to `convex/schema.ts`:

```typescript
// Procurement Chat Analytics for tracking AI usage and costs
procurementChatAnalytics: defineTable({
  // Request identification
  sessionId: v.id("procurementChatSessions"),
  messageId: v.optional(v.id("procurementChatMessages")),
  userId: v.string(), // Clerk user ID
  
  // Message content
  userPrompt: v.string(), // The user's input
  assistantResponse: v.string(), // AI response (summary or full)
  
  // Model information
  model: v.string(), // e.g., "gpt-4o-mini"
  provider: v.string(), // e.g., "openai"
  
  // Token usage
  requestTokens: v.number(), // Input/prompt tokens
  responseTokens: v.number(), // Output/completion tokens
  totalTokens: v.number(), // Combined total
  
  // Cost tracking (in USD, stored as cents for precision)
  requestCostCents: v.number(), // Cost of input tokens in cents
  responseCostCents: v.number(), // Cost of output tokens in cents
  totalCostCents: v.number(), // Total cost in cents
  
  // Request metadata
  toolCallsCount: v.optional(v.number()), // Number of tool calls made
  isError: v.optional(v.boolean()), // Whether request failed
  errorMessage: v.optional(v.string()), // Error details if failed
  latencyMs: v.optional(v.number()), // Response time in milliseconds
  
  // Timestamps
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_session", ["sessionId"])
  .index("by_provider", ["provider"])
  .index("by_model", ["model"])
  .index("by_creation", ["createdAt"])
  .index("by_user_creation", ["userId", "createdAt"]),
```

### Pricing Configuration Table (Optional Enhancement)

```typescript
// AI Model Pricing Configuration
aiModelPricing: defineTable({
  provider: v.string(), // "openai", "anthropic", etc.
  model: v.string(), // "gpt-4o-mini", "gpt-4o", etc.
  inputPricePer1kTokens: v.number(), // Price per 1K input tokens (in cents)
  outputPricePer1kTokens: v.number(), // Price per 1K output tokens (in cents)
  isActive: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_provider_model", ["provider", "model"]),
```

---

## Phase 2: Backend Implementation

### 2.1 Create Analytics Convex Module

Create `convex/procurementChatAnalytics.ts`:

```typescript
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Pricing constants (in cents per 1K tokens)
const MODEL_PRICING = {
  "openai": {
    "gpt-4o-mini": { input: 0.015, output: 0.060 }, // $0.15/1M in, $0.60/1M out
    "gpt-4o": { input: 0.250, output: 1.000 }, // $2.50/1M in, $10/1M out
  },
  "anthropic": {
    "claude-3-5-sonnet": { input: 0.300, output: 1.500 },
  },
} as const;

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
    const providerPricing = MODEL_PRICING[args.provider as keyof typeof MODEL_PRICING];
    const modelPricing = providerPricing?.[args.model as keyof typeof providerPricing] 
      || { input: 0.015, output: 0.060 }; // Default to gpt-4o-mini pricing
    
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

// Query: Get all analytics (admin only)
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("procurementChatAnalytics")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    
    let query = ctx.db
      .query("procurementChatAnalytics")
      .order("desc");
    
    const results = await query.take(limit);
    
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
```

### 2.2 Update `procurementChat.ts` to Capture Analytics

Modify `convex/procurementChat.ts`:

```typescript
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import { procurementAgent } from "./procurementAgent";

// ... existing code ...

export const fetchAndSaveProcurementLinks = action({
  args: { 
    prompt: v.string(),
    sessionId: v.id("procurementChatSessions"),
    targetRegions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    try {
      // Get session to retrieve userId
      const session = await ctx.runQuery(internal.procurementChatSessions.getInternal, {
        id: args.sessionId,
      });
      
      if (!session) {
        throw new Error("Session not found");
      }
      
      const threadId = args.sessionId as any;
      
      // Use generateObject for structured JSON output
      const result = await procurementAgent.generateObject(ctx, {
        threadId: threadId,
        messages: [
          {
            role: "user",
            content: args.prompt,
          },
        ],
        schema: z.object({
          // ... existing schema ...
        }),
        maxSteps: 10,
      });

      const parsed = result.object;
      const latencyMs = Date.now() - startTime;
      
      // Extract usage data from the result
      const usage = result.usage || { promptTokens: 0, completionTokens: 0 };
      
      // Record analytics
      await ctx.runMutation(internal.procurementChatAnalytics.recordAnalytics, {
        sessionId: args.sessionId,
        userId: session.userId,
        userPrompt: args.prompt,
        assistantResponse: JSON.stringify(parsed),
        model: "gpt-4o-mini", // From procurementAgent config
        provider: "openai",
        requestTokens: usage.promptTokens || 0,
        responseTokens: usage.completionTokens || 0,
        toolCallsCount: result.toolCalls?.length || 0,
        latencyMs,
        isError: false,
      });

      // ... rest of existing code ...
      
      return parsed;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      // Record error analytics
      const session = await ctx.runQuery(internal.procurementChatSessions.getInternal, {
        id: args.sessionId,
      });
      
      if (session) {
        await ctx.runMutation(internal.procurementChatAnalytics.recordAnalytics, {
          sessionId: args.sessionId,
          userId: session.userId,
          userPrompt: args.prompt,
          assistantResponse: "",
          model: "gpt-4o-mini",
          provider: "openai",
          requestTokens: 0,
          responseTokens: 0,
          latencyMs,
          isError: true,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
      
      // ... existing error handling ...
    }
  },
});
```

### 2.3 Add Internal Query for Sessions

Add to `convex/procurementChatSessions.ts`:

```typescript
import { internalQuery } from "./_generated/server";

// Internal query for getting session (used by actions)
export const getInternal = internalQuery({
  args: { id: v.id("procurementChatSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

---

## Phase 3: Frontend Implementation

### 3.1 Create Analytics Grid Component

Create `src/components/admin/ProcurementChatAnalytics.tsx`:

```tsx
import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { TronPanel } from '../TronPanel';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Zap, 
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Bot,
} from 'lucide-react';

interface AnalyticsEntry {
  _id: string;
  userId: string;
  userPrompt: string;
  assistantResponse: string;
  model: string;
  provider: string;
  requestTokens: number;
  responseTokens: number;
  totalTokens: number;
  requestCostCents: number;
  responseCostCents: number;
  totalCostCents: number;
  toolCallsCount?: number;
  isError?: boolean;
  errorMessage?: string;
  latencyMs?: number;
  createdAt: number;
}

export function ProcurementChatAnalytics() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  // Fetch analytics data
  const analyticsData = useQuery(api.procurementChatAnalytics.list, { limit: 100 });
  const stats = useQuery(api.procurementChatAnalytics.getStats, {
    startDate: dateRange !== 'all' 
      ? Date.now() - (parseInt(dateRange) * 24 * 60 * 60 * 1000)
      : undefined,
  });
  const dailyStats = useQuery(api.procurementChatAnalytics.getDailyStats, {
    days: parseInt(dateRange) || 30,
  });

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(4)}`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!analyticsData || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-tron-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-tron-cyan" />
            Procurement AI Chat Analytics
          </h2>
          <p className="text-tron-gray mt-1">
            Monitor usage, costs, and performance of the AI chat assistant
          </p>
        </div>
        
        {/* Date Range Filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="px-4 py-2 bg-tron-bg-elevated border border-tron-cyan/20 rounded-md text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tron-cyan/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-tron-cyan" />
            </div>
            <div>
              <p className="text-sm text-tron-gray">Total Requests</p>
              <p className="text-2xl font-bold text-tron-white">{stats.totalRequests}</p>
            </div>
          </div>
        </div>
        
        {/* Total Cost */}
        <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-success/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-neon-success" />
            </div>
            <div>
              <p className="text-sm text-tron-gray">Total Cost</p>
              <p className="text-2xl font-bold text-tron-white">
                ${stats.totalCostDollars.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Total Tokens */}
        <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-warning/10 rounded-lg">
              <Zap className="w-5 h-5 text-neon-warning" />
            </div>
            <div>
              <p className="text-sm text-tron-gray">Total Tokens</p>
              <p className="text-2xl font-bold text-tron-white">
                {stats.totalTokens.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Unique Users */}
        <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-tron-gray">Unique Users</p>
              <p className="text-2xl font-bold text-tron-white">{stats.uniqueUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-tron-bg-card rounded-lg border border-tron-cyan/10 p-4">
          <p className="text-sm text-tron-gray">Avg. Tokens/Request</p>
          <p className="text-lg font-semibold text-tron-white mt-1">
            {stats.avgTokensPerRequest.toLocaleString()}
          </p>
        </div>
        <div className="bg-tron-bg-card rounded-lg border border-tron-cyan/10 p-4">
          <p className="text-sm text-tron-gray">Avg. Cost/Request</p>
          <p className="text-lg font-semibold text-tron-white mt-1">
            ${stats.avgCostPerRequest.toFixed(4)}
          </p>
        </div>
        <div className="bg-tron-bg-card rounded-lg border border-tron-cyan/10 p-4">
          <p className="text-sm text-tron-gray">Error Rate</p>
          <p className={`text-lg font-semibold mt-1 ${
            stats.errorRate > 5 ? 'text-neon-error' : 'text-neon-success'
          }`}>
            {stats.errorRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Analytics Grid */}
      <TronPanel 
        title="Request Log" 
        icon={<Bot className="w-5 h-5" />}
        glowColor="cyan"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-tron-bg-elevated">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Chat Sent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Model / Provider
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Request Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Response Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Request Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Response Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tron-cyan/10">
              {analyticsData.map((entry: AnalyticsEntry) => (
                <React.Fragment key={entry._id}>
                  <tr className="hover:bg-tron-bg-elevated transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-tron-gray">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(entry.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-xs text-tron-cyan font-mono bg-tron-bg-deep px-2 py-1 rounded">
                        {truncateText(entry.userId, 16)}
                      </code>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm text-tron-white truncate" title={entry.userPrompt}>
                        {truncateText(entry.userPrompt, 50)}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="text-tron-white font-medium">{entry.model}</span>
                        <span className="text-tron-gray"> / {entry.provider}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-tron-white">
                      {entry.requestTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-tron-white">
                      {entry.responseTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-neon-warning">
                      {formatCurrency(entry.requestCostCents)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-neon-warning">
                      {formatCurrency(entry.responseCostCents)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-neon-success">
                      {formatCurrency(entry.totalCostCents)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {entry.isError ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-neon-error/10 text-neon-error text-xs rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-neon-success/10 text-neon-success text-xs rounded-full">
                          Success
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => setExpandedRow(expandedRow === entry._id ? null : entry._id)}
                        className="p-1 hover:bg-tron-cyan/10 rounded transition-colors"
                      >
                        {expandedRow === entry._id ? (
                          <ChevronUp className="w-4 h-4 text-tron-cyan" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-tron-cyan" />
                        )}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Details Row */}
                  {expandedRow === entry._id && (
                    <tr className="bg-tron-bg-deep">
                      <td colSpan={11} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-tron-cyan mb-2">User Prompt</h4>
                            <p className="text-sm text-tron-white bg-tron-bg-card p-3 rounded border border-tron-cyan/10">
                              {entry.userPrompt}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-tron-cyan mb-2">AI Response</h4>
                            <div className="text-sm text-tron-white bg-tron-bg-card p-3 rounded border border-tron-cyan/10 max-h-48 overflow-y-auto">
                              <pre className="whitespace-pre-wrap font-mono text-xs">
                                {entry.assistantResponse}
                              </pre>
                            </div>
                          </div>
                          {entry.latencyMs && (
                            <div>
                              <h4 className="text-sm font-medium text-tron-cyan mb-2">Latency</h4>
                              <p className="text-sm text-tron-white">{entry.latencyMs}ms</p>
                            </div>
                          )}
                          {entry.toolCallsCount !== undefined && entry.toolCallsCount > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-tron-cyan mb-2">Tool Calls</h4>
                              <p className="text-sm text-tron-white">{entry.toolCallsCount}</p>
                            </div>
                          )}
                          {entry.isError && entry.errorMessage && (
                            <div className="col-span-2">
                              <h4 className="text-sm font-medium text-neon-error mb-2">Error Message</h4>
                              <p className="text-sm text-neon-error bg-neon-error/10 p-3 rounded">
                                {entry.errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {analyticsData.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-tron-gray">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No analytics data yet</p>
                    <p className="text-sm mt-1">Start using the Procurement Chat to generate analytics</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TronPanel>
    </div>
  );
}
```

### 3.2 Add Analytics Tab to AdminPanelPage

Update `src/pages/AdminPanelPage.tsx` to include a tab for analytics:

```tsx
// Add import at top
import { ProcurementChatAnalytics } from '../components/admin/ProcurementChatAnalytics';
import { BarChart3, Users, Bot } from 'lucide-react';

// Add state for active tab
const [activeTab, setActiveTab] = useState<'users' | 'analytics'>('users');

// Add tab navigation in the header section
<div className="flex items-center gap-2 border-b border-tron-cyan/20 mb-6">
  <button
    onClick={() => setActiveTab('users')}
    className={`px-4 py-2 text-sm font-medium transition-colors ${
      activeTab === 'users'
        ? 'text-tron-cyan border-b-2 border-tron-cyan'
        : 'text-tron-gray hover:text-tron-white'
    }`}
  >
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4" />
      User Management
    </div>
  </button>
  <button
    onClick={() => setActiveTab('analytics')}
    className={`px-4 py-2 text-sm font-medium transition-colors ${
      activeTab === 'analytics'
        ? 'text-tron-cyan border-b-2 border-tron-cyan'
        : 'text-tron-gray hover:text-tron-white'
    }`}
  >
    <div className="flex items-center gap-2">
      <BarChart3 className="w-4 h-4" />
      AI Chat Analytics
    </div>
  </button>
</div>

{/* Tab content */}
{activeTab === 'users' ? (
  {/* Existing user management UI */}
) : (
  <ProcurementChatAnalytics />
)}
```

---

## Phase 4: File Structure

```
convex/
├── procurementChatAnalytics.ts   # NEW: Analytics mutations/queries
├── procurementChat.ts            # MODIFIED: Add analytics recording
├── procurementChatSessions.ts    # MODIFIED: Add internal query
├── procurementAgent.ts           # Existing
├── schema.ts                     # MODIFIED: Add analytics table

src/
├── components/
│   └── admin/
│       ├── AddLinkForm.tsx       # Existing
│       └── ProcurementChatAnalytics.tsx  # NEW: Analytics grid component
└── pages/
    └── AdminPanelPage.tsx        # MODIFIED: Add analytics tab
```

---

## Phase 5: Implementation Checklist

### Backend Tasks

- [ ] **5.1** Add `procurementChatAnalytics` table to `convex/schema.ts`
- [ ] **5.2** Create `convex/procurementChatAnalytics.ts` with:
  - [ ] `recordAnalytics` internal mutation
  - [ ] `list` query (paginated)
  - [ ] `listByUser` query
  - [ ] `getStats` query (aggregated stats)
  - [ ] `getDailyStats` query (daily breakdown)
- [ ] **5.3** Add `getInternal` query to `convex/procurementChatSessions.ts`
- [ ] **5.4** Modify `convex/procurementChat.ts` to:
  - [ ] Capture start time for latency tracking
  - [ ] Extract usage data from agent response
  - [ ] Call `recordAnalytics` on success
  - [ ] Call `recordAnalytics` on error (with error flag)
- [ ] **5.5** Run `npx convex dev` to push schema changes

### Frontend Tasks

- [ ] **5.6** Create `src/components/admin/ProcurementChatAnalytics.tsx`
- [ ] **5.7** Update `src/pages/AdminPanelPage.tsx`:
  - [ ] Add tab navigation
  - [ ] Import and render analytics component
- [ ] **5.8** Test admin access controls

### Testing Tasks

- [ ] **5.9** Verify analytics data is captured on chat requests
- [ ] **5.10** Verify cost calculations are accurate
- [ ] **5.11** Test expanded row details display
- [ ] **5.12** Test date range filtering
- [ ] **5.13** Verify admin-only access

---

## Token Pricing Reference

### OpenAI (as of December 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| gpt-4o-mini | $0.150 | $0.600 |
| gpt-4o | $2.50 | $10.00 |
| gpt-4-turbo | $10.00 | $30.00 |

### Anthropic (as of December 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| claude-3-5-sonnet | $3.00 | $15.00 |
| claude-3-haiku | $0.25 | $1.25 |

---

## Future Enhancements

1. **Export to CSV/Excel** - Add export functionality for analytics data
2. **Charts & Visualizations** - Add recharts/visx for trend visualization
3. **Alert Thresholds** - Set cost alerts when daily/monthly spend exceeds limits
4. **User Quota Management** - Limit requests per user per day/month
5. **Model Performance Comparison** - A/B test different models
6. **Real-time Dashboard** - WebSocket updates for live monitoring

---

## Security Considerations

1. **Admin-Only Access** - All analytics queries should verify admin role
2. **Data Sanitization** - Truncate sensitive data in logs if needed
3. **PII Handling** - Consider GDPR implications of storing user prompts
4. **Cost Exposure** - Only admins should see cost data

---

## Estimated Implementation Time

| Phase | Effort |
|-------|--------|
| Schema Enhancement | 30 min |
| Backend Implementation | 2-3 hours |
| Frontend Implementation | 3-4 hours |
| Testing & Refinement | 1-2 hours |
| **Total** | **6-9 hours** |

---

## References

- [Convex Agent Component](https://www.convex.dev/components/agent)
- [AI SDK Usage Tracking](https://sdk.vercel.ai/docs/ai-sdk-core/telemetry)
- [OpenAI Pricing](https://openai.com/pricing)
