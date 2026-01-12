"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components, internal } from "./_generated/api";
import mammoth from "mammoth";

/**
 * AI-Powered Resume Parser using Convex AI Agents
 * This is a separate parser from the regex-based parser for beta testing with PII concerns.
 * Uses GPT-5-mini to intelligently extract experience and skills from resume text.
 */

// Reuse text extraction functions from resumeParser.ts
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer);
    if (pdfData.text && pdfData.text.trim().length > 0) {
      return pdfData.text;
    }
    throw new Error('No text content found in PDF');
  } catch (error) {
    // Try fallback with pdfjs-dist
    try {
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      const pdfjsWorker = require('pdfjs-dist/legacy/build/pdf.worker.entry');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      if (fullText.trim().length > 0) {
        return fullText;
      }
    } catch (fallbackError) {
      // Ignore fallback error, throw original
    }
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract basic personal info (minimal PII - just for matching)
function extractBasicInfo(text: string): { email: string; phone: string; name: string[] } {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phonePatterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  ];
  
  const emailMatch = text.match(emailPattern);
  const email = emailMatch ? emailMatch[0] : "";
  
  let phone = "";
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      phone = match[0];
      break;
    }
  }
  
  // Extract name from first few lines
  const lines = text.split('\n').slice(0, 5);
  let name: string[] = ["", "", ""];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.match(/^(Email:|Phone:|Address:|Summary:|Objective:)/i)) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2 && parts.length <= 4) {
        if (parts.length === 2) {
          name = [parts[0], "", parts[1]];
        } else if (parts.length === 3) {
          name = [parts[0], parts[1], parts[2]];
        } else if (parts.length === 4) {
          name = [parts[0], parts[1], `${parts[2]} ${parts[3]}`];
        }
        break;
      }
    }
  }
  
  return { email, phone, name };
}

// Extract years of experience
function extractYearsOfExperience(text: string): number {
  const patterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i,
    /(\d+)\+?\s*years?\s*in/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const years = parseInt(match[1], 10);
      if (!isNaN(years)) {
        return years;
      }
    }
  }
  
  return 0;
}

// Create AI agent for resume parsing
const resumeParsingAgent = new Agent(components.agent, {
  name: "Resume Parser AI Agent",
  languageModel: openai.chat("gpt-5-mini"),
  instructions: `You are an expert resume parser specialized in extracting work experience and skills from resume text.

YOUR TASK:
Extract structured data from the provided resume text, focusing on:
1. Work Experience (REQUIRED)
2. Skills (REQUIRED)
3. Optional fields when available: Education, Certifications, Professional Memberships, Security Clearance, Professional Summary

CRITICAL REQUIREMENTS:
- Extract ONLY experience and skills as primary focus
- For experience, extract: job title, company name, location, duration/date range, and responsibilities/achievements
- For skills, extract as an array of individual skill strings
- Include optional fields only when clearly present in the resume
- Do NOT invent or hallucinate information - only extract what is explicitly stated
- Handle various resume formats (chronological, functional, combination)

OUTPUT FORMAT:
You MUST respond with valid JSON only. No markdown, no explanations, just the JSON object.

Required JSON Structure:
{
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, State or Remote",
      "duration": "MM/YYYY - MM/YYYY or Present",
      "responsibilities": [
        "Responsibility or achievement 1",
        "Responsibility or achievement 2"
      ]
    }
  ],
  "skills": [
    "Skill 1",
    "Skill 2",
    "Skill 3"
  ],
  "education": ["Optional - Education entries"],
  "certifications": "Optional - Certifications text",
  "professionalMemberships": "Optional - Memberships text",
  "securityClearance": "Optional - Clearance level if mentioned",
  "professionalSummary": "Optional - Summary or objective text"
}

FIELD REQUIREMENTS:
- experience: Array of objects, REQUIRED (can be empty array if none found)
  - title: string, REQUIRED
  - company: string, REQUIRED
  - location: string, REQUIRED (use "Remote" if remote work, or city/state if available)
  - duration: string, REQUIRED (format: "MM/YYYY - MM/YYYY" or "MM/YYYY - Present")
  - responsibilities: array of strings, REQUIRED (can be empty array)
- skills: array of strings, REQUIRED (can be empty array if none found)
- education: array of strings, OPTIONAL (only include if found)
- certifications: string, OPTIONAL (only include if found)
- professionalMemberships: string, OPTIONAL (only include if found)
- securityClearance: string, OPTIONAL (only include if found)
- professionalSummary: string, OPTIONAL (only include if found)

IMPORTANT:
- Always return valid JSON
- If a required field cannot be extracted, use empty string or empty array
- Do not include fields that are not found (omit optional fields entirely)
- Parse dates and durations carefully - handle various formats
- Extract responsibilities as individual bullet points when possible
- For skills, normalize variations (e.g., "JavaScript" and "JS" should be standardized)`,
});

