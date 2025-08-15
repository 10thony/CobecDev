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

// List all resumes
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("resumes").collect();
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
