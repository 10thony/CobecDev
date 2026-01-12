import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Insert a new resume
export const insert = mutation({
  args: {
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
    embedding: v.optional(v.array(v.number())),
    metadata: v.optional(v.object({
      filePath: v.optional(v.string()),
      fileName: v.string(),
      importedAt: v.number(),
      parsedAt: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const resumeId = await ctx.db.insert("resumes", args);
    return resumeId;
  },
});

// List all resumes (returns all resumes for data management)
export const list = query({
  args: {},
  handler: async (ctx) => {
    // Return all resumes to allow full access in data management component
    return await ctx.db.query("resumes").collect();
  },
});

// List all resumes (paginated version for better performance)
export const listPaginated = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, { paginationOpts }) => {
    return await ctx.db.query("resumes").paginate(paginationOpts);
  },
});

// List resumes for vector search (with higher limit)
export const listForVectorSearch = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 500 }) => {
    // Return up to specified limit for vector search operations
    // Vector search actions will handle similarity calculations
    return await ctx.db.query("resumes").take(limit);
  },
});

// Get resume by ID
export const get = query({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Update resume
export const update = mutation({
  args: {
    id: v.id("resumes"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Delete resume
export const remove = mutation({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return { success: true };
  },
});

// Search resumes by filename
export const searchByFilename = query({
  args: { filename: v.string() },
  handler: async (ctx, { filename }) => {
    return await ctx.db
      .query("resumes")
      .withIndex("by_filename", (q) => q.eq("filename", filename))
      .collect();
  },
});

// Search resumes by email
export const searchByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("resumes")
      .withIndex("by_email", (q) => q.eq("personalInfo.email", email))
      .collect();
  },
});

// Search resumes by skills
export const searchBySkills = query({
  args: { skills: v.array(v.string()) },
  handler: async (ctx, { skills }) => {
    const resumes = await ctx.db.query("resumes").collect();
    
    return resumes.filter(resume => {
      const resumeSkills = resume.skills || [];
      return skills.some(skill => 
        resumeSkills.some(resumeSkill => 
          resumeSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
    });
  },
});

// Get resumes with embeddings
export const getWithEmbeddings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("resumes")
      .filter((q) => q.neq(q.field("embedding"), undefined))
      .collect();
  },
});

// Count total resumes (efficient count without fetching all records)
export const count = query({
  args: {},
  handler: async (ctx) => {
    // Use collect() to get all IDs, then return count
    // This is efficient for counting without loading full documents
    const allResumes = await ctx.db.query("resumes").collect();
    return allResumes.length;
  },
});

// Bulk import mutation for Local Resume Bulk Importer
// This mutation is designed for simple bulk imports from local DOCX files
export const insertResume = mutation({
  args: {
    filename: v.string(),
    storageId: v.id("_storage"),
    textContent: v.string(),
    checksum: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for existing checksum to avoid duplicates
    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_checksum", (q) => q.eq("checksum", args.checksum))
      .first();

    if (existing) {
      // Resume with this checksum already exists, skip insertion
      return { id: existing._id, skipped: true };
    }

    // Insert new resume with minimal required fields and bulk import data
    const now = Date.now();
    const resumeId = await ctx.db.insert("resumes", {
      filename: args.filename,
      originalText: args.textContent, // Use textContent as originalText for compatibility
      // Required fields with default/empty values for bulk import
      personalInfo: {
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
        yearsOfExperience: 0,
      },
      professionalSummary: "",
      education: [],
      experience: [],
      skills: [],
      certifications: "",
      professionalMemberships: "",
      securityClearance: "",
      // Bulk import specific fields
      fileStorageId: args.storageId,
      textContent: args.textContent,
      importDate: new Date().toISOString(),
      checksum: args.checksum,
      createdAt: now,
      updatedAt: now,
    });

    return { id: resumeId, skipped: false };
  },
});
