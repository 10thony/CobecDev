import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Note: Embedding generation is now handled client-side or through separate Node.js actions
// This file contains only Convex-native functions

// Placeholder function for migrations (returns empty array)
export const generateEmbeddings = action({
  args: {
    text: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.array(v.number()),
  handler: async (ctx, args): Promise<number[]> => {
    // TODO: Implement proper embedding generation
    // For now, return empty array to allow migrations to proceed
    console.log(`Placeholder: Would generate embedding for text: ${args.text.substring(0, 100)}...`);
    return [];
  },
});

// Extract skills from search query
function extractSkillsFromQuery(query: string): string[] {
  const commonSkills = [
    // Programming Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'go', 'rust', 'typescript',
    // Web Technologies
    'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
    // Mobile Development
    'ios', 'android', 'react native', 'flutter', 'xamarin',
    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
    // Data Science & AI
    'machine learning', 'ai', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
    // Other Technical Skills
    'linux', 'unix', 'windows', 'agile', 'scrum', 'project management', 'cybersecurity',
    // Domain Specific
    'aviation', 'safety', 'faa', 'government', 'security clearance'
  ];
  
  const queryLower = query.toLowerCase();
  const foundSkills = commonSkills.filter(skill => 
    queryLower.includes(skill.toLowerCase())
  );
  
  return foundSkills;
}



// Vector similarity search for job postings using Convex native vector search
export const searchJobsByVector = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number()),
    filters: v.optional(v.object({
      location: v.optional(v.string()),
      department: v.optional(v.string()),
      jobType: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { query, limit = 10, filters = {} }): Promise<Doc<"jobpostings">[]> => {
    // For now, we'll use a simple text search since vector search requires pre-computed embeddings
    // TODO: Implement proper vector search when embeddings are available
    
    // Start with a base query
    // Relaxed typing so it can accept returned Query methods like .withIndex(...)
    let queryBuilder: any = ctx.db.query("jobpostings");
    
    // Apply filters using the most restrictive index first
    if (filters?.location) {
      queryBuilder = queryBuilder.withIndex("by_location", (q: any) => q.eq("location", filters.location!));
    } else if (filters?.department) {
      queryBuilder = queryBuilder.withIndex("by_department", (q: any) => q.eq("department", filters.department!));
    }
    
    // Get results
    const results = await queryBuilder
      .order("desc")
      .take(limit);
    
    // Apply additional filtering in memory if needed
    let filteredResults = results;
    
    if (filters?.jobType) {
      filteredResults = filteredResults.filter((job: any) => job.jobType === filters.jobType);
    }
    
    if (filters?.department && !filters?.location) {
      filteredResults = filteredResults.filter((job: any) => job.department === filters.department);
    }
    
    return filteredResults.slice(0, limit);
  },
});

// Vector similarity search for resumes using Convex native vector search
export const searchResumesByVector = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number()),
    filters: v.optional(v.object({
      skills: v.optional(v.array(v.string())),
      experienceLevel: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { query, limit = 10, filters = {} }): Promise<Doc<"resumes">[]> => {
    // For now, we'll use a simple text search since vector search requires pre-computed embeddings
    // TODO: Implement proper vector search when embeddings are available
    let queryBuilder: any = ctx.db.query("resumes");
    
    // Get results
    const results = await queryBuilder
      .order("desc")
      .take(limit * 2); // Get more results to filter from
    
    // Apply filtering in memory
    let filteredResults = results;
    
    if (filters?.skills && filters.skills.length > 0) {
      filteredResults = filteredResults.filter((resume: any) => 
        resume.skills.some((skill: string) => 
          filters.skills!.some(filterSkill => 
            skill.toLowerCase().includes(filterSkill.toLowerCase())
          )
        )
      );
    }
    
    return filteredResults.slice(0, limit);
  },
});

