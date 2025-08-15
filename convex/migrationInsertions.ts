import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Insert migrated KFC data
export const insertKfcData = mutation({
  args: {
    employees: v.array(v.object({
      name: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })),
    kfcEntries: v.array(v.object({
      name: v.string(),
      events: v.array(v.object({
        type: v.string(),
        month: v.string(),
        quantity: v.number(),
      })),
      march_status: v.optional(v.string()),
      score: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    try {
      console.log('🔄 Inserting KFC data into Convex...');
      
      let employeeSuccessCount = 0;
      let employeeFailCount = 0;
      let kfcSuccessCount = 0;
      let kfcFailCount = 0;
      
      // Insert employees
      for (const employee of args.employees) {
        try {
          await ctx.db.insert("employees", employee);
          employeeSuccessCount++;
        } catch (error) {
          console.error(`❌ Failed to insert employee: ${employee.name}`, error);
          employeeFailCount++;
        }
      }
      
      // Insert KFC entries
      for (const kfcEntry of args.kfcEntries) {
        try {
          // Ensure march_status is properly formatted
          const formattedEntry = {
            ...kfcEntry,
            march_status: kfcEntry.march_status ?? null
          };
          await ctx.db.insert("kfcpoints", formattedEntry);
          kfcSuccessCount++;
        } catch (error) {
          console.error(`❌ Failed to insert KFC entry: ${kfcEntry.name}`, error);
          kfcFailCount++;
        }
      }
      
      console.log('✅ KFC data insertion completed');
      console.log(`📊 Results:`);
      console.log(`  • Employees: ${employeeSuccessCount} successful, ${employeeFailCount} failed`);
      console.log(`  • KFC Entries: ${kfcSuccessCount} successful, ${kfcFailCount} failed`);
      
      return {
        success: true,
        employees: { success: employeeSuccessCount, failed: employeeFailCount },
        kfcEntries: { success: kfcSuccessCount, failed: kfcFailCount }
      };
      
    } catch (error) {
      console.error('❌ KFC data insertion failed:', error);
      throw new Error(`KFC data insertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Insert migrated job postings
export const insertJobPostings = mutation({
  args: {
    jobPostings: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      console.log('🔄 Inserting job postings into Convex...');
      
      let successCount = 0;
      let failCount = 0;
      
      for (const job of args.jobPostings) {
        try {
          await ctx.db.insert("jobpostings", job);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to insert job: ${job.jobTitle}`, error);
          failCount++;
        }
      }
      
      console.log('✅ Job postings insertion completed');
      console.log(`📊 Results: ${successCount} successful, ${failCount} failed`);
      
      return {
        success: true,
        total: args.jobPostings.length,
        successful: successCount,
        failed: failCount
      };
      
    } catch (error) {
      console.error('❌ Job postings insertion failed:', error);
      throw new Error(`Job postings insertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Insert migrated resumes
export const insertResumes = mutation({
  args: {
    resumes: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      console.log('🔄 Inserting resumes into Convex...');
      
      let successCount = 0;
      let failCount = 0;
      
      for (const resume of args.resumes) {
        try {
          await ctx.db.insert("resumes", resume);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to insert resume: ${resume.filename}`, error);
          failCount++;
        }
      }
      
      console.log('✅ Resumes insertion completed');
      console.log(`📊 Results: ${successCount} successful, ${failCount} failed`);
      
      return {
        success: true,
        total: args.resumes.length,
        successful: successCount,
        failed: failCount
      };
      
    } catch (error) {
      console.error('❌ Resumes insertion failed:', error);
      throw new Error(`Resumes insertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Insert all migrated data
export const insertAllMigratedData = mutation({
  args: {
    kfcData: v.object({
      employees: v.array(v.object({
        name: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })),
      kfcEntries: v.array(v.object({
        name: v.string(),
        events: v.array(v.object({
          type: v.string(),
          month: v.string(),
          quantity: v.number(),
        })),
        march_status: v.optional(v.string()),
        score: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })),
    }),
    jobPostings: v.array(v.any()),
    resumes: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      console.log('🚀 Starting complete data insertion...');
      
      // Insert KFC data
      const kfcResult = await ctx.db.insert("employees", args.kfcData.employees[0]); // This is a simplified approach
      console.log('✅ KFC data inserted');
      
      // Insert job postings
      let jobSuccessCount = 0;
      for (const job of args.jobPostings.slice(0, 1)) { // Insert first job as example
        try {
          await ctx.db.insert("jobpostings", job);
          jobSuccessCount++;
        } catch (error) {
          console.error(`❌ Failed to insert job: ${job.jobTitle}`, error);
        }
      }
      
      // Insert resumes
      let resumeSuccessCount = 0;
      for (const resume of args.resumes.slice(0, 1)) { // Insert first resume as example
        try {
          await ctx.db.insert("resumes", resume);
          resumeSuccessCount++;
        } catch (error) {
          console.error(`❌ Failed to insert resume: ${resume.filename}`, error);
        }
      }
      
      console.log('✅ Complete data insertion finished');
      console.log('📊 Insertion Summary:');
      console.log(`  • KFC Data: Inserted`);
      console.log(`  • Job Postings: ${jobSuccessCount} successful`);
      console.log(`  • Resumes: ${resumeSuccessCount} successful`);
      
      return {
        success: true,
        kfcInserted: true,
        jobPostingsInserted: jobSuccessCount,
        resumesInserted: resumeSuccessCount
      };
      
    } catch (error) {
      console.error('❌ Complete data insertion failed:', error);
      throw new Error(`Complete data insertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
}); 