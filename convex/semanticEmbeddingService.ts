"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";

// Initialize OpenAI client
const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable not set");
  }
  return new OpenAI({ apiKey });
};

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Intelligently truncate text to fit within token limit while preserving important content
 * Keeps beginning and end of document, which often contain the most critical information
 */
function intelligentTruncate(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  // Reserve tokens for beginning and end sections
  const maxChars = maxTokens * 4;
  const beginChars = Math.floor(maxChars * 0.6); // 60% from beginning
  const endChars = Math.floor(maxChars * 0.35);  // 35% from end (5% for separator)
  
  const beginning = text.substring(0, beginChars);
  const end = text.substring(text.length - endChars);
  
  return `${beginning}\n\n[...content truncated for embedding...]\n\n${end}`;
}

/**
 * Extract answer to a semantic question from document text using AI
 */
async function extractAnswerWithAI(
  text: string,
  question: string,
  context: "job_posting" | "resume"
): Promise<string> {
  try {
    const openai = getOpenAI();
    
    const prompt = `You are analyzing a ${context === "job_posting" ? "job posting" : "resume"}.

Based on the following text, answer this question concisely and specifically:

Question: ${question}

Text: ${text.substring(0, 3000)}

Provide a direct, factual answer extracted from the text. If the information is not available, respond with "Not specified".
Keep your answer brief (1-3 sentences maximum).`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that extracts specific information from documents." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 150,
    });
    
    const answer = response.choices[0]?.message?.content?.trim() || "Not specified";
    return answer;
  } catch (error) {
    console.warn(`Failed to extract answer for question "${question}":`, error);
    return "Not specified";
  }
}

/**
 * Generate enhanced text with semantic Q&A pairs
 * Intelligently manages token limits to prevent API errors
 */
