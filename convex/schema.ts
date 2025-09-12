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
    _creationTime: v.optional(v.number()), // Convex automatically adds this field
  }).index("by_clerkUserId", ["clerkUserId"])
    .index("by_role", ["role"])
    .index("by_creation", ["createdAt"]), // For sorting by creation date

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
  }).index("by_name", ["name"])
    .index("by_creation", ["createdAt"]), // For sorting by creation date

  // KFC Points tracking
  kfcpoints: defineTable({
    name: v.string(), // Employee name
    events: v.array(v.object({
      type: v.string(), // "Team", "Individual", "Growth"
      month: v.string(), // "JAN", "FEB", etc.
      quantity: v.optional(v.number()), // Number of events (optional for backward compatibility)
    })),
    march_status: v.union(v.string(), v.null()), // March status (can be null)
    score: v.number(), // Total KFC score
    // Complete searchable text for semantic search (aggregated, deduplicated content)
    completeSearchableText: v.optional(v.string()),
    // Embedding fields for semantic search on individual fields
    embedding: v.optional(v.array(v.number())), // Gemini MRL 2048 embedding dimension
    embeddingModel: v.optional(v.string()), // Track which model generated embedding
    embeddingGeneratedAt: v.optional(v.number()), // Timestamp for embedding freshness
    createdAt: v.number(), // Track when entry was created
    updatedAt: v.number(), // Track when entry was last updated
  }).index("by_name", ["name"])
    .index("by_score", ["score"]) // For sorting by score
    .index("by_creation", ["createdAt"]) // For sorting by creation date
    .index("by_embedding", ["embedding"]) // Vector similarity search index
    .index("by_embedding_model", ["embeddingModel"])
    .index("by_embedding_generated", ["embeddingGeneratedAt"]),

  // Job Postings - migrated from MongoDB with proper vector support
  jobpostings: defineTable({
    jobTitle: v.string(),
    location: v.string(),
    salary: v.string(),
    openDate: v.string(),
    closeDate: v.string(),
    jobLink: v.string(),
    jobType: v.string(),
    jobSummary: v.string(),
    duties: v.string(),
    requirements: v.string(),
    qualifications: v.string(),
    education: v.array(v.string()),
    howToApply: v.string(),
    additionalInformation: v.string(),
    department: v.string(),
    seriesGrade: v.string(),
    travelRequired: v.string(),
    workSchedule: v.string(),
    securityClearance: v.string(),
    experienceRequired: v.string(),
    educationRequired: v.string(),
    applicationDeadline: v.string(),
    contactInfo: v.string(),
    searchableText: v.optional(v.string()),
    extractedSkills: v.optional(v.array(v.string())),
    // Complete searchable text for semantic search (aggregated, deduplicated content)
    completeSearchableText: v.optional(v.string()),
    // Enhanced embedding fields for semantic search
    embedding: v.optional(v.array(v.number())), // Gemini MRL 2048 embedding dimension
    embeddingModel: v.optional(v.string()), // Track which model generated embedding
    embeddingGeneratedAt: v.optional(v.number()), // Timestamp for embedding freshness
    // Additional fields for migration compatibility
    _id: v.optional(v.string()), // MongoDB ObjectId compatibility
    _index: v.optional(v.number()), // Source data index
    metadata: v.optional(v.object({
      originalIndex: v.optional(v.number()),
      importedAt: v.number(),
      sourceFile: v.optional(v.string()),
      dataType: v.string(),
      embeddingModel: v.optional(v.string()),
      parsedAt: v.optional(v.number()),
      processedAt: v.optional(v.object({
        date: v.string(),
      })),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_jobTitle", ["jobTitle"])
    .index("by_location", ["location"])
    .index("by_department", ["department"])
    .index("by_creation", ["createdAt"])
    .index("by_metadata_import", ["metadata.importedAt"])
    .index("by_metadata_source", ["metadata.sourceFile"])
    // Vector similarity search index (for future v.vector() migration)
    .index("by_embedding", ["embedding"])
    .index("by_embedding_model", ["embeddingModel"])
    .index("by_embedding_generated", ["embeddingGeneratedAt"]),

  // Resumes - migrated from MongoDB with proper vector support
  resumes: defineTable({
    filename: v.string(),
    originalText: v.string(),
    personalInfo: v.object({
      firstName: v.string(),
      middleName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.string(),
      yearsOfExperience: v.number(),
    }),
    professionalSummary: v.string(),
    education: v.array(v.string()),
    experience: v.array(v.object({
      title: v.string(),
      company: v.string(),
      location: v.string(),
      duration: v.string(),
      responsibilities: v.array(v.string()),
    })),
    skills: v.array(v.string()),
    certifications: v.string(),
    professionalMemberships: v.string(),
    securityClearance: v.string(),
    searchableText: v.optional(v.string()),
    extractedSkills: v.optional(v.array(v.string())),
    // Complete searchable text for semantic search (aggregated, deduplicated content)
    completeSearchableText: v.optional(v.string()),
    // Enhanced embedding fields for semantic search
    embedding: v.optional(v.array(v.number())), // Gemini MRL 2048 embedding dimension
    embeddingModel: v.optional(v.string()), // Track which model generated embedding
    embeddingGeneratedAt: v.optional(v.number()), // Timestamp for embedding freshness
    // Additional fields for migration compatibility
    _id: v.optional(v.string()), // MongoDB ObjectId compatibility
    _metadata: v.optional(v.any()), // Legacy metadata compatibility
    metadata: v.optional(v.object({
      filePath: v.optional(v.string()),
      fileName: v.string(),
      importedAt: v.number(),
      parsedAt: v.number(),
      dataType: v.optional(v.string()), // Add dataType field for resumes
      embeddingModel: v.optional(v.string()),
      processedAt: v.optional(v.object({
        date: v.string(),
      })),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_filename", ["filename"])
    .index("by_email", ["personalInfo.email"])
    .index("by_creation", ["createdAt"])
    .index("by_metadata_import", ["metadata.importedAt"])
    .index("by_metadata_model", ["metadata.embeddingModel"])
    // Vector similarity search index (for future v.vector() migration)
    .index("by_embedding", ["embedding"])
    .index("by_embedding_model", ["embeddingModel"])
    .index("by_embedding_generated", ["embeddingGeneratedAt"]),

  // User queries for dynamic prompt learning
  userQueries: defineTable({
    query: v.string(),
    promptsUsed: v.array(v.string()),
    confidence: v.number(),
    timestamp: v.number(),
    addedToPrompts: v.boolean(),
    usageCount: v.optional(v.number()),
    category: v.optional(v.string()),
    effectiveness: v.optional(v.number()),
  }).index("by_added_to_prompts", ["addedToPrompts"])
    .index("by_timestamp", ["timestamp"])
    .index("by_query", ["query"]),

  // Vector search prompts for embedding generation
  vectorSearchPrompts: defineTable({
    text: v.string(),
    category: v.string(),
    usageCount: v.number(),
    effectiveness: v.number(),
    needsEmbeddingRegeneration: v.boolean(),
    createdAt: v.number(),
  }).index("by_category", ["category"])
    .index("by_needs_regeneration", ["needsEmbeddingRegeneration"])
    .index("by_usage", ["usageCount"])
    .index("by_effectiveness", ["effectiveness"]),
};

export default defineSchema({
  ...applicationTables,
});
