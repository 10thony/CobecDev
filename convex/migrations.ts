"use node";
import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { MongoClient, ObjectId } from "mongodb";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// MongoDB document interfaces
interface MongoJobPosting {
  _id: ObjectId;
  jobTitle: string;
  location?: string;
  salary?: string;
  openDate?: string;
  closeDate?: string;
  jobLink?: string;
  jobType?: string;
  jobSummary?: string;
  duties?: string;
  requirements?: string;
  qualifications?: string;
  education?: string;
  howToApply?: string;
  additionalInformation?: string;
  department?: string;
  seriesGrade?: string;
  travelRequired?: string;
  workSchedule?: string;
  securityClearance?: string;
  experienceRequired?: string;
  educationRequired?: string;
  applicationDeadline?: string;
  contactInfo?: string;
  createdAt?: Date;
  metadata?: {
    originalIndex?: number;
    sourceFile?: string;
  };
}

interface MongoResume {
  _id: ObjectId;
  filename: string;
  originalText?: string;
  personalInfo?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    yearsOfExperience?: number;
  };
  professionalSummary?: string;
  education?: string[];
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    duration?: string;
    responsibilities?: string[];
    description?: string;
  }>;
  skills?: string[];
  certifications?: string;
  professionalMemberships?: string;
  securityClearance?: string;
  createdAt?: Date;
  metadata?: {
    filePath?: string;
    parsedAt?: Date;
  };
}

// MongoDB credentials
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let uri: string;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  uri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

// Helper function to create MongoDB client
function createMongoClient() {
  return new MongoClient(uri, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    maxPoolSize: 1,
    minPoolSize: 0,
    maxIdleTimeMS: 30000,
  });
}