export const generateSemanticEnhancedText = action({
  args: {
    text: v.string(),
    category: v.union(v.literal("job_posting"), v.literal("resume")),
    maxQuestions: v.optional(v.number()),
    targetModel: v.optional(v.string()),
  },
  handler: async (ctx, { text, category, maxQuestions = 15, targetModel = "text-embedding-3-small" }) => {
    try {
      // Model token limits (leaving safety margin of 10%)
      const modelLimits: Record<string, number> = {
        "text-embedding-3-small": 7300,  // 8192 - 10% safety margin
        "text-embedding-3-large": 7300,  // Same limit
        "text-embedding-ada-002": 7300,
      };
      
      const maxTokens = modelLimits[targetModel] || 7300;
      
      // Get active semantic questions for this category
      const allQuestions = await ctx.runQuery(api.semanticQuestions.listByCategory, {
        category
      });

      // Filter active questions and sort by weight
      const activeQuestions = allQuestions
        .filter((q: any) => q.isActive)
        .sort((a: any, b: any) => b.weight - a.weight)
        .slice(0, maxQuestions);

      if (activeQuestions.length === 0) {
        console.warn(`No active questions found for category ${category}`);
        // Still truncate if needed
        const truncatedText = intelligentTruncate(text, maxTokens);
        return {
          enhancedText: truncatedText,
          qaText: "",
          questionsUsed: 0,
          answers: [],
          wasTruncated: truncatedText.length < text.length,
          estimatedTokens: estimateTokenCount(truncatedText)
        };
      }

      // Extract answers for each question
      const qaList: string[] = [];
      const answers: Array<{ question: string; answer: string; weight: number }> = [];
      
      console.log(`Extracting answers for ${activeQuestions.length} questions...`);
      
      for (const question of activeQuestions) {
        const answer = await extractAnswerWithAI(text, question.question, category);
        
        if (answer && answer !== "Not specified") {
          qaList.push(`Q: ${question.question}\nA: ${answer}`);
          answers.push({
            question: question.question,
            answer,
            weight: question.weight
          });
          
          // Increment usage count
          await ctx.runMutation(api.semanticQuestions.incrementUsage, {
            id: question._id
          });
        }
      }

      // Create Q&A section
      const qaText = qaList.length > 0 
        ? `\n\n=== Structured Information ===\n\n${qaList.join('\n\n')}`
        : "";
      
      // Estimate tokens needed for Q&A section
      const qaTokens = estimateTokenCount(qaText);
      const maxTextTokens = maxTokens - qaTokens - 50; // Reserve 50 tokens for safety
      
      // Truncate original text if needed to make room for Q&A pairs
      const truncatedText = intelligentTruncate(text, maxTextTokens);
      const enhancedText = `${truncatedText}${qaText}`;
      
      // Final validation
      const finalTokenCount = estimateTokenCount(enhancedText);
      if (finalTokenCount > maxTokens) {
        console.warn(`Enhanced text still too large (${finalTokenCount} tokens), performing additional truncation`);
        // Emergency truncation
        const emergencyText = intelligentTruncate(enhancedText, maxTokens - 100);
        return {
          enhancedText: emergencyText,
          qaText,
          questionsUsed: qaList.length,
          answers,
          wasTruncated: true,
          estimatedTokens: estimateTokenCount(emergencyText)
        };
      }

      console.log(`Enhanced text: ${finalTokenCount} tokens (limit: ${maxTokens})`);

      return {
        enhancedText,
        qaText,
        questionsUsed: qaList.length,
        answers,
        wasTruncated: truncatedText.length < text.length,
        estimatedTokens: finalTokenCount
      };
    } catch (error) {
      console.error("Error generating semantic enhanced text:", error);
      throw new Error(`Failed to generate enhanced text: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Regenerate embedding for a single document using semantic questions
 * Now with intelligent token management and graceful error handling
 */
export const regenerateDocumentEmbedding = action({
  args: {
    documentId: v.string(),
    collection: v.union(v.literal("jobpostings"), v.literal("resumes")),
  },
  handler: async (ctx, { documentId, collection }): Promise<any> => {
    try {
      // Get the document
      const document: any = collection === "jobpostings"
        ? await ctx.runQuery(api.jobPostings.list).then((docs: any[]) => 
            docs.find((d: any) => d._id === documentId)
          )
        : await ctx.runQuery(api.resumes.list).then((docs: any[]) => 
            docs.find((d: any) => d._id === documentId)
          );

      if (!document) {
        throw new Error(`Document ${documentId} not found in ${collection}`);
      }

      // Get searchable text
      const originalText: string = document.completeSearchableText || 
                          document.searchableText || 
                          document.originalText ||
                          "";

      if (!originalText || originalText.trim().length === 0) {
        throw new Error(`Document ${documentId} has no searchable text`);
      }

      const originalLength = originalText.length;
      console.log(`Processing document ${documentId}: ${originalLength} chars, ~${estimateTokenCount(originalText)} tokens`);

      // Generate enhanced text with semantic questions (with intelligent truncation)
      const category = collection === "jobpostings" ? "job_posting" : "resume";
      const enhanced: any = await ctx.runAction(api.semanticEmbeddingService.generateSemanticEnhancedText, {
        text: originalText,
        category,
        targetModel: "text-embedding-3-small"
      });

      console.log(`Generated ${enhanced.questionsUsed} Q&A pairs for ${collection} ${documentId}`);
      console.log(`Enhanced text: ${enhanced.estimatedTokens} tokens${enhanced.wasTruncated ? ' (truncated)' : ''}`);

      // Generate embedding with the enhanced text using OpenAI
      let embeddingResult: any;
      try {
        embeddingResult = await ctx.runAction(api.embeddingService.generateEmbedding, {
          text: enhanced.enhancedText,
          model: "text-embedding-3-small"
        });
      } catch (embeddingError: any) {
        // If still getting token errors, try with more aggressive truncation
        if (embeddingError.message?.includes("maximum context length")) {
          console.warn(`Token limit still exceeded for ${documentId}, applying emergency truncation`);
          const emergencyText = intelligentTruncate(enhanced.enhancedText, 6000); // Very conservative limit
          embeddingResult = await ctx.runAction(api.embeddingService.generateEmbedding, {
            text: emergencyText,
            model: "text-embedding-3-small"
          });
        } else {
          throw embeddingError;
        }
      }

      // Update the document
      await ctx.runMutation(api.semanticEmbeddingMutations.updateDocumentWithSemanticEmbedding, {
        documentId,
        collection,
        embedding: embeddingResult.embedding,
        embeddingModel: embeddingResult.model,
        embeddingGeneratedAt: embeddingResult.generatedAt,
        enhancedText: enhanced.enhancedText,
        semanticAnswers: enhanced.answers,
        questionsUsed: enhanced.questionsUsed
      });

      return {
        success: true,
        documentId,
        collection,
        questionsUsed: enhanced.questionsUsed,
        embeddingDimensions: embeddingResult.dimensions,
        wasTruncated: enhanced.wasTruncated,
        estimatedTokens: enhanced.estimatedTokens
      };
    } catch (error) {
      console.error(`Error regenerating embedding for ${documentId}:`, error);
      throw error;
    }
  },
});

/**
 * Batch regenerate embeddings for all documents in a collection
 * Now with better error handling, progress tracking, and statistics
 */
export const batchRegenerateEmbeddings = action({
  args: {
    collection: v.union(v.literal("jobpostings"), v.literal("resumes")),
    batchSize: v.optional(v.number()),
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, { collection, batchSize = 5, delayMs = 1000 }): Promise<any> => {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Starting batch regeneration for ${collection}...`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Get all documents
      const documents: any[] = collection === "jobpostings"
        ? await ctx.runQuery(api.jobPostings.list)
        : await ctx.runQuery(api.resumes.list);

      const results: any = {
        total: documents.length,
        processed: 0,
        successful: 0,
        failed: 0,
        truncated: 0,
        errors: [] as string[],
        tokenStats: {
          min: Infinity,
          max: 0,
          total: 0,
          avg: 0
        },
        startTime: Date.now(),
        endTime: 0
      };

      console.log(`Found ${documents.length} documents to process`);
      console.log(`Batch size: ${batchSize}, Delay: ${delayMs}ms\n`);

      // Process in batches to avoid rate limits
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(documents.length / batchSize);
        
        console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} documents)...`);

        for (const doc of batch) {
          try {
            const result = await ctx.runAction(api.semanticEmbeddingService.regenerateDocumentEmbedding, {
              documentId: doc._id,
              collection
            });
            
            results.successful++;
            
            // Track statistics
            if (result.wasTruncated) {
              results.truncated++;
            }
            if (result.estimatedTokens) {
              results.tokenStats.min = Math.min(results.tokenStats.min, result.estimatedTokens);
              results.tokenStats.max = Math.max(results.tokenStats.max, result.estimatedTokens);
              results.tokenStats.total += result.estimatedTokens;
            }
            
            const progressPercent = ((results.successful / documents.length) * 100).toFixed(1);
            console.log(`  ✓ [${progressPercent}%] ${doc._id} - ${result.questionsUsed} Q&As, ${result.estimatedTokens} tokens${result.wasTruncated ? ' (truncated)' : ''}`);
          } catch (error) {
            results.failed++;
            const errorMsg = `${doc._id}: ${error instanceof Error ? error.message : String(error)}`;
            results.errors.push(errorMsg);
            console.error(`  ✗ Failed: ${errorMsg}`);
          }
          
          results.processed++;
        }

        // Delay between batches to respect rate limits
        if (i + batchSize < documents.length) {
          console.log(`  ⏳ Waiting ${delayMs}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      results.endTime = Date.now();
      const durationSeconds = (results.endTime - results.startTime) / 1000;
      results.tokenStats.avg = results.successful > 0 
        ? Math.round(results.tokenStats.total / results.successful) 
        : 0;

      // Final summary
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Batch Regeneration Complete`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Collection:        ${collection}`);
      console.log(`Total Documents:   ${results.total}`);
      console.log(`Successful:        ${results.successful} (${((results.successful/results.total)*100).toFixed(1)}%)`);
      console.log(`Failed:            ${results.failed}`);
      console.log(`Truncated:         ${results.truncated}`);
      console.log(`Duration:          ${durationSeconds.toFixed(2)}s`);
      console.log(`Processing Rate:   ${(results.successful / durationSeconds * 60).toFixed(2)} docs/min`);
      console.log(`\nToken Statistics:`);
      console.log(`  Min:     ${results.tokenStats.min !== Infinity ? results.tokenStats.min : 0} tokens`);
      console.log(`  Max:     ${results.tokenStats.max} tokens`);
      console.log(`  Average: ${results.tokenStats.avg} tokens`);
      
      if (results.errors.length > 0) {
        console.log(`\n❌ Errors (${results.errors.length}):`);
        const firstTenErrors = results.errors.slice(0, 10);
        for (let i = 0; i < firstTenErrors.length; i++) {
          console.log(`  ${i + 1}. ${firstTenErrors[i]}`);
        }
        if (results.errors.length > 10) {
          console.log(`  ... and ${results.errors.length - 10} more errors`);
        }
      }
      console.log(`${'='.repeat(60)}\n`);

      return results;
    } catch (error) {
      console.error(`\n❌ Batch regeneration failed:`, error);
      throw error;
    }
  },
});

