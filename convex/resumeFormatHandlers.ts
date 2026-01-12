/**
 * Format-Agnostic Resume Experience Parser
 * 
 * Uses Strategy Pattern to support multiple resume formats through pluggable handlers.
 * Each handler can detect and parse a specific format, making the parser extensible.
 */

// Experience entry structure
export interface ExperienceEntry {
  title: string;
  company: string;
  location: string;
  duration: string;
  responsibilities: string[];
}

// Format handler interface
export interface ExperienceFormatHandler {
  canHandle(lines: string[], startIndex: number): boolean;
  parse(lines: string[], startIndex: number): { experience: ExperienceEntry; nextIndex: number };
}

// Utility functions for field extraction
export function hasDatePattern(text: string): boolean {
  const datePatterns = [
    /\d{4}/,  // Year
    /\d{1,2}\/\d{4}/,  // MM/YYYY
    /\d{1,2}-\d{4}/,  // MM-YYYY
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s-]+\d{4}/i,  // Month Year
    /\d{4}[\s-]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,  // Year Month
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s-]+\d{4}[\s-]+(?:to|–|-|current|present)/i,  // Date range
    /(current|present|ongoing)/i,  // Current position
  ];
  return datePatterns.some(pattern => pattern.test(text));
}

export function extractDuration(text: string): string | null {
  const datePatterns = [
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s-]+\d{4}[\s-]+(?:to|–|-|current|present)/i,
    /\d{4}[\s-]+(?:to|–|-|current|present)/i,
    /(current|present|ongoing)/i,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s-]+\d{4}/i,
    /\d{1,2}\/\d{4}/,
    /\d{4}/,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

export function isCompanyName(text: string): boolean {
  // Heuristic: company names are usually:
  // - Capitalized words
  // - Don't contain date patterns
  // - Not too long (usually 2-5 words)
  // - Don't start with action verbs
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return false;
  
  // Check if it contains dates (not a company name)
  if (hasDatePattern(trimmed)) return false;
  
  // Check if it starts with action verbs (likely a responsibility)
  if (trimmed.match(/^(Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible|Began|Migrated|Pitched|Implemented)/i)) {
    return false;
  }
  
  // Check if it's a bullet point
  if (trimmed.match(/^(•|-|\*)/)) return false;
  
  // Check if it looks like a company name (capitalized, reasonable length)
  const words = trimmed.split(/\s+/);
  if (words.length > 6) return false;  // Too long for a company name
  
  // Most words should be capitalized (allowing for "Inc", "LLC", etc.)
  const capitalizedWords = words.filter(w => /^[A-Z]/.test(w) || /^(Inc|LLC|Corp|Ltd|Co)$/i.test(w));
  return capitalizedWords.length >= words.length * 0.6;  // At least 60% capitalized
}

export function isNewJobEntry(lines: string[], index: number): boolean {
  if (index >= lines.length) return false;
  const line = lines[index].trim();
  if (!line) return false;
  
  // Check if this looks like a job title (capitalized, not a bullet, not an action verb)
  return line.match(/^[A-Z][^•\n]{10,}/) !== null && 
         !line.match(/^(•|-|\*|Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible)/);
}

/**
 * Tab-Separated Format Handler
 * Handles format: "Job Title\tDuration" on one line, "Company Name" on next
 * Also handles space-separated format when tabs are converted to spaces during DOCX extraction
 */
export class TabSeparatedFormatHandler implements ExperienceFormatHandler {
  canHandle(lines: string[], startIndex: number): boolean {
    if (startIndex >= lines.length) return false;
    const line = lines[startIndex].trim();
    
    // Check if line contains tab or multiple spaces (2+) and has date pattern
    const hasTab = /\t/.test(line);
    const hasMultipleSpaces = /\s{2,}/.test(line);
    const hasDate = hasDatePattern(line);
    
    return (hasTab || hasMultipleSpaces) && hasDate;
  }
  
  parse(lines: string[], startIndex: number): { experience: ExperienceEntry; nextIndex: number } {
    const titleLine = lines[startIndex].trim();
    
    // Split by tab first, if no tab then split by multiple spaces (2+)
    let parts: string[];
    if (/\t/.test(titleLine)) {
      parts = titleLine.split('\t');
    } else {
      // Split by 2+ spaces (treat as tab replacement)
      parts = titleLine.split(/\s{2,}/);
    }
    
    const title = parts[0].trim();
    const duration = parts.slice(1).join(' ').trim();
    
    // Next line should be company
    let company = '';
    let nextIndex = startIndex + 1;
    if (nextIndex < lines.length) {
      const companyLine = lines[nextIndex].trim();
      if (companyLine && !hasDatePattern(companyLine) && !companyLine.match(/^(•|-|\*)/)) {
        company = companyLine;
        nextIndex++;
      }
    }
    
    // Find responsibilities (lines starting with bullets or action verbs)
    const responsibilities: string[] = [];
    while (nextIndex < lines.length) {
      const line = lines[nextIndex].trim();
      if (!line) {
        nextIndex++;
        continue;
      }
      
      // Check if this is a new job entry
      if (isNewJobEntry(lines, nextIndex)) {
        break;
      }
      
      // Check if this is a responsibility
      if (line.match(/^(•|-|\*|Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible|Began|Migrated|Pitched)/i)) {
        responsibilities.push(line.replace(/^(•|-|\*)\s*/, ''));
        nextIndex++;
      } else if (hasDatePattern(line) && !duration) {
        // Might be a duration line if we don't have one yet
        nextIndex++;
      } else {
        // Unknown line, skip it
        nextIndex++;
      }
    }
    
    return {
      experience: { title, company, location: '', duration, responsibilities },
      nextIndex
    };
  }
}

