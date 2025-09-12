import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Vector Search Prompts Management System
 * Manages prompts used for embedding generation and provides UI for prompt management
 */

// Vector search prompts from the VECTOR_SEARCH_PROMPTS.md file
const DEFAULT_VECTOR_SEARCH_PROMPTS = [
  // Technical Skills (Based on Actual Resume Data)
  "Find candidates or jobs with ArcGIS skills",
  "Find candidates or jobs with Survey123 skills", 
  "Find candidates or jobs with JavaScript skills",
  "Find candidates or jobs with Power Platform (PowerBI, PowerApps, Power Automate) skills",
  "Find candidates or jobs with Tableau skills",
  "Find candidates or jobs with MS Office skills",
  "Find candidates or jobs with SQL skills",
  "Find candidates or jobs with HTML skills",
  "Find candidates or jobs with SharePoint/KSN skills",
  "Find candidates or jobs with Python skills",
  "Find candidates or jobs with C programming skills",
  "Find candidates or jobs with R programming skills",
  "Find candidates or jobs with MySQL skills",
  "Find candidates or jobs with Linux skills",
  "Find candidates or jobs with Git skills",
  "Find candidates or jobs with Docker skills",
  "Find candidates or jobs with AWS S3 skills",
  "Find candidates or jobs with SageMaker skills",
  "Find candidates or jobs with Chinese language skills",
  "Find candidates or jobs with RFP preparation skills",
  
  // Mobile Development Specific
  "Find candidates or jobs with iOS development experience",
  "Find candidates or jobs with iPhone app development skills",
  "Find candidates or jobs with mobile app development experience",
  "Find candidates or jobs with Swift programming skills",
  "Find candidates or jobs with Objective-C skills",
  "Find candidates or jobs with Xcode development experience",
  "Find candidates or jobs with mobile UI/UX design skills",
  "Find candidates or jobs with app store deployment experience",
  
  // Professional Skills
  "Find candidates or jobs with project management experience",
  "Search for positions or resumes with data analysis expertise",
  "Find candidates or jobs with cybersecurity experience",
  "Search for positions or resumes with cloud computing skills",
  "Find candidates or jobs with machine learning expertise",
  "Search for positions or resumes with leadership experience",
  "Find candidates or jobs with financial analysis skills",
  "Search for positions or resumes with aviation experience",
  "Find candidates or jobs with government contracting experience",
  "Search for positions or resumes with business analysis expertise",
  
  // Software Development
  "Find resumes for software development positions with programming languages",
  "Search for candidates with database management and SQL experience",
  "Find resumes for web development and frontend positions",
  "Search for candidates with mobile development and app experience",
  "Find resumes for DevOps and automation positions",
  
  // Data & Analytics
  "Find resumes for data analysis and business intelligence positions",
  "Search for candidates with machine learning and AI experience",
  "Find resumes for data science positions with statistical analysis",
  "Search for candidates with business intelligence and reporting experience",
  "Find resumes for analytics positions with data visualization skills",
  
  // Infrastructure & Security
  "Find resumes for network security and cybersecurity positions",
  "Search for candidates with cloud computing and infrastructure experience",
  "Find resumes for system administration and IT support positions",
  "Search for candidates with network administration and security experience",
  "Find resumes for infrastructure management positions"
];

/**
 * Get all vector search prompts
 */
export const getVectorSearchPrompts = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Get prompts from the database
      const storedPrompts = await ctx.db.query("vectorSearchPrompts").collect();
      
      // If no prompts in database, return default prompts
      if (storedPrompts.length === 0) {
        return {
          prompts: DEFAULT_VECTOR_SEARCH_PROMPTS.map((prompt, index) => ({
            id: `default-${index}`,
            text: prompt,
            category: "Default",
            isDefault: true,
            usageCount: 0,
            effectiveness: 0.5,
            createdAt: Date.now()
          })),
          totalCount: DEFAULT_VECTOR_SEARCH_PROMPTS.length,
          needsEmbeddingRegeneration: false
        };
      }
      
      // Return stored prompts
      const prompts = storedPrompts.map(prompt => ({
        id: prompt._id,
        text: prompt.text,
        category: prompt.category || "Custom",
        isDefault: false,
        usageCount: prompt.usageCount || 0,
        effectiveness: prompt.effectiveness || 0.5,
        createdAt: prompt.createdAt
      }));
      
      return {
        prompts,
        totalCount: prompts.length,
        needsEmbeddingRegeneration: storedPrompts.some(p => p.needsEmbeddingRegeneration)
      };
    } catch (error) {
      console.error("Error getting vector search prompts:", error);
      throw error;
    }
  },
});

/**
 * Add a new vector search prompt
 */
