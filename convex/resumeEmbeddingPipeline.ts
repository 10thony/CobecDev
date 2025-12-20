"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import OpenAI from "openai";

const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
};

/**
 * Generate searchable text from resume fields
 * This creates a comprehensive text representation for embedding
 */
function generateSearchableText(resume: Doc<"resumes">): string {
  const parts: string[] = [];
  
  // Personal info
  if (resume.personalInfo) {
    const { firstName, lastName, yearsOfExperience } = resume.personalInfo;
    if (firstName || lastName) {
      parts.push(`Candidate: ${firstName} ${lastName}`);
    }
    if (yearsOfExperience > 0) {
      parts.push(`Years of Experience: ${yearsOfExperience}`);
    }
  }
  
  // Professional summary
  if (resume.professionalSummary) {
    parts.push(`Summary: ${resume.professionalSummary}`);
  }
  
  // Skills - very important for matching
  if (resume.skills?.length > 0) {
    parts.push(`Skills: ${resume.skills.join(", ")}`);
  }
  
  // Experience
  if (resume.experience?.length > 0) {
    resume.experience.forEach((exp) => {
      parts.push(`Experience: ${exp.title} at ${exp.company}`);
      if (exp.responsibilities?.length > 0) {
        parts.push(exp.responsibilities.join(". "));
      }
    });
  }
  
  // Education
  if (resume.education?.length > 0) {
    parts.push(`Education: ${resume.education.join(", ")}`);
  }
  
  // Certifications
  if (resume.certifications) {
    parts.push(`Certifications: ${resume.certifications}`);
  }
  
  // Security clearance
  if (resume.securityClearance) {
    parts.push(`Security Clearance: ${resume.securityClearance}`);
  }
  
  // Raw text content (for bulk imports that only have text)
  if (resume.textContent && parts.length < 3) {
    parts.push(resume.textContent);
  }
  
  // Original text as fallback
  if (resume.originalText && parts.length < 3) {
    parts.push(resume.originalText);
  }
  
  return parts.join("\n\n");
}

/**
 * Extract skills using OpenAI
 */