/**
 * Comma-Separated Format Handler
 * Handles format: "Job Title" on one line, "Company, Location" on next
 */
export class CommaSeparatedFormatHandler implements ExperienceFormatHandler {
  canHandle(lines: string[], startIndex: number): boolean {
    if (startIndex >= lines.length) return false;
    const line = lines[startIndex].trim();
    
    // Check if this looks like a job title
    if (!line.match(/^[A-Z][^•\n]{10,}/) || line.match(/^(•|-|\*|Designed|Developed|Managed)/)) {
      return false;
    }
    
    // Check if next line has comma (company, location format)
    if (startIndex + 1 < lines.length) {
      const nextLine = lines[startIndex + 1].trim();
      return nextLine.includes(',');
    }
    
    return false;
  }
  
  parse(lines: string[], startIndex: number): { experience: ExperienceEntry; nextIndex: number } {
    const title = lines[startIndex].trim();
    let company = '';
    let location = '';
    let duration = '';
    let nextIndex = startIndex + 1;
    
    // Parse company/location line
    if (nextIndex < lines.length) {
      const companyLine = lines[nextIndex].trim();
      if (companyLine.includes(',')) {
        const parts = companyLine.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          company = parts[0];
          location = parts[1];
          if (parts.length >= 3) {
            duration = parts[2];
          }
        } else if (parts.length === 1) {
          company = parts[0];
        }
        nextIndex++;
      }
    }
    
    // Check if next line is a duration line
    if (nextIndex < lines.length && !duration) {
      const durationLine = lines[nextIndex].trim();
      if (hasDatePattern(durationLine) && !durationLine.includes(',')) {
        duration = durationLine;
        nextIndex++;
      }
    }
    
    // Find responsibilities
    const responsibilities: string[] = [];
    while (nextIndex < lines.length) {
      const line = lines[nextIndex].trim();
      if (!line) {
        nextIndex++;
        continue;
      }
      
      // Check if this is a new job entry
      if (isNewJobEntry(lines, nextIndex)) {
        break;
      }
      
      // Check if this is a responsibility
      if (line.match(/^(•|-|\*|Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible|Began|Migrated|Pitched)/i)) {
        responsibilities.push(line.replace(/^(•|-|\*)\s*/, ''));
        nextIndex++;
      } else {
        // Unknown line, skip it
        nextIndex++;
      }
    }
    
    return {
      experience: { title, company, location, duration, responsibilities },
      nextIndex
    };
  }
}

/**
 * Inline Format Handler
 * Handles format: "Job Title at Company (Duration)" all on one line
 */
export class InlineFormatHandler implements ExperienceFormatHandler {
  canHandle(lines: string[], startIndex: number): boolean {
    if (startIndex >= lines.length) return false;
    const line = lines[startIndex].trim();
    
    // Check for "at Company" or "(Duration)" patterns
    return / at /.test(line) || /\([^)]*\)/.test(line);
  }
  
  parse(lines: string[], startIndex: number): { experience: ExperienceEntry; nextIndex: number } {
    const line = lines[startIndex].trim();
    let title = line;
    let company = '';
    let duration = '';
    
    // Extract "at Company" pattern
    const atMatch = line.match(/\s+at\s+([^(\n]+)/i);
    if (atMatch) {
      company = atMatch[1].trim();
      title = line.substring(0, atMatch.index).trim();
    }
    
    // Extract duration from parentheses
    const durationMatch = line.match(/\(([^)]+)\)/);
    if (durationMatch) {
      duration = durationMatch[1].trim();
    }
    
    // If title still contains the full line, try to clean it
    if (title === line) {
      // Remove company and duration from title
      title = line.replace(/\s+at\s+[^(\n]+/i, '').replace(/\([^)]*\)/, '').trim();
    }
    
    let nextIndex = startIndex + 1;
    
    // Find responsibilities
    const responsibilities: string[] = [];
    while (nextIndex < lines.length) {
      const line = lines[nextIndex].trim();
      if (!line) {
        nextIndex++;
        continue;
      }
      
      // Check if this is a new job entry
      if (isNewJobEntry(lines, nextIndex)) {
        break;
      }
      
      // Check if this is a responsibility
      if (line.match(/^(•|-|\*|Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible|Began|Migrated|Pitched)/i)) {
        responsibilities.push(line.replace(/^(•|-|\*)\s*/, ''));
        nextIndex++;
      } else {
        // Unknown line, skip it
        nextIndex++;
      }
    }
    
    return {
      experience: { title, company, location: '', duration, responsibilities },
      nextIndex
    };
  }
}

