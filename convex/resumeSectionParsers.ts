/**
 * Section parsers for resume parsing
 * Parses raw section text into structured data
 */

import {
  SectionParser,
  SectionParseResult,
  ResumeSectionType,
} from "./resumeSectionTypes";
import {
  parseExperienceWithHandlers,
  ExperienceEntry,
  TabSeparatedFormatHandler,
  CommaSeparatedFormatHandler,
  InlineFormatHandler,
  MultiLineFormatHandler,
} from "./resumeFormatHandlers";

/**
 * Experience parser
 * Uses existing format handlers to parse experience entries
 */
export class ExperienceParser implements SectionParser<ExperienceEntry[]> {
  name = "ExperienceParser";
  private handlers = [
    new TabSeparatedFormatHandler(),
    new CommaSeparatedFormatHandler(),
    new InlineFormatHandler(),
    new MultiLineFormatHandler(),
  ];

  parse(rawText: string, sectionType: ResumeSectionType): SectionParseResult<ExperienceEntry[]> {
    try {
      // Use the existing parseExperienceWithHandlers function
      // But we need to pass the raw text directly, not extract section again
      const experiences = this.parseExperienceFromText(rawText);
      
      return {
        parsedData: experiences,
        confidence: experiences.length > 0 ? 0.9 : 0.3,
      };
    } catch (error) {
      return {
        parsedData: [],
        parseErrors: [error instanceof Error ? error.message : 'Unknown parsing error'],
        confidence: 0.0,
      };
    }
  }

  /**
   * Parse experience from raw text (already extracted section)
   */
  private parseExperienceFromText(text: string): ExperienceEntry[] {
    const lines = text.split('\n');
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
      for (const handler of this.handlers) {
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
}

/**
 * Improved skills parser with structure awareness
 * Handles various skill formats: comma-separated, bullet lists, categorized, etc.
 */
export class SkillsParser implements SectionParser<string[]> {
  name = "SkillsParser";

  parse(rawText: string, sectionType: ResumeSectionType): SectionParseResult<string[]> {
    try {
      const skills = this.parseSkillsFromText(rawText);
      
      return {
        parsedData: skills,
        confidence: skills.length > 0 ? 0.9 : 0.3,
      };
    } catch (error) {
      return {
        parsedData: [],
        parseErrors: [error instanceof Error ? error.message : 'Unknown parsing error'],
        confidence: 0.0,
      };
    }
  }

  /**
   * Parse skills from raw text with structure awareness
   */
  private parseSkillsFromText(text: string): string[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return [];
    }

    const allSkills: string[] = [];

    // Check for categorized format (e.g., "Programming: Java, Python")
    const categorizedPattern = /^([^:]+):\s*(.+)$/;
    
    // Check for bullet list format
    const isBulletList = lines.some(line => /^(•|-|\*)\s+/.test(line));
    
    // Check for comma/semicolon separated format
    const isDelimited = lines.some(line => /[,;]/.test(line));

    for (const line of lines) {
      // Handle categorized format
      const categoryMatch = line.match(categorizedPattern);
      if (categoryMatch) {
        const category = categoryMatch[1].trim();
        const skillsInCategory = this.splitSkills(categoryMatch[2]);
        // Optionally include category name, but for now just add skills
        allSkills.push(...skillsInCategory);
        continue;
      }

      // Handle bullet list
      if (isBulletList && /^(•|-|\*)\s+/.test(line)) {
        const skill = line.replace(/^(•|-|\*)\s+/, '').trim();
        if (skill) {
          // Check if bullet item contains multiple skills (comma-separated)
          const skills = this.splitSkills(skill);
          allSkills.push(...skills);
        }
        continue;
      }

      // Handle delimited format (comma or semicolon)
      if (isDelimited && /[,;]/.test(line)) {
        const skills = this.splitSkills(line);
        allSkills.push(...skills);
        continue;
      }

      // Single skill per line
      if (line.length > 1) {
        allSkills.push(line);
      }
    }

    // Clean and deduplicate skills
    const cleanedSkills = this.cleanSkills(allSkills);
    
    return cleanedSkills.slice(0, 50); // Limit to 50 skills
  }

  /**
   * Split a string into individual skills by delimiters
   */
  private splitSkills(text: string): string[] {
    // Try comma first, then semicolon
    if (text.includes(',')) {
      return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    if (text.includes(';')) {
      return text.split(';').map(s => s.trim()).filter(s => s.length > 0);
    }
    return [text.trim()].filter(s => s.length > 0);
  }

  /**
   * Clean and deduplicate skills
   */
  private cleanSkills(skills: string[]): string[] {
    const cleaned: string[] = [];
    const seen = new Set<string>();

    for (const skill of skills) {
      const trimmed = skill.trim();
      
      // Skip if too short or empty
      if (trimmed.length < 2) {
        continue;
      }

      // Remove bullet points if still present
      const cleanedSkill = trimmed.replace(/^(•|-|\*)\s*/, '').trim();
      
      // Skip if empty after cleaning
      if (!cleanedSkill) {
        continue;
      }

      // Normalize for deduplication (case-insensitive)
      const normalized = cleanedSkill.toLowerCase();
      
      // Skip duplicates
      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      cleaned.push(cleanedSkill);
    }

    return cleaned;
  }
}

/**
 * Education parser (basic implementation)
 */
export class EducationParser implements SectionParser<string[]> {
  name = "EducationParser";

  parse(rawText: string, sectionType: ResumeSectionType): SectionParseResult<string[]> {
    try {
      const lines = rawText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      return {
        parsedData: lines.slice(0, 10), // Limit to 10 entries
        confidence: lines.length > 0 ? 0.8 : 0.3,
      };
    } catch (error) {
      return {
        parsedData: [],
        parseErrors: [error instanceof Error ? error.message : 'Unknown parsing error'],
        confidence: 0.0,
      };
    }
  }
}

/**
 * Helper function to parse section data using a parser
 */
export function parseSectionData<T>(
  rawText: string,
  sectionType: ResumeSectionType,
  parser: SectionParser<T>
): SectionParseResult<T> {
  return parser.parse(rawText, sectionType);
}
