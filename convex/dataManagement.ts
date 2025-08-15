import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Get all job postings with pagination and search
export const getAllJobPostings = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    search: v.optional(v.string()),
    filters: v.optional(v.object({
      location: v.optional(v.string()),
      department: v.optional(v.string()),
      jobType: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { limit = 1000, offset = 0, search, filters }) => {
    try {
      // Use a higher limit to get more data, similar to HR dashboard
      const allJobs = await ctx.db.query("jobpostings").collect();
      
      let jobs = allJobs;
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        jobs = jobs.filter(job => 
          job.jobTitle.toLowerCase().includes(searchLower) ||
          job.jobSummary.toLowerCase().includes(searchLower) ||
          job.requirements.toLowerCase().includes(searchLower) ||
          job.department.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply filters
      if (filters) {
        if (filters.location) {
          jobs = jobs.filter(job => 
            job.location.toLowerCase().includes(filters.location!.toLowerCase())
          );
        }
        if (filters.department) {
          jobs = jobs.filter(job => 
            job.department.toLowerCase().includes(filters.department!.toLowerCase())
          );
        }
        if (filters.jobType) {
          jobs = jobs.filter(job => 
            job.jobType.toLowerCase().includes(filters.jobType!.toLowerCase())
          );
        }
      }
      
      // Apply pagination
      const total = jobs.length;
      const paginatedJobs = jobs.slice(offset, offset + limit);
      
      return {
        jobs: paginatedJobs,
        total,
        hasMore: offset + limit < total,
        offset,
        limit
      };
    } catch (error) {
      console.error('Error in getAllJobPostings:', error);
      return {
        jobs: [],
        total: 0,
        hasMore: false,
        offset,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
});

// Add new paginated collection queries for better performance
export const getPaginatedJobPostings = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    filters: v.optional(v.any()),
  },
  handler: async (ctx, { page, pageSize, filters = {} }) => {
    try {
      // Build query based on filters
      let results;
      
      if (filters.jobTitle) {
        results = await ctx.db.query("jobpostings")
          .withIndex("by_jobTitle", q => q.eq("jobTitle", filters.jobTitle))
          .order("desc")
          .take(pageSize);
      } else if (filters.location) {
        results = await ctx.db.query("jobpostings")
          .withIndex("by_location", q => q.eq("location", filters.location))
          .order("desc")
          .take(pageSize);
      } else if (filters.department) {
        results = await ctx.db.query("jobpostings")
          .withIndex("by_department", q => q.eq("department", filters.department))
          .order("desc")
          .take(pageSize);
      } else {
        // No filters, get all
        results = await ctx.db.query("jobpostings")
          .order("desc")
          .take(pageSize);
      }
      
      return {
        jobs: results,
        page,
        pageSize,
        hasMore: results.length === pageSize
      };
    } catch (error) {
      console.error('Error in getPaginatedJobPostings:', error);
      return {
        jobs: [],
        page,
        pageSize,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
});

export const getPaginatedResumes = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    filters: v.optional(v.any()),
  },
  handler: async (ctx, { page, pageSize, filters = {} }) => {
    try {
      let results;
      
      if (filters.email) {
        results = await ctx.db.query("resumes")
          .withIndex("by_email", q => q.eq("personalInfo.email", filters.email))
          .order("desc")
          .take(pageSize);
      } else {
        // No filters, get all
        results = await ctx.db.query("resumes")
          .order("desc")
          .take(pageSize);
      }
      
      return {
        resumes: results,
        page,
        pageSize,
        hasMore: results.length === pageSize
      };
    } catch (error) {
      console.error('Error in getPaginatedResumes:', error);
      return {
        resumes: [],
        page,
        pageSize,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
});

// Get all resumes with pagination and search
export const getAllResumes = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    search: v.optional(v.string()),
    filters: v.optional(v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      skills: v.optional(v.string()),
      yearsOfExperience: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { limit = 1000, offset = 0, search, filters }) => {
    try {
      // Use collect() to get all data, similar to HR dashboard
      const allResumes = await ctx.db.query("resumes").collect();
      
      let resumes = allResumes;
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        resumes = resumes.filter(resume => 
          resume.personalInfo.firstName.toLowerCase().includes(searchLower) ||
          resume.personalInfo.lastName.toLowerCase().includes(searchLower) ||
          resume.professionalSummary.toLowerCase().includes(searchLower) ||
          resume.skills.some(skill => skill.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply filters
      if (filters) {
        if (filters.firstName) {
          resumes = resumes.filter(resume => 
            resume.personalInfo.firstName.toLowerCase().includes(filters.firstName!.toLowerCase())
          );
        }
        if (filters.lastName) {
          resumes = resumes.filter(resume => 
            resume.personalInfo.lastName.toLowerCase().includes(filters.lastName!.toLowerCase())
          );
        }
        if (filters.email) {
          resumes = resumes.filter(resume => 
            resume.personalInfo.email.toLowerCase().includes(filters.email!.toLowerCase())
          );
        }
        if (filters.skills) {
          resumes = resumes.filter(resume => 
            resume.skills.some(skill => 
              skill.toLowerCase().includes(filters.skills!.toLowerCase())
            )
          );
        }
        if (filters.yearsOfExperience !== undefined) {
          resumes = resumes.filter(resume => 
            resume.personalInfo.yearsOfExperience >= filters.yearsOfExperience!
          );
        }
      }
      
      // Apply pagination
      const total = resumes.length;
      const paginatedResumes = resumes.slice(offset, offset + limit);
      
      return {
        resumes: paginatedResumes,
        total,
        hasMore: offset + limit < total,
        offset,
        limit
      };
    } catch (error) {
      console.error('Error in getAllResumes:', error);
      return {
        resumes: [],
        total: 0,
        hasMore: false,
        offset,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
});

// Search job postings with vector similarity
export const searchJobPostings = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    filters: v.optional(v.object({
      location: v.optional(v.string()),
      department: v.optional(v.string()),
      jobType: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { query, limit = 20, filters }) => {
    // Use pagination to avoid memory limits
    const allJobs = await ctx.db.query("jobpostings").take(10000); // Reasonable limit
    
    let jobs = allJobs;
    
    // Apply text search
    const queryLower = query.toLowerCase();
    jobs = jobs.filter(job => 
      job.jobTitle.toLowerCase().includes(queryLower) ||
      job.jobSummary.toLowerCase().includes(queryLower) ||
      job.requirements.toLowerCase().includes(queryLower) ||
      job.duties.toLowerCase().includes(queryLower) ||
      job.qualifications.toLowerCase().includes(queryLower)
    );
    
    // Apply filters
    if (filters) {
      if (filters.location) {
        jobs = jobs.filter(job => 
          job.location.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }
      if (filters.department) {
        jobs = jobs.filter(job => 
          job.department.toLowerCase().includes(filters.department!.toLowerCase())
        );
      }
      if (filters.jobType) {
        jobs = jobs.filter(job => 
          job.jobType.toLowerCase().includes(filters.jobType!.toLowerCase())
        );
      }
    }
    
    // Limit results
    return jobs.slice(0, limit);
  },
});

// Search resumes with vector similarity
export const searchResumes = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    filters: v.optional(v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      skills: v.optional(v.string()),
      yearsOfExperience: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { query, limit = 20, filters }) => {
    // Use pagination to avoid memory limits
    const allResumes = await ctx.db.query("resumes").take(10000); // Reasonable limit
    
    let resumes = allResumes;
    
    // Apply text search
    const queryLower = query.toLowerCase();
    resumes = resumes.filter(resume => 
      resume.personalInfo.firstName.toLowerCase().includes(queryLower) ||
      resume.personalInfo.lastName.toLowerCase().includes(queryLower) ||
      resume.professionalSummary.toLowerCase().includes(queryLower) ||
      resume.skills.some(skill => skill.toLowerCase().includes(queryLower)) ||
      resume.education.some(edu => edu.toLowerCase().includes(queryLower))
    );
    
    // Apply filters
    if (filters) {
      if (filters.firstName) {
        resumes = resumes.filter(resume => 
          resume.personalInfo.firstName.toLowerCase().includes(filters.firstName!.toLowerCase())
        );
      }
      if (filters.lastName) {
        resumes = resumes.filter(resume => 
          resume.personalInfo.lastName.toLowerCase().includes(filters.lastName!.toLowerCase())
        );
      }
      if (filters.email) {
        resumes = resumes.filter(resume => 
          resume.personalInfo.email.toLowerCase().includes(filters.email!.toLowerCase())
        );
      }
      if (filters.skills) {
        resumes = resumes.filter(resume => 
          resume.skills.some(skill => 
            skill.toLowerCase().includes(filters.skills!.toLowerCase())
          )
        );
      }
      if (filters.yearsOfExperience !== undefined) {
        resumes = resumes.filter(resume => 
          resume.personalInfo.yearsOfExperience >= filters.yearsOfExperience!
        );
      }
    }
    
    // Limit results
    return resumes.slice(0, limit);
  },
});

// Get data summary statistics
export const getDataSummary = query({
  args: {
    pageSize: v.optional(v.number()), // Default: 100
    page: v.optional(v.number()),     // Default: 0
  },
  handler: async (ctx, { pageSize = 100, page = 0 }) => {
    try {
      // Use lightweight queries with pagination to avoid memory limits
      const [jobs, resumes, employees, kfcPoints] = await Promise.all([
        ctx.db.query("jobpostings")
          .order("desc")
          .take(pageSize),
        ctx.db.query("resumes")
          .order("desc") 
          .take(pageSize),
        ctx.db.query("employees")
          .order("desc")
          .take(pageSize),
        ctx.db.query("kfcpoints")
          .order("desc")
          .take(pageSize),
      ]);

      // Get total counts using separate lightweight queries
      const [totalJobs, totalResumes, totalEmployees, totalKfcPoints] = await Promise.all([
        ctx.db.query("jobpostings").collect().then(jobs => jobs.length),
        ctx.db.query("resumes").collect().then(resumes => resumes.length),
        ctx.db.query("employees").collect().then(employees => employees.length),
        ctx.db.query("kfcpoints").collect().then(kfcPoints => kfcPoints.length),
      ]);

      return {
        pagination: { page, pageSize, totalJobs, totalResumes, totalEmployees, totalKfcPoints },
        recentJobs: jobs
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 5)
          .map(job => ({
            id: job._id,
            title: job.jobTitle,
            location: job.location,
            department: job.department,
            createdAt: job.createdAt,
          })),
        recentResumes: resumes
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 5)
          .map(resume => ({
            id: resume._id,
            name: `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim(),
            email: resume.personalInfo?.email || '',
            skills: (resume.skills || []).slice(0, 3),
            createdAt: resume.createdAt,
          })),
      };
    } catch (error) {
      console.error('Error in getDataSummary:', error);
      // Return lightweight fallback data
      return {
        pagination: { page: 0, pageSize: 100, totalJobs: 0, totalResumes: 0, totalEmployees: 0, totalKfcPoints: 0 },
        recentJobs: [],
        recentResumes: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
});

// Lightweight data summary for fallback when main function fails
export const getLightweightDataSummary = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Only get counts to avoid memory issues
      const [totalJobs, totalResumes, totalEmployees, totalKfcPoints] = await Promise.all([
        ctx.db.query("jobpostings").collect().then(jobs => jobs.length),
        ctx.db.query("resumes").collect().then(resumes => resumes.length),
        ctx.db.query("employees").collect().then(employees => employees.length),
        ctx.db.query("kfcpoints").collect().then(kfcPoints => kfcPoints.length),
      ]);
      
      return {
        pagination: { page: 0, pageSize: 100, totalJobs, totalResumes, totalEmployees, totalKfcPoints },
        recentJobs: [],
        recentResumes: [],
        isLightweight: true
      };
    } catch (error) {
      console.error('Error in getLightweightDataSummary:', error);
      return {
        pagination: { page: 0, pageSize: 100, totalJobs: 0, totalResumes: 0, totalEmployees: 0, totalKfcPoints: 0 },
        recentJobs: [],
        recentResumes: [],
        isLightweight: true,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
});

// Clear all data (admin only)
export const clearAllData = mutation({
  args: {
    confirm: v.boolean(),
  },
  handler: async (ctx, { confirm }) => {
    if (!confirm) {
      throw new Error("Must confirm data deletion");
    }
    
    // Delete records in batches to avoid memory limits
    let deletedCount = 0;
    
    // Delete job postings in batches
    let hasMoreJobs = true;
    while (hasMoreJobs) {
      const jobs = await ctx.db.query("jobpostings").take(100);
      if (jobs.length === 0) {
        hasMoreJobs = false;
        break;
      }
      
      for (const job of jobs) {
        await ctx.db.delete(job._id);
        deletedCount++;
      }
    }
    
    // Delete resumes in batches
    let hasMoreResumes = true;
    while (hasMoreResumes) {
      const resumes = await ctx.db.query("resumes").take(100);
      if (resumes.length === 0) {
        hasMoreResumes = false;
        break;
      }
      
      for (const resume of resumes) {
        await ctx.db.delete(resume._id);
        deletedCount++;
      }
    }
    
    // Delete employees in batches
    let hasMoreEmployees = true;
    while (hasMoreEmployees) {
      const employees = await ctx.db.query("employees").take(100);
      if (employees.length === 0) {
        hasMoreEmployees = false;
        break;
      }
      
      for (const employee of employees) {
        await ctx.db.delete(employee._id);
        deletedCount++;
      }
    }
    
    // Delete KFC points in batches
    let hasMoreKfcPoints = true;
    while (hasMoreKfcPoints) {
      const kfcPoints = await ctx.db.query("kfcpoints").take(100);
      if (kfcPoints.length === 0) {
        hasMoreKfcPoints = false;
        break;
      }
      
      for (const kfcPoint of kfcPoints) {
        await ctx.db.delete(kfcPoint._id);
        deletedCount++;
      }
    }
    
    return {
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} records`,
    };
  },
});

// Export data to JSON
export const exportData = action({
  args: {
    dataType: v.union(v.literal("jobs"), v.literal("resumes"), v.literal("employees"), v.literal("kfcpoints"), v.literal("all")),
  },
  handler: async (ctx, { dataType }) => {
    const data: any = {};
    
    if (dataType === "jobs" || dataType === "all") {
      // Export jobs in batches to avoid memory limits
      const allJobs = [];
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        const batch = await ctx.runQuery(api.dataManagement.getAllJobPostings, { 
          limit: batchSize, 
          offset 
        });
        
        if (batch.jobs.length === 0) break;
        
        allJobs.push(...batch.jobs);
        offset += batchSize;
        
        if (!batch.hasMore) break;
      }
      
      data.jobs = allJobs;
    }
    
    if (dataType === "resumes" || dataType === "all") {
      // Export resumes in batches to avoid memory limits
      const allResumes = [];
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        const batch = await ctx.runQuery(api.dataManagement.getAllResumes, { 
          limit: batchSize, 
          offset 
        });
        
        if (batch.resumes.length === 0) break;
        
        allResumes.push(...batch.resumes);
        offset += batchSize;
        
        if (!batch.hasMore) break;
      }
      
      data.resumes = allResumes;
    }
    
    if (dataType === "employees" || dataType === "all") {
      data.employees = await ctx.runQuery(api.employees.list);
    }
    
    if (dataType === "kfcpoints" || dataType === "all") {
      data.kfcpoints = await ctx.runQuery(api.kfcData.list);
    }
    
    return {
      success: true,
      data,
      exportDate: new Date().toISOString(),
      recordCount: Object.values(data).reduce((total: number, items: any) => {
        return total + (Array.isArray(items) ? items.length : 0);
      }, 0),
    };
  },
});

// Import data from JSON
export const importData = action({
  args: {
    data: v.any(),
    dataType: v.union(v.literal("jobs"), v.literal("resumes"), v.literal("employees"), v.literal("kfcpoints")),
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, { data, dataType, overwrite = false }) => {
    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    try {
      switch (dataType) {
        case "jobs":
          for (const job of data) {
            try {
              if (overwrite) {
                // Check if job exists using pagination to avoid memory limits
                let existingJob = null;
                let offset = 0;
                const batchSize = 1000;
                
                while (!existingJob) {
                  const batch = await ctx.runQuery(api.dataManagement.getAllJobPostings, { 
                    limit: batchSize, 
                    offset 
                  });
                  
                  if (batch.jobs.length === 0) break;
                  
                  existingJob = batch.jobs.find((j: any) => j.jobTitle === job.jobTitle);
                  offset += batchSize;
                  
                  if (!batch.hasMore) break;
                }
                
                if (existingJob) {
                  await ctx.runMutation(api.jobPostings.update, {
                    id: existingJob._id,
                    ...job,
                    updatedAt: Date.now(),
                  });
                } else {
                  await ctx.runMutation(api.jobPostings.insert, {
                    ...job,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  });
                }
              } else {
                await ctx.runMutation(api.jobPostings.insert, {
                  ...job,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              }
              importedCount++;
            } catch (error) {
              errorCount++;
              errors.push(`Job ${job.jobTitle}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          break;
          
        case "resumes":
          for (const resume of data) {
            try {
              if (overwrite) {
                // Check if resume exists using pagination to avoid memory limits
                let existingResume = null;
                let offset = 0;
                const batchSize = 1000;
                
                while (!existingResume) {
                  const batch = await ctx.runQuery(api.dataManagement.getAllResumes, { 
                    limit: batchSize, 
                    offset 
                  });
                  
                  if (batch.resumes.length === 0) break;
                  
                  existingResume = batch.resumes.find((r: any) => r.filename === resume.filename);
                  offset += batchSize;
                  
                  if (!batch.hasMore) break;
                }
                
                if (existingResume) {
                  await ctx.runMutation(api.resumes.update, {
                    id: existingResume._id,
                    ...resume,
                    updatedAt: Date.now(),
                  });
                } else {
                  await ctx.runMutation(api.resumes.insert, {
                    ...resume,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  });
                }
              } else {
                await ctx.runMutation(api.resumes.insert, {
                  ...resume,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              }
              importedCount++;
            } catch (error) {
              errorCount++;
              errors.push(`Resume ${resume.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          break;
          
        case "employees":
          for (const employee of data) {
            try {
              if (overwrite) {
                // Check if employee exists and update
                const existingEmployees = await ctx.runQuery(api.employees.list);
                const existingEmployee = existingEmployees.find((e: any) => e.name === employee.name);
                
                if (existingEmployee) {
                  await ctx.runMutation(api.employees.update, {
                    _id: existingEmployee._id,
                    name: employee.name,
                  });
                } else {
                  await ctx.runMutation(api.employees.insert, {
                    ...employee,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  });
                }
              } else {
                await ctx.runMutation(api.employees.insert, {
                  ...employee,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              }
              importedCount++;
            } catch (error) {
              errorCount++;
              errors.push(`Employee ${employee.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          break;
          
        case "kfcpoints":
          for (const kfcPoint of data) {
            try {
              if (overwrite) {
                // Check if KFC point exists and update
                const existingKfcPoints = await ctx.runQuery(api.kfcData.list);
                const existingKfcPoint = existingKfcPoints.find((k: any) => k.name === kfcPoint.name);
                
                if (existingKfcPoint) {
                  await ctx.runMutation(api.kfcData.update, {
                    _id: existingKfcPoint._id,
                    name: kfcPoint.name,
                    events: kfcPoint.events || [],
                    march_status: kfcPoint.march_status,
                    score: kfcPoint.score || 0,
                  });
                } else {
                  await ctx.runMutation(api.kfcData.insert, {
                    ...kfcPoint,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  });
                }
              } else {
                await ctx.runMutation(api.kfcData.insert, {
                  ...kfcPoint,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              }
              importedCount++;
            } catch (error) {
              errorCount++;
              errors.push(`KFC Point ${kfcPoint.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          break;
      }
      
      return {
        success: true,
        importedCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully imported ${importedCount} records with ${errorCount} errors`,
      };
      
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Functions for embedding regeneration agent
export const getCollectionStats = query({
  args: {
    collectionName: v.union(v.literal("resumes"), v.literal("jobpostings")),
  },
  handler: async (ctx, { collectionName }) => {
    try {
      // Use pagination to avoid memory limits
      let total = 0;
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        const batch = await ctx.db.query(collectionName).take(batchSize);
        if (batch.length === 0) break;
        
        total += batch.length;
        offset += batchSize;
        
        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) break;
      }
      
      return { total };
    } catch (error) {
      throw new Error(`Failed to get stats for ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const getDocumentsWithoutEmbeddings = query({
  args: {
    collectionName: v.union(v.literal("resumes"), v.literal("jobpostings")),
  },
  handler: async (ctx, { collectionName }) => {
    try {
      // Use pagination to avoid memory limits
      const documentsWithoutEmbeddings: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        const batch = await ctx.db.query(collectionName).take(batchSize);
        if (batch.length === 0) break;
        
        const filteredBatch = batch.filter(doc => !doc.embedding || doc.embedding.length === 0);
        documentsWithoutEmbeddings.push(...filteredBatch);
        
        offset += batchSize;
        
        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) break;
      }
      
      return documentsWithoutEmbeddings;
    } catch (error) {
      throw new Error(`Failed to get documents without embeddings from ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const getDocumentsWithOutdatedEmbeddings = query({
  args: {
    collectionName: v.union(v.literal("resumes"), v.literal("jobpostings")),
    maxAge: v.number(), // in milliseconds
  },
  handler: async (ctx, { collectionName, maxAge }) => {
    try {
      // Use pagination to avoid memory limits
      const documentsWithOutdatedEmbeddings: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      const cutoffTime = Date.now() - maxAge;
      
      while (true) {
        const batch = await ctx.db.query(collectionName).take(batchSize);
        if (batch.length === 0) break;
        
        const filteredBatch = batch.filter(doc => 
          doc.embeddingGeneratedAt && doc.embeddingGeneratedAt < cutoffTime
        );
        documentsWithOutdatedEmbeddings.push(...filteredBatch);
        
        offset += batchSize;
        
        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) break;
      }
      
      return documentsWithOutdatedEmbeddings;
    } catch (error) {
      throw new Error(`Failed to get documents with outdated embeddings from ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const getDocumentsWithLowConfidenceEmbeddings = query({
  args: {
    collectionName: v.union(v.literal("resumes"), v.literal("jobpostings")),
    minConfidence: v.number(),
  },
  handler: async (ctx, { collectionName, minConfidence }) => {
    try {
      // Use pagination to avoid memory limits
      const documentsWithLowConfidence: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        const batch = await ctx.db.query(collectionName).take(batchSize);
        if (batch.length === 0) break;
        
        // For now, return documents without confidence scores as they need regeneration
        // In the future, this could check actual confidence values
        const filteredBatch = batch.filter(doc => 
          !doc.embedding || 
          doc.embedding.length === 0 ||
          !doc.embeddingGeneratedAt
        );
        documentsWithLowConfidence.push(...filteredBatch);
        
        offset += batchSize;
        
        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) break;
      }
      
      return documentsWithLowConfidence;
    } catch (error) {
      throw new Error(`Failed to get documents with low confidence embeddings from ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const getDocumentsForEmbeddingUpdate = query({
  args: {
    collectionName: v.union(v.literal("resumes"), v.literal("jobpostings")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { collectionName, limit = 100 }) => {
    try {
      // Use pagination to avoid memory limits
      const documentsNeedingUpdate: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        const batch = await ctx.db.query(collectionName).take(batchSize);
        if (batch.length === 0) break;
        
        // Get documents that need embedding updates
        const filteredBatch = batch.filter(doc => 
          !doc.embedding || 
          doc.embedding.length === 0 ||
          !doc.embeddingGeneratedAt ||
          (doc.embeddingGeneratedAt && doc.embeddingGeneratedAt < Date.now() - (30 * 24 * 60 * 60 * 1000)) // 30 days old
        );
        
        documentsNeedingUpdate.push(...filteredBatch);
        
        // Stop if we've reached the limit
        if (documentsNeedingUpdate.length >= limit) {
          documentsNeedingUpdate.splice(limit);
          break;
        }
        
        offset += batchSize;
        
        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) break;
      }
      
      return documentsNeedingUpdate.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get documents for embedding update from ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});
