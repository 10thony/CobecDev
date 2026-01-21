import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Default system prompt for AI resume generation
// This prompt instructs GPT-5-mini to generate realistic but synthetic resumes tailored to lead data
export const DEFAULT_SYSTEM_PROMPT = `You are an AI resume generation assistant. Your task is to create realistic, professional resumes tailored to specific procurement opportunities and lead data.

CRITICAL REQUIREMENTS:
1. Generate SYNTHETIC data only - never use real PII (Personally Identifiable Information)
2. Use placeholder names, emails, and phone numbers (e.g., "john.doe@example.com", "John Doe", "(555) 123-4567")
3. Tailor the resume to match the opportunity requirements from the lead data
4. Ensure all generated data is realistic and professional
5. Match years of experience to the opportunity level and requirements
6. Include relevant skills, certifications, and clearances based on the lead category

RESUME STRUCTURE:
You must generate a complete resume in JSON format with the following structure:
{
  "filename": "resume_[firstname]_[lastname].txt",
  "originalText": "Full resume text as it would appear in a document",
  "personalInfo": {
    "firstName": "Synthetic first name",
    "middleName": "Synthetic middle name or empty string",
    "lastName": "Synthetic last name",
    "email": "synthetic.email@example.com",
    "phone": "(555) XXX-XXXX format",
    "yearsOfExperience": <number matching opportunity level>
  },
  "professionalSummary": "2-3 sentence summary tailored to the opportunity",
  "education": ["Degree 1", "Degree 2", ...],
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "location": "City, State",
      "duration": "MM/YYYY - MM/YYYY",
      "responsibilities": ["Responsibility 1", "Responsibility 2", ...]
    }
  ],
  "skills": ["Skill 1", "Skill 2", ...], // Must match opportunity requirements
  "certifications": "Relevant certifications or empty string",
  "professionalMemberships": "Professional memberships or empty string",
  "securityClearance": "Security clearance level if relevant, otherwise empty string"
}

GENERATION GUIDELINES:
- Years of Experience: Match to opportunity level (entry: 0-3, mid: 3-7, senior: 7+)
- Skills: Extract relevant skills from the opportunity title, summary, and category
- Location: Match to lead location (region, city) when possible
- Experience Entries: Create 2-4 relevant work experience entries
- Education: Include 1-2 relevant degrees or certifications
- Professional Summary: Highlight experience relevant to the opportunity type

OPPORTUNITY ANALYSIS:
When provided with lead data, analyze:
- Opportunity Type: RFP, RFQ, Contract, etc.
- Category/Subcategory: Technology, Construction, Services, etc.
- Location: Region, city, county
- Summary: Key requirements and scope
- Estimated Value: Indicates project size and seniority needed

OUTPUT FORMAT:
You must respond with ONLY valid JSON. No markdown, no explanations, no code blocks - just the JSON object that matches the structure above.

Remember: All data must be synthetic and realistic. Never use real names, emails, or other PII.`;

// Get all resume generation system prompts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const prompts = await ctx.db
      .query("resumeGenerationSystemPrompts")
      .order("desc")
      .collect();
    return prompts;
  },
});

// Get the primary/active system prompt
export const getPrimary = query({
  args: {},
  handler: async (ctx) => {
    const primary = await ctx.db
      .query("resumeGenerationSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    return primary;
  },
});

// Get a specific prompt by ID
export const getById = query({
  args: {
    id: v.id("resumeGenerationSystemPrompts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new system prompt
export const create = mutation({
  args: {
    systemPromptText: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    isPrimarySystemPrompt: v.optional(v.boolean()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // If this is set as primary, unset all other primary prompts
    if (args.isPrimarySystemPrompt) {
      const existingPrimary = await ctx.db
        .query("resumeGenerationSystemPrompts")
        .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
        .collect();
      
      for (const prompt of existingPrimary) {
        await ctx.db.patch(prompt._id, {
          isPrimarySystemPrompt: false,
          updatedAt: now,
        });
      }
    }
    
    return await ctx.db.insert("resumeGenerationSystemPrompts", {
      systemPromptText: args.systemPromptText,
      title: args.title,
      description: args.description,
      isPrimarySystemPrompt: args.isPrimarySystemPrompt ?? false,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing system prompt
export const update = mutation({
  args: {
    id: v.id("resumeGenerationSystemPrompts"),
    systemPromptText: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isPrimarySystemPrompt: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    
    // If setting as primary, unset all other primary prompts
    if (updates.isPrimarySystemPrompt === true) {
      const existingPrimary = await ctx.db
        .query("resumeGenerationSystemPrompts")
        .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
        .collect();
      
      for (const prompt of existingPrimary) {
        if (prompt._id !== id) {
          await ctx.db.patch(prompt._id, {
            isPrimarySystemPrompt: false,
            updatedAt: now,
          });
        }
      }
    }
    
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });
  },
});

// Set a prompt as primary (unsetting all others)
export const setPrimary = mutation({
  args: {
    id: v.id("resumeGenerationSystemPrompts"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Unset all other primary prompts
    const existingPrimary = await ctx.db
      .query("resumeGenerationSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .collect();
    
    for (const prompt of existingPrimary) {
      if (prompt._id !== args.id) {
        await ctx.db.patch(prompt._id, {
          isPrimarySystemPrompt: false,
          updatedAt: now,
        });
      }
    }
    
    // Set this prompt as primary
    return await ctx.db.patch(args.id, {
      isPrimarySystemPrompt: true,
      updatedAt: now,
    });
  },
});

// Delete a system prompt
export const deletePrompt = mutation({
  args: {
    id: v.id("resumeGenerationSystemPrompts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Internal query to get primary prompt (for use in actions)
export const getPrimaryInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const primary = await ctx.db
      .query("resumeGenerationSystemPrompts")
      .withIndex("by_primary", (q) => q.eq("isPrimarySystemPrompt", true))
      .first();
    return primary;
  },
});
