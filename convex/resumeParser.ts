"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import mammoth from "mammoth";

/**
 * Parse a resume file (DOCX/PDF) using TypeScript without AI
 * This avoids PII bleeding to AI services by using local text extraction and regex parsing
 */

// Extract text from DOCX using mammoth
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract text from PDF using pdf-parse
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

// Extract email address from text
function extractEmail(text: string): string {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const match = text.match(emailPattern);
  return match ? match[0] : "";
}

// Extract phone number from text
function extractPhone(text: string): string {
  const phonePatterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,  // (123) 456-7890 or 123-456-7890
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,  // 123-456-7890
    /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,  // International
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return "";
}

// Extract name from the first few lines of text
function extractName(text: string): [string, string, string] {
  const lines = text.split('\n').slice(0, 5);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.match(/^(Email:|Phone:|Address:|Summary:|Objective:)/i)) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2 && parts.length <= 4) {
        if (parts.length === 2) {
          return [parts[0], "", parts[1]];
        } else if (parts.length === 3) {
          return [parts[0], parts[1], parts[2]];
        } else if (parts.length === 4) {
          return [parts[0], parts[1], `${parts[2]} ${parts[3]}`];
        }
      }
    }
  }
  return ["", "", ""];
}

// Extract years of experience from text
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
  
  // Fallback: count experience entries
  const expSection = extractSection(text, ['experience', 'work experience', 'professional experience', 'employment']);
  if (expSection) {
    const lines = expSection.split('\n');
    let count = 0;
    for (const line of lines) {
      if (line.trim().match(/^[A-Z][^•\n]{10,}/)) {
        count++;
      }
    }
    return Math.min(count, 30); // Cap at 30
  }
  
  return 0;
}

