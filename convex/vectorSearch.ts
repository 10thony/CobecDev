"use node";
import { action, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { api } from "./_generated/api";

// Initialize Gemini AI for embeddings
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

// Generate embedding for search query using Gemini
async function generateQueryEmbedding(query: string) {
  try {
    if (!query || query.trim().length === 0) {
      throw new Error('Empty query provided for embedding');
    }

    const result = await embeddingModel.embedContent(query.trim());
    return result.embedding.values;
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
      const model = args.model || 'embedding-001';
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
    model: v.union(v.literal("gemini"), v.literal("mock")),
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
      
      if (args.model === "gemini") {
        queryEmbedding = await generateQueryEmbedding(args.query);
      } else {
        // Mock embedding for testing
        queryEmbedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1); // Gemini uses 768 dimensions
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
        .filter((job: any) => job.embeddings?.combinedEmbedding && Array.isArray(job.embeddings.combinedEmbedding))
        .map((job: any) => {
          const baseSimilarity = cosineSimilarity(queryEmbedding, job.embeddings.combinedEmbedding);
          
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

// Multi-embedding vector search for optimized job matching
export const multiEmbeddingJobSearch = action({
  args: {
    query: v.string(),
    embeddingType: v.union(v.literal("title"), v.literal("summary"), v.literal("requirements"), v.literal("duties"), v.literal("combined")),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: { query: string; embeddingType: string; limit?: number; minSimilarity?: number }): Promise<any[]> => {
    let client;
    
    try {
      console.log(`Multi-embedding job search for: "${args.query}" (${args.embeddingType})`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      const minSimilarity = args.minSimilarity || 0.3;
      
      console.log(`Minimum similarity threshold: ${minSimilarity}`);
      
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
      const jobsCollection = db.collection('jobpostings');
      
      // Get jobs with the specific embedding type
      const embeddingField = `embeddings.${args.embeddingType}Embedding`;
      const jobs = await jobsCollection.find({ 
        [embeddingField]: { $exists: true, $ne: [] }
      }).toArray();
      
      console.log(`Found ${jobs.length} jobs with ${args.embeddingType} embeddings`);
      
      // Calculate similarities using the specific embedding type
      const similarities = jobs
        .map((job: any) => {
          const jobEmbedding = job.embeddings?.[`${args.embeddingType}Embedding`];
          if (!jobEmbedding || !Array.isArray(jobEmbedding)) {
            return null;
          }
          
          const similarity = cosineSimilarity(queryEmbedding, jobEmbedding);
          return {
            job: job,
            similarity: similarity,
            embeddingType: args.embeddingType
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null && item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity);
      
      console.log(`Found ${similarities.length} jobs meeting similarity threshold`);
      
      // Return top results
      const limit = args.limit || 5;
      const results = similarities.slice(0, limit).map(item => {
        try {
          return {
            ...convertMongoDocument(item.job),
            similarity: item.similarity,
            embeddingType: item.embeddingType
          };
        } catch (conversionError) {
          console.error('Error converting job document:', conversionError);
          return {
            _id: item.job._id?.toString() || 'unknown',
            jobTitle: item.job.jobTitle || 'Unknown Title',
            similarity: item.similarity,
            embeddingType: item.embeddingType,
            error: 'Document conversion failed'
          };
        }
      });
      
      console.log(`Returning ${results.length} matching jobs with ${args.embeddingType} embedding search`);
      return results;
      
    } catch (error) {
      console.error('Error in multi-embedding job search:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Multi-embedding vector search for optimized resume matching
export const multiEmbeddingResumeSearch = action({
  args: {
    query: v.string(),
    embeddingType: v.union(v.literal("name"), v.literal("summary"), v.literal("skills"), v.literal("experience"), v.literal("education"), v.literal("combined")),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: { query: string; embeddingType: string; limit?: number; minSimilarity?: number }): Promise<any[]> => {
    let client;
    
    try {
      console.log(`Multi-embedding resume search for: "${args.query}" (${args.embeddingType})`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      const minSimilarity = args.minSimilarity || 0.3;
      
      console.log(`Minimum similarity threshold: ${minSimilarity}`);
      
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
      
      // Get resumes with the specific embedding type
      const embeddingField = `embeddings.${args.embeddingType}Embedding`;
      const resumes = await resumesCollection.find({ 
        [embeddingField]: { $exists: true, $ne: [] }
      }).toArray();
      
      console.log(`Found ${resumes.length} resumes with ${args.embeddingType} embeddings`);
      
      // Calculate similarities using the specific embedding type
      const similarities = resumes
        .map((resume: any) => {
          const resumeEmbedding = resume.embeddings?.[`${args.embeddingType}Embedding`];
          if (!resumeEmbedding || !Array.isArray(resumeEmbedding)) {
            return null;
          }
          
          const similarity = cosineSimilarity(queryEmbedding, resumeEmbedding);
          return {
            resume: resume,
            similarity: similarity,
            embeddingType: args.embeddingType
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null && item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity);
      
      console.log(`Found ${similarities.length} resumes meeting similarity threshold`);
      
      // Return top results
      const limit = args.limit || 5;
      const results = similarities.slice(0, limit).map(item => {
        try {
          return {
            ...mapResumeDataForFrontend(item.resume),
            similarity: item.similarity,
            embeddingType: item.embeddingType
          };
        } catch (conversionError) {
          console.error('Error converting resume document:', conversionError);
          return {
            _id: item.resume._id?.toString() || 'unknown',
            name: item.resume.name || 'Unknown Name',
            similarity: item.similarity,
            embeddingType: item.embeddingType,
            error: 'Document conversion failed'
          };
        }
      });
      
      console.log(`Returning ${results.length} matching resumes with ${args.embeddingType} embedding search`);
      return results;
      
    } catch (error) {
      console.error('Error in multi-embedding resume search:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
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
        .filter((job: any) => job.embeddings?.combinedEmbedding && Array.isArray(job.embeddings.combinedEmbedding))
        .map((job: any) => ({
          job: job,
          similarity: cosineSimilarity(queryEmbedding, job.embeddings.combinedEmbedding)
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

// Search similar resumes - semantic search using existing resume data
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
      
      // Helper function to create searchable text from resume data
      const createResumeSearchableText = (resume: any): string => {
        const fields = [
          resume.professionalSummary || '',
          resume.skills ? (Array.isArray(resume.skills) ? resume.skills.join(' ') : resume.skills) : '',
          resume.education ? (Array.isArray(resume.education) ? resume.education.join(' ') : resume.education) : '',
          resume.certifications || '',
          resume.securityClearance || '',
          resume.personalInfo ? `${resume.personalInfo.firstName || ''} ${resume.personalInfo.lastName || ''}`.trim() : '',
          resume.experience ? (Array.isArray(resume.experience) ? 
            resume.experience.map((exp: any) => 
              `${exp.title || ''} ${exp.company || ''} ${(exp.responsibilities || []).join(' ')}`
            ).join(' ') : resume.experience) : '',
          resume.originalText || ''
        ];
        
        return fields.filter(Boolean).join(' ');
      };
      
      // Calculate similarities by generating embeddings on-the-fly
      const similarities = [];
      
      for (const resume of resumes) {
        try {
          // Create searchable text from resume data
          const searchableText = createResumeSearchableText(resume);
          
          if (searchableText.trim()) {
            // Generate embedding for this resume
            const resumeEmbedding = await generateQueryEmbedding(searchableText);
            
            // Calculate similarity
            const similarity = cosineSimilarity(queryEmbedding, resumeEmbedding);
            
            similarities.push({
              resume: resume,
              similarity: similarity
            });
          }
        } catch (error) {
          console.error(`Error processing resume ${resume._id}:`, error);
          continue;
        }
      }
      
      console.log(`Calculated similarities for ${similarities.length} resumes`);
      
      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Return top results
      const limit = args.limit || 5;
      const results = similarities.slice(0, limit).map(item => {
        try {
          return {
            ...mapResumeDataForFrontend(item.resume),
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

// AI Agent Search - semantic search using existing data
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

// Pure vector search - no text-based substring matching
export const searchSimilarJobsPure = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: { query: string; limit?: number; minSimilarity?: number }): Promise<any[]> => {
    let client;
    
    try {
      console.log(`Pure vector search for jobs: "${args.query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      const minSimilarity = args.minSimilarity || 0.3;
      
      console.log(`Minimum similarity threshold: ${minSimilarity}`);
      
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
      const jobsCollection = db.collection('jobpostings');
      
      // Get all jobs with embeddings
      const jobs = await jobsCollection.find({ "embeddings.combinedEmbedding": { $exists: true } }).toArray();
      console.log(`Found ${jobs.length} jobs with embeddings`);
      
      // Calculate pure vector similarities
      const similarities = jobs
        .filter((job: any) => job.embeddings?.combinedEmbedding && Array.isArray(job.embeddings.combinedEmbedding))
        .map((job: any) => {
          const similarity = cosineSimilarity(queryEmbedding, job.embeddings.combinedEmbedding);
          return {
            job: job,
            similarity: similarity
          };
        })
        .filter(item => item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity);
      
      console.log(`Found ${similarities.length} jobs meeting similarity threshold`);
      
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
          return {
            _id: item.job._id?.toString() || 'unknown',
            jobTitle: item.job.jobTitle || 'Unknown Title',
            similarity: item.similarity,
            error: 'Document conversion failed'
          };
        }
      });
      
      console.log(`Returning ${results.length} matching jobs with pure vector search`);
      return results;
      
    } catch (error) {
      console.error('Error in pure vector search:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Pure vector search for resumes - semantic search using existing resume data
export const searchSimilarResumesPure = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: { query: string; limit?: number; minSimilarity?: number }): Promise<any[]> => {
    let client;
    
    try {
      console.log(`Pure vector search for resumes: "${args.query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      const minSimilarity = args.minSimilarity || 0.3;
      
      console.log(`Minimum similarity threshold: ${minSimilarity}`);
      
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
      
      // Get all resumes (we'll generate embeddings on-the-fly)
      const resumes = await resumesCollection.find({}).toArray();
      console.log(`Found ${resumes.length} resumes in database`);
      
      // Helper function to create searchable text from resume data
      const createResumeSearchableText = (resume: any): string => {
        const fields = [
          resume.professionalSummary || '',
          resume.skills ? (Array.isArray(resume.skills) ? resume.skills.join(' ') : resume.skills) : '',
          resume.education ? (Array.isArray(resume.education) ? resume.education.join(' ') : resume.education) : '',
          resume.certifications || '',
          resume.securityClearance || '',
          resume.personalInfo ? `${resume.personalInfo.firstName || ''} ${resume.personalInfo.lastName || ''}`.trim() : '',
          resume.experience ? (Array.isArray(resume.experience) ? 
            resume.experience.map((exp: any) => 
              `${exp.title || ''} ${exp.company || ''} ${(exp.responsibilities || []).join(' ')}`
            ).join(' ') : resume.experience) : '',
          resume.originalText || ''
        ];
        
        return fields.filter(Boolean).join(' ');
      };
      
      // Calculate similarities by generating embeddings on-the-fly
      const similarities = [];
      
      for (const resume of resumes) {
        try {
          // Create searchable text from resume data
          const searchableText = createResumeSearchableText(resume);
          
          if (searchableText.trim()) {
            // Generate embedding for this resume
            const resumeEmbedding = await generateQueryEmbedding(searchableText);
            
            // Calculate similarity
            const similarity = cosineSimilarity(queryEmbedding, resumeEmbedding);
            
            if (similarity >= minSimilarity) {
              similarities.push({
                resume: resume,
                similarity: similarity,
                searchableText: searchableText
              });
            }
          }
        } catch (error) {
          console.error(`Error processing resume ${resume._id}:`, error);
          continue;
        }
      }
      
      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      console.log(`Found ${similarities.length} resumes meeting similarity threshold`);
      
      // Return top results
      const limit = args.limit || 5;
      const results = similarities.slice(0, limit).map(item => {
        try {
          return {
            ...mapResumeDataForFrontend(item.resume),
            similarity: item.similarity
          };
        } catch (conversionError) {
          console.error('Error converting resume document:', conversionError);
          return {
            _id: item.resume._id?.toString() || 'unknown',
            filename: item.resume.filename || 'Unknown',
            similarity: item.similarity,
            error: 'Document conversion failed'
          };
        }
      });
      
      console.log(`Returning ${results.length} matching resumes with semantic vector search`);
      return results;
      
    } catch (error) {
      console.error('Error in semantic vector search:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Cross-matched vector search - strict matching between jobs and resumes
export const crossMatchedVectorSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    minSimilarity: v.optional(v.number()),
    crossMatchThreshold: v.optional(v.number()),
  },
  returns: v.object({
    jobs: v.array(v.any()),
    resumes: v.array(v.any()),
    crossMatches: v.array(v.object({
      jobId: v.string(),
      resumeId: v.string(),
      similarity: v.number(),
      colorIndex: v.number()
    })),
    colorGroups: v.array(v.object({
      colorIndex: v.number(),
      jobIds: v.array(v.string()),
      resumeIds: v.array(v.string()),
      matchCount: v.number()
    }))
  }),
  handler: async (ctx: any, args: { 
    query: string; 
    limit?: number; 
    minSimilarity?: number;
    crossMatchThreshold?: number;
  }): Promise<any> => {
    let client;
    
    try {
      console.log(`Cross-matched vector search for: "${args.query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(args.query);
      const minSimilarity = args.minSimilarity || 0.3;
      const crossMatchThreshold = args.crossMatchThreshold || 0.4;
      const limit = args.limit || 10;
      
      console.log(`Minimum similarity threshold: ${minSimilarity}`);
      console.log(`Cross-match threshold: ${crossMatchThreshold}`);
      
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
      const jobsCollection = db.collection('jobpostings');
      const resumesCollection = db.collection('resumes');
      
      // Get top jobs and resumes based on query similarity
      const jobs = await jobsCollection.find({ "embeddings.combinedEmbedding": { $exists: true } }).toArray();
      const resumes = await resumesCollection.find({}).toArray();
      
      console.log(`Found ${jobs.length} jobs and ${resumes.length} resumes`);
      
      // Calculate query similarities for jobs
      const jobSimilarities = jobs
        .filter((job: any) => job.embeddings?.combinedEmbedding && Array.isArray(job.embeddings.combinedEmbedding))
        .map((job: any) => ({
          job: job,
          querySimilarity: cosineSimilarity(queryEmbedding, job.embeddings.combinedEmbedding)
        }))
        .filter(item => item.querySimilarity >= minSimilarity)
        .sort((a, b) => b.querySimilarity - a.querySimilarity)
        .slice(0, limit);
      
      // Calculate query similarities for resumes
      const resumeSimilarities: any[] = [];
      
      // Helper function to create searchable text from resume data
      const createResumeSearchableText = (resume: any): string => {
        const fields = [
          resume.professionalSummary || '',
          resume.skills ? (Array.isArray(resume.skills) ? resume.skills.join(' ') : resume.skills) : '',
          resume.education ? (Array.isArray(resume.education) ? resume.education.join(' ') : resume.education) : '',
          resume.certifications || '',
          resume.securityClearance || '',
          resume.personalInfo ? `${resume.personalInfo.firstName || ''} ${resume.personalInfo.lastName || ''}`.trim() : '',
          resume.experience ? (Array.isArray(resume.experience) ? 
            resume.experience.map((exp: any) => 
              `${exp.title || ''} ${exp.company || ''} ${(exp.responsibilities || []).join(' ')}`
            ).join(' ') : resume.experience) : '',
          resume.originalText || ''
        ];
        
        return fields.filter(Boolean).join(' ');
      };
      
      for (const resume of resumes) {
        try {
          const searchableText = createResumeSearchableText(resume);
          if (searchableText.trim()) {
            const resumeEmbedding = await generateQueryEmbedding(searchableText);
            const querySimilarity = cosineSimilarity(queryEmbedding, resumeEmbedding);
            
            if (querySimilarity >= minSimilarity) {
              resumeSimilarities.push({
                resume: resume,
                querySimilarity: querySimilarity,
                searchableText: searchableText
              });
            }
          }
        } catch (error) {
          console.error(`Error processing resume ${resume._id}:`, error);
          continue;
        }
      }
      
      resumeSimilarities.sort((a, b) => b.querySimilarity - a.querySimilarity);
      const topResumes = resumeSimilarities.slice(0, limit);
      
      console.log(`Top ${jobSimilarities.length} jobs and ${topResumes.length} resumes found`);
      
      // Cross-match jobs and resumes
      const crossMatches: any[] = [];
      const matchedJobIds = new Set<string>();
      const matchedResumeIds = new Set<string>();
      
      for (const jobItem of jobSimilarities) {
        for (const resumeItem of topResumes) {
          try {
            // Generate embedding for resume if not already done
            let resumeEmbedding = resumeItem.resume.embedding;
            if (!resumeEmbedding || !Array.isArray(resumeEmbedding)) {
              resumeEmbedding = await generateQueryEmbedding(resumeItem.searchableText);
            }
            
            // Calculate cross-match similarity
            const crossMatchSimilarity = cosineSimilarity(jobItem.job.embeddings.combinedEmbedding, resumeEmbedding);
            
            if (crossMatchSimilarity >= crossMatchThreshold) {
              crossMatches.push({
                jobId: jobItem.job._id.toString(),
                resumeId: resumeItem.resume._id.toString(),
                similarity: crossMatchSimilarity,
                jobQuerySimilarity: jobItem.querySimilarity,
                resumeQuerySimilarity: resumeItem.querySimilarity
              });
              
              matchedJobIds.add(jobItem.job._id.toString());
              matchedResumeIds.add(resumeItem.resume._id.toString());
            }
          } catch (error) {
            console.error(`Error cross-matching job ${jobItem.job._id} with resume ${resumeItem.resume._id}:`, error);
            continue;
          }
        }
      }
      
      console.log(`Found ${crossMatches.length} cross-matches`);
      
      // Create color groups (up to 10 unique colors)
      const colorGroups: any[] = [];
      let colorIndex = 0;
      const maxColors = 10;
      
      // Group by job (each job gets a color, resumes matching that job get the same color)
      const jobColorMap = new Map<string, number>();
      const resumeColorMap = new Map<string, number>();
      
      for (const match of crossMatches) {
        if (!jobColorMap.has(match.jobId)) {
          if (colorIndex < maxColors) {
            jobColorMap.set(match.jobId, colorIndex);
            colorIndex++;
          }
        }
        
        const jobColor = jobColorMap.get(match.jobId);
        if (jobColor !== undefined) {
          resumeColorMap.set(match.resumeId, jobColor);
        }
      }
      
      // Create color groups
      for (let i = 0; i < Math.min(colorIndex, maxColors); i++) {
        const jobIds = Array.from(jobColorMap.entries())
          .filter(([_, color]) => color === i)
          .map(([jobId, _]) => jobId);
        
        const resumeIds = Array.from(resumeColorMap.entries())
          .filter(([_, color]) => color === i)
          .map(([resumeId, _]) => resumeId);
        
        colorGroups.push({
          colorIndex: i,
          jobIds: jobIds,
          resumeIds: resumeIds,
          matchCount: jobIds.length * resumeIds.length
        });
      }
      
      // Filter jobs and resumes to only include those with cross-matches
      const matchedJobs = jobSimilarities
        .filter(item => matchedJobIds.has(item.job._id.toString()))
        .map(item => ({
          ...convertMongoDocument(item.job),
          similarity: item.querySimilarity,
          colorIndex: jobColorMap.get(item.job._id.toString()) || 0
        }));
      
      const matchedResumes = topResumes
        .filter(item => matchedResumeIds.has(item.resume._id.toString()))
        .map(item => ({
          ...mapResumeDataForFrontend(item.resume),
          similarity: item.querySimilarity,
          colorIndex: resumeColorMap.get(item.resume._id.toString()) || 0
        }));
      
      console.log(`Returning ${matchedJobs.length} matched jobs and ${matchedResumes.length} matched resumes`);
      
      return {
        jobs: matchedJobs,
        resumes: matchedResumes,
        crossMatches: crossMatches.map(match => ({
          jobId: match.jobId,
          resumeId: match.resumeId,
          similarity: match.similarity,
          colorIndex: jobColorMap.get(match.jobId) || 0
        })),
        colorGroups: colorGroups
      };
      
    } catch (error) {
      console.error('Error in cross-matched vector search:', error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Helper function to extract text from PDF using multiple methods with fallback
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  let extractedText = '';
  let lastError: Error | null = null;
  
  // Method 1: Try pdf-parse (original method)
  try {
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer);
    if (pdfData.text && pdfData.text.trim().length > 0) {
      console.log('PDF parsing successful with pdf-parse');
      return pdfData.text;
    }
  } catch (error) {
    console.log('pdf-parse failed, trying alternative method:', error instanceof Error ? error.message : 'Unknown error');
    lastError = error instanceof Error ? error : new Error('pdf-parse failed');
  }
  
  // Method 2: Try pdfjs-dist (Mozilla's PDF.js library)
  try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    
    // Set up the worker
    const pdfjsWorker = require('pdfjs-dist/legacy/build/pdf.worker.entry');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    if (fullText.trim().length > 0) {
      console.log('PDF parsing successful with pdfjs-dist');
      return fullText;
    }
  } catch (error) {
    console.log('pdfjs-dist failed, trying next method:', error instanceof Error ? error.message : 'Unknown error');
    lastError = error instanceof Error ? error : new Error('pdfjs-dist failed');
  }
  
  // Method 3: Try a more basic approach with pdf-parse but with different options
  try {
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer, {
      // Try with different options
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });
    
    if (pdfData.text && pdfData.text.trim().length > 0) {
      console.log('PDF parsing successful with pdf-parse (alternative options)');
      return pdfData.text;
    }
  } catch (error) {
    console.log('pdf-parse with alternative options failed:', error instanceof Error ? error.message : 'Unknown error');
    lastError = error instanceof Error ? error : new Error('pdf-parse with alternative options failed');
  }
  
  // If all methods failed, throw a comprehensive error
  console.error('All PDF parsing methods failed. Last error:', lastError);
  throw new Error('PDF parsing failed. Please ensure the PDF is not password-protected and contains readable text. Try converting the PDF to a .docx file and upload that instead.');
}

// Update resume with new document upload
export const updateResumeWithDocument = action({
  args: {
    resumeId: v.string(),
    fileName: v.string(),
    fileData: v.string(), // base64 encoded file data
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    updatedResume: v.optional(v.any()),
  }),
  handler: async (ctx: any, args: { resumeId: string; fileName: string; fileData: string }):
     Promise<{ success: boolean; message: string; updatedResume?: any }> => {
    let client;
    
    try {
      console.log(`Updating resume with ID: "${args.resumeId}" using document: ${args.fileName}`);
      
      // Validate file type
      const fileName = args.fileName.toLowerCase();
      if (!fileName.endsWith('.docx') && !fileName.endsWith('.pdf')) {
        throw new Error('Only .docx and .pdf files are supported for resume updates');
      }

      // Decode base64 data
      const buffer = Buffer.from(args.fileData, 'base64');
      
      let extractedText = '';
      let extractionMethod = '';
      
      // Extract text based on file type
      if (fileName.endsWith('.docx')) {
        // Extract text from DOCX using mammoth
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
        extractionMethod = 'mammoth + AI';
      } else if (fileName.endsWith('.pdf')) {
        // Extract text from PDF using multiple parsing methods with fallback
        extractedText = await extractTextFromPDF(buffer);
        extractionMethod = 'multi-method PDF parsing + AI';
      }
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text content could be extracted from the document');
      }

      console.log(`Extracted ${extractedText.length} characters from ${args.fileName}`);
      
      // Parse the extracted text using AI
      const structuredData = await parseResumeWithAI(extractedText);
      
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
      
      // Find the existing resume by ID
      let existingResume = null;
      try {
        const objectId = new ObjectId(args.resumeId);
        existingResume = await resumesCollection.findOne({ _id: objectId });
      } catch (e) {
        // If not a valid ObjectId, try to find by name
        existingResume = await resumesCollection.findOne({ 
          "processedMetadata.name": args.resumeId 
        });
      }
      
      if (!existingResume) {
        throw new Error("Resume not found");
      }
      
      // Create the updated document structure
      const updatedDocument = {
        filename: args.fileName,
        originalText: extractedText,
        personalInfo: structuredData.personalInfo || {
          firstName: '',
          middleName: '',
          lastName: '',
          email: '',
          phone: '',
          yearsOfExperience: 0
        },
        professionalSummary: structuredData.professionalSummary || '',
        education: structuredData.education || [],
        experience: structuredData.experience || [],
        skills: structuredData.skills || [],
        certifications: structuredData.certifications || 'n/a',
        professionalMemberships: structuredData.professionalMemberships || 'n/a',
        securityClearance: structuredData.securityClearance || 'n/a',
        _metadata: {
          fileName: args.fileName,
          importedAt: new Date(),
          parsedAt: new Date(),
          updatedFrom: existingResume._id,
          originalFilename: existingResume.filename
        },
        processedAt: new Date().toISOString(),
        processedMetadata: {
          sourceFile: args.fileName,
          extractionMethod: 'mammoth + AI',
          textLength: extractedText.length,
          name: structuredData.personalInfo?.firstName && structuredData.personalInfo?.lastName ? 
            `${structuredData.personalInfo.firstName} ${structuredData.personalInfo.lastName}` : 
            existingResume.processedMetadata?.name,
          email: structuredData.personalInfo?.email || existingResume.processedMetadata?.email,
          phone: structuredData.personalInfo?.phone || existingResume.processedMetadata?.phone,
          location: existingResume.processedMetadata?.location || 'N/A',
          yearsOfExperience: structuredData.personalInfo?.yearsOfExperience || existingResume.processedMetadata?.yearsOfExperience || 0,
          education: structuredData.education || existingResume.processedMetadata?.education || [],
          skills: structuredData.skills || existingResume.processedMetadata?.skills || []
        },
        lastUpdated: new Date()
      };
      
      // Generate embeddings for the updated resume
      const { searchableText, embedding, extractedSkills } = await generateResumeEmbeddings(updatedDocument);
      
      // Add embedding data to document
      const finalDocument = {
        ...updatedDocument,
        searchableText,
        embedding,
        extractedSkills: extractedSkills || structuredData.skills || [],
        embeddingGeneratedAt: new Date()
      };
      
      // Update the existing resume in MongoDB
      const updateResult = await resumesCollection.updateOne(
        { _id: existingResume._id },
        { $set: finalDocument }
      );
      
      if (updateResult.modifiedCount === 0) {
        throw new Error("Failed to update resume - no changes were made");
      }
      
      // Fetch the updated resume
      const updatedResume = await resumesCollection.findOne({ _id: existingResume._id });
      const mappedResume = mapResumeDataForFrontend(updatedResume);
      
      console.log('Resume updated successfully with new document');
      
      return {
        success: true,
        message: "Resume updated successfully with new document and fresh embeddings",
        updatedResume: mappedResume,
      };
      
    } catch (error) {
      console.error('Error updating resume with document:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update resume with document";
      
      // Provide user-friendly error messages
      if (errorMessage.includes('PDF parsing failed')) {
        return {
          success: false,
          message: 'PDF parsing failed. Please ensure the PDF is not password-protected and contains readable text. Try converting the PDF to a .docx file and upload that instead.',
        };
      } else if (errorMessage.includes('Only .docx and .pdf files are supported')) {
        return {
          success: false,
          message: 'This file type is not supported. Please upload a .docx or .pdf file.',
        };
      } else if (errorMessage.includes('No text content could be extracted')) {
        return {
          success: false,
          message: 'Unable to extract text from this document. The file may be corrupted or password-protected.',
        };
      } else {
        return {
          success: false,
          message: errorMessage,
        };
      }
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Helper function to parse resume text with AI
async function parseResumeWithAI(text: string): Promise<any> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Parse the following resume text and extract structured information. Return the result as a JSON object with the following structure:
    
    {
      "personalInfo": {
        "firstName": "string",
        "middleName": "string", 
        "lastName": "string",
        "email": "string",
        "phone": "string",
        "yearsOfExperience": number
      },
      "professionalSummary": "string",
      "education": ["string array"],
      "experience": [
        {
          "title": "string",
          "company": "string", 
          "location": "string",
          "duration": "string",
          "responsibilities": ["string array"]
        }
      ],
      "skills": ["string array"],
      "certifications": "string",
      "professionalMemberships": "string",
      "securityClearance": "string"
    }
    
    Resume text:
    ${text}
    
    Extract all available information and return only the JSON object. If a field is not found, use empty string or empty array as appropriate.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }
    
    const parsedData = JSON.parse(jsonMatch[0]);
    return parsedData;
    
  } catch (error) {
    console.error('Error parsing resume with AI:', error);
    // Return a basic structure if AI parsing fails
    return {
      personalInfo: {
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        phone: '',
        yearsOfExperience: 0
      },
      professionalSummary: '',
      education: [],
      experience: [],
      skills: [],
      certifications: '',
      professionalMemberships: '',
      securityClearance: ''
    };
  }
}

// Helper function to generate resume embeddings
async function generateResumeEmbeddings(resumeData: any): Promise<{
  searchableText: string;
  embedding: number[];
  extractedSkills?: string[];
}> {
  try {
    // Create searchable text from resume data
    const searchableText = createResumeSearchableText(resumeData);
    
    // Generate embedding
    const embedding = await generateQueryEmbedding(searchableText);
    
    // Extract skills from the text
    const extractedSkills = extractSkillsFromQuery(searchableText);
    
    return {
      searchableText,
      embedding,
      extractedSkills
    };
  } catch (error) {
    console.error('Error generating resume embeddings:', error);
    throw error;
  }
}

// Helper function to create searchable text from resume data
function createResumeSearchableText(resume: any): string {
  const fields = [
    resume.professionalSummary || '',
    resume.skills ? (Array.isArray(resume.skills) ? resume.skills.join(' ') : resume.skills) : '',
    resume.education ? (Array.isArray(resume.education) ? resume.education.join(' ') : resume.education) : '',
    resume.certifications || '',
    resume.experience ? resume.experience.map((exp: any) => 
      `${exp.title || ''} ${exp.company || ''} ${exp.responsibilities ? exp.responsibilities.join(' ') : ''}`
    ).join(' ') : '',
    resume.professionalMemberships || '',
    resume.securityClearance || '',
    resume.personalInfo ? 
      `${resume.personalInfo.firstName || ''} ${resume.personalInfo.lastName || ''} ${resume.personalInfo.email || ''}` : '',
  ];
  
  return fields.filter(Boolean).join(' ').toLowerCase();
}