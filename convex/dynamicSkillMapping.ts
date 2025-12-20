// Removed "use node" directive to allow both queries and actions

import { v } from "convex/values";
import { query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI for skill extraction and enhancement
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Skill categories for domain-specific organization
const SKILL_CATEGORIES = {
  PROGRAMMING_LANGUAGES: [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'go', 'rust',
    'scala', 'perl', 'haskell', 'elixir', 'clojure', 'f#', 'dart', 'r', 'matlab'
  ],
  WEB_TECHNOLOGIES: [
    'html', 'css', 'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt.js', 'node.js', 'express', 'django',
    'flask', 'spring', 'laravel', 'asp.net', 'jquery', 'bootstrap', 'tailwind', 'sass', 'less'
  ],
  MOBILE_DEVELOPMENT: [
    'ios', 'android', 'react native', 'flutter', 'xamarin', 'ionic', 'cordova', 'phonegap', 'swift ui',
    'kotlin multiplatform', 'xamarin.forms', 'capacitor'
  ],
  DATABASES: [
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'sql server', 'sqlite', 'dynamodb',
    'firebase', 'cassandra', 'neo4j', 'elasticsearch', 'influxdb'
  ],
  CLOUD_DEVOPS: [
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github', 'gitlab', 'bitbucket',
    'terraform', 'ansible', 'chef', 'puppet', 'circleci', 'travis ci', 'github actions'
  ],
  DATA_SCIENCE_AI: [
    'machine learning', 'ai', 'artificial intelligence', 'deep learning', 'neural networks', 'tensorflow',
    'pytorch', 'scikit-learn', 'pandas', 'numpy', 'matplotlib', 'seaborn', 'jupyter', 'r studio',
    'spark', 'hadoop', 'kafka', 'airflow'
  ],
  CYBERSECURITY: [
    'cybersecurity', 'penetration testing', 'ethical hacking', 'security analysis', 'vulnerability assessment',
    'incident response', 'threat hunting', 'siem', 'splunk', 'wireshark', 'metasploit', 'burp suite'
  ],
  PROJECT_MANAGEMENT: [
    'agile', 'scrum', 'kanban', 'project management', 'jira', 'confluence', 'asana', 'trello',
    'monday.com', 'basecamp', 'slack', 'microsoft teams'
  ],
  DOMAIN_SPECIFIC: [
    'aviation', 'safety', 'faa', 'government', 'security clearance', 'healthcare', 'finance',
    'e-commerce', 'gaming', 'iot', 'blockchain', 'vr', 'ar', 'robotics'
  ]
};

// Enhanced skill extraction with AI-powered discovery
export const extractSkillsWithAI = action({
  args: {
    text: v.string(),
    context: v.string(),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, { text, context, useAI = true }): Promise<{
    skills: string[];
    categories: Record<string, string[]>;
    confidence: number;
    aiEnhanced: boolean;
  }> => {
    if (!text || text.trim().length === 0) {
      return {
        skills: [],
        categories: {},
        confidence: 0,
        aiEnhanced: false
      };
    }

    try {
      let extractedSkills: string[] = [];
      let aiEnhanced = false;

      // Basic skill extraction using predefined categories
      const basicSkills = extractBasicSkills(text);
      extractedSkills = [...basicSkills];

      // AI-enhanced skill extraction if enabled
      if (useAI && process.env.GOOGLE_AI_API_KEY) {
        try {
          const aiSkills = await extractSkillsWithGemini(text, context as "resume" | "job_posting");
          extractedSkills = [...new Set([...extractedSkills, ...aiSkills])];
          aiEnhanced = true;
        } catch (error) {
          console.warn("AI skill extraction failed, falling back to basic extraction:", error);
        }
      }

      // Categorize skills
      const categorizedSkills = categorizeSkills(extractedSkills);

      // Calculate confidence based on extraction method and skill count
      const confidence = calculateExtractionConfidence(extractedSkills, aiEnhanced, text.length);

      return {
        skills: extractedSkills,
        categories: categorizedSkills,
        confidence,
        aiEnhanced
      };
    } catch (error) {
      console.error("Error in skill extraction:", error);
      return {
        skills: [],
        categories: {},
        confidence: 0,
        aiEnhanced: false
      };
    }
  },
});

/**
 * Get resumes for skill extraction (query function for actions to call)
 */
export const getResumesForSkills = query({
  args: {},
  handler: async (ctx): Promise<any[]> => {
    try {
      const resumes = await ctx.db.query("resumes").collect();
      return resumes;
    } catch (error) {
      console.error("Error getting resumes for skills:", error);
      return [];
    }
  },
});

/**
 * Get job postings for skill extraction (query function for actions to call)
 */
export const getJobPostingsForSkills = query({
  args: {},
  handler: async (ctx): Promise<any[]> => {
    try {
      const jobPostings = await ctx.db.query("jobpostings").collect();
      return jobPostings;
    } catch (error) {
      console.error("Error getting job postings for skills:", error);
      return [];
    }
  },
});

/**
 * Extract all skills from resumes database
 */
export const extractAllResumeSkills = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    try {
      const resumes = await ctx.runQuery(api.dynamicSkillMapping.getResumesForSkills, {});
      
      const allSkills = new Set<string>();
      const skillFrequency: Record<string, number> = {};
      const skillSources: Record<string, string[]> = {};

      for (const resume of resumes) {
        const skills = resume.extractedSkills || [];
        const searchableText = resume.completeSearchableText || resume.searchableText || "";
        
        // Add extracted skills
        skills.forEach((skill: any) => {
          allSkills.add(skill.toLowerCase());
          skillFrequency[skill.toLowerCase()] = (skillFrequency[skill.toLowerCase()] || 0) + 1;
          if (!skillSources[skill.toLowerCase()]) {
            skillSources[skill.toLowerCase()] = [];
          }
          skillSources[skill.toLowerCase()].push(resume.filename);
        });

        // Extract additional skills from searchable text if no extracted skills
        if (skills.length === 0 && searchableText) {
          const additionalSkills = extractBasicSkills(searchableText);
          additionalSkills.forEach((skill: any) => {
            allSkills.add(skill.toLowerCase());
            skillFrequency[skill.toLowerCase()] = (skillFrequency[skill.toLowerCase()] || 0) + 1;
            if (!skillSources[skill.toLowerCase()]) {
              skillSources[skill.toLowerCase()] = [];
            }
            skillSources[skill.toLowerCase()].push(resume.filename);
          });
        }
      }

      return {
        totalSkills: allSkills.size,
        skills: Array.from(allSkills),
        skillFrequency,
        skillSources,
        totalResumes: resumes.length,
        resumesWithSkills: resumes.filter((r: any) => (r.extractedSkills?.length || 0) > 0).length
      };
    } catch (error) {
      console.error("Error extracting resume skills:", error);
      throw error;
    }
  },
});

