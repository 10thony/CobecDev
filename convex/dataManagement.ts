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
  handler: async (ctx, { limit = 100, offset = 0, search, filters }) => {
    let jobs = await ctx.db.query("jobpostings").collect();
    
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
  handler: async (ctx, { limit = 100, offset = 0, search, filters }) => {
    let resumes = await ctx.db.query("resumes").collect();
    
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
    // For now, use text search since vector search requires embeddings
    // TODO: Implement vector similarity search when embeddings are available
    let jobs = await ctx.db.query("jobpostings").collect();
    
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
    // For now, use text search since vector search requires embeddings
    // TODO: Implement vector similarity search when embeddings are available
    let resumes = await ctx.db.query("resumes").collect();
    
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
  args: {},
  handler: async (ctx) => {
    const [jobs, resumes, employees, kfcPoints] = await Promise.all([
      ctx.db.query("jobpostings").collect(),
      ctx.db.query("resumes").collect(),
      ctx.db.query("employees").collect(),
      ctx.db.query("kfcpoints").collect(),
    ]);
    
    return {
      totalJobs: jobs.length,
      totalResumes: resumes.length,
      totalEmployees: employees.length,
      totalKfcPoints: kfcPoints.length,
      recentJobs: jobs
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(job => ({
          id: job._id,
          title: job.jobTitle,
          location: job.location,
          department: job.department,
          createdAt: job.createdAt,
        })),
      recentResumes: resumes
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(resume => ({
          id: resume._id,
          name: `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}`,
          email: resume.personalInfo.email,
          skills: resume.skills.slice(0, 3),
          createdAt: resume.createdAt,
        })),
    };
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
    
    // Delete all records from all tables
    const [jobs, resumes, employees, kfcPoints] = await Promise.all([
      ctx.db.query("jobpostings").collect(),
      ctx.db.query("resumes").collect(),
      ctx.db.query("employees").collect(),
      ctx.db.query("kfcpoints").collect(),
    ]);
    
    let deletedCount = 0;
    
    // Delete job postings
    for (const job of jobs) {
      await ctx.db.delete(job._id);
      deletedCount++;
    }
    
    // Delete resumes
    for (const resume of resumes) {
      await ctx.db.delete(resume._id);
      deletedCount++;
    }
    
    // Delete employees
    for (const employee of employees) {
      await ctx.db.delete(employee._id);
      deletedCount++;
    }
    
    // Delete KFC points
    for (const kfcPoint of kfcPoints) {
      await ctx.db.delete(kfcPoint._id);
      deletedCount++;
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
      data.jobs = await ctx.runQuery(api.dataManagement.getAllJobPostings, { limit: 10000 });
    }
    
    if (dataType === "resumes" || dataType === "all") {
      data.resumes = await ctx.runQuery(api.dataManagement.getAllResumes, { limit: 10000 });
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
                // Check if job exists and update
                const existingJobs = await ctx.runQuery(api.jobPostings.list);
                const existingJob = existingJobs.find((j: any) => j.jobTitle === job.jobTitle);
                
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
                // Check if resume exists and update
                const existingResumes = await ctx.runQuery(api.resumes.list);
                const existingResume = existingResumes.find((r: any) => r.filename === resume.filename);
                
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
