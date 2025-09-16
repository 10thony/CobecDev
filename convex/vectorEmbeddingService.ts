"use node";

import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Id } from "./_generated/dataModel";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Types for enhanced embedding functionality
interface EmbeddingContext {
  type: "resume" | "job_posting" | "user_query";
  industry?: string;
  skills?: string[];
  location?: string;
  experience_level?: string;
}

interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  generatedAt: number;
  enhancedText: string;
  extractedSkills: string[];
  skillCategories: Record<string, string[]>;
  confidence: number;
  promptsUsed: string[];
}

interface VectorSearchPrompt {
  id: string;
  text: string;
  category: string;
  usageCount: number;
  lastUsed: number;
  effectiveness: number;
}

/**
 * Consolidated embedding generation with vector search prompt integration
 * Merges capabilities from embeddingService, enhancedEmbeddingService, and embeddingManagement
 */
export const generateVectorAwareEmbedding = action({
  args: {
    text: v.string(),
    context: v.any(),
    usePromptEnhancement: v.optional(v.boolean()),
    useSkillEnhancement: v.optional(v.boolean()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { 
    text, 
    context, 
    usePromptEnhancement = true, 
    useSkillEnhancement = true,
    model = "gemini-text-embedding-004"
  }): Promise<EmbeddingResult> => {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY environment variable not set");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Empty text provided for embedding");
    }

    try {
      let enhancedText = text.trim();
      let extractedSkills: string[] = [];
      let skillCategories: Record<string, string[]> = {};
      let confidence = 0.5;
      let promptsUsed: string[] = [];

      // Phase 1: Extract skills if enabled
      if (useSkillEnhancement) {
        const skillExtraction = await extractSkillsWithAI(text, context.type);
        extractedSkills = skillExtraction.skills;
        skillCategories = skillExtraction.categories;
        confidence = Math.max(confidence, skillExtraction.confidence);
      }

      // Phase 2: Enhance with relevant vector search prompts
      if (usePromptEnhancement) {
        const promptEnhancement = await enhanceWithVectorPrompts(text, context, extractedSkills);
        enhancedText = promptEnhancement.enhancedText;
        promptsUsed = promptEnhancement.promptsUsed;
        confidence = Math.max(confidence, promptEnhancement.confidence);
      }

      // Phase 3: Generate embedding with enhanced text
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await embeddingModel.embedContent(enhancedText);
      const embedding = result.embedding;

      // Validate embedding dimensions
      if (!embedding.values || (embedding.values.length !== 768 && embedding.values.length !== 2048)) {
        throw new Error(`Invalid embedding dimensions. Expected 768 or 2048, got ${embedding.values?.length || 0}`);
      }

      // Phase 4: Update skill taxonomy and prompt effectiveness
      if (extractedSkills.length > 0) {
        try {
          await ctx.runAction(api.dynamicSkillMapping.updateSkillMappings, {
            newSkills: extractedSkills,
            source: context.type,
            context: `Vector-aware embedding generation for ${context.type}`
          });
        } catch (error) {
          console.warn("Failed to update skill taxonomy:", error);
        }
      }

      // Phase 5: Track prompt usage if user query
      if (context.type === "user_query" && text.length > 3) {
        await trackUserQuery(ctx, text, promptsUsed, confidence);
      }

      return {
        embedding: embedding.values,
        model,
        dimensions: embedding.values.length,
        generatedAt: Date.now(),
        enhancedText,
        extractedSkills,
        skillCategories,
        confidence,
        promptsUsed
      };
    } catch (error) {
      console.error("Error generating vector-aware embedding:", error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Batch process embeddings with vector prompt awareness
 */
export const generateBatchVectorEmbeddings = action({
  args: {
    collection: v.string(),
    documentIds: v.optional(v.array(v.string())),
    batchSize: v.optional(v.number()),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, { collection, documentIds, batchSize = 10, forceRegenerate = false }): Promise<any> => {
    try {
      const results = {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Get documents to process
      let documentsToProcess: any[];
      if (documentIds) {
        documentsToProcess = [];
        for (const docId of documentIds) {
          const doc = await getDocumentForEmbedding(ctx, collection, docId);
          if (doc) documentsToProcess.push(doc);
        }
      } else {
        documentsToProcess = await getDocumentsNeedingEmbeddings(ctx, collection, forceRegenerate);
      }

      results.total = documentsToProcess.length;

      // Process in batches
      for (let i = 0; i < documentsToProcess.length; i += batchSize) {
        const batch = documentsToProcess.slice(i, i + batchSize);
        
        for (const doc of batch) {
          try {
            const searchableText = doc.completeSearchableText || doc.searchableText || "";
            if (!searchableText) {
              results.errors.push(`Document ${doc._id} has no searchable text`);
              results.failed++;
              continue;
            }

            // Extract context from document
            const context: EmbeddingContext = {
              type: collection === "resumes" ? "resume" : "job_posting",
              industry: extractIndustry(doc),
              skills: extractExistingSkills(doc),
              location: extractLocation(doc),
              experience_level: extractExperienceLevel(doc)
            };

            // Generate vector-aware embedding
            const embeddingResult = await ctx.runAction(api.vectorEmbeddingService.generateVectorAwareEmbedding, {
              text: searchableText,
              context,
              usePromptEnhancement: true,
              useSkillEnhancement: true
            });

            // Update document
            await updateDocumentWithEmbedding(ctx, collection, doc._id, embeddingResult);

            results.successful++;
          } catch (error) {
            const errorMsg = `Error processing document ${doc._id}: ${error}`;
            console.error(errorMsg);
            results.errors.push(errorMsg);
            results.failed++;
          }
          
          results.processed++;
        }

        // Rate limiting
        if (i + batchSize < documentsToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return results;
    } catch (error) {
      console.error("Error in batch vector embedding generation:", error);
      throw error;
    }
  },
});

/**
 * Enhanced semantic search using vector-aware embeddings
 */
export const vectorAwareSemanticSearch = action({
  args: {
    query: v.string(),
    targetCollection: v.string(),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
    context: v.optional(v.any()),
  },
  handler: async (ctx, { query, targetCollection, limit = 20, minSimilarity = 0.5, context }): Promise<any> => {
    try {
      // Generate query embedding with vector prompt enhancement
      const queryContext: EmbeddingContext = {
        type: "user_query",
        ...context
      };

      const queryEmbedding = await ctx.runAction(api.vectorEmbeddingService.generateVectorAwareEmbedding, {
        text: query,
        context: queryContext,
        usePromptEnhancement: true,
        useSkillEnhancement: true
      });

      // Search target collections
      const results: any = {};

      if (targetCollection === "resumes" || targetCollection === "both") {
        results.resumes = await searchCollection(ctx, "resumes", queryEmbedding, limit, minSimilarity);
      }

      if (targetCollection === "jobpostings" || targetCollection === "both") {
        results.jobpostings = await searchCollection(ctx, "jobpostings", queryEmbedding, limit, minSimilarity);
      }

      // Track this query for future prompt learning
      await trackUserQuery(ctx, query, queryEmbedding.promptsUsed, queryEmbedding.confidence);

      return {
        query,
        queryEmbedding: {
          extractedSkills: queryEmbedding.extractedSkills,
          confidence: queryEmbedding.confidence,
          promptsUsed: queryEmbedding.promptsUsed
        },
        results,
        searchTimestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Vector-aware semantic search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Helper functions

async function enhanceWithVectorPrompts(
  text: string, 
  context: EmbeddingContext, 
  extractedSkills: string[]
): Promise<{ enhancedText: string; promptsUsed: string[]; confidence: number }> {
  try {
    // Get relevant prompts from the static prompt library
    const relevantPrompts = await findRelevantPrompts(text, context, extractedSkills);
    
    if (relevantPrompts.length === 0) {
      return { enhancedText: text, promptsUsed: [], confidence: 0.5 };
    }

    // Create context-aware enhancement
    const promptContext = relevantPrompts.slice(0, 3).map(p => p.text).join(" | ");
    const enhancedText = `${text}\n\nVector Context: ${promptContext}`;

    return {
      enhancedText,
      promptsUsed: relevantPrompts.map(p => p.id),
      confidence: Math.min(0.9, 0.6 + (relevantPrompts.length * 0.1))
    };
  } catch (error) {
    console.warn("Prompt enhancement failed:", error);
    return { enhancedText: text, promptsUsed: [], confidence: 0.5 };
  }
}

async function findRelevantPrompts(
  text: string, 
  context: EmbeddingContext, 
  skills: string[]
): Promise<VectorSearchPrompt[]> {
  // This is a simplified implementation - in production, you'd use embedding similarity
  const staticPrompts = getStaticVectorPrompts();
  const textLower = text.toLowerCase();
  
  return staticPrompts
    .filter(prompt => {
      // Match by skills
      if (skills.some(skill => prompt.text.toLowerCase().includes(skill.toLowerCase()))) {
        return true;
      }
      
      // Match by context type
      if (context.type === "resume" && prompt.category.includes("resume")) {
        return true;
      }
      
      if (context.type === "job_posting" && prompt.category.includes("job")) {
        return true;
      }
      
      // Match by industry
      if (context.industry && prompt.text.toLowerCase().includes(context.industry.toLowerCase())) {
        return true;
      }
      
      return false;
    })
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, 5);
}

function getStaticVectorPrompts(): VectorSearchPrompt[] {
  // Sample of the 235 prompts from VECTOR_SEARCH_PROMPTS.md
  return [
    {
      id: "aviation-safety-inspector",
      text: "Find resumes for Aviation Safety Inspector positions with FAA experience",
      category: "aviation-resume",
      usageCount: 0,
      lastUsed: 0,
      effectiveness: 0.8
    },
    {
      id: "software-engineer-python-js",
      text: "Find resumes for software engineering positions with Python and JavaScript experience",
      category: "tech-resume",
      usageCount: 0,
      lastUsed: 0,
      effectiveness: 0.9
    },
    {
      id: "project-manager-5-years",
      text: "Search for candidates with 5+ years of project management experience",
      category: "management-resume",
      usageCount: 0,
      lastUsed: 0,
      effectiveness: 0.7
    },
    // Add more static prompts from the VECTOR_SEARCH_PROMPTS.md file
  ];
}

async function extractSkillsWithAI(
  text: string, 
  contextType: "resume" | "job_posting" | "user_query"
): Promise<{ skills: string[]; categories: Record<string, string[]>; confidence: number }> {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      return extractBasicSkills(text);
    }

    const prompt = `
      Extract technical skills, programming languages, frameworks, tools, and technologies from this ${contextType} text.
      
      Focus on: Programming languages, Frameworks, Tools, Databases, Cloud platforms, Domain expertise.
      
      Return only a comma-separated list of skills.
      
      Text: ${text.substring(0, 2000)}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    if (response) {
      const skills = response.split(',').map(skill => skill.trim()).filter(Boolean);
      const categories = categorizeSkills(skills);
      return { skills, categories, confidence: 0.8 };
    }
  } catch (error) {
    console.warn("AI skill extraction failed:", error);
  }

  return extractBasicSkills(text);
}

function extractBasicSkills(text: string): { skills: string[]; categories: Record<string, string[]>; confidence: number } {
  const skillPatterns = {
    PROGRAMMING: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'go', 'rust'],
    WEB: ['html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask'],
    MOBILE: ['ios', 'android', 'react native', 'flutter', 'xamarin'],
    DATABASE: ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle'],
    CLOUD: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git'],
    AI_DATA: ['machine learning', 'ai', 'tensorflow', 'pytorch', 'pandas', 'numpy']
  };

  const textLower = text.toLowerCase();
  const foundSkills: string[] = [];
  const categories: Record<string, string[]> = {};

  Object.entries(skillPatterns).forEach(([category, skills]) => {
    const categorySkills = skills.filter(skill => textLower.includes(skill.toLowerCase()));
    if (categorySkills.length > 0) {
      categories[category] = categorySkills;
      foundSkills.push(...categorySkills);
    }
  });

  return { skills: foundSkills, categories, confidence: 0.6 };
}

function categorizeSkills(skills: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  
  skills.forEach(skill => {
    const skillLower = skill.toLowerCase();
    
    if (['javascript', 'typescript', 'python', 'java', 'c++', 'c#'].includes(skillLower)) {
      if (!categories.PROGRAMMING) categories.PROGRAMMING = [];
      categories.PROGRAMMING.push(skill);
    } else if (['react', 'angular', 'vue', 'html', 'css'].includes(skillLower)) {
      if (!categories.WEB) categories.WEB = [];
      categories.WEB.push(skill);
    } else if (['aws', 'azure', 'docker', 'kubernetes'].includes(skillLower)) {
      if (!categories.CLOUD) categories.CLOUD = [];
      categories.CLOUD.push(skill);
    }
    // Add more categorization logic
  });
  
  return categories;
}

async function trackUserQuery(ctx: any, query: string, promptsUsed: string[], confidence: number) {
  try {
    // Store new user queries for future prompt enhancement
    await ctx.runMutation(api.vectorEmbeddingQueries.storeUserQuery, {
      query,
      promptsUsed,
      confidence,
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn("Failed to track user query:", error);
  }
}

function extractIndustry(doc: any): string | undefined {
  // Extract industry from document
  if (doc.industry) return doc.industry;
  if (doc.jobTitle?.toLowerCase().includes('aviation')) return 'aviation';
  if (doc.jobTitle?.toLowerCase().includes('engineer')) return 'engineering';
  return undefined;
}

function extractExistingSkills(doc: any): string[] {
  return doc.extractedSkills || doc.skills || [];
}

function extractLocation(doc: any): string | undefined {
  return doc.location || doc.workLocation || undefined;
}

function extractExperienceLevel(doc: any): string | undefined {
  return doc.experienceLevel || doc.yearsOfExperience || undefined;
}

async function getDocumentsNeedingEmbeddings(ctx: any, collection: string, forceRegenerate: boolean): Promise<any[]> {
  // Get documents that need embeddings
  if (forceRegenerate) {
    if (collection === "jobpostings") {
      return await ctx.runQuery(api.dataManagement.getAllJobPostings);
    } else if (collection === "resumes") {
      return await ctx.runQuery(api.dataManagement.getAllResumes);
    }
    return [];
  } else {
    return await ctx.runQuery(api.dataManagement.getDocumentsWithoutEmbeddings, { collectionName: collection });
  }
}

async function getDocumentForEmbedding(ctx: any, collection: string, documentId: string): Promise<any> {
  // For now, we'll query directly since the getDocumentById function has type issues
  if (collection === "resumes") {
    return await ctx.db.query("resumes")
      .filter((q: any) => q.eq(q.field("filename"), documentId))
      .first();
  } else if (collection === "jobpostings") {
    return await ctx.db.query("jobpostings")
      .filter((q: any) => q.eq(q.field("jobTitle"), documentId))
      .first();
  }
  return null;
}

async function updateDocumentWithEmbedding(ctx: any, collection: string, documentId: string, embeddingResult: EmbeddingResult) {
  await ctx.runMutation(api.vectorEmbeddingQueries.updateDocumentEmbedding, {
    collectionName: collection,
    documentId,
    embedding: embeddingResult.embedding,
    embeddingModel: embeddingResult.model,
    embeddingGeneratedAt: embeddingResult.generatedAt,
    extractedSkills: embeddingResult.extractedSkills,
    confidence: embeddingResult.confidence,
    promptsUsed: embeddingResult.promptsUsed
  });
}

async function searchCollection(ctx: any, collection: string, queryEmbedding: EmbeddingResult, limit: number, minSimilarity: number) {
  // Simplified search - in production, use proper vector similarity search
  let documents: any[] = [];
  
  if (collection === "resumes") {
    const result = await ctx.runQuery(api.dataManagement.getAllResumes);
    documents = result.resumes || [];
  } else if (collection === "jobpostings") {
    const result = await ctx.runQuery(api.dataManagement.getAllJobPostings);
    documents = result.jobs || [];
  }
  
  // Ensure documents is an array
  if (!Array.isArray(documents)) {
    console.warn(`Documents from ${collection} is not an array:`, documents);
    return [];
  }
  
  return documents
    .filter((doc: any) => doc.embedding && doc.embedding.length > 0)
    .map((doc: any) => ({
      ...doc,
      similarity: calculateCosineSimilarity(queryEmbedding.embedding, doc.embedding)
    }))
    .filter((result: any) => result.similarity >= minSimilarity)
    .sort((a: any, b: any) => b.similarity - a.similarity)
    .slice(0, limit);
}

function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}




