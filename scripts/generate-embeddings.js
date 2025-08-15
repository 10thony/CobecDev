#!/usr/bin/env node

/**
 * AJAI Semantic Search - Embedding Generation Script
 * 
 * This script generates Gemini MRL 2048 embeddings for all documents in the system:
 * - Job Postings
 * - Resumes  
 * - KFC Points
 * 
 * The embeddings enable semantic search with 50% similarity threshold for HR-focused matching.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

// Load environment variables from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env if .env.local doesn't exist

// Debug: Log environment variables
console.log("🔍 Environment variables loaded:");
console.log("VITE_CONVEX_URL:", process.env.VITE_CONVEX_URL ? "✅ Set" : "❌ Not set");
console.log("GOOGLE_AI_API_KEY:", process.env.GOOGLE_AI_API_KEY ? "✅ Set" : "❌ Not set");

const CONVEX_URL = process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("❌ VITE_CONVEX_URL environment variable is required");
  console.error("Please check your .env.local file contains: VITE_CONVEX_URL=your_convex_url");
  process.exit(1);
}

// Note: Google API key is required for embedding generation
if (!process.env.GOOGLE_AI_API_KEY) {
  console.error("❌ GOOGLE_AI_API_KEY environment variable is required for embedding generation");
  console.error("Please check your .env.local file contains: GOOGLE_AI_API_KEY=your_google_api_key");
  process.exit(1);
}

// Initialize Convex client
const client = new ConvexHttpClient(CONVEX_URL);

console.log("🚀 Starting AJAI Semantic Search Embedding Generation...\n");

/**
 * Generate embeddings for job postings
 */
