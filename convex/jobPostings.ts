import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Insert a new job posting
export const insert = mutation({
  args: {
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
    embedding: v.optional(v.array(v.number())),
    metadata: v.optional(v.object({
      originalIndex: v.optional(v.number()),
      importedAt: v.number(),
      sourceFile: v.optional(v.string()),
      dataType: v.string(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("jobpostings", args);
    return jobId;
  },
});

// List all job postings
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("jobpostings").collect();
  },
});

// Get job posting by ID
export const get = query({
  args: { id: v.id("jobpostings") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Update job posting
export const update = mutation({
  args: {
    id: v.id("jobpostings"),
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

// Delete job posting
export const remove = mutation({
  args: { id: v.id("jobpostings") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return { success: true };
  },
});

// Search job postings by title
export const searchByTitle = query({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    return await ctx.db
      .query("jobpostings")
      .withIndex("by_jobTitle", (q) => q.eq("jobTitle", title))
      .collect();
  },
});

// Search job postings by location
export const searchByLocation = query({
  args: { location: v.string() },
  handler: async (ctx, { location }) => {
    return await ctx.db
      .query("jobpostings")
      .withIndex("by_location", (q) => q.eq("location", location))
      .collect();
  },
});

// Search job postings by department
export const searchByDepartment = query({
  args: { department: v.string() },
  handler: async (ctx, { department }) => {
    return await ctx.db
      .query("jobpostings")
      .withIndex("by_department", (q) => q.eq("department", department))
      .collect();
  },
});