/**
 * Multi-Line Format Handler (Flexible Fallback)
 * Tries to extract company/duration from next 2-3 lines using heuristics
 */
export class MultiLineFormatHandler implements ExperienceFormatHandler {
  canHandle(lines: string[], startIndex: number): boolean {
    if (startIndex >= lines.length) return false;
    const line = lines[startIndex].trim();
    
    // This is a fallback handler - it can handle any line that looks like a job title
    return line.match(/^[A-Z][^•\n]{10,}/) !== null && 
           !line.match(/^(•|-|\*|Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible)/);
  }
  
  parse(lines: string[], startIndex: number): { experience: ExperienceEntry; nextIndex: number } {
    const title = lines[startIndex].trim();
    let company = '';
    let location = '';
    let duration = '';
    let nextIndex = startIndex + 1;
    
    // Try to extract company and duration from next 2-3 lines
    const lookAheadLines = 3;
    for (let i = 0; i < lookAheadLines && nextIndex + i < lines.length; i++) {
      const line = lines[nextIndex + i].trim();
      if (!line) continue;
      
      // Skip if it's a responsibility
      if (line.match(/^(•|-|\*|Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible|Began|Migrated|Pitched)/i)) {
        break;
      }
      
      // Check if this is a new job entry
      if (isNewJobEntry(lines, nextIndex + i)) {
        break;
      }
      
      // Check if this looks like a duration
      if (!duration && hasDatePattern(line)) {
        duration = line;
        continue;
      }
      
      // Check if this looks like a company name
      if (!company && isCompanyName(line)) {
        company = line;
        continue;
      }
      
      // Check if this has comma (might be company, location)
      if (!company && line.includes(',')) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 1) {
          company = parts[0];
          if (parts.length >= 2 && !hasDatePattern(parts[1])) {
            location = parts[1];
          }
        }
      }
    }
    
    // Advance past the lines we've processed
    if (company || duration) {
      nextIndex += 1;  // At least skip the first line after title
      if (duration && nextIndex < lines.length && lines[nextIndex].trim() === duration) {
        nextIndex++;
      }
      if (company && nextIndex < lines.length && lines[nextIndex].trim() === company) {
        nextIndex++;
      }
    }
    
    // Find responsibilities
    const responsibilities: string[] = [];
    while (nextIndex < lines.length) {
      const line = lines[nextIndex].trim();
      if (!line) {
        nextIndex++;
        continue;
      }
      
      // Check if this is a new job entry
      if (isNewJobEntry(lines, nextIndex)) {
        break;
      }
      
      // Check if this is a responsibility
      if (line.match(/^(•|-|\*|Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible|Began|Migrated|Pitched)/i)) {
        responsibilities.push(line.replace(/^(•|-|\*)\s*/, ''));
        nextIndex++;
      } else if (hasDatePattern(line) && !duration) {
        // Might be a duration line if we don't have one yet
        duration = line;
        nextIndex++;
      } else if (isCompanyName(line) && !company) {
        // Might be a company name if we don't have one yet
        company = line;
        nextIndex++;
      } else {
        // Unknown line, skip it
        nextIndex++;
      }
    }
    
    return {
      experience: { title, company, location, duration, responsibilities },
      nextIndex
    };
  }
}

/**
 * Format Detector/Orchestrator
 * Tries handlers in sequence until one succeeds
 */
export function parseExperienceWithHandlers(
  text: string,
  handlers: ExperienceFormatHandler[]
): ExperienceEntry[] {
  const expSection = extractSection(text, ['experience', 'work experience', 'professional experience', 'employment history']);
  if (!expSection) {
    return [];
  }
  
  const lines = expSection.split('\n');
  const experiences: ExperienceEntry[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    
    // Try each handler in sequence until one succeeds
    let parsed = false;
    for (const handler of handlers) {
      if (handler.canHandle(lines, i)) {
        try {
          const result = handler.parse(lines, i);
          experiences.push(result.experience);
          i = result.nextIndex;
          parsed = true;
          break;
        } catch (error) {
          // Handler failed, try next one
          console.warn(`Handler failed for line ${i}:`, error);
          continue;
        }
      }
    }
    
    // If no handler matched, skip line and continue
    if (!parsed) {
      i++;
    }
  }
  
  return experiences;
}

// Helper function to extract section (reused from main parser)
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
