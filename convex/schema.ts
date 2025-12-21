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
    embedding: v.optional(v.array(v.float64())), // Gemini MRL 2048 embedding dimension
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
    embedding: v.optional(v.array(v.float64())), // Gemini MRL 2048 embedding dimension
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
    .index("by_embedding_model", ["embeddingModel"])
    .index("by_embedding_generated", ["embeddingGeneratedAt"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["department", "location", "jobType"],
    }),

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
    // Bulk import fields for Local Resume Bulk Importer
    fileStorageId: v.optional(v.id("_storage")), // The original .docx file in Convex storage
    textContent: v.optional(v.string()), // The searchable raw text extracted from DOCX
    importDate: v.optional(v.string()), // ISO string date when imported
    checksum: v.optional(v.string()), // MD5 hash to prevent duplicate uploads
    // Enhanced embedding fields for semantic search
    embedding: v.optional(v.array(v.float64())), // Gemini MRL 2048 embedding dimension
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
    .index("by_checksum", ["checksum"]) // For duplicate detection
    // Vector similarity search index (for future v.vector() migration)
    .index("by_embedding_model", ["embeddingModel"])
    .index("by_embedding_generated", ["embeddingGeneratedAt"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["skills", "securityClearance"],
    })
    // Search index for textContent (bulk import search)
    .searchIndex("by_content", {
      searchField: "textContent",
    }),

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

  // Texas procurement opportunities data
  opportunities: defineTable({
    opportunityType: v.string(), // "Public Sector", "Private Sector", etc.
    opportunityTitle: v.string(), // Title of the opportunity
    contractID: v.optional(v.string()), // Contract ID if available
    issuingBody: v.object({
      name: v.string(), // Name of the issuing organization
      level: v.string(), // State, Regional, City, County, etc.
    }),
    location: v.object({
      city: v.optional(v.string()), // City name
      county: v.optional(v.string()), // County name
      region: v.string(), // Geographic region (Dallas–Fort Worth, Houston, Austin, etc.)
    }),
    status: v.string(), // "Budgeted for FY2026", "In Planning Phase", "Open for Bidding", etc.
    estimatedValueUSD: v.optional(v.number()), // Estimated value in USD
    keyDates: v.object({
      publishedDate: v.string(), // Date when opportunity was published
      bidDeadline: v.optional(v.string()), // Bid deadline if available
      projectedStartDate: v.optional(v.string()), // Projected start date
    }),
    source: v.object({
      documentName: v.string(), // Name of the source document
      url: v.string(), // URL to the source
    }),
    summary: v.string(), // Detailed summary of the opportunity
    // Additional fields for enhanced functionality
    category: v.optional(v.string()), // Opportunity category (Transportation, Aviation, Infrastructure, etc.)
    subcategory: v.optional(v.string()), // More specific category (Highway, Airport, Digital Infrastructure, etc.)
    isActive: v.optional(v.boolean()), // Whether the opportunity is currently active
    lastChecked: v.optional(v.number()), // Timestamp of last data check
    // Search and embedding fields for future semantic search
    searchableText: v.optional(v.string()), // Aggregated searchable content
    embedding: v.optional(v.array(v.number())), // Vector embedding for semantic search
    embeddingModel: v.optional(v.string()), // Model used for embedding
    embeddingGeneratedAt: v.optional(v.number()), // When embedding was generated
    // Metadata
    metadata: v.optional(v.object({
      sourceFile: v.optional(v.string()),
      importedAt: v.number(),
      dataType: v.string(),
      originalIndex: v.optional(v.number()),
      dynamicFields: v.optional(v.any()), // For storing information about dynamic fields
      newColumns: v.optional(v.array(v.string())), // List of new columns added during import
    })),
    createdAt: v.number(), // When opportunity was created
    updatedAt: v.number(), // When opportunity was last updated
  }).index("by_opportunity_type", ["opportunityType"])
    .index("by_issuing_level", ["issuingBody.level"])
    .index("by_region", ["location.region"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"])
    .index("by_creation", ["createdAt"])
    .index("by_metadata_import", ["metadata.importedAt"])
    .index("by_embedding", ["embedding"])
    .index("by_embedding_model", ["embeddingModel"])
    .index("by_estimated_value", ["estimatedValueUSD"]),

  // Texas leads data - matches texasLeadsTierOne.json format
  leads: defineTable({
    opportunityType: v.string(), // "Public Sector", "Private Subcontract", etc.
    opportunityTitle: v.string(), // Title of the opportunity
    contractID: v.optional(v.string()), // Contract ID if available
    issuingBody: v.object({
      name: v.string(), // Name of the issuing organization
      level: v.string(), // State, Regional, City, County, etc.
    }),
    location: v.object({
      city: v.optional(v.string()), // City name
      county: v.optional(v.string()), // County name
      region: v.string(), // Geographic region (Dallas–Fort Worth, Houston, Austin, etc.)
    }),
    status: v.string(), // "Active / Open for Task Orders", "Open for Bidding", etc.
    estimatedValueUSD: v.optional(v.number()), // Estimated value in USD
    keyDates: v.object({
      publishedDate: v.optional(v.string()), // Date when opportunity was published
      bidDeadline: v.optional(v.string()), // Bid deadline if available
      projectedStartDate: v.optional(v.string()), // Projected start date
    }),
    source: v.object({
      documentName: v.string(), // Name of the source document
      url: v.string(), // URL to the source
    }),
    contacts: v.array(v.object({
      name: v.optional(v.string()), // Contact person name (can be null)
      title: v.string(), // Contact person title
      email: v.optional(v.string()), // Contact email
      phone: v.optional(v.string()), // Contact phone
      url: v.optional(v.string()), // Contact URL
    })),
    summary: v.string(), // Detailed summary of the opportunity
    verificationStatus: v.optional(v.string()), // Verification status (e.g., "Verified", "Pending – Requires Portal Login")
    // Additional fields for enhanced functionality
    category: v.optional(v.string()), // Opportunity category
    subcategory: v.optional(v.string()), // More specific category
    isActive: v.optional(v.boolean()), // Whether the opportunity is currently active
    lastChecked: v.optional(v.number()), // Timestamp of last data check
    // Search and embedding fields for future semantic search
    searchableText: v.optional(v.string()), // Aggregated searchable content
    embedding: v.optional(v.array(v.number())), // Vector embedding for semantic search
    embeddingModel: v.optional(v.string()), // Model used for embedding
    embeddingGeneratedAt: v.optional(v.number()), // When embedding was generated
    // Metadata
    metadata: v.optional(v.object({
      sourceFile: v.optional(v.string()),
      importedAt: v.number(),
      dataType: v.string(),
      originalIndex: v.optional(v.number()),
    })),
    // Additional flexible field for imported data
    adHoc: v.optional(v.any()), // For any additional data from imports
    createdAt: v.number(), // When lead was created
    updatedAt: v.number(), // When lead was last updated
  }).index("by_opportunity_type", ["opportunityType"])
    .index("by_issuing_level", ["issuingBody.level"])
    .index("by_region", ["location.region"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"])
    .index("by_verification_status", ["verificationStatus"])
    .index("by_creation", ["createdAt"])
    .index("by_metadata_import", ["metadata.importedAt"])
    .index("by_embedding", ["embedding"])
    .index("by_embedding_model", ["embeddingModel"])
    .index("by_estimated_value", ["estimatedValueUSD"]),

  // Semantic Questions for better embeddings
  semanticQuestions: defineTable({
    question: v.string(), // The semantic question
    category: v.string(), // "job_posting", "resume", "opportunity", "lead", "general"
    subCategory: v.optional(v.string()), // More specific categorization (e.g., "technical_skills", "experience", "qualifications")
    description: v.string(), // Description of what this question helps capture
    weight: v.number(), // Importance weight (1-10) for embedding generation
    isActive: v.boolean(), // Whether this question is currently being used
    usageCount: v.number(), // How many times this question has been used
    effectiveness: v.optional(v.number()), // Effectiveness score based on search results (0-1)
    exampleAnswer: v.optional(v.string()), // Example of what a good answer looks like
    tags: v.array(v.string()), // Tags for easier filtering and organization
    createdBy: v.optional(v.string()), // User who created this question (Clerk ID)
    createdAt: v.number(), // When question was created
    updatedAt: v.number(), // When question was last updated
  }).index("by_category", ["category"])
    .index("by_subcategory", ["subCategory"])
    .index("by_active", ["isActive"])
    .index("by_weight", ["weight"])
    .index("by_effectiveness", ["effectiveness"])
    .index("by_creation", ["createdAt"])
    .index("by_usage", ["usageCount"]),

  // Favorites - track user favorites for resumes and job postings
  favorites: defineTable({
    userId: v.string(), // Clerk user ID
    entityType: v.union(v.literal("resume"), v.literal("jobposting")), // Type of entity being favorited
    entityId: v.string(), // ID of the entity (Convex ID as string)
    createdAt: v.number(), // When favorite was created
  }).index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user_entity", ["userId", "entityType"])
    .index("by_creation", ["createdAt"]),

  // Government Links - links to government resources by state
  govLinks: defineTable({
    title: v.string(),
    url: v.string(),
    stateCode: v.string(), // ISO 3166-2 code: "CA", "NY", "TX"
    stateName: v.string(), // Full name: "California", "New York"
    category: v.string(), // "Health", "Education", "Transportation", etc.
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    priority: v.optional(v.number()), // For ordering within a state
    isActive: v.boolean(),
    lastVerified: v.optional(v.number()), // Timestamp of last link check
  })
    .index("by_state", ["stateCode"])
    .index("by_category", ["category"])
    .index("by_state_category", ["stateCode", "category"])
    .index("by_active", ["isActive"]),

  // Categories for government links
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(), // Emoji or icon class
    color: v.string(), // Tailwind color class
  }).index("by_slug", ["slug"]),

  // Audit log for tracking changes to government links
  auditLog: defineTable({
    action: v.string(), // "create", "update", "delete"
    linkId: v.optional(v.id("govLinks")),
    userId: v.optional(v.string()),
    timestamp: v.number(),
    details: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"]),

  // Procurement Chat Sessions for AI-powered procurement link discovery
  procurementChatSessions: defineTable({
    userId: v.string(), // Clerk user ID
    title: v.string(), // Auto-generated or user-provided title
    isArchived: v.optional(v.boolean()),
    threadId: v.optional(v.string()), // Agent component thread ID
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "isArchived"])
    .index("by_last_message", ["lastMessageAt"]),

  // Procurement Chat Messages within sessions
  procurementChatMessages: defineTable({
    sessionId: v.id("procurementChatSessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(), // User prompt or AI summary
    // Store the full response data for assistant messages
    responseData: v.optional(v.object({
      search_metadata: v.object({
        target_regions: v.array(v.string()),
        count_found: v.number(),
        timestamp: v.optional(v.string()),
      }),
      procurement_links: v.array(v.object({
        state: v.string(),
        capital: v.string(),
        official_website: v.string(),
        procurement_link: v.string(),
        entity_type: v.optional(v.string()),
        link_type: v.optional(v.string()),
        confidence_score: v.optional(v.number()),
      })),
    })),
    isError: v.optional(v.boolean()), // Flag for error messages
    createdAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_creation", ["createdAt"]),

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

  // Procurement Chat System Prompts - configurable system prompts for procurement chat
  procurementChatSystemPrompts: defineTable({
    systemPromptText: v.string(), // The full system prompt text
    isPrimarySystemPrompt: v.boolean(), // Whether this is the active/primary prompt
    title: v.string(), // A descriptive title for this prompt
    description: v.optional(v.string()), // Optional description
    createdBy: v.optional(v.string()), // Clerk user ID who created this
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_primary", ["isPrimarySystemPrompt"])
    .index("by_creation", ["createdAt"]),

  // Procurement URLs - for ingesting and verifying procurement links before they become available for pins
  procurementUrls: defineTable({
    state: v.string(), // Full state name: "Alabama", "Alaska"
    capital: v.string(), // Capital city name
    officialWebsite: v.string(), // Official city website URL
    procurementLink: v.string(), // Procurement/bidding page URL
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")), // Verification status
    verifiedBy: v.optional(v.string()), // Clerk user ID of who verified
    verifiedAt: v.optional(v.number()), // Timestamp when verified
    denialReason: v.optional(v.string()), // Optional reason for denial
    importedAt: v.number(), // When this URL was imported
    sourceFile: v.optional(v.string()), // Source JSON file name
    requiresRegistration: v.optional(v.boolean()), // Whether registration is required to view bids
  })
    .index("by_state", ["state"])
    .index("by_status", ["status"])
    .index("by_state_status", ["state", "status"])
    .index("by_imported", ["importedAt"]),
};

export default defineSchema({
  ...applicationTables,
});
