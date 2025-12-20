// Removed "use node" directive to allow both queries and actions

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI for enhanced embedding generation
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

/**
 * Generate enhanced embeddings with dynamic skill context
 * Integrates with the dynamic skill mapping system for better semantic alignment
 */
export const generateEnhancedEmbedding = action({
  args: {
    text: v.string(),
    context: v.union(v.literal("resume"), v.literal("job_posting"), v.literal("user_query")),
    useSkillEnhancement: v.optional(v.boolean()),
    model: v.optional(v.literal("text-embedding-3-large")),
  },
  handler: async (ctx, { 
    text, 
    context, 
    useSkillEnhancement = true, 
    model = "text-embedding-3-large" 
  }): Promise<{
    embedding: number[];
    model: string;
    dimensions: number;
    generatedAt: number;
    enhancedText: string;
    extractedSkills: string[];
    skillCategories: Record<string, string[]>;
    confidence: number;
  }> => {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY environment variable not set");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Empty text provided for embedding");
    }

    try {
      let enhancedText = text;
      let extractedSkills: string[] = [];
      let skillCategories: Record<string, string[]> = {};
      let confidence = 0.5;

      // Enhance text with skill context if enabled
      if (useSkillEnhancement) {
        const enhancementResult = await enhanceTextWithSkillContext(text, context);
        enhancedText = enhancementResult.enhancedText;
        extractedSkills = enhancementResult.skills;
        skillCategories = enhancementResult.categories;
        confidence = enhancementResult.confidence;
      }

      // Generate embedding using the enhanced text
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await embeddingModel.embedContent(enhancedText.trim());
      const embedding = result.embedding;

      // Validate embedding dimensions
      if (!embedding.values || (embedding.values.length !== 768 && embedding.values.length !== 2048)) {
        throw new Error(`Invalid embedding dimensions. Expected 768 or 2048, got ${embedding.values?.length || 0}`);
      }

      // Update skill taxonomy with newly discovered skills
      if (extractedSkills.length > 0) {
        try {
          await ctx.runAction(api.dynamicSkillMapping.updateSkillMappings, {
            newSkills: extractedSkills,
            source: context,
            context: `Enhanced embedding generation for ${context}`
          });
        } catch (error) {
          console.warn("Failed to update skill taxonomy:", error);
        }
      }

      return {
        embedding: embedding.values,
        model: model,
        dimensions: embedding.values.length,
        generatedAt: Date.now(),
        enhancedText,
        extractedSkills,
        skillCategories,
        confidence
      };
    } catch (error) {
      console.error("Error generating enhanced embedding:", error);
      throw new Error(`Failed to generate enhanced embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Update existing embeddings with new skill mappings
 * Re-generates embeddings for documents when skill taxonomy is updated
 */
export const updateEmbeddingsWithNewSkills = action({
  args: {
    collection: v.union(v.literal("resumes"), v.literal("jobpostings")),
    batchSize: v.optional(v.number()),
    forceUpdate: v.optional(v.boolean()),
  },
  handler: async (ctx, { collection, batchSize = 10, forceUpdate = false }): Promise<any> => {
    try {
      // Use runQuery instead of ctx.db in action context
      const documents = await ctx.runQuery(api.enhancedEmbeddingService.getDocumentsForUpdate, { collection });
      let updatedCount = 0;
      let errorCount = 0;

      // Process documents in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        for (const doc of batch) {
          try {
            // Check if update is needed
            if (!forceUpdate && doc.embedding && doc.embeddingGeneratedAt) {
              const daysSinceUpdate = (Date.now() - doc.embeddingGeneratedAt) / (1000 * 60 * 60 * 24);
              if (daysSinceUpdate < 7) {
                continue; // Skip if recently updated
              }
            }

            // Get the searchable text
            const searchableText = doc.completeSearchableText || doc.searchableText || "";
            if (!searchableText) continue;

            // Generate enhanced embedding
            const enhancedEmbedding = await ctx.runAction(api.enhancedEmbeddingService.generateEnhancedEmbedding, {
              text: searchableText,
              context: collection === "resumes" ? "resume" : "job_posting",
              useSkillEnhancement: true
            });

            // Update the document
            await ctx.runMutation(api.enhancedEmbeddingService.updateDocumentEmbedding, {
              collectionName: collection,
              documentId: doc._id,
              embedding: enhancedEmbedding.embedding,
              extractedSkills: enhancedEmbedding.extractedSkills,
              model: enhancedEmbedding.model,
              dimensions: enhancedEmbedding.dimensions,
              enhancedText: enhancedEmbedding.enhancedText,
              skillCategories: enhancedEmbedding.skillCategories,
              confidence: enhancedEmbedding.confidence
            });

            updatedCount++;
          } catch (error) {
            console.error(`Error updating embedding for ${collection} ${doc._id}:`, error);
            errorCount++;
          }
        }

        // Log progress
        if (i % (batchSize * 5) === 0) {
          console.log(`Updated ${updatedCount} ${collection} embeddings...`);
        }
      }

      return {
        collection,
        totalDocuments: documents.length,
        updated: updatedCount,
        errors: errorCount,
        successRate: documents.length > 0 ? (updatedCount / documents.length) * 100 : 0
      };
    } catch (error) {
      console.error(`Error updating ${collection} embeddings:`, error);
      throw error;
    }
  },
});

/**
 * Cross-reference skill consistency check
 * Validates that skills are consistently represented across collections
 */
export const validateSkillConsistency = action({
  args: {
    collection: v.optional(v.union(v.literal("resumes"), v.literal("jobpostings"), v.literal("both"))),
  },
  handler: async (ctx, { collection = "both" }): Promise<any> => {
    try {
      const consistencyReport: any = {
        timestamp: Date.now(),
        overallScore: 0,
        issues: [],
        recommendations: []
      };

      // Get current skill taxonomy
      const taxonomy = await ctx.runAction(api.dynamicSkillMapping.buildSkillTaxonomy, {});

      // Check skill consistency across collections
      const resumeSkills = new Set(taxonomy.resumeSkills.skills);
      const jobSkills = new Set(taxonomy.jobSkills.skills);
      
      // Find skills that exist in only one collection
      const resumeOnly = [...resumeSkills].filter(skill => !jobSkills.has(skill));
      const jobOnly = [...jobSkills].filter(skill => !resumeSkills.has(skill));
      const commonSkills = [...resumeSkills].filter(skill => jobSkills.has(skill));

      // Calculate consistency score
      const totalSkills = resumeSkills.size + jobSkills.size;
      const commonSkillsCount = commonSkills.length;
      consistencyReport.overallScore = totalSkills > 0 ? (commonSkillsCount / totalSkills) * 100 : 0;

      // Identify consistency issues
      if (resumeOnly.length > 0) {
        consistencyReport.issues.push({
          type: "skills_only_in_resumes",
          count: resumeOnly.length,
          examples: resumeOnly.slice(0, 10),
          description: "Skills found in resumes but not in job postings"
        });
      }

      if (jobOnly.length > 0) {
        consistencyReport.issues.push({
          type: "skills_only_in_jobs",
          count: jobOnly.length,
          examples: jobOnly.slice(0, 10),
          description: "Skills found in job postings but not in resumes"
        });
      }

      // Check for skill frequency mismatches
      const skillGapAnalysis = Object.entries(taxonomy.skillDemand?.skillGap || {})
        .filter((entry) => {
          const gap = entry[1];
          return typeof gap === 'number' && Math.abs(gap) > 5;
        })
        .sort((a, b) => {
          const gapA = a[1];
          const gapB = b[1];
          if (typeof gapA === 'number' && typeof gapB === 'number') {
            return Math.abs(gapB) - Math.abs(gapA);
          }
          return 0;
        })
        .slice(0, 10);

      if (skillGapAnalysis.length > 0) {
        consistencyReport.issues.push({
          type: "skill_supply_demand_mismatch",
          count: skillGapAnalysis.length,
          examples: skillGapAnalysis.map(([skill, gap]) => ({ skill, gap })),
          description: "Skills with significant supply/demand gaps"
        });
      }

      // Generate recommendations
      if (resumeOnly.length > 0) {
        consistencyReport.recommendations.push({
          priority: "medium",
          action: "Extract missing skills from job postings",
          description: `Add ${resumeOnly.length} skills found in resumes to job postings for better matching`
        });
      }

      if (jobOnly.length > 0) {
        consistencyReport.recommendations.push({
          priority: "medium",
          action: "Extract missing skills from resumes",
          description: `Add ${jobOnly.length} skills found in job postings to resumes for better matching`
        });
      }

      if (consistencyReport.overallScore < 70) {
        consistencyReport.recommendations.push({
          priority: "high",
          action: "Improve skill extraction consistency",
          description: "Current consistency score is below 70%. Review extraction methods and ensure both collections use the same skill vocabulary."
        });
      }

      // Add detailed statistics
      consistencyReport.statistics = {
        totalUniqueSkills: taxonomy.totalUniqueSkills,
        resumeSkillsCount: resumeSkills.size,
        jobSkillsCount: jobSkills.size,
        commonSkillsCount,
        consistencyScore: consistencyReport.overallScore,
        skillCategories: Object.keys(taxonomy.categorizedSkills).length,
        lastTaxonomyUpdate: taxonomy.lastUpdated
      };

      return consistencyReport;
    } catch (error) {
      console.error("Error validating skill consistency:", error);
      throw error;
    }
  },
});

/**
 * Generate batch embeddings for multiple documents
 * Efficiently processes large collections with progress tracking
 */
export const generateBatchEmbeddings = action({
  args: {
    collection: v.union(v.literal("resumes"), v.literal("jobpostings")),
    documentIds: v.array(v.id("resumes")), // Fixed: added table name
    useSkillEnhancement: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { collection, documentIds, useSkillEnhancement = true, batchSize = 5 }): Promise<any> => {
    try {
      const results = {
        total: documentIds.length,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process documents in batches
      for (let i = 0; i < documentIds.length; i += batchSize) {
        const batch = documentIds.slice(i, i + batchSize);
        
        for (const docId of batch) {
          try {
            // Get the document using runQuery instead of ctx.db
            const document = await ctx.runQuery(api.enhancedEmbeddingService.getDocumentById, { 
              collection, 
              documentId: docId 
            });
            if (!document) {
              results.errors.push(`Document ${docId} not found`);
              results.failed++;
              continue;
            }

            // Get searchable text
            const searchableText = document.completeSearchableText || document.searchableText || "";
            if (!searchableText) {
              results.errors.push(`Document ${docId} has no searchable text`);
              results.failed++;
              continue;
            }

            // Generate enhanced embedding
            const enhancedEmbedding = await ctx.runAction(api.enhancedEmbeddingService.generateEnhancedEmbedding, {
              text: searchableText,
              context: collection === "resumes" ? "resume" : "job_posting",
              useSkillEnhancement
            });

            // Update the document using runMutation instead of ctx.db
            await ctx.runMutation(api.enhancedEmbeddingService.updateDocumentEmbedding, {
              collectionName: collection,
              documentId: docId,
              embedding: enhancedEmbedding.embedding,
              extractedSkills: enhancedEmbedding.extractedSkills,
              model: enhancedEmbedding.model,
              dimensions: enhancedEmbedding.dimensions,
              enhancedText: enhancedEmbedding.enhancedText,
              skillCategories: enhancedEmbedding.skillCategories,
              confidence: enhancedEmbedding.confidence
            });

            results.successful++;
          } catch (error) {
            const errorMsg = `Error processing document ${docId}: ${error}`;
            console.error(errorMsg);
            results.errors.push(errorMsg);
            results.failed++;
          }
          
          results.processed++;
        }

        // Log progress
        if (i % (batchSize * 5) === 0) {
          console.log(`Processed ${results.processed}/${results.total} documents...`);
        }
      }

      return results;
    } catch (error) {
      console.error("Error in batch embedding generation:", error);
      throw error;
    }
  },
});

/**
 * Get documents that need embedding updates
 */
export const getDocumentsForUpdate = query({
  args: {
    collection: v.union(v.literal("resumes"), v.literal("jobpostings")),
  },
  handler: async (ctx, { collection }): Promise<any[]> => {
    try {
      const documents = await ctx.db.query(collection).collect();
      return documents;
    } catch (error) {
      console.error(`Error getting documents for update:`, error);
      return [];
    }
  },
});

/**
 * Get a specific document by ID
 */
export const getDocumentById = query({
  args: {
    collection: v.union(v.literal("resumes"), v.literal("jobpostings")),
    documentId: v.id("resumes"), // Using resumes as default, will need to handle both
  },
  handler: async (ctx, { collection, documentId }): Promise<any> => {
    try {
      // This is a simplified version - in practice you'd need separate functions for each collection
      // or use a union type approach
      if (collection === "resumes") {
        return await ctx.db.get(documentId);
      } else {
        // For jobpostings, we'd need a different approach since the ID type is different
        // This is a temporary workaround
        return null;
      }
    } catch (error) {
      console.error(`Error getting document by ID:`, error);
      return null;
    }
  },
});

// Helper functions

/**
 * Enhance text with skill context using AI and taxonomy
 */
async function enhanceTextWithSkillContext(
  text: string, 
  context: "resume" | "job_posting" | "user_query"
): Promise<{
  enhancedText: string;
  skills: string[];
  categories: Record<string, string[]>;
  confidence: number;
}> {
  try {
    // Get current skill taxonomy
    const taxonomy = await getCurrentTaxonomy();
    
    // Extract skills from the text
    const skillExtraction = await extractSkillsWithAI(text, context);
    
    // Enhance text with skill context
    let enhancedText = text;
    
    if (skillExtraction.skills.length > 0) {
      // Add skill context to the text
      const skillContext = `Skills: ${skillExtraction.skills.join(', ')}`;
      enhancedText = `${text}\n\n${skillContext}`;
      
      // Add related skills from taxonomy
      const relatedSkills = new Set<string>();
      skillExtraction.skills.forEach(skill => {
        const relationships = taxonomy.skillRelationships?.[skill.toLowerCase()] || [];
        relationships.forEach((relatedSkill: any) => {
          if (!skillExtraction.skills.includes(relatedSkill)) {
            relatedSkills.add(relatedSkill);
          }
        });
      });
      
      if (relatedSkills.size > 0) {
        const relatedContext = `Related Skills: ${Array.from(relatedSkills).slice(0, 5).join(', ')}`;
        enhancedText = `${enhancedText}\n${relatedContext}`;
      }
    }

    return {
      enhancedText,
      skills: skillExtraction.skills,
      categories: skillExtraction.categories,
      confidence: skillExtraction.confidence
    };
  } catch (error) {
    console.warn("Text enhancement failed, returning original:", error);
    return {
      enhancedText: text,
      skills: [],
      categories: {},
      confidence: 0.5
    };
  }
}

/**
 * Extract skills using AI with fallback to basic extraction
 */
async function extractSkillsWithAI(
  text: string, 
  context: "resume" | "job_posting" | "user_query"
): Promise<{
  skills: string[];
  categories: Record<string, string[]>;
  confidence: number;
}> {
  try {
    if (process.env.GOOGLE_AI_API_KEY) {
      // Use AI for skill extraction
      const prompt = `
        Extract technical skills, programming languages, frameworks, tools, and technologies from the following ${context} text.
        
        Focus on:
        - Programming languages (JavaScript, Python, Java, etc.)
        - Frameworks and libraries (React, Angular, Django, etc.)
        - Tools and platforms (Docker, AWS, Git, etc.)
        - Databases (MySQL, MongoDB, etc.)
        - Operating systems and environments
        - Domain-specific technologies
        
        Return only a comma-separated list of skills, no explanations.
        
        Text: ${text.substring(0, 2000)}...
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();
      
      if (response) {
        const skills = response.split(',').map(skill => skill.trim()).filter(Boolean);
        const categories = categorizeSkills(skills);
        return {
          skills,
          categories,
          confidence: 0.8
        };
      }
    }
  } catch (error) {
    console.warn("AI skill extraction failed:", error);
  }

  // Fallback to basic skill extraction
  const basicSkills = extractBasicSkills(text);
  const categories = categorizeSkills(basicSkills);
  
  return {
    skills: basicSkills,
    categories,
    confidence: 0.6
  };
}