async function extractSkillsFromText(text: string): Promise<string[]> {
  try {
    const openai = getOpenAI();
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a skill extraction assistant. Extract technical skills, programming languages, 
frameworks, tools, platforms, and domain expertise from the resume text.
Return ONLY a comma-separated list of skills, no explanations.
Focus on: Programming languages, Mobile development (iOS, Android), Web frameworks, 
Cloud platforms, Databases, Tools, Soft skills, Industry-specific skills.`
        },
        { role: "user", content: text.substring(0, 4000) }
      ],
      temperature: 0.2,
      max_tokens: 300,
    });
    
    const skillsText = response.choices[0]?.message?.content?.trim() || "";
    return skillsText.split(",").map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error("Skill extraction failed:", error);
    return [];
  }
}

// Result types for actions
interface EmbeddingResult {
  success: boolean;
  resumeId: Id<"resumes">;
  embeddingDimensions: number;
  skillsExtracted: number;
}

interface BatchResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

/**
 * Generate embedding for a single resume
 */
export const generateResumeEmbedding = action({
  args: {
    resumeId: v.id("resumes"),
  },
  handler: async (ctx, { resumeId }): Promise<EmbeddingResult> => {
    // Fetch the resume using the helper query
    const resume = await ctx.runQuery(internal.vectorSearchHelpers.getResumeById, { 
      resumeId 
    }) as Doc<"resumes"> | null;
    
    if (!resume) throw new Error(`Resume ${resumeId} not found`);
    
    // Generate searchable text
    const searchableText = generateSearchableText(resume);
    if (!searchableText || searchableText.length < 50) {
      throw new Error("Insufficient text content for embedding");
    }
    
    // Extract skills
    const extractedSkills = await extractSkillsFromText(searchableText);
    
    // Generate embedding
    const openai = getOpenAI();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: searchableText.substring(0, 8000), // OpenAI limit
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Update the resume with embedding data using the helper mutation
    await ctx.runMutation(internal.vectorSearchHelpers.updateResumeWithEmbedding, {
      resumeId,
      completeSearchableText: searchableText,
      embedding,
      extractedSkills,
      embeddingModel: "text-embedding-3-small",
      embeddingGeneratedAt: Date.now(),
    });
    
    return {
      success: true,
      resumeId,
      embeddingDimensions: embedding.length,
      skillsExtracted: extractedSkills.length,
    };
  },
});

/**
 * Batch generate embeddings for all resumes without embeddings
 */
export const batchGenerateResumeEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, { batchSize = 10, forceRegenerate = false }): Promise<BatchResult> => {
    // Get resumes needing embeddings using the helper query
    const resumes = await ctx.runQuery(
      internal.vectorSearchHelpers.getResumesNeedingEmbeddings,
      { limit: batchSize, forceRegenerate }
    ) as Doc<"resumes">[];
    
    const results: BatchResult = {
      total: resumes.length,
      successful: 0,
      failed: 0,
      errors: [],
    };
    
    for (const resume of resumes) {
      try {
        await ctx.runAction(api.resumeEmbeddingPipeline.generateResumeEmbedding, {
          resumeId: resume._id,
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${resume._id}: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Rate limiting to avoid OpenAI throttling
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  },
});

/**
 * Generate embedding for a single job posting
 */
export const generateJobEmbedding = action({
  args: {
    jobId: v.id("jobpostings"),
  },
  handler: async (ctx, { jobId }): Promise<{
    success: boolean;
    jobId: Id<"jobpostings">;
    embeddingDimensions: number;
    skillsExtracted: number;
  }> => {
    // Fetch the job posting using the helper query
    const job = await ctx.runQuery(internal.vectorSearchHelpers.getJobById, { 
      jobId 
    }) as Doc<"jobpostings"> | null;
    
    if (!job) throw new Error(`Job posting ${jobId} not found`);
    
    // Generate searchable text from job fields
    const parts: string[] = [];
    if (job.jobTitle) parts.push(`Job Title: ${job.jobTitle}`);
    if (job.department) parts.push(`Department: ${job.department}`);
    if (job.location) parts.push(`Location: ${job.location}`);
    if (job.jobSummary) parts.push(`Summary: ${job.jobSummary}`);
    if (job.duties) parts.push(`Duties: ${job.duties}`);
    if (job.requirements) parts.push(`Requirements: ${job.requirements}`);
    if (job.qualifications) parts.push(`Qualifications: ${job.qualifications}`);
    if (job.education?.length) parts.push(`Education: ${job.education.join(", ")}`);
    
    const searchableText = parts.join("\n\n");
    if (!searchableText || searchableText.length < 50) {
      throw new Error("Insufficient text content for embedding");
    }
    
    // Extract skills
    const extractedSkills = await extractSkillsFromText(searchableText);
    
    // Generate embedding
    const openai = getOpenAI();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: searchableText.substring(0, 8000),
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Update the job posting with embedding data
    await ctx.runMutation(internal.vectorSearchHelpers.updateJobWithEmbedding, {
      jobId,
      completeSearchableText: searchableText,
      embedding,
      extractedSkills,
      embeddingModel: "text-embedding-3-small",
      embeddingGeneratedAt: Date.now(),
    });
    
    return {
      success: true,
      jobId,
      embeddingDimensions: embedding.length,
      skillsExtracted: extractedSkills.length,
    };
  },
});

/**
 * Batch generate embeddings for all job postings without embeddings
 */
export const batchGenerateJobEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, { batchSize = 10, forceRegenerate = false }): Promise<BatchResult> => {
    // Get job postings needing embeddings
    const jobs = await ctx.runQuery(
      internal.vectorSearchHelpers.getJobPostingsNeedingEmbeddings,
      { limit: batchSize, forceRegenerate }
    ) as Doc<"jobpostings">[];
    
    const results: BatchResult = {
      total: jobs.length,
      successful: 0,
      failed: 0,
      errors: [],
    };
    
    for (const job of jobs) {
      try {
        await ctx.runAction(api.resumeEmbeddingPipeline.generateJobEmbedding, {
          jobId: job._id,
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${job._id}: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Rate limiting to avoid OpenAI throttling
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  },
});
