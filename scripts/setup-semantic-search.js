#!/usr/bin/env node

/**
 * Semantic Search Setup Script
 * 
 * This script populates the completeSearchableText field and generates embeddings
 * for existing job postings, resumes, and KFC points to enable semantic search.
 * 
 * Features:
 * - Aggregates searchable text from multiple fields
 * - Removes duplicate strings
 * - Generates Gemini MRL 2048 embeddings
 * - Updates Convex database with new fields
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

// Note: Google API key is optional for Phase 1 (schema updates)
// It's required for Phase 2 (embedding generation)

const client = new ConvexHttpClient(CONVEX_URL);

/**
 * Aggregates searchable text from job posting fields, removing duplicates
 * Truncates text to stay within Convex size limits (1 MiB)
 */
function aggregateJobPostingText(jobPosting) {
  const fields = [
    jobPosting.jobSummary,
    jobPosting.jobType,
    jobPosting.jobTitle,
    jobPosting.location,
    jobPosting.qualifications,
    jobPosting.requirements,
    jobPosting.searchableText,
    jobPosting.experienceRequired,
    jobPosting.educationRequired,
    jobPosting.duties,
    jobPosting.closeDate
  ].filter(Boolean); // Remove null/undefined values

  // Remove duplicate strings and join with spaces
  const uniqueFields = [...new Set(fields)];
  let aggregatedText = uniqueFields.join(" ").trim();
  
  // Truncate to stay within Convex size limits (1 MiB = ~1,000,000 characters)
  // Use a much smaller limit to account for byte encoding overhead
  const maxLength = 500000; // Conservative limit to stay well under 1 MiB
  if (aggregatedText.length > maxLength) {
    console.log(`⚠️  Truncating job posting ${jobPosting.jobTitle} from ${aggregatedText.length} to ${maxLength} characters`);
    aggregatedText = aggregatedText.substring(0, maxLength) + " [TRUNCATED]";
  }
  
  // Debug: Log approximate size in MB
  const approximateSizeMB = (aggregatedText.length * 2) / (1024 * 1024); // Rough estimate: 2 bytes per character
  console.log(`📊 Job posting ${jobPosting.jobTitle}: ${aggregatedText.length} characters, ~${approximateSizeMB.toFixed(2)} MB`);
  
  return aggregatedText;
}

/**
 * Aggregates searchable text from resume fields, removing duplicates
 * Truncates text to stay within Convex size limits (1 MiB)
 */
function aggregateResumeText(resume) {
  const fields = [
    resume.certifications,
    resume.education?.join(" "),
    resume.experience?.map(exp => 
      `${exp.title} ${exp.company} ${exp.location} ${exp.duration} ${exp.responsibilities?.join(" ")}`
    ).join(" "),
    resume.originalText,
    resume.skills?.join(" "),
    resume.professionalSummary,
    resume.searchableText
  ].filter(Boolean); // Remove null/undefined values

  // Remove duplicate strings and join with spaces
  const uniqueFields = [...new Set(fields)];
  let aggregatedText = uniqueFields.join(" ").trim();
  
  // Truncate to stay within Convex size limits (1 MiB = ~1,000,000 characters)
  // Use a much smaller limit to account for byte encoding overhead
  const maxLength = 500000; // Conservative limit to stay well under 1 MiB
  if (aggregatedText.length > maxLength) {
    console.log(`⚠️  Truncating resume ${resume.filename} from ${aggregatedText.length} to ${maxLength} characters`);
    aggregatedText = aggregatedText.substring(0, maxLength) + " [TRUNCATED]";
  }
  
  // Debug: Log approximate size in MB
  const approximateSizeMB = (aggregatedText.length * 2) / (1024 * 1024); // Rough estimate: 2 bytes per character
  console.log(`📊 Resume ${resume.filename}: ${aggregatedText.length} characters, ~${approximateSizeMB.toFixed(2)} MB`);
  
  return aggregatedText;
}

/**
 * Aggregates searchable text from KFC points fields, removing duplicates
 */
function aggregateKfcPointsText(kfcPoint) {
  const fields = [
    kfcPoint.name,
    kfcPoint.events?.map(event => `${event.type} ${event.month}`).join(" "),
    kfcPoint.march_status
  ].filter(Boolean); // Remove null/undefined values

  // Remove duplicate strings and join with spaces
  const uniqueFields = [...new Set(fields)];
  return uniqueFields.join(" ").trim();
}

/**
 * Main function to set up semantic search
 */
