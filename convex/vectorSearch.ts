"use node";
import { action, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { api } from "./_generated/api";

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

// Generate embedding for search query
async function generateQueryEmbedding(query: string) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query.trim(),
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
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

// Helper function to recursively convert all ObjectId fields to strings
function convertMongoDocument(doc: any): any {
  if (!doc) return doc;

  // If this is an ObjectId, convert to string
  if (doc.constructor && doc.constructor.name === 'ObjectId' && doc.toString) {
    return doc.toString();
  }

  // If this is an array, recursively convert each element
  if (Array.isArray(doc)) {
    return doc.map(item => convertMongoDocument(item));
  }

  // If this is an object, recursively convert each property
  if (typeof doc === 'object') {
    const newDoc: any = {};
    for (const [key, value] of Object.entries(doc)) {
      newDoc[key] = convertMongoDocument(value);
    }
    return newDoc;
  }

  // Otherwise, return as is
  return doc;
}

// Helper function to map resume data from MongoDB structure to frontend structure
function mapResumeDataForFrontend(resume: any): any {
  if (!resume) return resume;

  console.log('Mapping resume data for frontend:', {
    _id: resume._id,
    hasPersonalInfo: !!resume.personalInfo,
    hasProcessedMetadata: !!resume.processedMetadata,
    personalInfoKeys: resume.personalInfo ? Object.keys(resume.personalInfo) : [],
    processedMetadataKeys: resume.processedMetadata ? Object.keys(resume.processedMetadata) : [],
    personalInfoContent: resume.personalInfo,
    processedMetadataContent: resume.processedMetadata,
    hasProfessionalSummary: !!resume.professionalSummary,
    hasExperience: !!resume.experience,
    hasEducation: !!resume.education,
    hasSkills: !!resume.skills,
    originalTextPreview: resume.originalText ? resume.originalText.substring(0, 200) + '...' : 'No original text'
  });

  // Convert ObjectIds first
  const convertedResume = convertMongoDocument(resume);

  // Extract name from various possible sources
  let candidateName = 'Unknown Candidate';
  if (convertedResume.personalInfo?.firstName && convertedResume.personalInfo?.lastName) {
    candidateName = `${convertedResume.personalInfo.firstName} ${convertedResume.personalInfo.lastName}`.trim();
  } else if (convertedResume.processedMetadata?.name) {
    candidateName = convertedResume.processedMetadata.name;
  } else if (convertedResume.filename) {
    // Try to extract name from filename
    const nameFromFile = convertedResume.filename.replace(/\.(docx|pdf|txt)$/i, '').replace(/_/g, ' ');
    if (nameFromFile && nameFromFile !== convertedResume.filename) {
      candidateName = nameFromFile;
    }
  }

  // Extract email from various possible sources
  let email = 'N/A';
  if (convertedResume.personalInfo?.email) {
    email = convertedResume.personalInfo.email;
  } else if (convertedResume.processedMetadata?.email) {
    email = convertedResume.processedMetadata.email;
  } else if (convertedResume.originalText) {
    // Try to extract email from original text
    const emailMatch = convertedResume.originalText.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      email = emailMatch[0];
    }
  }

  // Extract phone from various possible sources
  let phone = 'N/A';
  if (convertedResume.personalInfo?.phone) {
    phone = convertedResume.personalInfo.phone;
  } else if (convertedResume.processedMetadata?.phone) {
    phone = convertedResume.processedMetadata.phone;
  } else if (convertedResume.originalText) {
    // Try to extract phone from original text
    const phoneMatch = convertedResume.originalText.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      phone = phoneMatch[0];
    }
  }

  // Extract experience years
  let yearsOfExperience = 0;
  if (convertedResume.personalInfo?.yearsOfExperience) {
    yearsOfExperience = convertedResume.personalInfo.yearsOfExperience;
  } else if (convertedResume.processedMetadata?.yearsOfExperience) {
    yearsOfExperience = convertedResume.processedMetadata.yearsOfExperience;
  }

  // Create the mapped structure that matches what the frontend expects
  const mappedResume = {
    _id: convertedResume._id,
    filename: convertedResume.filename,
    originalText: convertedResume.originalText,
    
    // Map personalInfo to processedMetadata structure
    processedMetadata: {
      name: candidateName,
      email: email,
      phone: phone,
      location: convertedResume.personalInfo?.location || convertedResume.processedMetadata?.location || 'N/A',
      yearsOfExperience: yearsOfExperience,
      education: convertedResume.education || convertedResume.processedMetadata?.education || [],
      skills: convertedResume.skills || convertedResume.processedMetadata?.skills || []
    },

    // Map other fields
    professionalSummary: convertedResume.professionalSummary || '',
    workExperience: convertedResume.experience ? 
      convertedResume.experience.map((exp: any) => 
        `${exp.title || ''} at ${exp.company || ''} (${exp.duration || ''})\n${(exp.responsibilities || []).join('\n')}`
      ).join('\n\n') : '',
    education: convertedResume.education ? 
      (Array.isArray(convertedResume.education) ? convertedResume.education.join('\n') : convertedResume.education) : '',
    skills: convertedResume.skills ? 
      (Array.isArray(convertedResume.skills) ? convertedResume.skills.join(', ') : convertedResume.skills) : '',
    certifications: convertedResume.certifications || 'N/A',
    professionalMemberships: convertedResume.professionalMemberships || 'N/A',
    securityClearance: convertedResume.securityClearance || 'N/A',
    
    // Preserve other fields
    searchableText: convertedResume.searchableText,
    extractedSkills: convertedResume.extractedSkills,
    embedding: convertedResume.embedding,
    _metadata: convertedResume._metadata,
    processedAt: convertedResume.processedAt,
    embeddingGeneratedAt: convertedResume.embeddingGeneratedAt,
    
    // Preserve any similarity data from search results
    similarity: convertedResume.similarity,
    baseSimilarity: convertedResume.baseSimilarity,
    hasRequiredSkills: convertedResume.hasRequiredSkills,
    skillMatch: convertedResume.skillMatch,
    skillScore: convertedResume.skillScore
  };

  console.log('Mapped resume data result:', {
    _id: mappedResume._id,
    name: mappedResume.processedMetadata.name,
    email: mappedResume.processedMetadata.email,
    phone: mappedResume.processedMetadata.phone,
    hasProfessionalSummary: !!mappedResume.professionalSummary,
    hasWorkExperience: !!mappedResume.workExperience,
    hasEducation: !!mappedResume.education,
    hasSkills: !!mappedResume.skills
  });

  return mappedResume;
}

