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

// Parse work experience from text
function parseExperience(text: string): Array<{
  title: string;
  company: string;
  location: string;
  duration: string;
  responsibilities: string[];
}> {
  const expSection = extractSection(text, ['experience', 'work experience', 'professional experience', 'employment history']);
  if (!expSection) {
    return [];
  }
  
  const experiences: Array<{
    title: string;
    company: string;
    location: string;
    duration: string;
    responsibilities: string[];
  }> = [];
  
  const lines = expSection.split('\n');
  let currentExp: {
    title: string;
    company: string;
    location: string;
    duration: string;
    responsibilities: string[];
  } | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if this looks like a job title (usually capitalized, not a bullet)
    if (line.match(/^[A-Z][^•\n]{10,}/) && !line.match(/^(•|-|\*|Designed|Developed|Managed)/)) {
      // Save previous experience if exists
      if (currentExp) {
        experiences.push(currentExp);
      }
      
      // Start new experience
      currentExp = {
        title: line,
        company: "",
        location: "",
        duration: "",
        responsibilities: []
      };
      
      // Check next line for company/location
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.includes(',')) {
          const parts = nextLine.split(',').map(p => p.trim());
          if (parts.length >= 2) {
            currentExp.company = parts[0];
            currentExp.location = parts[1];
            if (parts.length >= 3) {
              currentExp.duration = parts[2];
            }
          } else if (parts.length === 1) {
            currentExp.company = parts[0];
          }
        } else if (nextLine.match(/\d{4}|\d{1,2}\/\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
          currentExp.duration = nextLine;
        }
      }
    } else if (currentExp) {
      // Check if this is a duration line
      if (line.match(/\d{4}|\d{1,2}\/\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
        if (!currentExp.duration) {
          currentExp.duration = line;
        }
      } else if (line.match(/^(•|-|\*|Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible)/i)) {
        // This is a responsibility
        currentExp.responsibilities.push(line.replace(/^(•|-|\*)\s*/, ''));
      }
    }
  }
  
  // Add last experience
  if (currentExp) {
    experiences.push(currentExp);
  }
  
  return experiences;
}

// Parse skills from text
function parseSkills(text: string): string[] {
  const skillsSection = extractSection(text, ['skills', 'technical skills', 'core competencies', 'key skills']);
  if (!skillsSection) {
    return [];
  }
  
  // Split by commas, semicolons, or newlines
  let skills: string[] = [];
  for (const delimiter of [',', ';', '\n']) {
    if (skillsSection.includes(delimiter)) {
      skills = skillsSection.split(delimiter).map(s => s.trim());
      break;
    }
  }
  
  if (skills.length === 0) {
    skills = [skillsSection.trim()];
  }
  
  // Clean up skills
  const cleanedSkills: string[] = [];
  for (const skill of skills) {
    const trimmed = skill.trim();
    if (trimmed && trimmed.length > 1) {
      // Remove bullet points
      cleanedSkills.push(trimmed.replace(/^(•|-|\*)\s*/, ''));
    }
  }
  
  return cleanedSkills.slice(0, 50); // Limit to 50 skills
}

// Parse education from text
function parseEducation(text: string): string[] {
  const eduSection = extractSection(text, ['education', 'academic background', 'qualifications']);
  if (!eduSection) {
    return [];
  }
  
  const lines = eduSection.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  return lines.slice(0, 10); // Limit to 10 entries
}

// Parse resume text into structured format
function parseResume(text: string, filename: string): any {
  // Extract personal info
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const [firstName, middleName, lastName] = extractName(text);
  const yearsOfExperience = extractYearsOfExperience(text);
  
  // Extract sections
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
  
  const education = parseEducation(text);
  const experience = parseExperience(text);
  const skills = parseSkills(text);
  
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
    education: education,
    experience: experience,
    skills: skills,
    certifications: certifications.substring(0, 500),
    professionalMemberships: professionalMemberships.substring(0, 500),
    securityClearance: securityClearance.substring(0, 200)
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