// Extract a section from text by looking for section headers
function extractSection(text: string, sectionNames: string[]): string {
  for (const sectionName of sectionNames) {
    const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^(${escaped})\\s*:?\\s*$`, 'im');
    const match = text.match(pattern);
    if (match) {
      const start = match.index! + match[0].length;
      const remainingText = text.substring(start);
      const nextSectionPattern = /^(?:SUMMARY|OBJECTIVE|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS|PROJECTS|AWARDS|REFERENCES)\s*:?\s*$/im;
      const nextMatch = remainingText.match(nextSectionPattern);
      const end = nextMatch ? start + nextMatch.index! : text.length;
      return text.substring(start, end).trim();
    }
  }
  return "";
}

// Import new section extraction and parsing abstractions
import {
  RegexSectionExtractor,
  LineBasedSectionExtractor,
  extractSectionData,
} from "./resumeSectionExtractors";
import {
  ExperienceParser,
  SkillsParser,
  EducationParser,
  parseSectionData,
} from "./resumeSectionParsers";
import {
  ResumeSectionData,
} from "./resumeSectionTypes";

// Extract and parse experience section using new abstractions
function parseExperience(text: string): {
  experience: Array<{
    title: string;
    company: string;
    location: string;
    duration: string;
    responsibilities: string[];
  }>;
  sectionData?: ResumeSectionData;
} {
  const extractors = [
    new RegexSectionExtractor(),
    new LineBasedSectionExtractor(),
  ];
  
  const extractionResult = extractSectionData(text, 'experience', extractors);
  
  if (!extractionResult) {
    return { experience: [] };
  }
  
  const parser = new ExperienceParser();
  const parseResult = parseSectionData(extractionResult.rawText, 'experience', parser);
  
  const sectionData: ResumeSectionData = {
    sectionType: 'experience',
    rawText: extractionResult.rawText,
    extractedBy: extractionResult.extractedBy,
    extractionConfidence: extractionResult.confidence,
    parsedData: parseResult.parsedData,
    parseErrors: parseResult.parseErrors,
    parseConfidence: parseResult.confidence,
    startIndex: extractionResult.startIndex,
    endIndex: extractionResult.endIndex,
  };
  
  return {
    experience: parseResult.parsedData || [],
    sectionData,
  };
}

// Extract and parse skills section using new abstractions
function parseSkills(text: string): {
  skills: string[];
  sectionData?: ResumeSectionData;
} {
  const extractors = [
    new RegexSectionExtractor(),
    new LineBasedSectionExtractor(),
  ];
  
  const extractionResult = extractSectionData(text, 'skills', extractors);
  
  if (!extractionResult) {
    return { skills: [] };
  }
  
  const parser = new SkillsParser();
  const parseResult = parseSectionData(extractionResult.rawText, 'skills', parser);
  
  const sectionData: ResumeSectionData = {
    sectionType: 'skills',
    rawText: extractionResult.rawText,
    extractedBy: extractionResult.extractedBy,
    extractionConfidence: extractionResult.confidence,
    parsedData: parseResult.parsedData,
    parseErrors: parseResult.parseErrors,
    parseConfidence: parseResult.confidence,
    startIndex: extractionResult.startIndex,
    endIndex: extractionResult.endIndex,
  };
  
  return {
    skills: parseResult.parsedData || [],
    sectionData,
  };
}

// Extract and parse education section using new abstractions
function parseEducation(text: string): {
  education: string[];
  sectionData?: ResumeSectionData;
} {
  const extractors = [
    new RegexSectionExtractor(),
    new LineBasedSectionExtractor(),
  ];
  
  const extractionResult = extractSectionData(text, 'education', extractors);
  
  if (!extractionResult) {
    return { education: [] };
  }
  
  const parser = new EducationParser();
  const parseResult = parseSectionData(extractionResult.rawText, 'education', parser);
  
  const sectionData: ResumeSectionData = {
    sectionType: 'education',
    rawText: extractionResult.rawText,
    extractedBy: extractionResult.extractedBy,
    extractionConfidence: extractionResult.confidence,
    parsedData: parseResult.parsedData,
    parseErrors: parseResult.parseErrors,
    parseConfidence: parseResult.confidence,
    startIndex: extractionResult.startIndex,
    endIndex: extractionResult.endIndex,
  };
  
  return {
    education: parseResult.parsedData || [],
    sectionData,
  };
}

// Parse resume text into structured format
function parseResume(text: string, filename: string): any {
  // Extract personal info
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const [firstName, middleName, lastName] = extractName(text);
  const yearsOfExperience = extractYearsOfExperience(text);
  
  // Extract sections using new abstractions
  let professionalSummary = extractSection(text, ['summary', 'professional summary', 'objective', 'profile']);
  if (!professionalSummary) {
    // Try to get first paragraph if no summary section
    const lines = text.split('\n').slice(0, 10);
    professionalSummary = lines
      .map(l => l.trim())
      .filter(l => l && !l.match(/^(Email:|Phone:|Address:)/i))
      .join(' ')
      .substring(0, 500);
  }
  
  const educationResult = parseEducation(text);
  const experienceResult = parseExperience(text);
  const skillsResult = parseSkills(text);
  
  // Extract other sections (still using old method for now)
  const certifications = extractSection(text, ['certifications', 'certification', 'training', 'certificates']);
  const professionalMemberships = extractSection(text, ['memberships', 'professional memberships', 'affiliations']);
  const securityClearance = extractSection(text, ['security clearance', 'clearance']);
  
  return {
    filename: filename,
    originalText: text,
    personalInfo: {
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      email: email,
      phone: phone,
      yearsOfExperience: yearsOfExperience
    },
    professionalSummary: professionalSummary.substring(0, 1000), // Limit length
    education: educationResult.education,
    experience: experienceResult.experience,
    skills: skillsResult.skills,
    certifications: certifications.substring(0, 500),
    professionalMemberships: professionalMemberships.substring(0, 500),
    securityClearance: securityClearance.substring(0, 200),
    // Include raw section data for debugging
    sectionData: {
      experience: experienceResult.sectionData,
      skills: skillsResult.sectionData,
      education: educationResult.sectionData,
    }
  };
}

/**
 * Parse a resume file (DOCX/PDF) using TypeScript without AI
 * This avoids PII bleeding to AI services by using local text extraction and regex parsing
 */
export const parseResumeFile = action({
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
      
      // Parse the resume text
      const parsedData = parseResume(extractedText, filename);
      
      return {
        success: true,
        data: parsedData,
      };
    } catch (error) {
      console.error("Error parsing resume file:", error);
      throw new Error(`Failed to parse resume file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});