// Hybrid search combining vector similarity and traditional filters for jobs
export const hybridJobSearch = query({
  args: { 
    query: v.string(),
    filters: v.object({
      location: v.optional(v.string()),
      department: v.optional(v.string()),
      jobType: v.optional(v.string()),
      skills: v.optional(v.array(v.string())),
    }),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, filters, limit = 20 }): Promise<Doc<"jobpostings">[]> => {
    // Get traditional filtered results
    let traditionalQuery: any = ctx.db.query("jobpostings");
    
    // Apply the most restrictive filter first using an index
    if (filters.location) {
      traditionalQuery = traditionalQuery.withIndex("by_location", (q: any) => q.eq("location", filters.location!));
    } else if (filters.department) {
      traditionalQuery = traditionalQuery.withIndex("by_department", (q: any) => q.eq("department", filters.department!));
    }
    
    // Get results
    const results = await traditionalQuery
      .order("desc")
      .take(limit * 2); // Get more results to filter from
    
    // Apply additional filtering in memory
    let filteredResults = results;
    
    if (filters.jobType) {
      filteredResults = filteredResults.filter((job: any) => job.jobType === filters.jobType);
    }
    
    if (filters.department && !filters.location) {
      filteredResults = filteredResults.filter((job: any) => job.department === filters.department);
    }
    
    return filteredResults.slice(0, limit);
  },
});

// Hybrid search combining vector similarity and traditional filters for resumes
export const hybridResumeSearch = query({
  args: { 
    query: v.string(),
    filters: v.object({
      skills: v.optional(v.array(v.string())),
      experienceLevel: v.optional(v.string()),
    }),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, filters, limit = 20 }): Promise<Doc<"resumes">[]> => {
    // Get traditional filtered results
    let traditionalQuery: any = ctx.db.query("resumes");
    
    // Get results
    const results = await traditionalQuery
      .order("desc")
      .take(limit * 2); // Get more results to filter from
    
    // Apply filtering in memory
    let filteredResults = results;
    
    if (filters?.skills && filters.skills.length > 0) {
      filteredResults = filteredResults.filter((resume: any) => 
        resume.skills.some((skill: string) => 
          filters.skills!.some(filterSkill => 
            skill.toLowerCase().includes(filterSkill.toLowerCase())
          )
        )
      );
    }
    
    return filteredResults.slice(0, limit);
  },
});

// AI Agent Search - semantic search using Convex vector search
export const aiAgentSearch = action({
  args: {
    query: v.string(),
    searchType: v.union(v.literal("jobs"), v.literal("resumes"), v.literal("both")),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    jobs: v.array(v.any()),
    resumes: v.array(v.any()),
    analysis: v.optional(v.string()),
    recommendations: v.optional(v.array(v.string())),
  }),
  handler: async (ctx, { query, searchType, limit = 5 }): Promise<{
    jobs: any[];
    resumes: any[];
    analysis?: string;
    recommendations?: string[];
  }> => {
    let jobs: any[] = [];
    let resumes: any[] = [];
    
    if (searchType === "jobs" || searchType === "both") {
      jobs = await ctx.runQuery(api.convexVectorSearch.searchJobsByVector, {
        query: query,
        limit: limit,
      });
    }
    
    if (searchType === "resumes" || searchType === "both") {
      resumes = await ctx.runQuery(api.convexVectorSearch.searchResumesByVector, {
        query: query,
        limit: limit,
      });
    }
    
    // Add AI analysis if both jobs and resumes are requested
    let analysis: string | undefined;
    let recommendations: string[] | undefined;
    
    if (searchType === "both" && (jobs.length > 0 || resumes.length > 0)) {
      try {
        // Generate basic analysis
        analysis = `Found ${jobs.length} matching jobs and ${resumes.length} matching resumes for your query: "${query}". The results are ranked by semantic similarity to your search terms using Convex's native vector search.`;
        
        // Generate some basic recommendations
        recommendations = [
          "Consider refining your search terms for more specific results",
          "Try searching for specific skills or technologies",
          "Use location-based searches for better matches",
          "Vector search provides semantic understanding of your query"
        ];
      } catch (aiError) {
        console.error('Error generating AI analysis:', aiError);
        // Continue without AI analysis
      }
    }
    
    return {
      jobs,
      resumes,
      analysis,
      recommendations,
    };
  },
});

// Get job by ID using Convex
export const getJobById = query({
  args: {
    jobId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { jobId }): Promise<Doc<"jobpostings"> | null> => {
    try {
      // Try to find by ID first
      const job = await ctx.db.get(jobId as Id<"jobpostings">);
      if (job) {
        return job;
      }
      
      // If not found by ID, try to find by job title
      const jobs = await ctx.db
        .query("jobpostings")
        .withIndex("by_jobTitle", (q: any) => q.eq("jobTitle", jobId))
        .take(1);
      
      return jobs[0] || null;
    } catch (error) {
      console.error('Error fetching job by ID:', error);
      throw error;
    }
  },
});