// Migrate job postings with vector embeddings
export const migrateJobPostings = action({
  args: { 
    batchSize: v.optional(v.number()),
    startFrom: v.optional(v.string()),
  },
  handler: async (ctx, { batchSize = 100, startFrom = null }) => {
    let client;
    
    try {
      console.log(`Starting job postings migration with batch size: ${batchSize}`);
      
      // Connect to MongoDB
      client = createMongoClient();
      await client.connect();
      
      const db = client.db(MONGODB_DATABASE);
      const collection = db.collection("jobpostings");
      
      // Build query
      let query = {};
      if (startFrom) {
        try {
          query = { _id: { $gt: new ObjectId(startFrom) } };
        } catch (e) {
          console.log(`Invalid ObjectId format: ${startFrom}, starting from beginning`);
        }
      }
      
      const documents = await collection
        .find(query)
        .limit(batchSize)
        .toArray() as MongoJobPosting[];
      
      console.log(`Found ${documents.length} job postings to migrate`);
      
      let lastId: string | null = null;
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const doc of documents) {
        try {
          // Check if job already exists in Convex
          const existingJobs = await ctx.runQuery(api.convexVectorSearch.getJobById, { 
            jobId: doc.jobTitle 
          });
          
          if (existingJobs) {
            console.log(`Job "${doc.jobTitle}" already exists, skipping...`);
            continue;
          }
          
          // Generate embedding for the job description
          const textToEmbed = `${doc.jobTitle} ${doc.jobSummary || ''} ${doc.requirements || ''} ${doc.duties || ''}`;
          const embedding = await ctx.runAction(api.convexVectorSearch.generateEmbeddings, { 
            text: textToEmbed 
          });
          
          // Create searchable text
          const searchableText = [
            doc.jobTitle,
            doc.jobSummary,
            doc.requirements,
            doc.duties,
            doc.qualifications,
            doc.education,
            doc.department,
            doc.seriesGrade
          ].filter(Boolean).join(' ');
          
          // Extract skills from the text
          const extractedSkills = extractSkillsFromText(searchableText);
          
          // Insert into Convex
          await ctx.runMutation(api.jobPostings.insert, {
            jobTitle: doc.jobTitle || 'Unknown Title',
            location: doc.location || 'Unknown Location',
            salary: doc.salary || 'Not specified',
            openDate: doc.openDate || '',
            closeDate: doc.closeDate || '',
            jobLink: doc.jobLink || '',
            jobType: doc.jobType || 'Full-time',
            jobSummary: doc.jobSummary || '',
            duties: doc.duties || '',
            requirements: doc.requirements || '',
            qualifications: doc.qualifications || '',
            education: Array.isArray(doc.education) ? doc.education : [doc.education || ''],
            howToApply: doc.howToApply || '',
            additionalInformation: doc.additionalInformation || '',
            department: doc.department || '',
            seriesGrade: doc.seriesGrade || '',
            travelRequired: doc.travelRequired || '',
            workSchedule: doc.workSchedule || '',
            securityClearance: doc.securityClearance || '',
            experienceRequired: doc.experienceRequired || '',
            educationRequired: doc.educationRequired || '',
            applicationDeadline: doc.applicationDeadline || '',
            contactInfo: doc.contactInfo || '',
            searchableText,
            extractedSkills,
            embedding,
            metadata: {
              originalIndex: doc.metadata?.originalIndex || 0,
              importedAt: Date.now(),
                              sourceFile: doc.metadata?.sourceFile || 'migration',
              dataType: 'jobposting'
            },
            createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
            updatedAt: Date.now(),
          });
          
          migratedCount++;
          lastId = doc._id.toString();
          
          if (migratedCount % 10 === 0) {
            console.log(`Migrated ${migratedCount} job postings...`);
          }
          
        } catch (error) {
          console.error(`Error migrating job posting ${doc.jobTitle}:`, error);
          errorCount++;
        }
      }
      
      await client.close();
      
      console.log(`Job postings migration completed. Migrated: ${migratedCount}, Errors: ${errorCount}`);
      
      return {
        migrated: migratedCount,
        errors: errorCount,
        lastId,
        hasMore: documents.length === batchSize,
      };
      
    } catch (error) {
      console.error('Error in job postings migration:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Migrate resumes with vector embeddings
export const migrateResumes = action({
  args: { 
    batchSize: v.optional(v.number()),
    startFrom: v.optional(v.string()),
  },
  handler: async (ctx, { batchSize = 100, startFrom = null }) => {
    let client;
    
    try {
      console.log(`Starting resumes migration with batch size: ${batchSize}`);
      
      // Connect to MongoDB
      client = createMongoClient();
      await client.connect();
      
      const db = client.db(MONGODB_DATABASE);
      const collection = db.collection("resumes");
      
      // Build query
      let query = {};
      if (startFrom) {
        try {
          query = { _id: { $gt: new ObjectId(startFrom) } };
        } catch (e) {
          console.log(`Invalid ObjectId format: ${startFrom}, starting from beginning`);
        }
      }
      
      const documents = await collection
        .find(query)
        .limit(batchSize)
        .toArray() as MongoResume[];
      
      console.log(`Found ${documents.length} resumes to migrate`);
      
      let lastId: string | null = null;
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const doc of documents) {
        try {
          // Check if resume already exists in Convex
          const existingResumes = await ctx.runQuery(api.convexVectorSearch.getResumeById, { 
            resumeId: doc.personalInfo?.email || doc.filename 
          });
          
          if (existingResumes) {
            console.log(`Resume "${doc.filename}" already exists, skipping...`);
            continue;
          }
          
          // Generate embedding for resume content
          const textToEmbed = `${doc.professionalSummary || ''} ${doc.skills?.join(" ") || ''} ${doc.education?.join(" ") || ''} ${doc.experience?.map((exp) => exp.description).join(" ") || ''}`;
          const embedding = await ctx.runAction(api.convexVectorSearch.generateEmbeddings, { 
            text: textToEmbed 
          });
          
          // Create searchable text
          const searchableText = [
            doc.professionalSummary,
            doc.skills?.join(' '),
            doc.education?.join(' '),
            doc.certifications,
            doc.securityClearance,
            doc.experience?.map((exp) => `${exp.title} ${exp.company} ${exp.responsibilities?.join(' ')}`).join(' '),
            doc.personalInfo ? `${doc.personalInfo.firstName} ${doc.personalInfo.lastName}` : '',
            doc.originalText
          ].filter(Boolean).join(' ');
          
          // Extract skills from the text
          const extractedSkills = extractSkillsFromText(searchableText);
          
          // Insert into Convex
          await ctx.runMutation(api.resumes.insert, {
            filename: doc.filename || 'unknown',
            originalText: doc.originalText || '',
            personalInfo: {
              firstName: doc.personalInfo?.firstName || '',
              middleName: doc.personalInfo?.middleName || '',
              lastName: doc.personalInfo?.lastName || '',
              email: doc.personalInfo?.email || '',
              phone: doc.personalInfo?.phone || '',
              yearsOfExperience: doc.personalInfo?.yearsOfExperience || 0,
            },
            professionalSummary: doc.professionalSummary || '',
            education: doc.education || [],
            experience: (doc.experience || []).map((exp: { title?: string; company?: string; location?: string; duration?: string; responsibilities?: string[]; description?: string }) => ({
              title: exp.title || '',
              company: exp.company || '',
              location: exp.location || '',
              duration: exp.duration || '',
              responsibilities: exp.responsibilities || [],
            })),
            skills: doc.skills || [],
            certifications: doc.certifications || '',
            professionalMemberships: doc.professionalMemberships || '',
            securityClearance: doc.securityClearance || '',
            searchableText,
            extractedSkills,
            embedding,
            metadata: {
              filePath: doc.metadata?.filePath || '',
              fileName: doc.filename || 'unknown',
              importedAt: Date.now(),
              parsedAt: doc.metadata?.parsedAt ? new Date(doc.metadata.parsedAt).getTime() : Date.now(),
            },
            createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
            updatedAt: Date.now(),
          });
          
          migratedCount++;
          lastId = doc._id.toString();
          
          if (migratedCount % 10 === 0) {
            console.log(`Migrated ${migratedCount} resumes...`);
          }
          
        } catch (error) {
          console.error(`Error migrating resume ${doc.filename}:`, error);
          errorCount++;
        }
      }
      
      await client.close();
      
      console.log(`Resumes migration completed. Migrated: ${migratedCount}, Errors: ${errorCount}`);
      
      return {
        migrated: migratedCount,
        errors: errorCount,
        lastId,
        hasMore: documents.length === batchSize,
      };
      
    } catch (error) {
      console.error('Error in resumes migration:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Migrate cobecadmins from workdemos JSON
export const migrateCobecAdmins = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Starting cobecadmins migration...');
      
      // Import the workdemos data
      const cobecAdminsData = [
        { clerkUserId: "user_2zK3951nbXRIwNsPwKYvVQAj0nu" },
        { clerkUserId: "user_2yeq7o5pXddjNeLFDpoz5tTwkWS" },
        { clerkUserId: "user_2zH6JiYnykjdwTcTpl7sRU0pKtW" },
        { clerkUserId: "user_2yhAe3Cu7CnonTn4wyRUzZIqIaF" }
      ];
      
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const admin of cobecAdminsData) {
        try {
          // Check if admin already exists
          const existingAdmin = await ctx.runQuery(api.cobecAdmins.getByClerkUserId, { 
            clerkUserId: admin.clerkUserId 
          });
          
          if (existingAdmin) {
            console.log(`Cobec admin ${admin.clerkUserId} already exists, skipping...`);
            continue;
          }
          
          // Insert into Convex
          await ctx.runMutation(api.cobecAdmins.insert, {
            clerkUserId: admin.clerkUserId,
            name: '',
            email: '',
            role: 'admin',
          });
          
          migratedCount++;
          
        } catch (error) {
          console.error(`Error migrating cobec admin ${admin.clerkUserId}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Cobec admins migration completed. Migrated: ${migratedCount}, Errors: ${errorCount}`);
      
      return {
        migrated: migratedCount,
        errors: errorCount,
        total: cobecAdminsData.length
      };
      
    } catch (error) {
      console.error('Error in cobecadmins migration:', error);
      throw error;
    }
  },
});

// Migrate employees from workdemos JSON
export const migrateEmployees = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Starting employees migration...');
      
      // Import the workdemos data - this would normally come from a file
      // For now, we'll create a sample structure based on the schema
      const employeesData = [
        { name: "Joe Carino" },
        { name: "Scott Gardner" },
        { name: "Dexter Ithal" },
        { name: "Michelle Ehlinger" },
        { name: "Annette Barlia" },
        { name: "Brannon Johanson" },
        { name: "Matt Chesnut" },
        { name: "Shawn Sanchez" }
      ];
      
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const employee of employeesData) {
        try {
          // Check if employee already exists
          const existingEmployee = await ctx.runQuery(api.employees.getByName, { 
            name: employee.name 
          });
          
          if (existingEmployee) {
            console.log(`Employee ${employee.name} already exists, skipping...`);
            continue;
          }
          
          // Insert into Convex
          await ctx.runMutation(api.employees.insert, {
            name: employee.name,
          });
          
          migratedCount++;
          
        } catch (error) {
          console.error(`Error migrating employee ${employee.name}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Employees migration completed. Migrated: ${migratedCount}, Errors: ${errorCount}`);
      
      return {
        migrated: migratedCount,
        errors: errorCount,
        total: employeesData.length
      };
      
    } catch (error) {
      console.error('Error in employees migration:', error);
      throw error;
    }
  },
});

// Migrate KFC points from workdemos JSON
export const migrateKfcPoints = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Starting KFC points migration...');
      
      // Import the workdemos data - this would normally come from a file
      // For now, we'll create a sample structure based on the schema
      const kfcPointsData = [
        {
          name: "Joe Carino",
          events: [{ type: "Team", month: "MARCH" }],
          march_status: null,
          score: 10
        },
        {
          name: "Scott Gardner",
          events: [{ type: "Team", month: "MARCH" }],
          march_status: null,
          score: 10
        },
        {
          name: "Dexter Ithal",
          events: [
            { type: "Team", month: "MARCH" },
            { type: "Individ", month: "JULY" },
            { type: "Team", month: "DEC" }
          ],
          march_status: "May - TEAM",
          score: 60
        }
      ];
      
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const kfcPoint of kfcPointsData) {
        try {
          // Check if KFC point already exists
          const existingKfcPoint = await ctx.runQuery(api.kfcData.getByName, { 
            name: kfcPoint.name 
          });
          
          if (existingKfcPoint) {
            console.log(`KFC point for ${kfcPoint.name} already exists, skipping...`);
            continue;
          }
          
          // Insert into Convex
          await ctx.runMutation(api.kfcData.insert, {
            name: kfcPoint.name,
            events: kfcPoint.events,
            march_status: kfcPoint.march_status ?? null,
            score: kfcPoint.score,
          });
          
          migratedCount++;
          
        } catch (error) {
          console.error(`Error migrating KFC point for ${kfcPoint.name}:`, error);
          errorCount++;
        }
      }
      
      console.log(`KFC points migration completed. Migrated: ${migratedCount}, Errors: ${errorCount}`);
      
      return {
        migrated: migratedCount,
        errors: errorCount,
        total: kfcPointsData.length
      };
      
    } catch (error) {
      console.error('Error in KFC points migration:', error);
      throw error;
    }
  },
});

