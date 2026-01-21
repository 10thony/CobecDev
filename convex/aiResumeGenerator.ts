"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";
import { DEFAULT_SYSTEM_PROMPT } from "./resumeGenerationSystemPrompts";

// Model to use for resume generation - MUST be GPT-5-mini
const RESUME_GENERATION_MODEL = "gpt-5-mini";

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable not set. Please set it in your Convex dashboard under Settings > Environment Variables.");
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

// Validate and normalize resume data structure
function validateResumeData(data: any): any {
  // Ensure all required fields are present with defaults
  return {
    filename: data.filename || `resume_${Date.now()}.txt`,
    originalText: data.originalText || "",
    personalInfo: {
      firstName: data.personalInfo?.firstName || "John",
      middleName: data.personalInfo?.middleName || "",
      lastName: data.personalInfo?.lastName || "Doe",
      email: data.personalInfo?.email || "john.doe@example.com",
      phone: data.personalInfo?.phone || "(555) 123-4567",
      yearsOfExperience: typeof data.personalInfo?.yearsOfExperience === "number" 
        ? data.personalInfo.yearsOfExperience 
        : 5,
    },
    professionalSummary: data.professionalSummary || "",
    education: Array.isArray(data.education) ? data.education : [],
    experience: Array.isArray(data.experience) ? data.experience.map((exp: any) => ({
      title: exp.title || "",
      company: exp.company || "",
      location: exp.location || "",
      duration: exp.duration || "",
      responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : [],
    })) : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    certifications: data.certifications || "",
    professionalMemberships: data.professionalMemberships || "",
    securityClearance: data.securityClearance || "",
  };
}

// Build user prompt from lead data
function buildUserPrompt(lead: any): string {
  const parts: string[] = [];
  
  parts.push(`Generate a professional resume tailored to this procurement opportunity:\n\n`);
  
  if (lead.opportunityTitle) {
    parts.push(`**Opportunity Title:** ${lead.opportunityTitle}\n`);
  }
  
  if (lead.opportunityType) {
    parts.push(`**Opportunity Type:** ${lead.opportunityType}\n`);
  }
  
  if (lead.issuingBody?.name) {
    parts.push(`**Issuing Organization:** ${lead.issuingBody.name} (${lead.issuingBody.level || "Unknown Level"})\n`);
  }
  
  if (lead.location) {
    const locationParts: string[] = [];
    if (lead.location.city) locationParts.push(lead.location.city);
    if (lead.location.county) locationParts.push(lead.location.county);
    if (lead.location.region) locationParts.push(lead.location.region);
    if (locationParts.length > 0) {
      parts.push(`**Location:** ${locationParts.join(", ")}\n`);
    }
  }
  
  if (lead.category) {
    parts.push(`**Category:** ${lead.category}`);
    if (lead.subcategory) {
      parts.push(` / ${lead.subcategory}`);
    }
    parts.push(`\n`);
  }
  
  if (lead.summary) {
    parts.push(`**Summary:** ${lead.summary}\n`);
  }
  
  if (lead.estimatedValueUSD) {
    parts.push(`**Estimated Value:** $${lead.estimatedValueUSD.toLocaleString()}\n`);
  }
  
  if (lead.keyDates) {
    if (lead.keyDates.bidDeadline) {
      parts.push(`**Bid Deadline:** ${lead.keyDates.bidDeadline}\n`);
    }
    if (lead.keyDates.projectedStartDate) {
      parts.push(`**Projected Start:** ${lead.keyDates.projectedStartDate}\n`);
    }
  }
  
  parts.push(`\nGenerate a complete resume in JSON format matching the required structure. Ensure all data is synthetic and realistic.`);
  
  return parts.join("");
}

