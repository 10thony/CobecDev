import { getMongoClient } from './mongoClient';
import { JobPosting, Resume } from './mongoClient';

// OpenAI API configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

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

// Generate embedding for search query using OpenAI
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

// Search resumes in local MongoDB
async function searchResumesInMongo(query: string, limit: number = 10): Promise<Resume[]> {
  try {
    console.log(`Searching resumes for: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Get MongoDB client and collection
    const client = await getMongoClient();
    const db = client.getDatabase('workdemos');
    const resumesCollection = db.collection('resumes');
    
    // Get all resumes
    const resumes = await resumesCollection.find({}).toArray();
    
    console.log(`Found ${resumes.length} resumes in database`);
    
    // Calculate similarities for resumes with embeddings
    const similarities = resumes
      .filter(resume => resume.embedding && Array.isArray(resume.embedding))
      .map(resume => ({
        resume: resume as Resume,
        similarity: cosineSimilarity(queryEmbedding, resume.embedding)
      }));
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top results
    const results = similarities.slice(0, limit).map(item => ({
      ...item.resume,
      similarity: item.similarity
    }));
    
    console.log(`Returning ${results.length} matching resumes`);
    return results;
    
  } catch (error) {
    console.error('Error searching resumes:', error);
    throw error;
  }
}

// Search job postings in local MongoDB
async function searchJobsInMongo(query: string, limit: number = 10): Promise<JobPosting[]> {
  try {
    console.log(`Searching jobs for: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Get MongoDB client and collection
    const client = await getMongoClient();
    const db = client.getDatabase('workdemos');
    const jobsCollection = db.collection('jobpostings');
    
    // Get all job postings
    const jobs = await jobsCollection.find({}).toArray();
    
    console.log(`Found ${jobs.length} jobs in database`);
    
    // Calculate similarities for jobs with embeddings
    const similarities = jobs
      .filter(job => job.embedding && Array.isArray(job.embedding))
      .map(job => ({
        job: job as JobPosting,
        similarity: cosineSimilarity(queryEmbedding, job.embedding)
      }));
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top results
    const results = similarities.slice(0, limit).map(item => ({
      ...item.job,
      similarity: item.similarity
    }));
    
    console.log(`Returning ${results.length} matching jobs`);
    return results;
    
  } catch (error) {
    console.error('Error searching jobs:', error);
    throw error;
  }
}

// Generate AI response using OpenAI
async function generateAIResponse(query: string, searchResults: any[], searchType: string): Promise<string> {
  try {
    // Prepare context from search results
    let context = '';
    
    if (searchType === 'jobs' || searchType === 'both') {
      const jobResults = searchResults.filter(result => result.jobTitle);
      if (jobResults.length > 0) {
        context += '\n\nRELEVANT JOB POSTINGS:\n';
        jobResults.slice(0, 3).forEach((job, index) => {
          context += `${index + 1}. ${job.jobTitle} at ${job.location}\n`;
          context += `   Department: ${job.department}\n`;
          context += `   Requirements: ${job.requirements?.substring(0, 200)}...\n`;
          context += `   Similarity Score: ${(job.similarity * 100).toFixed(1)}%\n\n`;
        });
      }
    }
    
    if (searchType === 'resumes' || searchType === 'both') {
      const resumeResults = searchResults.filter(result => result.personalInfo);
      if (resumeResults.length > 0) {
        context += '\n\nRELEVANT RESUMES:\n';
        resumeResults.slice(0, 3).forEach((resume, index) => {
          const fullName = `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}`;
          context += `${index + 1}. ${fullName} (${resume.personalInfo.yearsOfExperience} years experience)\n`;
          context += `   Skills: ${resume.skills?.slice(0, 5).join(', ')}\n`;
          context += `   Similarity Score: ${(resume.similarity * 100).toFixed(1)}%\n\n`;
        });
      }
    }
    
    if (!context) {
      return "I couldn't find any relevant data in the database for your query. Please try rephrasing your search or check if the database contains the type of information you're looking for.";
    }
    
    // Create the prompt for OpenAI
    const prompt = `You are a helpful assistant that searches through a database of job postings and resumes. 
    
User Query: "${query}"

Based on the following search results from the database, provide a helpful and informative response. 
Focus on the most relevant matches and provide specific details from the data.

${context}

Please provide a clear, structured response that:
1. Addresses the user's query directly
2. Highlights the most relevant matches found
3. Provides specific details from the search results
4. Suggests any additional search terms if relevant

Response:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides information based on database search results. Be concise, accurate, and helpful.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

// Main chat function that combines search and AI response
export async function chatWithMongoData(params: {
  query: string;
  searchType: "jobs" | "resumes" | "both";
  limit?: number;
}): Promise<string> {
  try {
    const { query, searchType, limit = 5 } = params;
    
    console.log(`Starting chat with MongoDB data for query: "${query}"`);
    
    let searchResults: any[] = [];
    
    // Search based on the specified type
    if (searchType === 'jobs' || searchType === 'both') {
      const jobResults = await searchJobsInMongo(query, limit);
      searchResults.push(...jobResults);
    }
    
    if (searchType === 'resumes' || searchType === 'both') {
      const resumeResults = await searchResumesInMongo(query, limit);
      searchResults.push(...resumeResults);
    }
    
    // Sort all results by similarity
    searchResults.sort((a, b) => b.similarity - a.similarity);
    
    // Generate AI response based on search results
    const aiResponse = await generateAIResponse(query, searchResults, searchType);
    
    return aiResponse;
    
  } catch (error) {
    console.error('Error in chatWithMongoData:', error);
    throw error;
  }
} 