// Comprehensive migration runner
export const runFullMigration = action({
  args: {
    includeJobs: v.optional(v.boolean()),
    includeResumes: v.optional(v.boolean()),
    includeCobecAdmins: v.optional(v.boolean()),
    includeEmployees: v.optional(v.boolean()),
    includeKfcPoints: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { 
    includeJobs = true, 
    includeResumes = true, 
    includeCobecAdmins = true, 
    includeEmployees = true, 
    includeKfcPoints = true,
    batchSize = 100 
  }) => {
    try {
      console.log('Starting comprehensive migration...');
      
      const results: any = {
        startTime: Date.now(),
        migrations: {},
        summary: {
          totalMigrated: 0,
          totalErrors: 0,
          success: true
        }
      };
      
      // Run cobecadmins migration
      if (includeCobecAdmins) {
        try {
          console.log('Migrating cobecadmins...');
          const cobecResult = await ctx.runAction(api.migrations.migrateCobecAdmins, {});
          results.migrations.cobecAdmins = cobecResult;
          results.summary.totalMigrated += cobecResult.migrated;
          results.summary.totalErrors += cobecResult.errors;
        } catch (error) {
          console.error('Cobecadmins migration failed:', error);
          results.migrations.cobecAdmins = { error: error instanceof Error ? error.message : 'Unknown error' };
          results.summary.success = false;
        }
      }
      
      // Run employees migration
      if (includeEmployees) {
        try {
          console.log('Migrating employees...');
          const employeesResult = await ctx.runAction(api.migrations.migrateEmployees, {});
          results.migrations.employees = employeesResult;
          results.summary.totalMigrated += employeesResult.migrated;
          results.summary.totalErrors += employeesResult.errors;
        } catch (error) {
          console.error('Employees migration failed:', error);
          results.migrations.employees = { error: error instanceof Error ? error.message : 'Unknown error' };
          results.summary.success = false;
        }
      }
      
      // Run KFC points migration
      if (includeKfcPoints) {
        try {
          console.log('Migrating KFC points...');
          const kfcResult = await ctx.runAction(api.migrations.migrateKfcPoints, {});
          results.migrations.kfcPoints = kfcResult;
          results.summary.totalMigrated += kfcResult.migrated;
          results.summary.totalErrors += kfcResult.errors;
        } catch (error) {
          console.error('KFC points migration failed:', error);
          results.migrations.kfcPoints = { error: error instanceof Error ? error.message : 'Unknown error' };
          results.summary.success = false;
        }
      }
      
      // Run job postings migration
      if (includeJobs) {
        try {
          console.log('Migrating job postings...');
          const jobsResult = await ctx.runAction(api.migrations.migrateJobPostings, { batchSize });
          results.migrations.jobPostings = jobsResult;
          results.summary.totalMigrated += jobsResult.migrated;
          results.summary.totalErrors += jobsResult.errors;
        } catch (error) {
          console.error('Job postings migration failed:', error);
          results.migrations.jobPostings = { error: error instanceof Error ? error.message : 'Unknown error' };
          results.summary.success = false;
        }
      }
      
      // Run resumes migration
      if (includeResumes) {
        try {
          console.log('Migrating resumes...');
          const resumesResult = await ctx.runAction(api.migrations.migrateResumes, { batchSize });
          results.migrations.resumes = resumesResult;
          results.summary.totalMigrated += resumesResult.migrated;
          results.summary.totalErrors += resumesResult.errors;
        } catch (error) {
          console.error('Resumes migration failed:', error);
          results.migrations.resumes = { error: error instanceof Error ? error.message : 'Unknown error' };
          results.summary.success = false;
        }
      }
      
      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;
      
      console.log('Comprehensive migration completed:', results);
      
      return results;
      
    } catch (error) {
      console.error('Error in comprehensive migration:', error);
      throw error;
    }
  },
});

