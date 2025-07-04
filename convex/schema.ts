import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  // AI Model configurations that admins can manage
  aiModels: defineTable({
    name: v.string(),
    provider: v.string(), // "openai", "anthropic", "google", etc.
    modelId: v.string(), // "gpt-4", "claude-3", etc.
    apiKeyEnvVar: v.string(), // environment variable name
    isActive: v.boolean(),
    description: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    helpLinks: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      description: v.optional(v.string()),
    }))),
    createdAt: v.number(), // Track when model was added
    updatedAt: v.number(), // Track when model was last updated
  }).index("by_provider", ["provider"])
    .index("by_active", ["isActive"]),

  // User roles for admin access - now using Clerk user IDs
  userRoles: defineTable({
    userId: v.string(), // Clerk user ID (string instead of Convex ID)
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(), // Track when role was assigned
    updatedAt: v.number(), // Track when role was last updated
  }).index("by_user", ["userId"])
    .index("by_role", ["role"]),

  // Cobec admins collection for KFC management access control
  cobecadmins: defineTable({
    clerkUserId: v.string(), // Clerk user ID
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    createdAt: v.number(), // Track when admin was added
    updatedAt: v.number(), // Track when admin was last updated
  }).index("by_clerkUserId", ["clerkUserId"])
    .index("by_role", ["role"]),

  // Chat conversations - now using Clerk user IDs
  chats: defineTable({
    userId: v.string(), // Clerk user ID (string instead of Convex ID)
    title: v.string(),
    modelId: v.string(), // Changed from v.id("aiModels") to v.string() for dynamic model IDs
    isArchived: v.optional(v.boolean()),
    createdAt: v.number(), // Track when chat was created
    updatedAt: v.number(), // Track when chat was last updated
    lastMessageAt: v.optional(v.number()), // Track when last message was sent
  }).index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "isArchived"])
    .index("by_last_message", ["lastMessageAt"]), // For sorting by recent activity

  // Messages within chats
  messages: defineTable({
    chatId: v.id("chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    userId: v.optional(v.string()), // Clerk user ID (string instead of Convex ID) - null for AI messages
    createdAt: v.number(), // Track when message was created
    updatedAt: v.number(), // Track when message was last updated
    isStreaming: v.optional(v.boolean()), // Track if message is still being streamed
    error: v.optional(v.string()), // Store any error messages
  }).index("by_chat", ["chatId"])
    .index("by_creation", ["createdAt"]), // For sorting messages chronologically

  // Logs for tracking user actions and errors
  logs: defineTable({
    userId: v.string(), // Clerk user ID
    action: v.string(),
    type: v.union(v.literal("action"), v.literal("error")),
    details: v.object({
      provider: v.optional(v.string()),
      model: v.optional(v.string()),
      messageId: v.optional(v.id("messages")),
      errorMessage: v.optional(v.string()),
      stackTrace: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }),
    createdAt: v.number(), // Track when log was created
  }).index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_creation", ["createdAt"]), // For sorting logs chronologically

  // KFC Nominations for employee recognition
  nominations: defineTable({
    nominatedBy: v.string(), // Name of person making nomination
    nominatedEmployee: v.string(), // Name of nominated employee
    nominationType: v.union(v.literal("Team"), v.literal("Individual"), v.literal("Growth")),
    description: v.string(), // Description of why they deserve nomination
    pointsAwarded: v.number(), // Points awarded (10, 20, or 30)
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("declined")),
    approvedBy: v.optional(v.string()), // Name of person who approved/declined
    approvedAt: v.optional(v.number()), // Timestamp when approved/declined
    createdAt: v.number(), // Track when nomination was created
    updatedAt: v.number(), // Track when nomination was last updated
  }).index("by_status", ["status"])
    .index("by_employee", ["nominatedEmployee"])
    .index("by_nominator", ["nominatedBy"])
    .index("by_creation", ["createdAt"]), // For sorting by creation date

  // Employees for KFC nominations
  employees: defineTable({
    name: v.string(), // Employee name
    createdAt: v.number(), // Track when employee was added
    updatedAt: v.number(), // Track when employee was last updated
  }).index("by_name", ["name"]),

  // KFC Points tracking
  kfcpoints: defineTable({
    name: v.string(), // Employee name
    events: v.array(v.object({
      type: v.string(), // "Team", "Individual", "Growth"
      month: v.string(), // "JAN", "FEB", etc.
      quantity: v.number(), // Number of events
    })),
    march_status: v.optional(v.string()), // March status
    score: v.number(), // Total KFC score
    createdAt: v.number(), // Track when entry was created
    updatedAt: v.number(), // Track when entry was last updated
  }).index("by_name", ["name"])
    .index("by_score", ["score"]), // For sorting by score
};

export default defineSchema({
  ...applicationTables,
});