// Extract all skills from job postings database
export const extractAllJobSkills = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    try {
      const jobPostings = await ctx.runQuery(api.dynamicSkillMapping.getJobPostingsForSkills, {});
      
      const allSkills = new Set<string>();
      const skillFrequency: Record<string, number> = {};
      const skillSources: Record<string, string[]> = {};
      const skillByDepartment: Record<string, string[]> = {};

      for (const job of jobPostings) {
        const skills = job.extractedSkills || [];
        const searchableText = job.completeSearchableText || job.searchableText || "";
        
        // Add extracted skills
        skills.forEach((skill: any) => {
          allSkills.add(skill.toLowerCase());
          skillFrequency[skill.toLowerCase()] = (skillFrequency[skill.toLowerCase()] || 0) + 1;
          if (!skillSources[skill.toLowerCase()]) {
            skillSources[skill.toLowerCase()] = [];
          }
          skillSources[skill.toLowerCase()].push(job.jobTitle);
        });

        // Extract additional skills from searchable text if no extracted skills
        if (skills.length === 0 && searchableText) {
          const additionalSkills = extractBasicSkills(searchableText);
          additionalSkills.forEach((skill: any) => {
            allSkills.add(skill.toLowerCase());
            skillFrequency[skill.toLowerCase()] = (skillFrequency[skill.toLowerCase()] || 0) + 1;
            if (!skillSources[skill.toLowerCase()]) {
              skillSources[skill.toLowerCase()] = [];
            }
            skillSources[skill.toLowerCase()].push(job.jobTitle);
          });
        }

        // Group skills by department
        const department = job.department || 'Unknown';
        if (!skillByDepartment[department]) {
          skillByDepartment[department] = [];
        }
        skills.forEach((skill: any) => {
          if (!skillByDepartment[department].includes(skill.toLowerCase())) {
            skillByDepartment[department].push(skill.toLowerCase());
          }
        });
      }

      return {
        totalSkills: allSkills.size,
        skills: Array.from(allSkills),
        skillFrequency,
        skillSources,
        skillByDepartment,
        totalJobs: jobPostings.length,
        jobsWithSkills: jobPostings.filter((j: any) => (j.extractedSkills?.length || 0) > 0).length
      };
    } catch (error) {
      console.error("Error extracting job skills:", error);
      throw error;
    }
  },
});

