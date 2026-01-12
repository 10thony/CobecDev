/**
 * Section extractors for resume parsing
 * Implements multiple strategies for extracting raw section text from resumes
 */

import {
  SectionExtractor,
  SectionExtractionResult,
  ResumeSectionType,
  SECTION_NAMES,
} from "./resumeSectionTypes";

/**
 * Regex-based section extractor (current approach)
 * Finds sections by matching section header patterns
 */
export class RegexSectionExtractor implements SectionExtractor {
  name = "RegexSectionExtractor";

  extract(text: string, sectionType: ResumeSectionType): SectionExtractionResult | null {
    const sectionNames = SECTION_NAMES[sectionType];
    
    for (const sectionName of sectionNames) {
      const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`^(${escaped})\\s*:?\\s*$`, 'im');
      const match = text.match(pattern);
      
      if (match) {
        const start = match.index! + match[0].length;
        const remainingText = text.substring(start);
        
        // Find the next section header to determine end
        const nextSectionPattern = /^(?:SUMMARY|OBJECTIVE|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS|PROJECTS|AWARDS|REFERENCES|PROFESSIONAL\s+EXPERIENCE|WORK\s+EXPERIENCE|EMPLOYMENT|CLEARANCE|SECURITY\s+CLEARANCE)\s*:?\s*$/im;
        const nextMatch = remainingText.match(nextSectionPattern);
        const end = nextMatch ? start + nextMatch.index! : text.length;
        
        const rawText = text.substring(start, end).trim();
        
        if (rawText.length > 0) {
          return {
            rawText,
            extractedBy: this.name,
            confidence: 0.9, // High confidence for explicit section headers
            startIndex: start,
            endIndex: end,
          };
        }
      }
    }
    
    return null;
  }
}

/**
 * Line-based section extractor
 * Finds sections by analyzing line patterns and content structure
 */
export class LineBasedSectionExtractor implements SectionExtractor {
  name = "LineBasedSectionExtractor";

  extract(text: string, sectionType: ResumeSectionType): SectionExtractionResult | null {
    const lines = text.split('\n');
    const sectionNames = SECTION_NAMES[sectionType];
    
    // Look for section header in lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line matches any section name
      for (const sectionName of sectionNames) {
        const normalizedLine = line.toLowerCase().replace(/[:\s]+$/, '');
        const normalizedSection = sectionName.toLowerCase();
        
        // Exact match or starts with section name
        if (normalizedLine === normalizedSection || 
            normalizedLine.startsWith(normalizedSection + ':') ||
            normalizedLine.startsWith(normalizedSection + ' ')) {
          
          // Collect lines until we hit another section or significant whitespace
          const sectionLines: string[] = [];
          let j = i + 1;
          
          while (j < lines.length) {
            const nextLine = lines[j].trim();
            
            // Stop if we hit another section header
            if (this.isSectionHeader(nextLine)) {
              break;
            }
            
            // Stop if we hit multiple blank lines (likely end of section)
            if (nextLine === '' && j + 1 < lines.length && lines[j + 1].trim() === '') {
              break;
            }
            
            // Add non-empty lines to section
            if (nextLine.length > 0) {
              sectionLines.push(nextLine);
            }
            
            j++;
          }
          
          if (sectionLines.length > 0) {
            const rawText = sectionLines.join('\n');
            const startIndex = text.indexOf(rawText);
            const endIndex = startIndex + rawText.length;
            
            return {
              rawText,
              extractedBy: this.name,
              confidence: 0.7, // Medium confidence for line-based detection
              startIndex,
              endIndex,
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Check if a line looks like a section header
   */
  private isSectionHeader(line: string): boolean {
    const upperLine = line.toUpperCase();
    const sectionHeaders = [
      'SUMMARY', 'OBJECTIVE', 'EXPERIENCE', 'EDUCATION', 'SKILLS',
      'CERTIFICATIONS', 'PROJECTS', 'AWARDS', 'REFERENCES',
      'PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT',
      'CLEARANCE', 'SECURITY CLEARANCE', 'PROFESSIONAL MEMBERSHIPS',
    ];
    
    return sectionHeaders.some(header => 
      upperLine === header || 
      upperLine.startsWith(header + ':') ||
      upperLine.startsWith(header + ' ')
    );
  }
}

/**
 * Hybrid section extractor
 * Tries multiple extractors in sequence until one succeeds
 */
export class HybridSectionExtractor implements SectionExtractor {
  name = "HybridSectionExtractor";
  private extractors: SectionExtractor[];

  constructor(extractors?: SectionExtractor[]) {
    // Default to regex and line-based extractors
    this.extractors = extractors || [
      new RegexSectionExtractor(),
      new LineBasedSectionExtractor(),
    ];
  }

  extract(text: string, sectionType: ResumeSectionType): SectionExtractionResult | null {
    // Try each extractor in order
    for (const extractor of this.extractors) {
      const result = extractor.extract(text, sectionType);
      if (result) {
        // Return result with hybrid extractor name but preserve original extractor name
        return {
          ...result,
          extractedBy: `${this.name}(${result.extractedBy})`,
        };
      }
    }
    
    return null;
  }
}

/**
 * Helper function to extract section data using a list of extractors
 */
export function extractSectionData(
  text: string,
  sectionType: ResumeSectionType,
  extractors: SectionExtractor[]
): SectionExtractionResult | null {
  const hybridExtractor = new HybridSectionExtractor(extractors);
  return hybridExtractor.extract(text, sectionType);
}