/**
 * Regenerate embeddings for both job postings and resumes
 */
export const regenerateAllEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()),
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, { batchSize = 5, delayMs = 1000 }): Promise<any> => {
    try {
      console.log("Starting full embedding regeneration for all collections...");
      
      // Regenerate job postings
      console.log("\n=== Processing Job Postings ===");
      const jobResults: any = await ctx.runAction(api.semanticEmbeddingService.batchRegenerateEmbeddings, {
        collection: "jobpostings",
        batchSize,
        delayMs
      });

      // Regenerate resumes
      console.log("\n=== Processing Resumes ===");
      const resumeResults: any = await ctx.runAction(api.semanticEmbeddingService.batchRegenerateEmbeddings, {
        collection: "resumes",
        batchSize,
        delayMs
      });

      const totalResults: any = {
        jobPostings: jobResults,
        resumes: resumeResults,
        totalProcessed: jobResults.processed + resumeResults.processed,
        totalSuccessful: jobResults.successful + resumeResults.successful,
        totalFailed: jobResults.failed + resumeResults.failed,
        overallSuccessRate: ((jobResults.successful + resumeResults.successful) / 
                            (jobResults.total + resumeResults.total) * 100).toFixed(2) + "%"
      };

      console.log(`
=== Full Regeneration Complete ===
Job Postings: ${jobResults.successful}/${jobResults.total}
Resumes: ${resumeResults.successful}/${resumeResults.total}
Total Successful: ${totalResults.totalSuccessful}
Total Failed: ${totalResults.totalFailed}
Overall Success Rate: ${totalResults.overallSuccessRate}
      `);

      return totalResults;
    } catch (error) {
      console.error("Full regeneration failed:", error);
      throw error;
    }
  },
});