// Build unified skill taxonomy from both collections
export const buildSkillTaxonomy = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    try {
      // Extract skills from both collections
      const resumeSkills = await ctx.runAction(api.dynamicSkillMapping.extractAllResumeSkills, {});
      const jobSkills = await ctx.runAction(api.dynamicSkillMapping.extractAllJobSkills, {});

      // Combine and deduplicate skills
      const allSkills = new Set([
        ...resumeSkills.skills,
        ...jobSkills.skills
      ]);

      // Build skill relationships and synonyms
      const skillRelationships = await buildSkillRelationships(Array.from(allSkills));
      
      // Categorize all skills
      const categorizedSkills = categorizeSkills(Array.from(allSkills));

      // Calculate skill demand metrics
      const skillDemand = calculateSkillDemand(resumeSkills.skillFrequency, jobSkills.skillFrequency);

      // Build cross-reference mappings
      const crossReferenceMappings = buildCrossReferenceMappings(
        resumeSkills.skills,
        jobSkills.skills,
        resumeSkills.skillFrequency,
        jobSkills.skillFrequency
      );

      const taxonomy = {
        totalUniqueSkills: allSkills.size,
        resumeSkills: {
          count: resumeSkills.totalSkills,
          skills: resumeSkills.skills,
          frequency: resumeSkills.skillFrequency
        },
        jobSkills: {
          count: jobSkills.totalSkills,
          skills: jobSkills.skills,
          frequency: jobSkills.skillFrequency,
          byDepartment: jobSkills.skillByDepartment
        },
        unifiedSkills: Array.from(allSkills),
        categorizedSkills,
        skillRelationships,
        skillDemand,
        crossReferenceMappings,
        generatedAt: Date.now(),
        lastUpdated: Date.now()
      };

      return taxonomy;
    } catch (error) {
      console.error("Error building skill taxonomy:", error);
      throw error;
    }
  },
});

// Update skill mappings based on new discoveries
export const updateSkillMappings = action({
  args: {
    newSkills: v.array(v.string()),
    source: v.union(v.literal("resume"), v.literal("job_posting"), v.literal("user_query")),
    context: v.optional(v.string()),
  },
  handler: async (ctx, { newSkills, source, context }): Promise<any> => {
    try {
      // Get current taxonomy
      const currentTaxonomy = await ctx.runAction(api.dynamicSkillMapping.buildSkillTaxonomy, {});
      
      // Add new skills to the taxonomy
      const updatedSkills = [...new Set([...currentTaxonomy.unifiedSkills, ...newSkills])];
      
      // Rebuild relationships with new skills
      const updatedRelationships = await buildSkillRelationships(updatedSkills);
      
      // Update cross-reference mappings
      const updatedMappings = buildCrossReferenceMappings(
        currentTaxonomy.resumeSkills.skills,
        currentTaxonomy.jobSkills.skills,
        currentTaxonomy.resumeSkills.frequency,
        currentTaxonomy.jobSkills.frequency
      );

      const updatedTaxonomy = {
        ...currentTaxonomy,
        unifiedSkills: updatedSkills,
        skillRelationships: updatedRelationships,
        crossReferenceMappings: updatedMappings,
        lastUpdated: Date.now()
      };

      return updatedTaxonomy;
    } catch (error) {
      console.error("Error updating skill mappings:", error);
      throw error;
    }
  },
});