// Extract skills from text
function extractSkillsFromText(text: string): string[] {
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
  
  const textLower = text.toLowerCase();
  const foundSkills = commonSkills.filter(skill => 
    textLower.includes(skill.toLowerCase())
  );
  
  return foundSkills;
}

// Migration status return type
type MigrationStatus = {
  convex: { jobs: number; resumes: number };
  mongodb: { jobs: number; resumes: number };
  progress: { jobs: number; resumes: number };
};

// Get migration status
export const getMigrationStatus = action({
  args: {},
  handler: async (ctx): Promise<MigrationStatus> => {
    try {
      // Count records in Convex
      const convexJobs = await ctx.runQuery(api.jobPostings.list);
      const convexResumes = await ctx.runQuery(api.resumes.list);
      
      // Count records in MongoDB
      let client;
      let mongoJobCount = 0;
      let mongoResumeCount = 0;
      
      try {
        client = createMongoClient();
        await client.connect();
        
        const db = client.db(MONGODB_DATABASE);
        mongoJobCount = await db.collection("jobpostings").countDocuments();
        mongoResumeCount = await db.collection("resumes").countDocuments();
        
        await client.close();
      } catch (error) {
        console.error('Error connecting to MongoDB for status check:', error);
      }
      
      return {
        convex: {
          jobs: convexJobs.length,
          resumes: convexResumes.length,
        },
        mongodb: {
          jobs: mongoJobCount,
          resumes: mongoResumeCount,
        },
        progress: {
          jobs: mongoJobCount > 0 ? (convexJobs.length / mongoJobCount) * 100 : 0,
          resumes: mongoResumeCount > 0 ? (convexResumes.length / mongoResumeCount) * 100 : 0,
        }
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      throw error;
    }
  },
});

// Clean up old MongoDB data after successful migration
export const cleanupMongoDBData = action({
  args: {
    confirm: v.boolean(),
  },
  handler: async (ctx, { confirm }) => {
    if (!confirm) {
      throw new Error("Must confirm cleanup operation");
    }
    
    let client;
    
    try {
      // Verify migration is complete
      const status = await ctx.runAction(api.migrations.getMigrationStatus, {});
      
      if (status.progress.jobs < 95 || status.progress.resumes < 95) {
        throw new Error("Migration not complete. Cannot cleanup MongoDB data yet.");
      }
      
      console.log("Migration complete. Proceeding with MongoDB cleanup...");
      
      // Connect to MongoDB
      client = createMongoClient();
      await client.connect();
      
      const db = client.db(MONGODB_DATABASE);
      
      // Drop collections (this will remove all data)
      await db.collection("jobpostings").drop();
      await db.collection("resumes").drop();
      
      console.log("MongoDB collections dropped successfully");
      
      return {
        success: true,
        message: "MongoDB data cleaned up successfully",
        droppedCollections: ["jobpostings", "resumes"]
      };
      
    } catch (error) {
      console.error('Error cleaning up MongoDB data:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
}); 