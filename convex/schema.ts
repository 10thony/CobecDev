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
    openrouterMetadata: v.optional(v.object({
      totalCost: v.number(),
      latency: v.number(),
    })), // OpenRouter-specific metadata for cost and latency tracking
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
    // Raw section data for debugging and reprocessing
    sectionData: v.optional(v.object({
      experience: v.optional(v.object({
        sectionType: v.string(),
        rawText: v.string(),
        extractedBy: v.string(),
        extractionConfidence: v.number(),
        parsedData: v.optional(v.any()),
        parseErrors: v.optional(v.array(v.string())),
        parseConfidence: v.optional(v.number()),
        startIndex: v.optional(v.number()),
        endIndex: v.optional(v.number()),
      })),
      skills: v.optional(v.object({
        sectionType: v.string(),
        rawText: v.string(),
        extractedBy: v.string(),
        extractionConfidence: v.number(),
        parsedData: v.optional(v.any()),
        parseErrors: v.optional(v.array(v.string())),
        parseConfidence: v.optional(v.number()),
        startIndex: v.optional(v.number()),
        endIndex: v.optional(v.number()),
      })),
      education: v.optional(v.object({
        sectionType: v.string(),
        rawText: v.string(),
        extractedBy: v.string(),
        extractionConfidence: v.number(),
        parsedData: v.optional(v.any()),
        parseErrors: v.optional(v.array(v.string())),
        parseConfidence: v.optional(v.number()),
        startIndex: v.optional(v.number()),
        endIndex: v.optional(v.number()),
      })),
    })),
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
  // Consolidated with jobpostings table - includes all fields from both
  leads: defineTable({
    opportunityType: v.string(), // "Public Sector", "Private Subcontract", "Job Posting", etc.
    opportunityTitle: v.string(), // Title of the opportunity (or jobTitle for job postings)
    contractID: v.optional(v.string()), // Contract ID if available
    issuingBody: v.object({
      name: v.string(), // Name of the issuing organization (or department for job postings)
      level: v.string(), // State, Regional, City, County, etc.
    }),
    location: v.object({
      city: v.optional(v.string()), // City name
      county: v.optional(v.string()), // County name
      region: v.string(), // Geographic region (Dallas–Fort Worth, Houston, Austin, etc.)
      // For job postings: location string is stored here as city or region
    }),
    status: v.string(), // "Active / Open for Task Orders", "Open for Bidding", etc.
    estimatedValueUSD: v.optional(v.number()), // Estimated value in USD
    keyDates: v.object({
      publishedDate: v.optional(v.string()), // Date when opportunity was published (or openDate for job postings)
      bidDeadline: v.optional(v.string()), // Bid deadline if available (or closeDate/applicationDeadline for job postings)
      projectedStartDate: v.optional(v.string()), // Projected start date
    }),
    source: v.object({
      documentName: v.string(), // Name of the source document
      url: v.string(), // URL to the source (or jobLink for job postings)
    }),
    contacts: v.array(v.object({
      name: v.optional(v.string()), // Contact person name (can be null)
      title: v.string(), // Contact person title
      email: v.optional(v.string()), // Contact email
      phone: v.optional(v.string()), // Contact phone
      url: v.optional(v.string()), // Contact URL
    })),
    summary: v.string(), // Detailed summary of the opportunity (or jobSummary for job postings)
    verificationStatus: v.optional(v.string()), // Verification status (e.g., "Verified", "Pending – Requires Portal Login")
    // Additional fields for enhanced functionality
    category: v.optional(v.string()), // Opportunity category
    subcategory: v.optional(v.string()), // More specific category
    isActive: v.optional(v.boolean()), // Whether the opportunity is currently active
    lastChecked: v.optional(v.number()), // Timestamp of last data check
    // Search and embedding fields for future semantic search
    searchableText: v.optional(v.string()), // Aggregated searchable content
    completeSearchableText: v.optional(v.string()), // Complete searchable text for semantic search
    extractedSkills: v.optional(v.array(v.string())), // Extracted skills from job postings
    embedding: v.optional(v.array(v.float64())), // Vector embedding for semantic search (Gemini MRL 2048 embedding dimension)
    embeddingModel: v.optional(v.string()), // Model used for embedding
    embeddingGeneratedAt: v.optional(v.number()), // When embedding was generated
    // Job posting specific fields (optional, for migrated job postings)
    salary: v.optional(v.string()), // Salary information
    jobType: v.optional(v.string()), // Job type (full-time, part-time, etc.)
    duties: v.optional(v.string()), // Job duties
    requirements: v.optional(v.string()), // Job requirements
    qualifications: v.optional(v.string()), // Job qualifications
    education: v.optional(v.array(v.string())), // Education requirements
    howToApply: v.optional(v.string()), // How to apply instructions
    additionalInformation: v.optional(v.string()), // Additional information
    seriesGrade: v.optional(v.string()), // Series/grade for government jobs
    travelRequired: v.optional(v.string()), // Travel requirements
    workSchedule: v.optional(v.string()), // Work schedule
    securityClearance: v.optional(v.string()), // Security clearance requirements
    experienceRequired: v.optional(v.string()), // Experience requirements
    educationRequired: v.optional(v.string()), // Education requirements (string format)
    applicationDeadline: v.optional(v.string()), // Application deadline
    contactInfo: v.optional(v.string()), // Contact information (string format, can be parsed into contacts array)
    // Additional fields for migration compatibility
    _id: v.optional(v.string()), // MongoDB ObjectId compatibility
    _index: v.optional(v.number()), // Source data index
    // Metadata
    metadata: v.optional(v.object({
      sourceFile: v.optional(v.string()),
      importedAt: v.number(),
      dataType: v.string(), // "lead", "job_posting", "bulk_import", etc.
      originalIndex: v.optional(v.number()),
      embeddingModel: v.optional(v.string()),
      parsedAt: v.optional(v.number()),
      processedAt: v.optional(v.object({
        date: v.string(),
      })),
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
    .index("by_metadata_source", ["metadata.sourceFile"])
    .index("by_embedding_model", ["embeddingModel"])
    .index("by_embedding_generated", ["embeddingGeneratedAt"])
    .index("by_estimated_value", ["estimatedValueUSD"])
    .index("by_source_url", ["source.url"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["category", "location.region", "opportunityType"],
    }),

  // Job Postings - TEMPORARY: Kept for migration purposes only
  // TODO: Remove this table after migrateJobPostingsToLeads migration completes successfully
  // This table exists temporarily to allow the migration to access existing job posting data
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
    completeSearchableText: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
    embeddingModel: v.optional(v.string()),
    embeddingGeneratedAt: v.optional(v.number()),
    _id: v.optional(v.string()),
    _index: v.optional(v.number()),
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
    .index("by_embedding_model", ["embeddingModel"])
    .index("by_embedding_generated", ["embeddingGeneratedAt"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["department", "location", "jobType"],
    }),

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
    userId: v.optional(v.string()), // Clerk user ID (optional for unauthenticated users)
    anonymousId: v.optional(v.string()), // Temporary ID for unauthenticated users
    title: v.string(), // Auto-generated or user-provided title
    isArchived: v.optional(v.boolean()),
    threadId: v.optional(v.string()), // Agent component thread ID
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_anonymous", ["anonymousId"])
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
    userId: v.string(), // Clerk user ID or anonymousId for unauthenticated users
    
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

  // Resume Parsing Analytics for tracking AI resume parser usage and costs
  resumeParsingAnalytics: defineTable({
    // Request identification
    resumeId: v.optional(v.id("resumes")), // If parsing an existing resume
    filename: v.string(), // Resume filename being parsed
    userId: v.string(), // Clerk user ID or "system" for automated
    
    // Input/Output content
    inputText: v.string(), // The raw resume text sent to AI (truncated for storage)
    outputJson: v.string(), // The parsed JSON response from AI (truncated for storage)
    
    // Model information
    model: v.string(), // e.g., "gpt-5-mini"
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
    isError: v.optional(v.boolean()), // Whether request failed
    errorMessage: v.optional(v.string()), // Error details if failed
    latencyMs: v.optional(v.number()), // Response time in milliseconds
    parserType: v.string(), // "ai" to distinguish from regex parser
    
    // Timestamps
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_resume", ["resumeId"])
    .index("by_provider", ["provider"])
    .index("by_model", ["model"])
    .index("by_creation", ["createdAt"])
    .index("by_user_creation", ["userId", "createdAt"]),

  // Chat System Prompts - configurable system prompts for chat
  chatSystemPrompts: defineTable({
    systemPromptText: v.string(), // The full system prompt text
    isPrimarySystemPrompt: v.boolean(), // Whether this is the active/primary prompt
    title: v.string(), // A descriptive title for this prompt
    description: v.optional(v.string()), // Optional description
    type: v.id("chatSystemPromptTypes"), // The type of prompt (basic, leads, procurementHubs)
    createdBy: v.optional(v.string()), // Clerk user ID who created this
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_primary", ["isPrimarySystemPrompt"])
    .index("by_creation", ["createdAt"])
    .index("by_type", ["type"])
    .index("by_type_primary", ["type", "isPrimarySystemPrompt"]),

  // Chat System Prompt Types - manageable types for system prompts
  chatSystemPromptTypes: defineTable({
    name: v.string(), // Type name: "basic", "leads", "procurementHubs"
    displayName: v.string(), // Display name: "Basic", "Leads", "Procurement Hubs"
    description: v.optional(v.string()), // Optional description
    isDefault: v.boolean(), // Whether this is the default type
    order: v.number(), // Display order
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_order", ["order"]),

  // Procurement Chat System Prompts - DEPRECATED: Use chatSystemPrompts instead
  // Kept for migration purposes
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
    // AI Agent fields
    aiReviewStatus: v.optional(v.union(v.literal("idle"), v.literal("processing"), v.literal("completed"), v.literal("failed"))), // AI review status
    aiDecision: v.optional(v.union(v.literal("approve"), v.literal("deny"))), // AI decision
    aiReasoning: v.optional(v.string()), // AI reasoning for the decision
    lastAgentAttempt: v.optional(v.number()), // Timestamp of last agent attempt
  })
    .index("by_state", ["state"])
    .index("by_status", ["status"])
    .index("by_state_status", ["state", "status"])
    .index("by_state_capital", ["state", "capital"]) // Composite index for state+city lookup
    .index("by_imported", ["importedAt"])
    .index("by_ai_review_status", ["aiReviewStatus"]),

  // Approved Procurement Links Lookup - singleton table for system prompt injection
  // This table caches all approved procurement links for efficient access during chat
  approvedProcurementLinksLookUp: defineTable({
    dateCreated: v.number(), // Timestamp when the lookup was first created
    lastApprovedBy: v.string(), // User ID (Clerk), "AI Agent", "System", or "Migration"
    lastApprovedAt: v.number(), // Timestamp of last approval that triggered update
    approvedProcurementLinks: v.array(
      v.object({
        state: v.string(),
        capital: v.string(),
        officialWebsite: v.string(),
        procurementLink: v.string(),
        // CRITICAL: Use v.union with v.null() for optional fields inside arrays
        // Using v.optional() inside arrays causes Convex deployment errors
        entityType: v.union(v.string(), v.null()),
        linkType: v.union(v.string(), v.null()),
        requiresRegistration: v.union(v.boolean(), v.null()),
      })
    ), // Array of all approved procurement links
    updatedAt: v.number(), // Last update timestamp
  })
    .index("by_creation", ["dateCreated"]), // For sorting/querying

  // Scraped Procurement Data - stores data scraped from procurement websites
  scrapedProcurementData: defineTable({
    // Source information
    procurementLinkId: v.optional(v.id("procurementUrls")), // Reference to original procurement link
    sourceUrl: v.string(), // The URL that was scraped
    state: v.string(), // State name
    capital: v.string(), // City/capital name
    
    // Scraping metadata
    scrapedAt: v.number(), // Timestamp when scraping occurred
    scrapedBy: v.string(), // "AI Agent" or user ID
    scrapingStatus: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    ),
    status: v.optional(v.union( // Legacy field - kept for compatibility, maps to scrapingStatus
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    )),
    errorMessage: v.optional(v.string()), // Error message if scraping failed
    
    // Scraped data (stored as JSON)
    scrapedData: v.any(), // Flexible JSON structure to handle different website formats
    
    // AI metadata
    aiModel: v.string(), // "gpt-5-mini"
    aiPrompt: v.optional(v.string()), // The prompt used for scraping
    tokensUsed: v.optional(v.number()), // Token usage for cost tracking
    
    // Data quality
    dataQuality: v.optional(v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    )),
    dataCompleteness: v.optional(v.number()), // 0-1 score
    
    // Last update
    updatedAt: v.number(),
  })
    .index("by_source_url", ["sourceUrl"])
    .index("by_state", ["state"])
    .index("by_status", ["scrapingStatus"])
    .index("by_scraped_at", ["scrapedAt"])
    .index("by_procurement_link", ["procurementLinkId"]),

  // Procurement Scraper System Prompts - configurable system prompts for procurement scraper
  procurementScraperSystemPrompts: defineTable({
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

  // Scraping Jobs (for browser agent tracking)
  scrapingJobs: defineTable({
    // Identification
    portalId: v.optional(v.id("portals")),
    batchJobId: v.optional(v.id("scrapingBatchJobs")),
    procurementLinkId: v.optional(v.id("procurementUrls")),
    
    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    // Browser Agent Info
    agentJobId: v.string(),          // UUID sent to browser agent
    agentStatus: v.optional(v.string()),
    
    // URL and location
    url: v.string(),
    state: v.string(),
    capital: v.string(),
    
    // Progress
    currentPage: v.optional(v.number()),
    totalPages: v.optional(v.number()),
    opportunitiesFound: v.optional(v.number()),
    currentAction: v.optional(v.string()),
    
    // Timing
    queuedAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    
    // Results
    resultRecordId: v.optional(v.id("scrapedProcurementData")),
    
    // Errors
    errorMessage: v.optional(v.string()),
    errorType: v.optional(v.string()),
    retryCount: v.number(),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_portal", ["portalId"])
    .index("by_status", ["status"])
    .index("by_agent_job_id", ["agentJobId"])
    .index("by_batch_job", ["batchJobId"]),

  // Scraping Batch Jobs - tracks batch scraping operations for persistence across navigation
  scrapingBatchJobs: defineTable({
    userId: v.string(), // Clerk user ID who started the job
    jobType: v.union(
      v.literal("all_approved"), // Scraping all approved links
      v.literal("multiple"), // Scraping multiple specific URLs
      v.literal("single") // Scraping a single URL
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    totalUrls: v.number(), // Total number of URLs to scrape
    completedUrls: v.number(), // Number of URLs completed
    failedUrls: v.number(), // Number of URLs that failed
    urls: v.array(v.string()), // List of URLs to scrape (for reference)
    recordIds: v.array(v.id("scrapedProcurementData")), // IDs of created scraping records
    errorMessage: v.optional(v.string()), // Error message if job failed
    startedAt: v.number(), // When the job started
    completedAt: v.optional(v.number()), // When the job completed
    updatedAt: v.number(), // Last update timestamp
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"])
    .index("by_started_at", ["startedAt"]),

  // ============================================================================
  // PROCUREMENT OPPORTUNITIES - Individual scraped procurement items
  // ============================================================================
  procurementOpportunities: defineTable({
    // ─────────────────────────────────────────────────────────────────────────
    // SOURCE TRACKING
    // ─────────────────────────────────────────────────────────────────────────
    scrapedDataId: v.id("scrapedProcurementData"), // Parent scraping session
    sourceUrl: v.string(), // URL of the list page where this was found
    detailUrl: v.optional(v.string()), // URL of the opportunity detail page (if navigated)
    
    // ─────────────────────────────────────────────────────────────────────────
    // LOCATION DATA
    // ─────────────────────────────────────────────────────────────────────────
    state: v.string(),
    capital: v.string(),
    
    // ─────────────────────────────────────────────────────────────────────────
    // CORE OPPORTUNITY DATA
    // ─────────────────────────────────────────────────────────────────────────
    title: v.string(), // Required - opportunity title
    referenceNumber: v.optional(v.string()), // RFP-2024-001, ITB-123, etc.
    opportunityType: v.optional(v.string()), // RFP, RFQ, ITB, IFB, RFI, etc.
    status: v.optional(v.string()), // Open, Closed, Awarded, Pending, etc.
    
    // ─────────────────────────────────────────────────────────────────────────
    // DATES
    // ─────────────────────────────────────────────────────────────────────────
    postedDate: v.optional(v.string()), // When the opportunity was posted
    closingDate: v.optional(v.string()), // Deadline for submissions
    openingDate: v.optional(v.string()), // When bids will be opened
    awardDate: v.optional(v.string()), // When contract was/will be awarded
    lastModifiedDate: v.optional(v.string()), // Last update to the listing
    
    // ─────────────────────────────────────────────────────────────────────────
    // DESCRIPTION & CLASSIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    description: v.optional(v.string()), // Full description text
    shortDescription: v.optional(v.string()), // Summary/teaser text
    category: v.optional(v.string()), // Category/classification
    subcategory: v.optional(v.string()),
    department: v.optional(v.string()), // Issuing department/agency
    division: v.optional(v.string()),
    
    // ─────────────────────────────────────────────────────────────────────────
    // FINANCIAL
    // ─────────────────────────────────────────────────────────────────────────
    estimatedValue: v.optional(v.string()), // Dollar amount or range
    budgetCode: v.optional(v.string()),
    fundingSource: v.optional(v.string()),
    
    // ─────────────────────────────────────────────────────────────────────────
    // CONTACT INFORMATION
    // ─────────────────────────────────────────────────────────────────────────
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactAddress: v.optional(v.string()),
    buyerName: v.optional(v.string()), // Procurement officer name
    
    // ─────────────────────────────────────────────────────────────────────────
    // REQUIREMENTS
    // ─────────────────────────────────────────────────────────────────────────
    requirements: v.optional(v.string()), // Eligibility/qualification requirements
    certifications: v.optional(v.array(v.string())), // Required certifications
    setAside: v.optional(v.string()), // Small business set-aside info
    
    // ─────────────────────────────────────────────────────────────────────────
    // DOCUMENTS & ATTACHMENTS
    // ─────────────────────────────────────────────────────────────────────────
    documents: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.optional(v.string()), // PDF, DOC, XLS, etc.
      size: v.optional(v.string()),
    }))),
    
    // ─────────────────────────────────────────────────────────────────────────
    // SUBMISSION INFO
    // ─────────────────────────────────────────────────────────────────────────
    submissionMethod: v.optional(v.string()), // Online, Email, Mail, etc.
    submissionInstructions: v.optional(v.string()),
    
    // ─────────────────────────────────────────────────────────────────────────
    // SCRAPING METADATA
    // ─────────────────────────────────────────────────────────────────────────
    scrapedAt: v.number(), // Timestamp when scraped
    rawScrapedText: v.optional(v.string()), // Raw text for debugging
    confidence: v.optional(v.number()), // AI confidence score 0-1
    
    // ─────────────────────────────────────────────────────────────────────────
    // DEDUPLICATION
    // ─────────────────────────────────────────────────────────────────────────
    hash: v.optional(v.string()), // Hash of key fields for dedup
  })
    .index("by_scraped_data", ["scrapedDataId"])
    .index("by_source_url", ["sourceUrl"])
    .index("by_state", ["state"])
    .index("by_state_capital", ["state", "capital"])
    .index("by_closing_date", ["closingDate"])
    .index("by_type", ["opportunityType"])
    .index("by_status", ["status"])
    .index("by_scraped_at", ["scrapedAt"])
    .index("by_hash", ["hash"]),

  // ============================================================================
  // SCRAPER INTERACTION LOG - Debug trail of scraper actions
  // ============================================================================
  scraperInteractionLog: defineTable({
    scrapedDataId: v.id("scrapedProcurementData"), // Parent scraping session
    
    // Action details
    action: v.string(), // "navigate", "click", "snapshot", "extract", "scroll", etc.
    selector: v.optional(v.string()), // Element reference (e.g., "D14", "B7")
    description: v.string(), // Human-readable description
    
    // Result
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    
    // Context
    pageUrl: v.optional(v.string()), // URL at time of action
    timestamp: v.number(),
    durationMs: v.optional(v.number()), // How long the action took
    
    // Debug data
    snapshotPreview: v.optional(v.string()), // First 500 chars of snapshot
    aiAnalysis: v.optional(v.string()), // AI reasoning for this action
  })
    .index("by_scraped_data", ["scrapedDataId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),

  // ============================================================================
  // SCRAPING STRATEGIES - Site-specific scraping configurations
  // ============================================================================
  scrapingStrategies: defineTable({
    // URL pattern matching
    urlPattern: v.string(), // Regex pattern to match URLs
    siteName: v.string(), // Human-readable site name
    
    // Page structure hints
    listPageSelectors: v.optional(v.object({
      opportunityRow: v.optional(v.string()), // CSS-like hint for rows
      opportunityLink: v.optional(v.string()),
      nextPageButton: v.optional(v.string()),
      loadMoreButton: v.optional(v.string()),
    })),
    
    detailPageSelectors: v.optional(v.object({
      title: v.optional(v.string()),
      referenceNumber: v.optional(v.string()),
      closingDate: v.optional(v.string()),
      description: v.optional(v.string()),
    })),
    
    // Special handling
    requiresLogin: v.boolean(),
    hasInfiniteScroll: v.boolean(),
    spaType: v.optional(v.string()), // "react", "angular", "vue", "none"
    
    // AI prompt customization
    customListPagePrompt: v.optional(v.string()),
    customDetailPagePrompt: v.optional(v.string()),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    successRate: v.optional(v.number()), // Tracked over time
    lastUsed: v.optional(v.number()),
  })
    .index("by_url_pattern", ["urlPattern"])
    .index("by_site_name", ["siteName"]),

  // HR Dashboard Component Visibility - controls which tabs/components are visible
  hrDashboardComponents: defineTable({
    componentId: v.string(), // Unique ID for the component (e.g., "overview", "search", "kfc-management")
    componentName: v.string(), // Display name (e.g., "HR Overview", "Semantic Search")
    isVisible: v.boolean(), // Whether this component is visible to users
    requiresAuth: v.optional(v.boolean()), // Whether this component requires authentication (default: true)
    description: v.optional(v.string()), // Optional description
    order: v.optional(v.number()), // Optional ordering for display
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_component_id", ["componentId"])
    .index("by_visible", ["isVisible"])
    .index("by_order", ["order"]),

  // Procurement Data - stores scraped procurement data for review
  procurementData: defineTable({
    procurementUrlId: v.optional(v.id("procurementUrls")),
    state: v.string(),
    sourceUrl: v.string(),
    data: v.array(v.any()),
    rowCount: v.number(),
    status: v.string(),
    createdAt: v.number(),
  })
    .index("by_procurement_url", ["procurementUrlId"])
    .index("by_state", ["state"])
    .index("by_status", ["status"])
    .index("by_creation", ["createdAt"]),

  // Feedback - stores user feedback for the procurement links feature
  feedback: defineTable({
    text: v.string(), // The feedback text
    normalizedText: v.optional(v.string()), // Lowercase, trimmed, for clustering (optional for backward compatibility)
    submittedBy: v.optional(v.string()), // Clerk user ID if authenticated, null if anonymous
    createdAt: v.number(), // When feedback was submitted
    clusterId: v.optional(v.id("feedbackClusters")), // Links to cluster
    sentiment: v.optional(v.string()), // "positive" | "neutral" | "negative" | "suggestion"
    tags: v.optional(v.array(v.string())),
  })
    .index("by_creation", ["createdAt"])
    .index("by_user", ["submittedBy"])
    .index("by_cluster", ["clusterId"])
    .index("by_normalized", ["normalizedText"]),

  // Feedback Clusters - groups similar/duplicate feedback
  feedbackClusters: defineTable({
    canonicalText: v.string(), // Representative text for the cluster
    normalizedKey: v.string(), // Normalized string for matching
    count: v.number(), // Total submissions
    uniqueUsers: v.number(), // Distinct users who submitted
    firstSubmittedAt: v.number(),
    lastSubmittedAt: v.number(),
    heat: v.number(), // Calculated "hotness" score
    position: v.optional(v.object({ // Persisted position (optional)
      x: v.number(),
      y: v.number(),
    })),
  })
    .index("by_count", ["count"])
    .index("by_heat", ["heat"])
    .index("by_normalized_key", ["normalizedKey"]),

  // Public Navigation Items - configurable navigation items for unauthenticated users
  publicNavigationItems: defineTable({
    path: v.string(), // Route path (e.g., "/", "/government-links")
    label: v.string(), // Display label (e.g., "Procurement Links", "Government Links")
    icon: v.string(), // Icon name from lucide-react (e.g., "Globe", "Map")
    order: v.number(), // Display order (lower numbers appear first)
    isVisible: v.boolean(), // Whether this item is visible
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order", ["order"])
    .index("by_visible", ["isVisible"])
    .index("by_path", ["path"]),
};

export default defineSchema({
  ...applicationTables,
});