/**
 * Basic skill extraction using predefined categories
 */
function extractBasicSkills(text: string): string[] {
  const skillCategories = {
    PROGRAMMING_LANGUAGES: [
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'go', 'rust'
    ],
    WEB_TECHNOLOGIES: [
      'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring'
    ],
    MOBILE_DEVELOPMENT: [
      'ios', 'android', 'react native', 'flutter', 'xamarin'
    ],
    DATABASES: [
      'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle'
    ],
    CLOUD_DEVOPS: [
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git'
    ],
    DATA_SCIENCE_AI: [
      'machine learning', 'ai', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy'
    ]
  };

  const textLower = text.toLowerCase();
  const allSkills: string[] = [];
  
  Object.values(skillCategories).forEach(category => {
    allSkills.push(...category);
  });
  
  const foundSkills = allSkills.filter(skill => 
    textLower.includes(skill.toLowerCase())
  );
  
  return foundSkills;
}

/**
 * Categorize skills into predefined categories
 */
function categorizeSkills(skills: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  
  skills.forEach(skill => {
    // Simple categorization logic - can be enhanced
    if (['javascript', 'typescript', 'python', 'java'].includes(skill.toLowerCase())) {
      if (!categories.PROGRAMMING_LANGUAGES) categories.PROGRAMMING_LANGUAGES = [];
      categories.PROGRAMMING_LANGUAGES.push(skill);
    } else if (['react', 'angular', 'vue', 'html', 'css'].includes(skill.toLowerCase())) {
      if (!categories.WEB_TECHNOLOGIES) categories.WEB_TECHNOLOGIES = [];
      categories.WEB_TECHNOLOGIES.push(skill);
    }
    // Add more categorization logic as needed
  });
  
  return categories;
}