// Generate a single resume from a lead
export const generateResumeFromLead = action({
  args: {
    leadId: v.id("leads"),
    systemPromptId: v.optional(v.id("resumeGenerationSystemPrompts")),
    customPrompt: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    resumeId: v.optional(v.id("resumes")),
    error: v.optional(v.string()),
    jobId: v.optional(v.id("resumeGenerationJobs")),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    resumeId?: Id<"resumes">;
    error?: string;
    jobId?: Id<"resumeGenerationJobs">;
  }> => {
    const startTime = Date.now();
    
    // Create job tracking record
    const jobId: Id<"resumeGenerationJobs"> = await ctx.runMutation(internal.aiResumeGeneratorMutations.createGenerationJob, {
      jobType: "single",
      leadIds: [args.leadId],
      systemPromptId: args.systemPromptId,
    });
    
    try {
      // 1. Load lead data using selective query
      const lead = await ctx.runQuery(api.leads.getLeadSummaryForGeneration, {
        leadId: args.leadId,
      });
      
      if (!lead) {
        return {
          success: false,
          error: "Lead not found",
        };
      }
      
      // 2. Get system prompt
      let systemPromptText = args.customPrompt || DEFAULT_SYSTEM_PROMPT;
      
      if (!args.customPrompt) {
        if (args.systemPromptId) {
          const prompt = await ctx.runQuery(api.resumeGenerationSystemPrompts.getById, {
            id: args.systemPromptId,
          });
          if (prompt) {
            systemPromptText = prompt.systemPromptText;
          }
        } else {
          const primaryPrompt = await ctx.runQuery(api.resumeGenerationSystemPrompts.getPrimary, {});
          if (primaryPrompt) {
            systemPromptText = primaryPrompt.systemPromptText;
          }
        }
      }
      
      // 3. Build user prompt with lead context
      const userPrompt = buildUserPrompt(lead);
      
      // 4. Call GPT-5-mini to generate resume
      const openai = getOpenAIClient();
      
      // Note: GPT-5-mini uses default temperature (1), so we don't set it
      const response = await openai.chat.completions.create({
        model: RESUME_GENERATION_MODEL,
        messages: [
          { role: "system", content: systemPromptText },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        // GPT-5-mini uses default temperature, so we don't override it
      });
      
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }
      
      // 5. Parse AI response
      let resumeData: any;
      try {
        resumeData = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          resumeData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse JSON from AI response");
        }
      }
      
      // 6. Validate and normalize resume structure
      const validatedResume = validateResumeData(resumeData);
      
      // 7. Insert resume with metadata
      const now = Date.now();
      const generationTimeMs = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens;
      
      const resumeId: Id<"resumes"> = await ctx.runMutation(api.dataManagement.insertResume, {
        filename: validatedResume.filename,
        originalText: validatedResume.originalText || JSON.stringify(validatedResume, null, 2),
        personalInfo: validatedResume.personalInfo,
        professionalSummary: validatedResume.professionalSummary,
        education: validatedResume.education,
        experience: validatedResume.experience,
        skills: validatedResume.skills,
        certifications: validatedResume.certifications,
        professionalMemberships: validatedResume.professionalMemberships,
        securityClearance: validatedResume.securityClearance,
        metadata: {
          fileName: validatedResume.filename,
          importedAt: now,
          parsedAt: now,
          dataType: "ai_generated",
        },
        sourceLeadId: args.leadId,
        generationMetadata: {
          systemPromptId: args.systemPromptId,
          generatedAt: now,
          model: RESUME_GENERATION_MODEL,
          tokensUsed: tokensUsed,
          generationTimeMs: generationTimeMs,
        },
      });
      
      // Update job as completed
      await ctx.runMutation(internal.aiResumeGeneratorMutations.completeJob, {
        jobId: jobId,
        status: "completed",
        result: {
          successful: 1,
          failed: 0,
          resumeIds: [resumeId],
        },
      });
      
      return {
        success: true,
        resumeId: resumeId,
        jobId: jobId,
      };
    } catch (error) {
      console.error("Error in generateResumeFromLead:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      // Update job as failed
      await ctx.runMutation(internal.aiResumeGeneratorMutations.completeJob, {
        jobId: jobId,
        status: "failed",
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
        jobId: jobId,
      };
    }
  },
});

// Generate multiple resumes from multiple leads (batch processing)
export const generateResumesFromLeads = action({
  args: {
    leadIds: v.array(v.id("leads")),
    systemPromptId: v.optional(v.id("resumeGenerationSystemPrompts")),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    total: v.number(),
    successful: v.number(),
    failed: v.number(),
    resumeIds: v.array(v.id("resumes")),
    errors: v.optional(v.array(v.object({
      leadId: v.id("leads"),
      error: v.string(),
    }))),
    jobId: v.id("resumeGenerationJobs"),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    total: number;
    successful: number;
    failed: number;
    resumeIds: Id<"resumes">[];
    errors?: Array<{ leadId: Id<"leads">; error: string }>;
    jobId: Id<"resumeGenerationJobs">;
  }> => {
    const batchSize = args.batchSize ?? 5;
    const leadIds = args.leadIds;
    const resumeIds: Id<"resumes">[] = [];
    const errors: Array<{ leadId: Id<"leads">; error: string }> = [];
    
    // Create job tracking record
    const jobId: Id<"resumeGenerationJobs"> = await ctx.runMutation(internal.aiResumeGeneratorMutations.createGenerationJob, {
      jobType: "batch",
      leadIds: leadIds,
      systemPromptId: args.systemPromptId,
    });
    
    // Process leads in batches to avoid timeout
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize);
      
      // Process batch sequentially to avoid rate limits
      for (const leadId of batch) {
        try {
          const result = await ctx.runAction(api.aiResumeGenerator.generateResumeFromLead, {
            leadId: leadId,
            systemPromptId: args.systemPromptId,
          });
          
          if (result.success && result.resumeId) {
            resumeIds.push(result.resumeId);
          } else {
            errors.push({
              leadId: leadId,
              error: result.error || "Unknown error",
            });
          }
          
          // Update progress
          const currentProgress = resumeIds.length + errors.length;
          await ctx.runMutation(internal.aiResumeGeneratorMutations.updateJobProgress, {
            jobId: jobId,
            current: currentProgress,
            total: leadIds.length,
          });
          
          // Small delay between requests to avoid rate limits
          if (i + batch.indexOf(leadId) < leadIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          errors.push({
            leadId: leadId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          
          // Update progress even on error
          const currentProgress = resumeIds.length + errors.length;
          await ctx.runMutation(internal.aiResumeGeneratorMutations.updateJobProgress, {
            jobId: jobId,
            current: currentProgress,
            total: leadIds.length,
          });
        }
      }
      
      // Delay between batches
      if (i + batchSize < leadIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const finalResult = {
      success: errors.length === 0,
      total: leadIds.length,
      successful: resumeIds.length,
      failed: errors.length,
      resumeIds: resumeIds,
      errors: errors.length > 0 ? errors : undefined,
    };
    
    // Update job as completed
    await ctx.runMutation(internal.aiResumeGeneratorMutations.completeJob, {
      jobId: jobId,
      status: errors.length === 0 ? "completed" : "failed",
      result: {
        successful: resumeIds.length,
        failed: errors.length,
        resumeIds: resumeIds,
        errors: errors.length > 0 ? errors : undefined,
      },
      error: errors.length > 0 ? `${errors.length} out of ${leadIds.length} failed` : undefined,
    });
    
    return {
      ...finalResult,
      jobId: jobId,
    };
  },
});
