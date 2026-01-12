/**
 * Type definitions for abstracted resume section extraction and parsing
 */

/**
 * Section types that can be extracted from a resume
 */
export type ResumeSectionType = 
  | 'experience' 
  | 'skills' 
  | 'education' 
  | 'summary' 
  | 'certifications' 
  | 'professionalMemberships' 
  | 'securityClearance';

/**
 * Result of section extraction
 */
export interface SectionExtractionResult {
  rawText: string;
  extractedBy: string;
  confidence: number; // 0-1, where 1 is highest confidence
  startIndex?: number; // Character index where section starts
  endIndex?: number; // Character index where section ends
}

/**
 * Result of section parsing
 */
export interface SectionParseResult<T = any> {
  parsedData: T;
  parseErrors?: string[];
  confidence?: number; // 0-1, where 1 is highest confidence
}

/**
 * Complete section data including both raw and parsed information
 */
export interface ResumeSectionData<T = any> {
  sectionType: ResumeSectionType;
  rawText: string;
  extractedBy: string;
  extractionConfidence: number;
  parsedData?: T;
  parseErrors?: string[];
  parseConfidence?: number;
  startIndex?: number;
  endIndex?: number;
}

/**
 * Section extractor interface
 * Implementations should extract raw text for a given section type
 */
export interface SectionExtractor {
  /**
   * Name of the extractor (for tracking which one succeeded)
   */
  name: string;
  
  /**
   * Attempt to extract a section from the resume text
   * @param text Full resume text
   * @param sectionType Type of section to extract
   * @returns Extraction result if successful, null otherwise
   */
  extract(text: string, sectionType: ResumeSectionType): SectionExtractionResult | null;
}

/**
 * Section parser interface
 * Implementations should parse raw section text into structured data
 */
export interface SectionParser<T = any> {
  /**
   * Name of the parser (for tracking which one succeeded)
   */
  name: string;
  
  /**
   * Parse raw section text into structured data
   * @param rawText Raw section text to parse
   * @param sectionType Type of section being parsed
   * @returns Parse result with structured data
   */
  parse(rawText: string, sectionType: ResumeSectionType): SectionParseResult<T>;
}

/**
 * Section names mapping for each section type
 */
export const SECTION_NAMES: Record<ResumeSectionType, string[]> = {
  experience: ['experience', 'work experience', 'professional experience', 'employment history', 'employment'],
  skills: ['skills', 'technical skills', 'core competencies', 'key skills', 'competencies'],
  education: ['education', 'academic background', 'qualifications', 'academic qualifications'],
  summary: ['summary', 'professional summary', 'objective', 'profile', 'overview'],
  certifications: ['certifications', 'certification', 'training', 'certificates', 'professional certifications'],
  professionalMemberships: ['memberships', 'professional memberships', 'affiliations', 'professional affiliations'],
  securityClearance: ['security clearance', 'clearance', 'security', 'clearance level'],
};