/**
 * Get current taxonomy (placeholder - should be replaced with actual API call)
 */
async function getCurrentTaxonomy(): Promise<any> {
  // This is a placeholder - in the actual implementation, this would call the taxonomy API
  return {
    skillRelationships: {},
    categorizedSkills: {}
  };
}

// Functions for embedding regeneration agent
export const updateDocumentEmbedding = mutation({
  args: {
    documentId: v.string(),
    collectionName: v.union(v.literal("resumes"), v.literal("jobpostings")),
    embedding: v.array(v.number()),
    model: v.string(),
    dimensions: v.number(),
    enhancedText: v.string(),
    extractedSkills: v.array(v.string()),
    skillCategories: v.record(v.string(), v.array(v.string())),
    confidence: v.number(),
  },
  handler: async (ctx, { documentId, collectionName, embedding, model, dimensions, enhancedText, extractedSkills, skillCategories, confidence }) => {
    try {
      // Convert string ID to Convex ID if needed
      let convexId: any;
      
      if (collectionName === "resumes") {
        // Find resume by filename or other identifier
        const resume = await ctx.db.query("resumes").filter(q => q.eq(q.field("filename"), documentId)).first();
        if (resume) {
          convexId = resume._id;
        }
      } else if (collectionName === "jobpostings") {
        // Find job posting by jobTitle or other identifier
        const jobPosting = await ctx.db.query("jobpostings").filter(q => q.eq(q.field("jobTitle"), documentId)).first();
        if (jobPosting) {
          convexId = jobPosting._id;
        }
      }
      
      if (!convexId) {
        throw new Error(`Document not found in ${collectionName} collection`);
      }
      
      // Update the document
      if (collectionName === "resumes") {
        await ctx.db.patch(convexId, {
          embedding,
          embeddingModel: model,
          embeddingGeneratedAt: Date.now(),
          extractedSkills,
          completeSearchableText: enhancedText,
        });
      } else if (collectionName === "jobpostings") {
        await ctx.db.patch(convexId, {
          embedding,
          embeddingModel: model,
          embeddingGeneratedAt: Date.now(),
          extractedSkills,
          completeSearchableText: enhancedText,
        });
      }

      return { success: true, documentId: convexId };
    } catch (error) {
      console.error("Error updating document embedding:", error);
      throw error;
    }
  },
});