// Generate embeddings for text
export const generateEmbeddings = action({
  args: {
    text: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.array(v.number()),
  handler: async (ctx: any, args: any) => {
    try {
      const model = args.model || 'text-embedding-ada-002';
      const embedding = await generateQueryEmbedding(args.text);
      return embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  },
});

// Calculate similarity between two texts
export const calculateSimilarity = action({
  args: {
    text1: v.string(),
    text2: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx: any, args: any) => {
    try {
      const [embedding1, embedding2] = await Promise.all([
        generateQueryEmbedding(args.text1),
        generateQueryEmbedding(args.text2),
      ]);
      
      return cosineSimilarity(embedding1, embedding2);
    } catch (error) {
      console.error('Error calculating similarity:', error);
      throw error;
    }
  },
});

// Enhanced vector search with multiple models
export const enhancedVectorSearch = action({
  args: {
    query: v.string(),
    model: v.union(v.literal("openai"), v.literal("mock")),
    searchType: v.union(v.literal("jobs"), v.literal("resumes"), v.literal("both")),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
    skillFilter: v.optional(v.array(v.string())),
  },
  returns: v.object({
    results: v.array(v.any()),
    modelUsed: v.string(),
    queryEmbedding: v.array(v.number()),
    searchType: v.string(),
    filters: v.any(),
  }),
  handler: async (ctx: any, args: any) => {
    try {
      console.log(`Enhanced vector search using ${args.model} for: "${args.query}"`);
      
      let queryEmbedding: number[];
      
      if (args.model === "openai") {
        queryEmbedding = await generateQueryEmbedding(args.query);
      } else {
        // Mock embedding for testing
        queryEmbedding = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
      }
      
      // Extract skills from query for filtering
      const extractedSkills = extractSkillsFromQuery(args.query);
      const skillFilter = args.skillFilter || extractedSkills;
      const minSimilarity = args.minSimilarity || 0.3; // Default 30% similarity threshold
      
      console.log(`Extracted skills from query: ${extractedSkills.join(', ')}`);
      console.log(`Using skill filter: ${skillFilter.join(', ')}`);
      console.log(`Minimum similarity threshold: ${minSimilarity}`);
      
      return {
        results: [],
        modelUsed: args.model,
        queryEmbedding,
        searchType: args.searchType,
        filters: {
          skillFilter,
          minSimilarity,
          extractedSkills
        }
      };
      
    } catch (error) {
      console.error('Error in enhanced vector search:', error);
      throw error;
    }
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

// Enhanced search similar jobs with skill filtering
export const searchSimilarJobsEnhanced = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
    skillFilter: v.optional(v.array(v.string())),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: { query: string; limit?: number; minSimilarity?: number; skillFilter?: string[] }): Promise<any[]> => {
    let client;
    
    try {
      console.log(`Enhanced job search for: "${args.query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      
      // Extract skills from query if not provided
      const extractedSkills = args.skillFilter || extractSkillsFromQuery(args.query);
      const minSimilarity = args.minSimilarity || 0.3;
      
      console.log(`Extracted skills: ${extractedSkills.join(', ')}`);
      console.log(`Minimum similarity: ${minSimilarity}`);
      
      // Connect to MongoDB with serverless-optimized settings
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        tls: true,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const jobsCollection = db.collection('jobpostings');
      
      // Get all job postings
      const jobs = await jobsCollection.find({}).toArray();
      console.log(`Found ${jobs.length} jobs in database`);
      
      // Calculate similarities and apply filters with enhanced scoring
      const similarities = jobs
        .filter((job: any) => job.embedding && Array.isArray(job.embedding))
        .map((job: any) => {
          const baseSimilarity = cosineSimilarity(queryEmbedding, job.embedding);
          
          // Get job text for skill analysis
          const jobText = (job.searchableText || '').toLowerCase();
          
          // Enhanced skill matching with weighted scoring
          let skillScore = 0;
          let matchedSkills: string[] = [];
          let hasRequiredSkills = false;
          
          if (extractedSkills.length > 0) {
            // Check for exact skill matches
            extractedSkills.forEach(skill => {
              const skillLower = skill.toLowerCase();
              if (jobText.includes(skillLower)) {
                skillScore += 0.3; // High weight for exact matches
                matchedSkills.push(skill);
              }
            });
            
            // Check for related technical terms
            const technicalTerms: Record<string, string[]> = {
              'software engineer': ['developer', 'programmer', 'software', 'coding', 'programming'],
              'ios development': ['ios', 'swift', 'objective-c', 'xcode', 'iphone', 'ipad', 'apple', 'mobile development'],
              'android': ['android', 'kotlin', 'java', 'mobile development'],
              'web development': ['javascript', 'html', 'css', 'react', 'angular', 'vue', 'node.js'],
              'python': ['python', 'django', 'flask', 'data science', 'machine learning'],
              'java': ['java', 'spring', 'enterprise', 'backend'],
              'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'database'],
              'cloud': ['aws', 'azure', 'gcp', 'cloud', 'devops']
            };
            
            extractedSkills.forEach(skill => {
              const relatedTerms = technicalTerms[skill.toLowerCase()] || [];
              relatedTerms.forEach((term: string) => {
                if (jobText.includes(term.toLowerCase())) {
                  skillScore += 0.15; // Medium weight for related terms
                  if (!matchedSkills.includes(skill)) {
                    matchedSkills.push(skill);
                  }
                }
              });
            });
            
            // Require at least one skill match for technical queries
            hasRequiredSkills = matchedSkills.length > 0;
          }
          
          // Apply stricter filtering for technical queries
          let finalSimilarity = baseSimilarity;
          
          // If this is a technical query (contains software, engineer, development, etc.)
          const isTechnicalQuery = /software|engineer|development|programming|coding|developer/i.test(args.query);
          
          if (isTechnicalQuery) {
            // For technical queries, heavily weight skill matches
            if (hasRequiredSkills) {
              finalSimilarity = baseSimilarity * 0.7 + skillScore * 0.3;
            } else {
              // Severely penalize jobs without required skills for technical queries
              finalSimilarity = baseSimilarity * 0.3;
            }
            
            // Additional penalty for non-technical jobs
            const isTechnicalJob = /software|developer|programmer|engineer|programming|coding|technology|technical|computer|information technology/i.test(jobText);
            if (!isTechnicalJob) {
              finalSimilarity *= 0.5; // 50% penalty for non-technical jobs
            }
          } else {
            // For non-technical queries, use standard scoring
            finalSimilarity = baseSimilarity * 0.8 + skillScore * 0.2;
          }
          
          return {
            job: job,
            similarity: finalSimilarity,
            baseSimilarity: baseSimilarity,
            hasRequiredSkills: hasRequiredSkills,
            skillMatch: matchedSkills,
            skillScore: skillScore,
            isTechnicalQuery: isTechnicalQuery
          };
        })
        .filter(item => {
          // Apply minimum similarity threshold
          if (item.similarity < minSimilarity) return false;
          
          // For technical queries, require skill matches
          if (item.isTechnicalQuery && !item.hasRequiredSkills) {
            return false; // Reject technical queries without skill matches
          }
          
          return true;
        })
        .sort((a, b) => {
          // Sort by skill match first, then by similarity
          if (a.hasRequiredSkills && !b.hasRequiredSkills) return -1;
          if (!a.hasRequiredSkills && b.hasRequiredSkills) return 1;
          return b.similarity - a.similarity;
        });
      
      console.log(`Found ${similarities.length} jobs meeting enhanced criteria`);
      
      // Return top results
      const limit = args.limit || 5;
      const results = similarities.slice(0, limit).map(item => {
        try {
          return {
            ...convertMongoDocument(item.job),
            similarity: item.similarity,
            baseSimilarity: item.baseSimilarity,
            hasRequiredSkills: item.hasRequiredSkills,
            skillMatch: item.skillMatch,
            skillScore: item.skillScore
          };
        } catch (conversionError) {
          console.error('Error converting job document:', conversionError);
          return {
            _id: item.job._id?.toString() || 'unknown',
            jobTitle: item.job.jobTitle || 'Unknown Title',
            similarity: item.similarity,
            baseSimilarity: item.baseSimilarity,
            hasRequiredSkills: item.hasRequiredSkills,
            skillMatch: item.skillMatch,
            skillScore: item.skillScore,
            error: 'Document conversion failed'
          };
        }
      });
      
      console.log(`Returning ${results.length} matching jobs with enhanced filtering`);
      return results;
      
    } catch (error) {
      console.error('Error searching similar jobs:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Enhanced search similar resumes with skill filtering
export const searchSimilarResumesEnhanced = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
    skillFilter: v.optional(v.array(v.string())),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: { query: string; limit?: number; minSimilarity?: number; skillFilter?: string[] }): Promise<any[]> => {
    let client;
    
    try {
      console.log(`Enhanced resume search for: "${args.query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      
      // Extract skills from query if not provided
      const extractedSkills = args.skillFilter || extractSkillsFromQuery(args.query);
      const minSimilarity = args.minSimilarity || 0.3;
      
      console.log(`Extracted skills: ${extractedSkills.join(', ')}`);
      console.log(`Minimum similarity: ${minSimilarity}`);
      
      // Connect to MongoDB with serverless-optimized settings
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        tls: true,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const resumesCollection = db.collection('resumes');
      
      // Get all resumes
      const resumes = await resumesCollection.find({}).toArray();
      console.log(`Found ${resumes.length} resumes in database`);
      
      // Calculate similarities and apply filters with enhanced scoring
      const similarities = resumes
        .filter((resume: any) => resume.embedding && Array.isArray(resume.embedding))
        .map((resume: any) => {
          const baseSimilarity = cosineSimilarity(queryEmbedding, resume.embedding);
          
          // Get resume text for skill analysis
          const resumeText = (resume.searchableText || resume.originalText || '').toLowerCase();
          
          // Enhanced skill matching with weighted scoring
          let skillScore = 0;
          let matchedSkills: string[] = [];
          let hasRequiredSkills = false;
          
          if (extractedSkills.length > 0) {
            // Check for exact skill matches
            extractedSkills.forEach(skill => {
              const skillLower = skill.toLowerCase();
              if (resumeText.includes(skillLower)) {
                skillScore += 0.3; // High weight for exact matches
                matchedSkills.push(skill);
              }
            });
            
            // Check for related technical terms
            const technicalTerms: Record<string, string[]> = {
              'software engineer': ['developer', 'programmer', 'software', 'coding', 'programming'],
              'ios development': ['ios', 'swift', 'objective-c', 'xcode', 'iphone', 'ipad', 'apple', 'mobile development'],
              'android': ['android', 'kotlin', 'java', 'mobile development'],
              'web development': ['javascript', 'html', 'css', 'react', 'angular', 'vue', 'node.js'],
              'python': ['python', 'django', 'flask', 'data science', 'machine learning'],
              'java': ['java', 'spring', 'enterprise', 'backend'],
              'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'database'],
              'cloud': ['aws', 'azure', 'gcp', 'cloud', 'devops']
            };
            
            extractedSkills.forEach(skill => {
              const relatedTerms = technicalTerms[skill.toLowerCase()] || [];
              relatedTerms.forEach((term: string) => {
                if (resumeText.includes(term.toLowerCase())) {
                  skillScore += 0.15; // Medium weight for related terms
                  if (!matchedSkills.includes(skill)) {
                    matchedSkills.push(skill);
                  }
                }
              });
            });
            
            // Require at least one skill match for technical queries
            hasRequiredSkills = matchedSkills.length > 0;
          }
          
          // Apply stricter filtering for technical queries
          let finalSimilarity = baseSimilarity;
          
          // If this is a technical query (contains software, engineer, development, etc.)
          const isTechnicalQuery = /software|engineer|development|programming|coding|developer/i.test(args.query);
          
          if (isTechnicalQuery) {
            // For technical queries, heavily weight skill matches
            if (hasRequiredSkills) {
              finalSimilarity = baseSimilarity * 0.7 + skillScore * 0.3;
            } else {
              // Severely penalize resumes without required skills for technical queries
              finalSimilarity = baseSimilarity * 0.3;
            }
            
            // Additional penalty for non-technical resumes
            const isTechnicalResume = /software|developer|programmer|engineer|programming|coding|technology|technical/i.test(resumeText);
            if (!isTechnicalResume) {
              finalSimilarity *= 0.5; // 50% penalty for non-technical resumes
            }
          } else {
            // For non-technical queries, use standard scoring
            finalSimilarity = baseSimilarity * 0.8 + skillScore * 0.2;
          }
          
          return {
            resume: resume,
            similarity: finalSimilarity,
            baseSimilarity: baseSimilarity,
            hasRequiredSkills: hasRequiredSkills,
            skillMatch: matchedSkills,
            skillScore: skillScore,
            isTechnicalQuery: isTechnicalQuery
          };
        })
        .filter(item => {
          // Apply minimum similarity threshold
          if (item.similarity < minSimilarity) return false;
          
          // For technical queries, require skill matches
          if (item.isTechnicalQuery && !item.hasRequiredSkills) {
            return false; // Reject technical queries without skill matches
          }
          
          return true;
        })
        .sort((a, b) => {
          // Sort by skill match first, then by similarity
          if (a.hasRequiredSkills && !b.hasRequiredSkills) return -1;
          if (!a.hasRequiredSkills && b.hasRequiredSkills) return 1;
          return b.similarity - a.similarity;
        });
      
      console.log(`Found ${similarities.length} resumes meeting enhanced criteria`);
      
      // Return top results
      const limit = args.limit || 5;
      const results = similarities.slice(0, limit).map(item => {
        try {
          return {
            ...mapResumeDataForFrontend(item.resume),
            similarity: item.similarity,
            baseSimilarity: item.baseSimilarity,
            hasRequiredSkills: item.hasRequiredSkills,
            skillMatch: item.skillMatch,
            skillScore: item.skillScore
          };
        } catch (conversionError) {
          console.error('Error converting resume document:', conversionError);
          return {
            _id: item.resume._id?.toString() || 'unknown',
            name: item.resume.name || 'Unknown Name',
            similarity: item.similarity,
            baseSimilarity: item.baseSimilarity,
            hasRequiredSkills: item.hasRequiredSkills,
            skillMatch: item.skillMatch,
            skillScore: item.skillScore,
            error: 'Document conversion failed'
          };
        }
      });
      
      console.log(`Returning ${results.length} matching resumes with enhanced filtering`);
      return results;
      
    } catch (error) {
      console.error('Error searching similar resumes:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Enhanced AI Agent Search with skill filtering
export const aiAgentSearchEnhanced = action({
  args: {
    query: v.string(),
    searchType: v.union(v.literal("jobs"), v.literal("resumes"), v.literal("both")),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
    skillFilter: v.optional(v.array(v.string())),
  },
  returns: v.object({
    jobs: v.array(v.any()),
    resumes: v.array(v.any()),
    analysis: v.optional(v.string()),
    recommendations: v.optional(v.array(v.string())),
    filters: v.any(),
  }),
  handler: async (ctx: any, args: { query: string; searchType: "jobs" | "resumes" | "both"; limit?: number; minSimilarity?: number; skillFilter?: string[] }): Promise<{ jobs: any[]; resumes: any[]; analysis?: string; recommendations?: string[]; filters: any }> => {
    try {
      console.log(`Enhanced AI Agent search for: "${args.query}" (${args.searchType})`);
      
      // Extract skills from query
      const extractedSkills = args.skillFilter || extractSkillsFromQuery(args.query);
      const minSimilarity = args.minSimilarity || 0.3;
      
      let jobs: any[] = [];
      let resumes: any[] = [];
      
      if (args.searchType === "jobs" || args.searchType === "both") {
        jobs = await ctx.runAction(api.vectorSearch.searchSimilarJobsEnhanced, {
          query: args.query,
          limit: args.limit || 5,
          minSimilarity: minSimilarity,
          skillFilter: extractedSkills,
        });
      }
      
      if (args.searchType === "resumes" || args.searchType === "both") {
        resumes = await ctx.runAction(api.vectorSearch.searchSimilarResumesEnhanced, {
          query: args.query,
          limit: args.limit || 5,
          minSimilarity: minSimilarity,
          skillFilter: extractedSkills,
        });
      }
      
      // Add AI analysis
      let analysis: string | undefined;
      let recommendations: string[] | undefined;
      
      if (args.searchType === "both" && (jobs.length > 0 || resumes.length > 0)) {
        try {
          const totalResults = jobs.length + resumes.length;
          const jobsWithSkills = jobs.filter(job => job.hasRequiredSkills).length;
          const resumesWithSkills = resumes.filter(resume => resume.hasRequiredSkills).length;
          
          analysis = `Found ${totalResults} total matches for your query: "${args.query}". `;
          analysis += `Of these, ${jobsWithSkills} jobs and ${resumesWithSkills} resumes contain the required skills: ${extractedSkills.join(', ')}. `;
          analysis += `All results meet the minimum similarity threshold of ${(minSimilarity * 100).toFixed(0)}%.`;
          
          recommendations = [
            "Results are prioritized by skill match, then by similarity score",
            "Consider adjusting the similarity threshold for more/less strict matching",
            "Add specific skills to the skill filter for more targeted results",
            "Use the enhanced search for better relevance filtering"
          ];
        } catch (aiError) {
          console.error('Error generating AI analysis:', aiError);
        }
      }
      
      return {
        jobs,
        resumes,
        analysis,
        recommendations,
        filters: {
          extractedSkills,
          minSimilarity,
          totalResults: jobs.length + resumes.length
        }
      };
    } catch (error) {
      console.error('Error in enhanced AI Agent search:', error);
      throw error;
    }
  },
});

// Get job by ID - direct MongoDB implementation
export const getJobById = action({
  args: {
    jobId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx: any, args: { jobId: string }): Promise<any> => {
    let client;
    
    try {
      console.log(`Fetching job with ID: "${args.jobId}"`);
      
      // Connect to MongoDB with serverless-optimized settings
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        tls: true,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const jobsCollection = db.collection('jobpostings');
      
      // Try to find job by ID first (handle both ObjectId and string)
      let job = null;
      try {
        // Try to convert to ObjectId if it's a valid ObjectId string
        const objectId = new ObjectId(args.jobId);
        job = await jobsCollection.findOne({ _id: objectId });
      } catch (e) {
        // If not a valid ObjectId, skip ID search and try job title
        console.log(`Invalid ObjectId format: ${args.jobId}`);
      }
      
      // If not found by ID, try to find by job title (fallback)
      if (!job) {
        job = await jobsCollection.findOne({ jobTitle: args.jobId });
      }
      
      if (!job) {
        throw new Error("Job not found");
      }
      
      console.log(`Found job: ${job.jobTitle}`);
      
      // Convert MongoDB document
      const result = convertMongoDocument(job);
      
      return result;
      
    } catch (error) {
      console.error('Error fetching job by ID:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Get resume by ID - direct MongoDB implementation
export const getResumeById = action({
  args: {
    resumeId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx: any, args: { resumeId: string }): Promise<any> => {
    let client;
    
    try {
      console.log(`Fetching resume with ID: "${args.resumeId}"`);
      
      // Connect to MongoDB with serverless-optimized settings
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        tls: true,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const resumesCollection = db.collection('resumes');
      
      // Try to find resume by ID first (handle both ObjectId and string)
      let resume = null;
      try {
        // Try to convert to ObjectId if it's a valid ObjectId string
        const objectId = new ObjectId(args.resumeId);
        resume = await resumesCollection.findOne({ _id: objectId });
      } catch (e) {
        // If not a valid ObjectId, skip ID search and try name
        console.log(`Invalid ObjectId format: ${args.resumeId}`);
      }
      
      // If not found by ID, try to find by name (fallback)
      if (!resume) {
        resume = await resumesCollection.findOne({ 
          "processedMetadata.name": args.resumeId 
        });
      }
      
      if (!resume) {
        throw new Error("Resume not found");
      }
      
      console.log(`Found resume: ${resume.processedMetadata?.name || 'Unknown'}`);
      
      // Convert MongoDB document
      const result = mapResumeDataForFrontend(resume);
      
      console.log('getResumeById returning result:', {
        _id: result._id,
        name: result.processedMetadata?.name,
        email: result.processedMetadata?.email,
        phone: result.processedMetadata?.phone,
        hasProfessionalSummary: !!result.professionalSummary,
        hasWorkExperience: !!result.workExperience,
        hasEducation: !!result.education,
        hasSkills: !!result.skills
      });
      
      return result;
      
    } catch (error) {
      console.error('Error fetching resume by ID:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Search similar jobs - direct MongoDB implementation (original)
export const searchSimilarJobs = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: { query: string; limit?: number }): Promise<any[]> => {
    let client;
    
    try {
      console.log(`Searching similar jobs for: "${args.query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      
      // Connect to MongoDB with serverless-optimized settings
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        tls: true,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const jobsCollection = db.collection('jobpostings');
      
      // Get all job postings
      const jobs = await jobsCollection.find({}).toArray();
      
      console.log(`Found ${jobs.length} jobs in database`);
      
      // Calculate similarities for jobs with embeddings
      const similarities = jobs
        .filter((job: any) => job.embedding && Array.isArray(job.embedding))
        .map((job: any) => ({
          job: job,
          similarity: cosineSimilarity(queryEmbedding, job.embedding)
        }));
      
      console.log(`Calculated similarities for ${similarities.length} jobs with embeddings`);
      
      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Return top results
      const limit = args.limit || 5;
      const results = similarities.slice(0, limit).map(item => {
        try {
          return {
            ...convertMongoDocument(item.job),
            similarity: item.similarity
          };
        } catch (conversionError) {
          console.error('Error converting job document:', conversionError);
          // Return a simplified version if conversion fails
          return {
            _id: item.job._id?.toString() || 'unknown',
            jobTitle: item.job.jobTitle || 'Unknown Title',
            similarity: item.similarity,
            error: 'Document conversion failed'
          };
        }
      });
      
      console.log(`Returning ${results.length} matching jobs`);
      return results;
      
    } catch (error) {
      console.error('Error searching similar jobs:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Search similar resumes - direct MongoDB implementation (original)
export const searchSimilarResumes = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: { query: string; limit?: number }): Promise<any[]> => {
    let client;
    
    try {
      console.log(`Searching similar resumes for: "${args.query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      
      // Connect to MongoDB with serverless-optimized settings
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        tls: true,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const resumesCollection = db.collection('resumes');
      
      // Get all resumes
      const resumes = await resumesCollection.find({}).toArray();
      
      console.log(`Found ${resumes.length} resumes in database`);
      
      // Calculate similarities for resumes with embeddings
      const similarities = resumes
        .filter((resume: any) => resume.embedding && Array.isArray(resume.embedding))
        .map((resume: any) => ({
          resume: resume,
          similarity: cosineSimilarity(queryEmbedding, resume.embedding)
        }));
      
      console.log(`Calculated similarities for ${similarities.length} resumes with embeddings`);
      
      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Return top results
      const limit = args.limit || 5;
      const results = similarities.slice(0, limit).map(item => {
        try {
          return {
            ...convertMongoDocument(item.resume),
            similarity: item.similarity
          };
        } catch (conversionError) {
          console.error('Error converting resume document:', conversionError);
          // Return a simplified version if conversion fails
          return {
            _id: item.resume._id?.toString() || 'unknown',
            name: item.resume.name || 'Unknown Name',
            similarity: item.similarity,
            error: 'Document conversion failed'
          };
        }
      });
      
      console.log(`Returning ${results.length} matching resumes`);
      return results;
      
    } catch (error) {
      console.error('Error searching similar resumes:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// AI Agent Search - direct MongoDB implementation (original)
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
  handler: async (ctx: any, args: { query: string; searchType: "jobs" | "resumes" | "both"; limit?: number }): Promise<{ jobs: any[]; resumes: any[]; analysis?: string; recommendations?: string[] }> => {
    try {
      console.log(`AI Agent search for: "${args.query}" (${args.searchType})`);
      
      let jobs: any[] = [];
      let resumes: any[] = [];
      
      if (args.searchType === "jobs" || args.searchType === "both") {
        jobs = await ctx.runAction(api.vectorSearch.searchSimilarJobs, {
          query: args.query,
          limit: args.limit || 5,
        });
      }
      
      if (args.searchType === "resumes" || args.searchType === "both") {
        resumes = await ctx.runAction(api.vectorSearch.searchSimilarResumes, {
          query: args.query,
          limit: args.limit || 5,
        });
      }
      
      // Add AI analysis if both jobs and resumes are requested
      let analysis: string | undefined;
      let recommendations: string[] | undefined;
      
      if (args.searchType === "both" && (jobs.length > 0 || resumes.length > 0)) {
        try {
          // Generate basic analysis
          analysis = `Found ${jobs.length} matching jobs and ${resumes.length} matching resumes for your query: "${args.query}". The results are ranked by semantic similarity to your search terms.`;
          
          // Generate some basic recommendations
          recommendations = [
            "Consider refining your search terms for more specific results",
            "Try searching for specific skills or technologies",
            "Use location-based searches for better matches"
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
    } catch (error) {
      console.error('Error in AI Agent search:', error);
      throw error;
    }
  },
});

// Test function to verify data mapping (can be removed after testing)
export const testResumeMapping = action({
  args: {
    resumeId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx: any, args: { resumeId: string }): Promise<any> => {
    let client;
    
    try {
      console.log(`Testing resume mapping for ID: "${args.resumeId}"`);
      
      // Connect to MongoDB
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        tls: true,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const resumesCollection = db.collection('resumes');
      
      // Find the resume
      const objectId = new ObjectId(args.resumeId);
      const resume = await resumesCollection.findOne({ _id: objectId });
      
      if (!resume) {
        throw new Error("Resume not found");
      }
      
      console.log('Original MongoDB document structure:', {
        _id: resume._id,
        filename: resume.filename,
        hasPersonalInfo: !!resume.personalInfo,
        personalInfoKeys: resume.personalInfo ? Object.keys(resume.personalInfo) : [],
        hasProcessedMetadata: !!resume.processedMetadata,
        processedMetadataKeys: resume.processedMetadata ? Object.keys(resume.processedMetadata) : [],
        hasProfessionalSummary: !!resume.professionalSummary,
        hasExperience: !!resume.experience,
        hasEducation: !!resume.education,
        hasSkills: !!resume.skills
      });
      
      // Test the mapping
      const mappedResume = mapResumeDataForFrontend(resume);
      
      return {
        original: {
          _id: resume._id,
          filename: resume.filename,
          personalInfo: resume.personalInfo,
          processedMetadata: resume.processedMetadata,
          professionalSummary: resume.professionalSummary,
          experience: resume.experience,
          education: resume.education,
          skills: resume.skills
        },
        mapped: {
          _id: mappedResume._id,
          filename: mappedResume.filename,
          processedMetadata: mappedResume.processedMetadata,
          professionalSummary: mappedResume.professionalSummary,
          workExperience: mappedResume.workExperience,
          education: mappedResume.education,
          skills: mappedResume.skills
        }
      };
      
    } catch (error) {
      console.error('Error testing resume mapping:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Update resume data in MongoDB
export const updateResume = action({
  args: {
    resumeId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      location: v.optional(v.string()),
      yearsOfExperience: v.optional(v.number()),
      professionalSummary: v.optional(v.string()),
      workExperience: v.optional(v.string()),
      education: v.optional(v.string()),
      skills: v.optional(v.string()),
      certifications: v.optional(v.string()),
      projects: v.optional(v.string()),
      languages: v.optional(v.string()),
      additionalInformation: v.optional(v.string()),
    }),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    updatedResume: v.optional(v.any()),
  }),
  handler: async (ctx: any, args: { resumeId: string; updates: any }):
     Promise<{ success: boolean; message: string; updatedResume?: any }> => {
    let client;
    
    try {
      console.log(`Updating resume with ID: "${args.resumeId}"`);
      console.log('Updates:', args.updates);
      
      // Connect to MongoDB
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        tls: true,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const resumesCollection = db.collection('resumes');
      
      // Find the resume by ID
      let resume = null;
      try {
        const objectId = new ObjectId(args.resumeId);
        resume = await resumesCollection.findOne({ _id: objectId });
      } catch (e) {
        // If not a valid ObjectId, try to find by name
        resume = await resumesCollection.findOne({ 
          "processedMetadata.name": args.resumeId 
        });
      }
      
      if (!resume) {
        throw new Error("Resume not found");
      }
      
      // Prepare the update object
      const updateData: any = {
        lastUpdated: new Date(),
      };
      
      // Update processedMetadata if personal info is being updated
      if (args.updates.name || args.updates.email || args.updates.phone || args.updates.location || args.updates.yearsOfExperience) {
        updateData.processedMetadata = {
          ...resume.processedMetadata,
          ...(args.updates.name && { name: args.updates.name }),
          ...(args.updates.email && { email: args.updates.email }),
          ...(args.updates.phone && { phone: args.updates.phone }),
          ...(args.updates.location && { location: args.updates.location }),
          ...(args.updates.yearsOfExperience && { yearsOfExperience: args.updates.yearsOfExperience }),
        };
      }
      
      // Update other fields
      if (args.updates.professionalSummary) {
        updateData.professionalSummary = args.updates.professionalSummary;
      }
      if (args.updates.workExperience) {
        updateData.workExperience = args.updates.workExperience;
      }
      if (args.updates.education) {
        updateData.education = args.updates.education;
      }
      if (args.updates.skills) {
        updateData.skills = args.updates.skills;
      }
      if (args.updates.certifications) {
        updateData.certifications = args.updates.certifications;
      }
      if (args.updates.projects) {
        updateData.projects = args.updates.projects;
      }
      if (args.updates.languages) {
        updateData.languages = args.updates.languages;
      }
      if (args.updates.additionalInformation) {
        updateData.additionalInformation = args.updates.additionalInformation;
      }
      
      // Generate new searchable text from updated content
      const fields = [
        updateData.professionalSummary || resume.professionalSummary || '',
        updateData.skills || resume.skills || '',
        updateData.education || resume.education || '',
        updateData.certifications || resume.certifications || '',
        updateData.workExperience || resume.workExperience || '',
        updateData.projects || resume.projects || '',
        updateData.languages || resume.languages || '',
        updateData.additionalInformation || resume.additionalInformation || '',
        (updateData.processedMetadata?.name || resume.processedMetadata?.name || ''),
      ];
      
      const combinedText = fields.filter(Boolean).join(' ');
      
      if (combinedText.trim()) {
        // Generate new embedding for the updated content
        const newEmbedding = await generateQueryEmbedding(combinedText);
        updateData.searchableText = combinedText;
        updateData.embedding = newEmbedding;
        updateData.embeddingGeneratedAt = new Date();
      }
      
      // Update the resume in MongoDB
      const updateResult = await resumesCollection.updateOne(
        { _id: resume._id },
        { $set: updateData }
      );
      
      if (updateResult.modifiedCount === 0) {
        throw new Error("Failed to update resume - no changes were made");
      }
      
      // Fetch the updated resume
      const updatedResume = await resumesCollection.findOne({ _id: resume._id });
      const mappedResume = mapResumeDataForFrontend(updatedResume);
      
      console.log('Resume updated successfully');
      
      return {
        success: true,
        message: "Resume updated successfully",
        updatedResume: mappedResume,
      };
      
    } catch (error) {
      console.error('Error updating resume:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update resume",
      };
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
}); 