async function generateJobPostingEmbeddings() {
  console.log("📋 Generating embeddings for job postings...");
  
  try {
    // Get ALL job postings with searchable text, regardless of existing embeddings
    const jobPostings = await client.query(api.vectorSearch.getJobPostingsNeedingEmbeddings, { limit: 1000 });
    
    if (jobPostings.length === 0) {
      console.log("✅ No job postings found with searchable text");
      return { processed: 0, failed: 0, errors: [] };
    }
    
    console.log(`📊 Found ${jobPostings.length} job postings to process`);
    
    let processed = 0;
    let failed = 0;
    const errors = [];
    
    for (const jobPosting of jobPostings) {
      try {
        if (!jobPosting.completeSearchableText) {
          console.log(`⚠️  Skipping job posting ${jobPosting.jobTitle} - no searchable text`);
          continue;
        }
        
        // Check if embedding already exists and has actual vector data
        if (jobPosting.embedding && jobPosting.embedding.length > 0) {
          console.log(`ℹ️  Job posting ${jobPosting.jobTitle} already has embedding (${jobPosting.embedding.length} dimensions) - regenerating...`);
        }
        
        // Generate embedding using Gemini MRL 2048
        const embeddingResult = await client.action(api.embeddingService.generateEmbedding, {
          text: jobPosting.completeSearchableText,
          model: "gemini-mrl-2048"
        });
        
        // Update job posting with embedding
        await client.mutation(api.vectorSearch.updateJobPostingEmbedding, {
          id: jobPosting._id,
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model,
          embeddingGeneratedAt: embeddingResult.generatedAt
        });
        
        console.log(`✅ Generated embedding for: ${jobPosting.jobTitle} (${embeddingResult.dimensions} dimensions)`);
        processed++;
        
        // Rate limiting - pause between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Failed to generate embedding for: ${jobPosting.jobTitle} - ${error.message}`);
        failed++;
        errors.push({
          type: 'jobPosting',
          id: jobPosting._id,
          title: jobPosting.jobTitle,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return { processed, failed, errors };
    
  } catch (error) {
    console.error("❌ Error in job posting embedding generation:", error);
    throw error;
  }
}

/**
 * Generate embeddings for resumes
 */
async function generateResumeEmbeddings() {
  console.log("\n📄 Generating embeddings for resumes...");
  
  try {
    // Get ALL resumes with searchable text, regardless of existing embeddings
    const resumes = await client.query(api.vectorSearch.getResumesNeedingEmbeddings, { limit: 1000 });
    
    if (resumes.length === 0) {
      console.log("✅ No resumes found with searchable text");
      return { processed: 0, failed: 0, errors: [] };
    }
    
    console.log(`📊 Found ${resumes.length} resumes to process`);
    
    let processed = 0;
    let failed = 0;
    const errors = [];
    
    for (const resume of resumes) {
      try {
        if (!resume.completeSearchableText) {
          console.log(`⚠️  Skipping resume ${resume.filename} - no searchable text`);
          continue;
        }
        
        // Check if embedding already exists and has actual vector data
        if (resume.embedding && resume.embedding.length > 0) {
          console.log(`ℹ️  Resume ${resume.filename} already has embedding (${resume.embedding.length} dimensions) - regenerating...`);
        }
        
        // Generate embedding using Gemini MRL 2048
        const embeddingResult = await client.action(api.embeddingService.generateEmbedding, {
          text: resume.completeSearchableText,
          model: "gemini-mrl-2048"
        });
        
        // Update resume with embedding
        await client.mutation(api.vectorSearch.updateResumeEmbedding, {
          id: resume._id,
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model,
          embeddingGeneratedAt: embeddingResult.generatedAt
        });
        
        console.log(`✅ Generated embedding for: ${resume.filename} (${embeddingResult.dimensions} dimensions)`);
        processed++;
        
        // Rate limiting - pause between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Failed to generate embedding for: ${resume.filename} - ${error.message}`);
        failed++;
        errors.push({
          type: 'resume',
          id: resume._id,
          filename: resume.filename,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return { processed, failed, errors };
    
  } catch (error) {
    console.error("❌ Error in resume embedding generation:", error);
    throw error;
  }
}

/**
 * Generate embeddings for KFC points
 */
async function generateKfcPointEmbeddings() {
  console.log("\n🏆 Generating embeddings for KFC points...");
  
  try {
    // Get ALL KFC points with searchable text, regardless of existing embeddings
    const kfcPoints = await client.query(api.vectorSearch.getKfcPointsNeedingEmbeddings, { limit: 1000 });
    
    if (kfcPoints.length === 0) {
      console.log("✅ No KFC points found with searchable text");
      return { processed: 0, failed: 0, errors: [] };
    }
    
    console.log(`📊 Found ${kfcPoints.length} KFC points to process`);
    
    let processed = 0;
    let failed = 0;
    const errors = [];
    
    for (const kfcPoint of kfcPoints) {
      try {
        if (!kfcPoint.completeSearchableText) {
          console.log(`⚠️  Skipping KFC point ${kfcPoint.name} - no searchable text`);
          continue;
        }
        
        // Check if embedding already exists and has actual vector data
        if (kfcPoint.embedding && kfcPoint.embedding.length > 0) {
          console.log(`ℹ️  KFC point ${kfcPoint.name} already has embedding (${kfcPoint.embedding.length} dimensions) - regenerating...`);
        }
        
        // Generate embedding using Gemini MRL 2048
        const embeddingResult = await client.action(api.embeddingService.generateEmbedding, {
          text: kfcPoint.completeSearchableText,
          model: "gemini-mrl-2048"
        });
        
        // Update KFC point with embedding
        await client.mutation(api.vectorSearch.updateKfcPointsEmbedding, {
          id: kfcPoint._id,
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model,
          embeddingGeneratedAt: embeddingResult.generatedAt
        });
        
        console.log(`✅ Generated embedding for: ${kfcPoint.name} (${embeddingResult.dimensions} dimensions)`);
        processed++;
        
        // Rate limiting - pause between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Failed to generate embedding for: ${kfcPoint.name} - ${error.message}`);
        failed++;
        errors.push({
          type: 'kfcPoint',
          id: kfcPoint._id,
          name: kfcPoint.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return { processed, failed, errors };
    
  } catch (error) {
    console.error("❌ Error in KFC point embedding generation:", error);
    throw error;
  }
}

/**
 * Test semantic search functionality
 */
async function testSemanticSearch() {
  console.log("\n🧪 Testing semantic search functionality...");
  
  try {
    // Test 1: Get embedding statistics
    const stats = await client.query(api.vectorSearch.getEmbeddingStats);
    console.log("📊 Embedding Statistics:");
    console.log(`  Job Postings: ${stats.jobPostings.withEmbeddings}/${stats.jobPostings.total} (${Math.round(stats.jobPostings.withEmbeddings/stats.jobPostings.total*100)}%)`);
    console.log(`  Resumes: ${stats.resumes.withEmbeddings}/${stats.resumes.total} (${Math.round(stats.resumes.withEmbeddings/stats.resumes.total*100)}%)`);
    console.log(`  KFC Points: ${stats.kfcPoints.withEmbeddings}/${stats.kfcPoints.total} (${Math.round(stats.kfcPoints.withEmbeddings/stats.kfcPoints.total*100)}%)`);
    console.log(`  Overall Coverage: ${stats.overall.embeddingCoverage}%`);
    
    // Test 2: Try a cross-table semantic search
    if (stats.overall.embeddingCoverage > 50) {
      console.log("\n🔍 Testing cross-table semantic search...");
      
      const searchResults = await client.query(api.vectorSearch.crossTableSemanticSearch, {
        query: "software engineer",
        searchType: "both",
        limit: 5,
        similarityThreshold: 0.5
      });
      
      console.log(`  Search Query: "${searchResults.query}"`);
      console.log(`  Jobs Found: ${searchResults.jobs?.totalFound || 0}`);
      console.log(`  Resumes Found: ${searchResults.resumes?.totalFound || 0}`);
      
      if (searchResults.jobs?.results?.length > 0) {
        console.log("  Top Job Match:", searchResults.jobs.results[0].jobTitle);
      }
      if (searchResults.resumes?.results?.length > 0) {
        console.log("  Top Resume Match:", searchResults.resumes.results[0].filename);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error("❌ Error testing semantic search:", error);
    return false;
  }
}

/**
 * Main function to generate all embeddings
 */
async function generateAllEmbeddings() {
  const startTime = Date.now();
  
  try {
    // Step 1: Generate job posting embeddings
    const jobResults = await generateJobPostingEmbeddings();
    
    // Step 2: Generate resume embeddings
    const resumeResults = await generateResumeEmbeddings();
    
    // Step 3: Generate KFC point embeddings
    const kfcResults = await generateKfcPointEmbeddings();
    
    // Step 4: Test semantic search
    const searchTestPassed = await testSemanticSearch();
    
    // Generate summary
    const totalProcessed = jobResults.processed + resumeResults.processed + kfcResults.processed;
    const totalFailed = jobResults.failed + resumeResults.failed + kfcResults.failed;
    const totalErrors = [...jobResults.errors, ...resumeResults.errors, ...kfcResults.errors];
    
    console.log("\n🎉 Embedding generation completed!");
    console.log("\n📊 Processing Summary:");
    console.log(`Job Postings: ${jobResults.processed} processed, ${jobResults.failed} failed`);
    console.log(`Resumes: ${resumeResults.processed} processed, ${resumeResults.failed} failed`);
    console.log(`KFC Points: ${kfcResults.processed} processed, ${kfcResults.failed} failed`);
    console.log(`Total: ${totalProcessed} processed, ${totalFailed} failed`);
    console.log(`Semantic Search Test: ${searchTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Create detailed log file
    const fs = await import('fs');
    const logData = {
      summary: {
        totalProcessed,
        totalFailed,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      },
      details: {
        jobPostings: jobResults,
        resumes: resumeResults,
        kfcPoints: kfcResults
      },
      searchTest: searchTestPassed
    };
    
    const logFileName = `embedding-generation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
    console.log(`\n📝 Detailed log saved to: ${logFileName}`);
    
    if (totalFailed > 0) {
      console.log("\n⚠️  Some documents failed to process. Check the log file for details.");
      console.log("You can retry processing failed documents individually or investigate the errors.");
    }
    
    if (searchTestPassed) {
      console.log("\n✅ Semantic search system is ready for use!");
      console.log("Next steps:");
      console.log("1. Test the frontend search interface");
      console.log("2. Implement HR dashboard for job-resume matching");
      console.log("3. Monitor search performance and adjust similarity thresholds");
    } else {
      console.log("\n⚠️  Semantic search test failed. Check embedding generation and try again.");
    }
    
  } catch (error) {
    console.error("❌ Critical error in embedding generation:", error);
    process.exit(1);
  }
}

// Run the script
generateAllEmbeddings()
  .then(() => {
    console.log('\n✅ Embedding generation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Embedding generation failed:', error);
    process.exit(1);
  });