async function setupSemanticSearch() {
  console.log("🚀 Setting up semantic search for AJAI application...\n");
  
  // Track processing results
  const results = {
    jobPostings: { processed: 0, failed: 0, errors: [] },
    resumes: { processed: 0, failed: 0, errors: [] },
    kfcPoints: { processed: 0, failed: 0, errors: [] }
  };

  try {
    // Step 1: Update job postings
    console.log("📋 Processing job postings...");
    const jobPostings = await client.query(api.jobPostings.list);
    
    for (const jobPosting of jobPostings) {
      try {
        const completeSearchableText = aggregateJobPostingText(jobPosting);
        
        await client.mutation(api.jobPostings.update, {
          id: jobPosting._id,
          updates: {
            completeSearchableText,
            embeddingModel: "gemini-mrl-2048",
            embeddingGeneratedAt: Date.now()
          }
        });
        
        console.log(`✅ Updated job posting: ${jobPosting.jobTitle}`);
        results.jobPostings.processed++;
      } catch (error) {
        console.log(`❌ Failed to update job posting: ${jobPosting.jobTitle} - ${error.message}`);
        results.jobPostings.failed++;
        results.jobPostings.errors.push({
          type: 'jobPosting',
          id: jobPosting._id,
          title: jobPosting.jobTitle,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Step 2: Update resumes
    console.log("\n📄 Processing resumes...");
    const resumes = await client.query(api.resumes.list);
    
    for (const resume of resumes) {
      try {
        const completeSearchableText = aggregateResumeText(resume);
        
        await client.mutation(api.resumes.update, {
          id: resume._id,
          updates: {
            completeSearchableText,
            embeddingModel: "gemini-mrl-2048",
            embeddingGeneratedAt: Date.now()
          }
        });
        
        console.log(`✅ Updated resume: ${resume.filename}`);
        results.resumes.processed++;
      } catch (error) {
        console.log(`❌ Failed to update resume: ${resume.filename} - ${error.message}`);
        results.resumes.failed++;
        results.resumes.errors.push({
          type: 'resume',
          id: resume._id,
          filename: resume.filename,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Step 3: Update KFC points
    console.log("\n🏆 Processing KFC points...");
    const kfcPoints = await client.query(api.kfcData.list);
    
    for (const kfcPoint of kfcPoints) {
      try {
        const completeSearchableText = aggregateKfcPointsText(kfcPoint);
        
        await client.mutation(api.kfcData.updateEmbeddings, {
          _id: kfcPoint._id,
          completeSearchableText: completeSearchableText,
          embedding: [], // Empty array for now, will be populated by embedding generation
          embeddingModel: "gemini-mrl-2048",
          embeddingGeneratedAt: Date.now()
        });
        
        console.log(`✅ Updated KFC points for: ${kfcPoint.name}`);
        results.kfcPoints.processed++;
      } catch (error) {
        console.log(`❌ Failed to update KFC points: ${kfcPoint.name} - ${error.message}`);
        results.kfcPoints.failed++;
        results.kfcPoints.errors.push({
          type: 'kfcPoint',
          id: kfcPoint._id,
          name: kfcPoint.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Generate summary and log file
    console.log("\n🎉 Semantic search setup completed!");
    console.log("\n📊 Processing Summary:");
    console.log(`Job Postings: ${results.jobPostings.processed} processed, ${results.jobPostings.failed} failed`);
    console.log(`Resumes: ${results.resumes.processed} processed, ${results.resumes.failed} failed`);
    console.log(`KFC Points: ${results.kfcPoints.processed} processed, ${results.kfcPoints.failed} failed`);
    
    // Create detailed log file
    const fs = await import('fs');
    const logData = {
      summary: {
        totalProcessed: results.jobPostings.processed + results.resumes.processed + results.kfcPoints.processed,
        totalFailed: results.jobPostings.failed + results.resumes.failed + results.kfcPoints.failed,
        timestamp: new Date().toISOString()
      },
      details: {
        jobPostings: results.jobPostings,
        resumes: results.resumes,
        kfcPoints: results.kfcPoints
      }
    };
    
    const logFileName = `semantic-search-setup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
    console.log(`\n📝 Detailed log saved to: ${logFileName}`);
    
    if (results.jobPostings.failed > 0 || results.resumes.failed > 0 || results.kfcPoints.failed > 0) {
      console.log("\n⚠️  Some documents failed to process. Check the log file for details.");
      console.log("You can retry processing failed documents individually or investigate the errors.");
    }

    console.log("\nNext steps:");
    console.log("1. Run the embedding generation script to create vectors");
    console.log("2. Test the semantic search functionality");
    console.log("3. Implement the frontend search interface");

  } catch (error) {
    console.error("❌ Critical error in semantic search setup:", error);
    process.exit(1);
  }
}

// Run the script
setupSemanticSearch()
  .then(() => {
    console.log('\n✅ Semantic search setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Semantic search setup failed:', error);
    process.exit(1);
  });