export const addVectorSearchPrompt = mutation({
  args: {
    text: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { text, category = "Custom" }) => {
    try {
      // Check if prompt already exists
      const existingPrompt = await ctx.db
        .query("vectorSearchPrompts")
        .filter((q) => q.eq(q.field("text"), text))
        .first();
      
      if (existingPrompt) {
        throw new Error("This prompt already exists");
      }
      
      // Add new prompt
      const promptId = await ctx.db.insert("vectorSearchPrompts", {
        text: text.trim(),
        category,
        usageCount: 0,
        effectiveness: 0.5,
        needsEmbeddingRegeneration: true, // Flag that embeddings need regeneration
        createdAt: Date.now()
      });
      
      return {
        success: true,
        promptId,
        message: "Prompt added successfully. Embeddings should be regenerated for optimal results."
      };
    } catch (error) {
      console.error("Error adding vector search prompt:", error);
      throw error;
    }
  },
});

/**
 * Update vector search prompt
 */
export const updateVectorSearchPrompt = mutation({
  args: {
    id: v.id("vectorSearchPrompts"),
    text: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { id, text, category }) => {
    try {
      const updates: any = {};
      
      if (text !== undefined) {
        updates.text = text.trim();
        updates.needsEmbeddingRegeneration = true; // Flag that embeddings need regeneration
      }
      
      if (category !== undefined) {
        updates.category = category;
      }
      
      await ctx.db.patch(id, updates);
      
      return {
        success: true,
        message: "Prompt updated successfully. Embeddings should be regenerated for optimal results."
      };
    } catch (error) {
      console.error("Error updating vector search prompt:", error);
      throw error;
    }
  },
});

/**
 * Delete vector search prompt
 */
export const deleteVectorSearchPrompt = mutation({
  args: {
    id: v.id("vectorSearchPrompts"),
  },
  handler: async (ctx, { id }) => {
    try {
      await ctx.db.delete(id);
      
      return {
        success: true,
        message: "Prompt deleted successfully"
      };
    } catch (error) {
      console.error("Error deleting vector search prompt:", error);
      throw error;
    }
  },
});

/**
 * Initialize default prompts in the database
 */
export const initializeDefaultPrompts = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      // Check if prompts already exist
      const existingPrompts = await ctx.db.query("vectorSearchPrompts").collect();
      
      if (existingPrompts.length > 0) {
        return {
          success: false,
          message: "Prompts already initialized"
        };
      }
      
      // Insert default prompts
      const defaultPrompts = DEFAULT_VECTOR_SEARCH_PROMPTS.map((text, index) => ({
        text,
        category: "Default",
        usageCount: 0,
        effectiveness: 0.5,
        needsEmbeddingRegeneration: false,
        createdAt: Date.now()
      }));
      
      for (const prompt of defaultPrompts) {
        await ctx.db.insert("vectorSearchPrompts", prompt);
      }
      
      return {
        success: true,
        message: `Initialized ${defaultPrompts.length} default prompts`,
        count: defaultPrompts.length
      };
    } catch (error) {
      console.error("Error initializing default prompts:", error);
      throw error;
    }
  },
});

/**
 * Get prompts that need embedding regeneration
 */
export const getPromptsNeedingRegeneration = query({
  args: {},
  handler: async (ctx) => {
    try {
      const prompts = await ctx.db
        .query("vectorSearchPrompts")
        .filter((q) => q.eq(q.field("needsEmbeddingRegeneration"), true))
        .collect();
      
      return {
        prompts: prompts.map(prompt => ({
          id: prompt._id,
          text: prompt.text,
          category: prompt.category,
          createdAt: prompt.createdAt
        })),
        count: prompts.length
      };
    } catch (error) {
      console.error("Error getting prompts needing regeneration:", error);
      throw error;
    }
  },
});

/**
 * Mark prompts as regenerated (clear the regeneration flag)
 */
export const markPromptsAsRegenerated = mutation({
  args: {
    promptIds: v.optional(v.array(v.id("vectorSearchPrompts"))),
  },
  handler: async (ctx, { promptIds }) => {
    try {
      if (promptIds) {
        // Mark specific prompts as regenerated
        for (const id of promptIds) {
          await ctx.db.patch(id, { needsEmbeddingRegeneration: false });
        }
      } else {
        // Mark all prompts as regenerated
        const prompts = await ctx.db
          .query("vectorSearchPrompts")
          .filter((q) => q.eq(q.field("needsEmbeddingRegeneration"), true))
          .collect();
        
        for (const prompt of prompts) {
          await ctx.db.patch(prompt._id, { needsEmbeddingRegeneration: false });
        }
      }
      
      return {
        success: true,
        message: "Prompts marked as regenerated"
      };
    } catch (error) {
      console.error("Error marking prompts as regenerated:", error);
      throw error;
    }
  },
});