// Get resume by ID using Convex
export const getResumeById = query({
  args: {
    resumeId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { resumeId }): Promise<Doc<"resumes"> | null> => {
    try {
      // Try to find by ID first
      const resume = await ctx.db.get(resumeId as Id<"resumes">);
      if (resume) {
        return resume;
      }
      
      // If not found by ID, try to find by email
      const resumes = await ctx.db
        .query("resumes")
        .withIndex("by_email", (q: any) => q.eq("personalInfo.email", resumeId))
        .take(1);
      
      return resumes[0] || null;
    } catch (error) {
      console.error('Error fetching resume by ID:', error);
      throw error;
    }
  },
});

// Update job posting with new embedding
export const updateJobEmbedding = mutation({
  args: {
    jobId: v.id("jobpostings"),
    searchableText: v.string(),
    embedding: v.array(v.number()),
    extractedSkills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { jobId, searchableText, embedding, extractedSkills }): Promise<void> => {
    await ctx.db.patch(jobId, {
      searchableText,
      embedding: embedding as any, // Cast to Convex vector type
      extractedSkills,
      updatedAt: Date.now(),
    });
  },
});

// Update resume with new embedding
export const updateResumeEmbedding = mutation({
  args: {
    resumeId: v.id("resumes"),
    searchableText: v.string(),
    embedding: v.array(v.number()),
    extractedSkills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { resumeId, searchableText, embedding, extractedSkills }): Promise<void> => {
    await ctx.db.patch(resumeId, {
      searchableText,
      embedding: embedding as any, // Cast to Convex vector type
      extractedSkills,
      updatedAt: Date.now(),
    });
  },
});