// Enhanced semantic search using dynamic skill mapping
export const semanticSearchWithDynamicSkills = query({
  args: {
    query: v.string(),
    collection: v.union(v.literal("resumes"), v.literal("jobpostings"), v.literal("both")),
    limit: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
    useSkillEnhancement: v.optional(v.boolean()),
  },
  handler: async (ctx, { 
    query, 
    collection = "both", 
    limit = 20, 
    similarityThreshold = 0.5,
    useSkillEnhancement = true
  }): Promise<any> => {
    try {
      // For now, use basic search without taxonomy in query context
      const taxonomy = null;
      
      // For now, return basic search results without AI enhancement in query context
      // AI enhancement should be done in action/mutation context
      let results: any[] = [];

      // Search resumes if requested
      if (collection === "resumes" || collection === "both") {
        const resumeResults = await searchCollectionWithEmbedding(
          ctx, "resumes", [], limit, similarityThreshold, taxonomy
        );
        results.push(...resumeResults.map((r: any) => ({ ...r, collection: "resumes" })));
      }

      // Search job postings if requested
      if (collection === "jobpostings" || collection === "both") {
        const jobResults = await searchCollectionWithEmbedding(
          ctx, "jobpostings", [], limit, similarityThreshold, taxonomy
        );
        results.push(...jobResults.map((r: any) => ({ ...r, collection: "jobpostings" })));
      }

      // Sort by similarity and apply limit
      results.sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0));
      results = results.slice(0, limit);

      return {
        query: query,
        results,
        totalFound: results.length,
        similarityThreshold,
        skillEnhancement: false, // Disabled in query context
        taxonomy: {
          totalSkills: 0,
          skillCategories: 0,
          lastUpdated: Date.now()
        }
      };
    } catch (error) {
      console.error("Error in semantic search with dynamic skills:", error);
      throw error;
    }
  },
});

/**
 * Get resumes by skill (query function for actions to call)
 */
export const getResumesBySkill = query({
  args: {
    skill: v.string(),
  },
  handler: async (ctx, { skill }): Promise<any[]> => {
    try {
      const normalizedSkill = skill.toLowerCase().trim();
      const resumes = await ctx.db
        .query("resumes")
        .filter((q: any) => q.eq(q.field("extractedSkills"), [normalizedSkill]))
        .collect();
      return resumes;
    } catch (error) {
      console.error("Error getting resumes by skill:", error);
      return [];
    }
  },
});

/**
 * Get job postings by skill (query function for actions to call)
 */
export const getJobPostingsBySkill = query({
  args: {
    skill: v.string(),
  },
  handler: async (ctx, { skill }): Promise<any[]> => {
    try {
      const normalizedSkill = skill.toLowerCase().trim();
      const jobPostings = await ctx.db
        .query("jobpostings")
        .filter((q: any) => q.eq(q.field("extractedSkills"), [normalizedSkill]))
        .collect();
      return jobPostings;
    } catch (error) {
      console.error("Error getting job postings by skill:", error);
      return [];
    }
  },
});