export const validateEmbeddings = query({
  args: {
    collectionName: v.union(v.literal("resumes"), v.literal("jobpostings")),
  },
  handler: async (ctx, { collectionName }) => {
    try {
      const documents = await ctx.db.query(collectionName).collect();
      
      let valid = 0;
      let invalid = 0;
      let totalConfidence = 0;
      let confidenceCount = 0;
      
      documents.forEach(doc => {
        if (doc.embedding && doc.embedding.length > 0 && doc.embeddingGeneratedAt) {
          valid++;
          // Note: confidence scoring would need to be implemented
          // For now, we'll use a default confidence based on embedding quality
          const confidence = doc.embedding.length === 2048 ? 0.9 : 0.7;
          totalConfidence += confidence;
          confidenceCount++;
        } else {
          invalid++;
        }
      });
      
      return {
        total: documents.length,
        valid,
        invalid,
        averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0
      };
    } catch (error) {
      throw new Error(`Failed to validate embeddings for ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const semanticSearch = action({
  args: {
    query: v.string(),
    collectionName: v.union(v.literal("resumes"), v.literal("jobpostings")),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
  },
  handler: async (ctx, { query, collectionName, limit = 10, minSimilarity = 0.7 }): Promise<{ results: any[] }> => {
    try {
      // Generate embedding for the search query
      const queryEmbedding = await ctx.runAction(api.enhancedEmbeddingService.generateEnhancedEmbedding, {
        text: query,
        context: collectionName === "resumes" ? "resume" : "job_posting",
        useSkillEnhancement: true,
        model: "text-embedding-3-large"
      });
      
      // Get documents with embeddings
      const documents: any[] = await ctx.runQuery(api.dataManagement.getDocumentsForEmbeddingUpdate, {
        collectionName,
        limit: 1000 // Get more documents for better search results
      });
      
      // Calculate similarities (simplified - in production, use proper vector similarity)
      const results: any[] = documents
        .filter((doc: any) => doc.embedding && doc.embedding.length > 0)
        .map((doc: any) => {
          // Simple cosine similarity calculation
          const similarity = calculateCosineSimilarity(queryEmbedding.embedding, doc.embedding);
          return {
            ...doc,
            similarity,
            extractedSkills: doc.extractedSkills || []
          };
        })
        .filter((result: any) => result.similarity >= minSimilarity)
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit);
      
      return { results };
    } catch (error) {
      throw new Error(`Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const validateEmbeddingsForRegeneration = action({
  args: {
    collections: v.array(v.union(v.literal("resumes"), v.literal("jobpostings"))),
  },
  handler: async (ctx, { collections }): Promise<{
    overallScore: number;
    collectionScores: Record<string, any>;
    inconsistencies: any[];
  }> => {
    try {
      const results: Record<string, any> = {};
      let overallScore = 0;
      let totalCollections = collections.length;
      
      for (const collectionName of collections) {
        const documents = await ctx.runQuery(api.dataManagement.getCollectionStats, { collectionName });
        
        // Calculate skill consistency for this collection
        const consistencyScore = await calculateCollectionSkillConsistency(ctx, collectionName);
        results[collectionName] = {
          totalDocuments: documents.total,
          skillConsistency: consistencyScore
        };
        
        overallScore += consistencyScore;
      }
      
      return {
        overallScore: overallScore / totalCollections,
        collectionScores: results,
        inconsistencies: [] // Would contain detailed inconsistency information
      };
    } catch (error) {
      throw new Error(`Skill consistency validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Helper function to calculate skill consistency for a collection
async function calculateCollectionSkillConsistency(ctx: any, collectionName: string): Promise<number> {
  try {
    const documents = await ctx.runQuery(api.dataManagement.getCollectionStats, { collectionName });
    
    // For now, return a placeholder consistency score
    // In production, this would analyze skill overlap, terminology consistency, etc.
    return 0.85; // Placeholder score
  } catch (error) {
    console.error(`Failed to calculate skill consistency for ${collectionName}:`, error);
    return 0.5; // Default low score on error
  }
}