/**
 * Parse resume text using AI agent
 */
async function parseResumeWithAIAgent(
  ctx: any, 
  resumeText: string,
  filename: string,
  resumeId?: string
): Promise<{ parsedData: any; usage: { requestTokens: number; responseTokens: number }; latencyMs: number }> {
  const startTime = Date.now();
  try {
    // Create a new thread for parsing
    const { threadId } = await resumeParsingAgent.createThread(ctx);
    
    // Generate structured response from AI
    const result = await resumeParsingAgent.generateText(
      ctx,
      { threadId },
      { prompt: `Parse the following resume text and extract work experience and skills. Return only valid JSON matching the required structure.\n\nResume Text:\n${resumeText}` }
    );
    
    const rawText = result.text || "";
    const latencyMs = Date.now() - startTime;
    
    // Extract token usage from result
    const usage = result.usage as { inputTokens?: number; outputTokens?: number; promptTokens?: number; completionTokens?: number } | undefined;
    const requestTokens = usage?.inputTokens ?? usage?.promptTokens ?? 0;
    const responseTokens = usage?.outputTokens ?? usage?.completionTokens ?? 0;
    
    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = rawText.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```")) {
      const lines = jsonText.split("\n");
      const startIndex = lines[0].includes("json") ? 1 : 0;
      const endIndex = lines.length - 1;
      jsonText = lines.slice(startIndex + 1, endIndex).join("\n");
    }
    
    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      // Try to extract JSON object from text if wrapped in other text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse JSON from AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }
    
    // Validate required fields
    if (!parsedData.experience || !Array.isArray(parsedData.experience)) {
      parsedData.experience = [];
    }
    if (!parsedData.skills || !Array.isArray(parsedData.skills)) {
      parsedData.skills = [];
    }
    
    // Validate experience entries
    parsedData.experience = parsedData.experience.map((exp: any) => ({
      title: exp.title || "",
      company: exp.company || "",
      location: exp.location || "",
      duration: exp.duration || "",
      responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : [],
    }));
    
    // Get userId if available (for analytics)
    let userId = "system";
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        userId = identity.subject;
      }
    } catch (authError) {
      // User not authenticated, use "system" as default
      console.log("No authenticated user for resume parsing analytics");
    }
    
    // Record analytics for successful parsing
    try {
      await ctx.runMutation(internal.resumeParsingAnalytics.recordAnalytics, {
        resumeId: resumeId as any,
        filename: filename,
        userId: userId,
        inputText: resumeText,
        outputJson: JSON.stringify(parsedData, null, 2),
        model: "gpt-5-mini",
        provider: "openai",
        requestTokens,
        responseTokens,
        isError: false,
        latencyMs,
        parserType: "ai",
      });
    } catch (analyticsError) {
      // Don't fail the parsing if analytics fails
      console.error("Failed to record resume parsing analytics:", analyticsError);
    }
    
    return { parsedData, usage: { requestTokens, responseTokens }, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error("AI parsing error:", error);
    
    // Get userId for error analytics
    let userId = "system";
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        userId = identity.subject;
      }
    } catch (authError) {
      // User not authenticated
    }
    
    // Record error analytics
    try {
      await ctx.runMutation(internal.resumeParsingAnalytics.recordAnalytics, {
        resumeId: resumeId as any,
        filename: filename,
        userId: userId,
        inputText: resumeText,
        outputJson: "",
        model: "gpt-5-mini",
        provider: "openai",
        requestTokens: 0,
        responseTokens: 0,
        isError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
        parserType: "ai",
      });
    } catch (analyticsError) {
      console.error("Failed to record error analytics:", analyticsError);
    }
    
    throw new Error(`AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse a resume file using AI agent
 * This is a separate parser from the regex-based parser for beta testing
 */
export const parseResumeFileWithAI = action({
  args: {
    fileData: v.string(), // base64-encoded file data
    filename: v.string(),
  },
  handler: async (ctx, { fileData, filename }) => {
    try {
      // Decode base64 data
      const buffer = Buffer.from(fileData, 'base64');
      
      // Extract text based on file type
      let extractedText = '';
      const fileExt = filename.toLowerCase().split('.').pop();
      
      if (fileExt === 'docx' || fileExt === 'doc') {
        extractedText = await extractTextFromDocx(buffer);
      } else if (fileExt === 'pdf') {
        extractedText = await extractTextFromPDF(buffer);
      } else {
        throw new Error(`Unsupported file type: ${fileExt}. Only .docx, .doc, and .pdf files are supported.`);
      }
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text content could be extracted from the document');
      }
      
      // Extract basic info (minimal PII for matching)
      const basicInfo = extractBasicInfo(extractedText);
      const yearsOfExperience = extractYearsOfExperience(extractedText);
      
      // Parse resume text with AI agent
      const aiResult = await parseResumeWithAIAgent(ctx, extractedText, filename);
      const aiParsedData = aiResult.parsedData;
      
      // Combine AI parsed data with basic info
      const parsedData = {
        filename: filename,
        originalText: extractedText,
        personalInfo: {
          firstName: basicInfo.name[0] || "",
          middleName: basicInfo.name[1] || "",
          lastName: basicInfo.name[2] || "",
          email: basicInfo.email,
          phone: basicInfo.phone,
          yearsOfExperience: yearsOfExperience,
        },
        professionalSummary: aiParsedData.professionalSummary || "",
        education: aiParsedData.education || [],
        experience: aiParsedData.experience || [],
        skills: aiParsedData.skills || [],
        certifications: aiParsedData.certifications || "",
        professionalMemberships: aiParsedData.professionalMemberships || "",
        securityClearance: aiParsedData.securityClearance || "",
        // Mark this as AI-parsed for tracking
        sectionData: {
          experience: {
            sectionType: "experience",
            rawText: extractedText,
            extractedBy: "AI-Agent-GPT-5-mini",
            extractionConfidence: 0.9,
            parsedData: aiParsedData.experience,
          },
          skills: {
            sectionType: "skills",
            rawText: extractedText,
            extractedBy: "AI-Agent-GPT-5-mini",
            extractionConfidence: 0.9,
            parsedData: aiParsedData.skills,
          },
        },
      };
      
      return {
        success: true,
        data: parsedData,
      };
    } catch (error) {
      console.error("Error parsing resume file with AI:", error);
      throw new Error(`Failed to parse resume file with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

/**
 * Parse resume text directly (for re-parsing existing resumes)
 */
export const parseResumeTextWithAI = action({
  args: {
    resumeText: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, { resumeText, filename = "resume.txt" }) => {
    try {
      if (!resumeText || resumeText.trim().length === 0) {
        throw new Error('Resume text is empty');
      }
      
      // Extract basic info
      const basicInfo = extractBasicInfo(resumeText);
      const yearsOfExperience = extractYearsOfExperience(resumeText);
      
      // Parse with AI agent
      const aiResult = await parseResumeWithAIAgent(ctx, resumeText, filename);
      const aiParsedData = aiResult.parsedData;
      
      // Combine data
      const parsedData = {
        filename: filename,
        originalText: resumeText,
        personalInfo: {
          firstName: basicInfo.name[0] || "",
          middleName: basicInfo.name[1] || "",
          lastName: basicInfo.name[2] || "",
          email: basicInfo.email,
          phone: basicInfo.phone,
          yearsOfExperience: yearsOfExperience,
        },
        professionalSummary: aiParsedData.professionalSummary || "",
        education: aiParsedData.education || [],
        experience: aiParsedData.experience || [],
        skills: aiParsedData.skills || [],
        certifications: aiParsedData.certifications || "",
        professionalMemberships: aiParsedData.professionalMemberships || "",
        securityClearance: aiParsedData.securityClearance || "",
        sectionData: {
          experience: {
            sectionType: "experience",
            rawText: resumeText,
            extractedBy: "AI-Agent-GPT-5-mini",
            extractionConfidence: 0.9,
            parsedData: aiParsedData.experience,
          },
          skills: {
            sectionType: "skills",
            rawText: resumeText,
            extractedBy: "AI-Agent-GPT-5-mini",
            extractionConfidence: 0.9,
            parsedData: aiParsedData.skills,
          },
        },
      };
      
      return {
        success: true,
        data: parsedData,
      };
    } catch (error) {
      console.error("Error parsing resume text with AI:", error);
      throw new Error(`Failed to parse resume text with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});