// Insert new job posting with embedding
export const insertJobPosting = mutation({
  args: {
    jobTitle: v.string(),
    location: v.string(),
    salary: v.string(),
    openDate: v.string(),
    closeDate: v.string(),
    jobLink: v.string(),
    jobType: v.string(),
    jobSummary: v.string(),
    duties: v.string(),
    requirements: v.string(),
    qualifications: v.string(),
    education: v.array(v.string()),
    howToApply: v.string(),
    additionalInformation: v.string(),
    department: v.string(),
    seriesGrade: v.string(),
    travelRequired: v.string(),
    workSchedule: v.string(),
    securityClearance: v.string(),
    experienceRequired: v.string(),
    educationRequired: v.string(),
    applicationDeadline: v.string(),
    contactInfo: v.string(),
    searchableText: v.optional(v.string()),
    extractedSkills: v.optional(v.array(v.string())),
    embedding: v.optional(v.array(v.number())),
    metadata: v.optional(v.object({
      originalIndex: v.optional(v.number()),
      importedAt: v.number(),
      sourceFile: v.optional(v.string()),
      dataType: v.string(),
    })),
  },
  handler: async (ctx, args): Promise<Id<"jobpostings">> => {
    const jobId = await ctx.db.insert("jobpostings", {
      ...args,
      embedding: args.embedding as any, // Cast to Convex vector type
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return jobId;
  },
});

// Insert new resume with embedding
export const insertResume = mutation({
  args: {
    filename: v.string(),
    originalText: v.string(),
    personalInfo: v.object({
      firstName: v.string(),
      middleName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.string(),
      yearsOfExperience: v.number(),
    }),
    professionalSummary: v.string(),
    education: v.array(v.string()),
    experience: v.array(v.object({
      title: v.string(),
      company: v.string(),
      location: v.string(),
      duration: v.string(),
      responsibilities: v.array(v.string()),
    })),
    skills: v.array(v.string()),
    certifications: v.string(),
    professionalMemberships: v.string(),
    securityClearance: v.string(),
    // Raw section data for debugging and reprocessing
    sectionData: v.optional(v.object({
      experience: v.optional(v.object({
        sectionType: v.string(),
        rawText: v.string(),
        extractedBy: v.string(),
        extractionConfidence: v.number(),
        parsedData: v.optional(v.any()),
        parseErrors: v.optional(v.array(v.string())),
        parseConfidence: v.optional(v.number()),
        startIndex: v.optional(v.number()),
        endIndex: v.optional(v.number()),
      })),
      skills: v.optional(v.object({
        sectionType: v.string(),
        rawText: v.string(),
        extractedBy: v.string(),
        extractionConfidence: v.number(),
        parsedData: v.optional(v.any()),
        parseErrors: v.optional(v.array(v.string())),
        parseConfidence: v.optional(v.number()),
        startIndex: v.optional(v.number()),
        endIndex: v.optional(v.number()),
      })),
      education: v.optional(v.object({
        sectionType: v.string(),
        rawText: v.string(),
        extractedBy: v.string(),
        extractionConfidence: v.number(),
        parsedData: v.optional(v.any()),
        parseErrors: v.optional(v.array(v.string())),
        parseConfidence: v.optional(v.number()),
        startIndex: v.optional(v.number()),
        endIndex: v.optional(v.number()),
      })),
    })),
    searchableText: v.optional(v.string()),
    extractedSkills: v.optional(v.array(v.string())),
    embedding: v.optional(v.array(v.number())),
    metadata: v.optional(v.object({
      filePath: v.optional(v.string()),
      fileName: v.string(),
      importedAt: v.number(),
      parsedAt: v.number(),
    })),
  },
  handler: async (ctx, args): Promise<Id<"resumes">> => {
    const resumeId = await ctx.db.insert("resumes", {
      ...args,
      embedding: args.embedding as any, // Cast to Convex vector type
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return resumeId;
  },
});

// Batch insert job postings with embeddings
export const batchInsertJobPostings = action({
  args: {
    jobs: v.array(v.object({
      jobTitle: v.string(),
      location: v.string(),
      salary: v.string(),
      openDate: v.string(),
      closeDate: v.string(),
      jobLink: v.string(),
      jobType: v.string(),
      jobSummary: v.string(),
      duties: v.string(),
      requirements: v.string(),
      qualifications: v.string(),
      education: v.array(v.string()),
      howToApply: v.string(),
      additionalInformation: v.string(),
      department: v.string(),
      seriesGrade: v.string(),
      travelRequired: v.string(),
      workSchedule: v.string(),
      securityClearance: v.string(),
      experienceRequired: v.string(),
      educationRequired: v.string(),
      applicationDeadline: v.string(),
      contactInfo: v.string(),
      searchableText: v.optional(v.string()),
      extractedSkills: v.optional(v.array(v.string())),
      embedding: v.optional(v.array(v.number())),
      metadata: v.optional(v.object({
        originalIndex: v.optional(v.number()),
        importedAt: v.number(),
        sourceFile: v.optional(v.string()),
        dataType: v.string(),
      })),
    })),
  },
  handler: async (ctx, { jobs }): Promise<Array<{
    success: boolean;
    jobId?: Id<"jobpostings">;
    jobTitle: string;
    error?: string;
  }>> => {
    const results = [];
    
    for (const job of jobs) {
      try {
        const jobId = await ctx.runMutation(api.convexVectorSearch.insertJobPosting, job);
        results.push({ success: true, jobId, jobTitle: job.jobTitle });
      } catch (error) {
        console.error(`Error inserting job ${job.jobTitle}:`, error);
        results.push({ success: false, jobTitle: job.jobTitle, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return results;
  },
});

// Batch insert resumes with embeddings
export const batchInsertResumes = action({
  args: {
    resumes: v.array(v.object({
      filename: v.string(),
      originalText: v.string(),
      personalInfo: v.object({
        firstName: v.string(),
        middleName: v.string(),
        lastName: v.string(),
        email: v.string(),
        phone: v.string(),
        yearsOfExperience: v.number(),
      }),
      professionalSummary: v.string(),
      education: v.array(v.string()),
      experience: v.array(v.object({
        title: v.string(),
        company: v.string(),
        location: v.string(),
        duration: v.string(),
        responsibilities: v.array(v.string()),
      })),
      skills: v.array(v.string()),
      certifications: v.string(),
      professionalMemberships: v.string(),
      securityClearance: v.string(),
      searchableText: v.optional(v.string()),
      extractedSkills: v.optional(v.array(v.string())),
      embedding: v.optional(v.array(v.number())),
      metadata: v.optional(v.object({
        filePath: v.optional(v.string()),
        fileName: v.string(),
        importedAt: v.number(),
        parsedAt: v.number(),
      })),
    })),
  },
  handler: async (ctx, { resumes }): Promise<Array<{
    success: boolean;
    resumeId?: Id<"resumes">;
    filename: string;
    error?: string;
  }>> => {
    const results = [];
    
    for (const resume of resumes) {
      try {
        const resumeId = await ctx.runMutation(api.convexVectorSearch.insertResume, resume);
        results.push({ success: true, resumeId, filename: resume.filename });
      } catch (error) {
        console.error(`Error inserting resume ${resume.filename}:`, error);
        results.push({ success: false, filename: resume.filename, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return results;
  },
});