/**
 * Update prompt usage statistics
 */
export const updatePromptUsage = mutation({
  args: {
    promptText: v.string(),
    effectiveness: v.optional(v.number()),
  },
  handler: async (ctx, { promptText, effectiveness }) => {
    try {
      const prompt = await ctx.db
        .query("vectorSearchPrompts")
        .filter((q) => q.eq(q.field("text"), promptText))
        .first();
      
      if (prompt) {
        const updates: any = {
          usageCount: (prompt.usageCount || 0) + 1
        };
        
        if (effectiveness !== undefined) {
          updates.effectiveness = effectiveness;
        }
        
        await ctx.db.patch(prompt._id, updates);
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error updating prompt usage:", error);
      throw error;
    }
  },
});

/**
 * Get embedding regeneration status
 */
export const getEmbeddingRegenerationStatus = query({
  args: {},
  handler: async (ctx) => {
    try {
      const promptsNeedingRegeneration = await ctx.db
        .query("vectorSearchPrompts")
        .filter((q) => q.eq(q.field("needsEmbeddingRegeneration"), true))
        .collect();
      
      const totalPrompts = await ctx.db.query("vectorSearchPrompts").collect();
      
      return {
        needsRegeneration: promptsNeedingRegeneration.length > 0,
        promptsNeedingRegeneration: promptsNeedingRegeneration.length,
        totalPrompts: totalPrompts.length,
        lastRegeneration: null // TODO: Track last regeneration timestamp
      };
    } catch (error) {
      console.error("Error getting embedding regeneration status:", error);
      throw error;
    }
  },
});

/**
 * Force regeneration of all embeddings when prompts are updated
 * This ensures accuracy by replacing old embeddings with new ones
 */
export const forceRegenerateAllEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { batchSize = 10 }): Promise<any> => {
    try {
      // Mark all prompts as needing regeneration
      const allPrompts = await ctx.runQuery(api.vectorSearchPrompts.getVectorSearchPrompts);
      if (allPrompts.prompts) {
        for (const prompt of allPrompts.prompts) {
          await ctx.runMutation(api.vectorSearchPrompts.updateVectorSearchPrompt, {
            id: prompt.id as any,
            text: prompt.text, // Keep same text to trigger regeneration flag
            category: prompt.category
          });
        }
      }

      // Regenerate all job posting embeddings
      const jobPostingsResult = await ctx.runQuery(api.dataManagement.getAllJobPostings, { limit: 1000 });
      const jobPostings = jobPostingsResult.jobs || [];
      let jobProcessed = 0;
      let jobErrors = 0;

      for (let i = 0; i < jobPostings.length; i += batchSize) {
        const batch = jobPostings.slice(i, i + batchSize);
        
        for (const job of batch) {
          try {
            if (job.completeSearchableText) {
              await ctx.runAction(api.embeddingManagement.generateJobPostingEmbedding, {
                jobPostingId: job._id,
                completeSearchableText: job.completeSearchableText
              });
              jobProcessed++;
            }
          } catch (error) {
            console.error(`Error regenerating embedding for job ${job._id}:`, error);
            jobErrors++;
          }
        }
      }

      // Regenerate all resume embeddings
      const resumesResult = await ctx.runQuery(api.dataManagement.getAllResumes, { limit: 1000 });
      const resumes = resumesResult.resumes || [];
      let resumeProcessed = 0;
      let resumeErrors = 0;

      for (let i = 0; i < resumes.length; i += batchSize) {
        const batch = resumes.slice(i, i + batchSize);
        
        for (const resume of batch) {
          try {
            if (resume.completeSearchableText) {
              await ctx.runAction(api.embeddingManagement.generateResumeEmbedding, {
                resumeId: resume._id,
                completeSearchableText: resume.completeSearchableText
              });
              resumeProcessed++;
            }
          } catch (error) {
            console.error(`Error regenerating embedding for resume ${resume._id}:`, error);
            resumeErrors++;
          }
        }
      }

      // Mark all prompts as regenerated
      await ctx.runMutation(api.vectorSearchPrompts.markPromptsAsRegenerated, {});

      return {
        success: true,
        message: "Embedding regeneration completed",
        results: {
          jobPostings: {
            total: jobPostings.length,
            processed: jobProcessed,
            errors: jobErrors
          },
          resumes: {
            total: resumes.length,
            processed: resumeProcessed,
            errors: resumeErrors
          }
        }
      };
    } catch (error) {
      console.error("Error forcing embedding regeneration:", error);
      throw error;
    }
  },
});