// Query enhancement using discovered skills
export const enhanceQueryWithSkillContext = action({
  args: {
    query: v.string(),
    taxonomy: v.any(),
  },
  handler: async (ctx, { query, taxonomy }) => {
    try {
      if (!process.env.GOOGLE_AI_API_KEY) {
        return query; // Return original query if AI is not available
      }

      const prompt = `
        Given the following query: "${query}"
        
        And this skill taxonomy from our HR system:
        - Total skills: ${taxonomy.totalUniqueSkills}
        - Skill categories: ${Object.keys(taxonomy.categorizedSkills).join(', ')}
        - Top skills by frequency: ${Object.entries(taxonomy.skillDemand?.topDemanded || {})
          .slice(0, 10)
          .map(([skill, count]) => `${skill} (${count})`)
          .join(', ')}

        Enhance the query by:
        1. Adding relevant skills that might be implied
        2. Including synonyms for technical terms
        3. Adding domain-specific terminology
        4. Maintaining the original intent
        
        Return only the enhanced query, no explanations.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const enhancedQuery = result.response.text().trim();

      return enhancedQuery || query;
    } catch (error) {
      console.warn("Query enhancement failed, returning original query:", error);
      return query;
    }
  },
});

// Cross-collection skill matching
export const findSkillMatchesAcrossCollections = action({
  args: {
    skill: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { skill, limit = 10 }): Promise<any> => {
    try {
      const normalizedSkill = skill.toLowerCase().trim();
      
      // Search resumes for skill matches
      const resumeMatches = await ctx.runQuery(api.dynamicSkillMapping.getResumesBySkill, { skill: normalizedSkill });

      // Search job postings for skill matches
      const jobMatches = await ctx.runQuery(api.dynamicSkillMapping.getJobPostingsBySkill, { skill: normalizedSkill });

      // Get basic skill info without calling actions
      const relatedSkills: string[] = [];

      return {
        skill: normalizedSkill,
        resumeMatches: resumeMatches.slice(0, limit),
        jobMatches: jobMatches.slice(0, limit),
        relatedSkills,
        totalMatches: resumeMatches.length + jobMatches.length
      };
    } catch (error) {
      console.error("Error finding skill matches:", error);
      throw error;
    }
  },
});

// Enhanced search with skill context - moved to action context
export const enhancedSearchWithSkillContext = action({
  args: {
    query: v.string(),
    collection: v.union(v.literal("resumes"), v.literal("jobpostings"), v.literal("both")),
    limit: v.optional(v.number()),
    similarityThreshold: v.optional(v.number()),
    useSkillEnhancement: v.optional(v.boolean()),
  },
  handler: async (ctx, { 
    query, 
    collection = "both", 
    limit = 20, 
    similarityThreshold = 0.7,
    useSkillEnhancement = true
  }): Promise<any> => {
    try {
      // Get current skill taxonomy
      const taxonomy = await ctx.runAction(api.dynamicSkillMapping.buildSkillTaxonomy, {});
      
      // Enhance query with skill context if enabled
      let enhancedQuery = query;
      if (useSkillEnhancement) {
        // For now, use a simple enhancement instead of calling the function
        enhancedQuery = `${query} ${taxonomy.unifiedSkills?.slice(0, 3).join(' ') || ''}`.trim();
      }

      // Generate embedding for enhanced query
      const queryEmbedding = await ctx.runAction(api.embeddingService.generateEmbedding, {
        text: enhancedQuery,
        model: "text-embedding-3-large"
      });

      let results: any[] = [];

      // Search resumes if requested
      if (collection === "resumes" || collection === "both") {
        const resumeResults = await searchCollectionWithEmbedding(
          ctx, "resumes", queryEmbedding.embedding, limit, similarityThreshold, taxonomy, enhancedQuery
        );
        results.push(...resumeResults
          .filter((item: any) => item.embedding && item.completeSearchableText)
          .map((item: any) => ({
            ...item,
            collection: "resumes",
            enhancedScore: (item.similarity || 0) * 1.1 // Simple enhancement
          })));
      }

      // Search job postings if requested
      if (collection === "jobpostings" || collection === "both") {
        const jobResults = await searchCollectionWithEmbedding(
          ctx, "jobpostings", queryEmbedding.embedding, limit, similarityThreshold, taxonomy, enhancedQuery
        );
        results.push(...jobResults
          .filter((item: any) => (item.similarity || 0) >= similarityThreshold)
          .map((item: any) => ({
            ...item,
            collection: "jobpostings",
            enhancedScore: (item.similarity || 0) * 1.1 // Simple enhancement
          })));
      }

      // Sort by enhanced score and apply limit
      results.sort((a: any, b: any) => (b.enhancedScore || 0) - (a.enhancedScore || 0));
      results = results.slice(0, limit);

      return {
        query: enhancedQuery,
        results,
        totalFound: results.length,
        similarityThreshold,
        skillEnhancement: useSkillEnhancement,
        taxonomy: {
          totalSkills: taxonomy.totalUniqueSkills,
          skillCategories: Object.keys(taxonomy.categorizedSkills).length,
          lastUpdated: taxonomy.lastUpdated
        }
      };
    } catch (error) {
      console.error("Error in enhanced search with skill context:", error);
      throw error;
    }
  },
});

// Helper functions

function extractBasicSkills(text: string): string[] {
  const textLower = text.toLowerCase();
  const allSkills: string[] = [];
  
  // Flatten all skill categories
  Object.values(SKILL_CATEGORIES).forEach(category => {
    allSkills.push(...category);
  });
  
  const foundSkills = allSkills.filter(skill => 
    textLower.includes(skill.toLowerCase())
  );
  
  return foundSkills;
}

function categorizeSkills(skills: string[]): Record<string, string[]> {
  const categorized: Record<string, string[]> = {};
  
  skills.forEach(skill => {
    for (const [category, categorySkills] of Object.entries(SKILL_CATEGORIES)) {
      if (categorySkills.some(catSkill => 
        skill.toLowerCase().includes(catSkill.toLowerCase()) ||
        catSkill.toLowerCase().includes(skill.toLowerCase())
      )) {
        if (!categorized[category]) {
          categorized[category] = [];
        }
        if (!categorized[category].includes(skill)) {
          categorized[category].push(skill);
        }
        break;
      }
    }
  });
  
  return categorized;
}

async function extractSkillsWithGemini(text: string, context: "resume" | "job_posting"): Promise<string[]> {
  try {
    const prompt = `
      Extract technical skills, programming languages, frameworks, tools, and technologies from the following ${context} text.
      
      Focus on:
      - Programming languages (JavaScript, Python, Java, etc.)
      - Frameworks and libraries (React, Angular, Django, etc.)
      - Tools and platforms (Docker, AWS, Git, etc.)
      - Databases (MySQL, MongoDB, etc.)
      - Operating systems and environments
      - Domain-specific technologies
      
      Return only a comma-separated list of skills, no explanations.
      
      Text: ${text.substring(0, 2000)}...
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    if (!response) return [];
    
    // Parse comma-separated skills
    const skills = response.split(',').map(skill => skill.trim()).filter(Boolean);
    return skills;
  } catch (error) {
    console.error("Error in AI skill extraction:", error);
    return [];
  }
}

async function buildSkillRelationships(skills: string[]): Promise<Record<string, string[]>> {
  const relationships: Record<string, string[]> = {};
  
  // Build basic relationships based on skill categories
  skills.forEach(skill => {
    relationships[skill] = [];
    
    // Find related skills in the same category
    for (const [category, categorySkills] of Object.entries(SKILL_CATEGORIES)) {
      if (categorySkills.some(catSkill => 
        skill.toLowerCase().includes(catSkill.toLowerCase()) ||
        catSkill.toLowerCase().includes(skill.toLowerCase())
      )) {
        // Add other skills from the same category
        categorySkills.forEach(otherSkill => {
          if (otherSkill !== skill && !relationships[skill].includes(otherSkill)) {
            relationships[skill].push(otherSkill);
          }
        });
        break;
      }
    }
  });
  
  return relationships;
}

function calculateSkillDemand(
  resumeFrequency: Record<string, number>,
  jobFrequency: Record<string, number>
): {
  topDemanded: Record<string, number>;
  topAvailable: Record<string, number>;
  skillGap: Record<string, number>;
} {
  const topDemanded = Object.entries(jobFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .reduce((acc, [skill, count]) => ({ ...acc, [skill]: count }), {});

  const topAvailable = Object.entries(resumeFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .reduce((acc, [skill, count]) => ({ ...acc, [skill]: count }), {});

  const skillGap: Record<string, number> = {};
  Object.keys({ ...resumeFrequency, ...jobFrequency }).forEach(skill => {
    const demand = jobFrequency[skill] || 0;
    const supply = resumeFrequency[skill] || 0;
    skillGap[skill] = demand - supply;
  });

  return { topDemanded, topAvailable, skillGap };
}

function buildCrossReferenceMappings(
  resumeSkills: string[],
  jobSkills: string[],
  resumeFrequency: Record<string, number>,
  jobFrequency: Record<string, number>
): Record<string, {
  resumeCount: number;
  jobCount: number;
  demandSupplyRatio: number;
  relatedTerms: string[];
}> {
  const allSkills = new Set([...resumeSkills, ...jobSkills]);
  const mappings: Record<string, any> = {};

  allSkills.forEach(skill => {
    const resumeCount = resumeFrequency[skill] || 0;
    const jobCount = jobFrequency[skill] || 0;
    const demandSupplyRatio = resumeCount > 0 ? jobCount / resumeCount : jobCount;

    // Find related terms based on skill categories
    const relatedTerms: string[] = [];
    for (const [category, categorySkills] of Object.entries(SKILL_CATEGORIES)) {
      if (categorySkills.some(catSkill => 
        skill.toLowerCase().includes(catSkill.toLowerCase()) ||
        catSkill.toLowerCase().includes(skill.toLowerCase())
      )) {
        relatedTerms.push(...categorySkills.filter(catSkill => catSkill !== skill));
        break;
      }
    }

    mappings[skill] = {
      resumeCount,
      jobCount,
      demandSupplyRatio,
      relatedTerms: relatedTerms.slice(0, 5) // Limit to top 5 related terms
    };
  });

  return mappings;
}

function calculateExtractionConfidence(
  skills: string[],
  aiEnhanced: boolean,
  textLength: number
): number {
  let confidence = 0.5; // Base confidence
  
  // Boost confidence for AI-enhanced extraction
  if (aiEnhanced) confidence += 0.2;
  
  // Boost confidence for longer texts (more content to analyze)
  if (textLength > 1000) confidence += 0.1;
  if (textLength > 5000) confidence += 0.1;
  
  // Boost confidence for more skills found
  if (skills.length > 5) confidence += 0.1;
  if (skills.length > 10) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

async function searchCollectionWithEmbedding(
  ctx: any,
  collectionName: "resumes" | "jobpostings",
  queryEmbedding: number[],
  limit: number,
  similarityThreshold: number,
  taxonomy: any,
  query?: string
) {
  const collection = await ctx.db.query(collectionName).collect();
  
  const results = collection
    .filter((item: any) => item.embedding && item.completeSearchableText)
    .map((item: any) => {
      const similarity = calculateCosineSimilarity(queryEmbedding, item.embedding!);
      
      // Enhance similarity score with skill context
      const enhancedSimilarity = enhanceSimilarityWithSkills(
        similarity,
        item,
        taxonomy
      );
      
      // If query is provided, enhance with explanation data
      if (query) {
        return enhanceSimilarityWithExplanation(
          enhancedSimilarity,
          item,
          query,
          taxonomy
        );
      }
      
      return {
        ...item,
        similarity: enhancedSimilarity,
        originalSimilarity: similarity,
        hasEmbedding: true,
        searchableText: item.completeSearchableText,
      };
    })
    .filter((item: any) => item.similarity >= similarityThreshold)
    .sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, limit);

  return results;
}

function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function enhanceSimilarityWithSkills(
  baseSimilarity: number,
  item: any,
  taxonomy: any
): number {
  let enhancedSimilarity = baseSimilarity;
  
  // Boost similarity if item has extracted skills
  if (item.extractedSkills && item.extractedSkills.length > 0) {
    enhancedSimilarity += 0.05; // Small boost for having structured skills
  }
  
  // Boost similarity based on skill demand (higher demand = higher relevance)
  if (item.extractedSkills) {
    const skillDemandBoost = item.extractedSkills.reduce((boost: number, skill: string) => {
      const demand = taxonomy.skillDemand?.topDemanded?.[skill.toLowerCase()] || 0;
      return boost + (demand * 0.001); // Small boost per demand point
    }, 0);
    enhancedSimilarity += Math.min(skillDemandBoost, 0.1); // Cap boost at 0.1
  }
  
  return Math.min(enhancedSimilarity, 1.0);
}

// Enhanced similarity calculation with explanation data
export function enhanceSimilarityWithExplanation(
  baseSimilarity: number,
  item: any,
  query: string,
  taxonomy: any
): any {
  const fieldSimilarities = calculateFieldSimilarities(item, query);
  const skillMatches = extractSkillMatches(item.extractedSkills || [], query);
  const experienceAlignment = calculateExperienceAlignment(item, query);
  
  return {
    ...item,
    similarity: baseSimilarity,
    explanation: {
      query,
      matchedText: extractMatchedText(item.completeSearchableText || '', query),
      fieldMatches: Object.entries(fieldSimilarities).map(([field, score]) => ({
        field,
        relevance: score,
        matchedContent: extractFieldContent(item, field),
        similarity: score
      })),
      overallSimilarity: baseSimilarity,
      confidenceScore: calculateConfidence(baseSimilarity, skillMatches.length),
      skillMatches,
      experienceAlignment
    },
    fieldSimilarities
  };
}

// Calculate field-level similarities
function calculateFieldSimilarities(item: any, query: string): Record<string, number> {
  const queryLower = query.toLowerCase();
  const fields: Record<string, string> = {
    title: item.jobTitle || item.processedMetadata?.name || '',
    description: item.jobDescription || item.processedMetadata?.summary || '',
    skills: (item.extractedSkills || []).join(' '),
    experience: item.experienceLevel || item.processedMetadata?.experience || '',
    education: item.education || item.processedMetadata?.education || ''
  };

  const similarities: Record<string, number> = {};
  
  Object.entries(fields).forEach(([field, content]) => {
    if (!content) {
      similarities[field] = 0;
      return;
    }
    
    const contentLower = content.toLowerCase();
    const words = queryLower.split(' ').filter(word => word.length > 2);
    let matchCount = 0;
    
    words.forEach(word => {
      if (contentLower.includes(word)) {
        matchCount++;
      }
    });
    
    similarities[field] = words.length > 0 ? matchCount / words.length : 0;
  });
  
  return similarities;
}

// Extract skill matches from query
function extractSkillMatches(skills: string[], query: string): string[] {
  if (!skills || skills.length === 0) return [];
  
  const queryLower = query.toLowerCase();
  return skills.filter(skill => 
    queryLower.includes(skill.toLowerCase()) || 
    skill.toLowerCase().includes(queryLower)
  );
}

// Calculate experience alignment
function calculateExperienceAlignment(item: any, query: string): number {
  const queryLower = query.toLowerCase();
  const experienceKeywords = ['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive'];
  
  let alignment = 0;
  experienceKeywords.forEach(keyword => {
    if (queryLower.includes(keyword)) {
      const itemLevel = item.experienceLevel || item.processedMetadata?.experience || '';
      if (itemLevel.toLowerCase().includes(keyword)) {
        alignment += 0.3;
      }
    }
  });
  
  return Math.min(alignment, 1.0);
}

// Extract matched text snippets
function extractMatchedText(text: string, query: string): string[] {
  if (!text || !query) return [];
  
  const queryLower = query.toLowerCase();
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const matches: string[] = [];
  
  sentences.forEach(sentence => {
    const sentenceLower = sentence.toLowerCase();
    const words = queryLower.split(' ').filter(word => word.length > 2);
    let matchScore = 0;
    
    words.forEach(word => {
      if (sentenceLower.includes(word)) {
        matchScore++;
      }
    });
    
    if (matchScore > 0) {
      matches.push(sentence.trim());
    }
  });
  
  return matches.slice(0, 3); // Return top 3 matches
}

// Extract field content for display
function extractFieldContent(item: any, field: string): string {
  switch (field) {
    case 'title':
      return item.jobTitle || item.processedMetadata?.name || '';
    case 'description':
      return (item.jobDescription || item.processedMetadata?.summary || '').substring(0, 100) + '...';
    case 'skills':
      return (item.extractedSkills || []).join(', ');
    case 'experience':
      return item.experienceLevel || item.processedMetadata?.experience || '';
    case 'education':
      return item.education || item.processedMetadata?.education || '';
    default:
      return '';
  }
}

// Calculate confidence score
function calculateConfidence(similarity: number, skillMatches: number): number {
  let confidence = similarity * 0.7; // Base confidence from similarity
  
  // Boost confidence for skill matches
  if (skillMatches > 0) confidence += 0.2;
  if (skillMatches > 2) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

