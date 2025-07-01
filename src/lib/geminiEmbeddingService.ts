import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY!);

// Gemini embedding model
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

// Generate embedding for text using Gemini
export async function generateGeminiEmbedding(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Empty text provided for embedding');
    }

    const result = await embeddingModel.embedContent(text.trim());
    const embedding = result.embedding;
    
    return embedding.values;
  } catch (error) {
    console.error('Error generating Gemini embedding:', error);
    throw error;
  }
}

// Generate multiple embeddings for different aspects of job data
export async function generateJobEmbeddings(jobData: any): Promise<{
  titleEmbedding: number[];
  summaryEmbedding: number[];
  requirementsEmbedding: number[];
  dutiesEmbedding: number[];
  combinedEmbedding: number[];
}> {
  try {
    // Create different text chunks for specialized embeddings
    const titleText = jobData.jobTitle || '';
    const summaryText = jobData.jobSummary || '';
    const requirementsText = jobData.requirements || '';
    const dutiesText = jobData.duties || '';
    
    // Combined text for general search
    const combinedText = [
      titleText,
      summaryText,
      requirementsText,
      dutiesText,
      jobData.qualifications || '',
      jobData.department || '',
      jobData.location || '',
      jobData.jobType || ''
    ].filter(Boolean).join(' ');

    // Generate embeddings in parallel for efficiency
    const [
      titleEmbedding,
      summaryEmbedding,
      requirementsEmbedding,
      dutiesEmbedding,
      combinedEmbedding
    ] = await Promise.all([
      titleText ? generateGeminiEmbedding(titleText) : [],
      summaryText ? generateGeminiEmbedding(summaryText) : [],
      requirementsText ? generateGeminiEmbedding(requirementsText) : [],
      dutiesText ? generateGeminiEmbedding(dutiesText) : [],
      combinedText ? generateGeminiEmbedding(combinedText) : []
    ]);

    return {
      titleEmbedding,
      summaryEmbedding,
      requirementsEmbedding,
      dutiesEmbedding,
      combinedEmbedding
    };
  } catch (error) {
    console.error('Error generating job embeddings:', error);
    throw error;
  }
}

// Generate multiple embeddings for different aspects of resume data
export async function generateResumeEmbeddings(resumeData: any): Promise<{
  nameEmbedding: number[];
  summaryEmbedding: number[];
  skillsEmbedding: number[];
  experienceEmbedding: number[];
  educationEmbedding: number[];
  combinedEmbedding: number[];
}> {
  try {
    // Create different text chunks for specialized embeddings
    const nameText = resumeData.processedMetadata?.name || resumeData.personalInfo?.firstName + ' ' + resumeData.personalInfo?.lastName || '';
    const summaryText = resumeData.professionalSummary || '';
    const skillsText = Array.isArray(resumeData.skills) ? resumeData.skills.join(' ') : resumeData.skills || '';
    const experienceText = resumeData.workExperience || '';
    const educationText = Array.isArray(resumeData.education) ? resumeData.education.join(' ') : resumeData.education || '';
    
    // Combined text for general search
    const combinedText = [
      nameText,
      summaryText,
      skillsText,
      experienceText,
      educationText,
      resumeData.certifications || '',
      resumeData.securityClearance || ''
    ].filter(Boolean).join(' ');

    // Generate embeddings in parallel for efficiency
    const [
      nameEmbedding,
      summaryEmbedding,
      skillsEmbedding,
      experienceEmbedding,
      educationEmbedding,
      combinedEmbedding
    ] = await Promise.all([
      nameText ? generateGeminiEmbedding(nameText) : [],
      summaryText ? generateGeminiEmbedding(summaryText) : [],
      skillsText ? generateGeminiEmbedding(skillsText) : [],
      experienceText ? generateGeminiEmbedding(experienceText) : [],
      educationText ? generateGeminiEmbedding(educationText) : [],
      combinedText ? generateGeminiEmbedding(combinedText) : []
    ]);

    return {
      nameEmbedding,
      summaryEmbedding,
      skillsEmbedding,
      experienceEmbedding,
      educationEmbedding,
      combinedEmbedding
    };
  } catch (error) {
    console.error('Error generating resume embeddings:', error);
    throw error;
  }
}

// Use Gemini AI to analyze and suggest optimal text chunking strategy
export async function analyzeTextChunkingStrategy(sampleData: any[], dataType: 'jobs' | 'resumes'): Promise<{
  recommendedChunks: string[];
  chunkDescriptions: string[];
  optimizationNotes: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create a prompt for analyzing the data structure
    const prompt = `
    Analyze this ${dataType} data structure and recommend the optimal way to chunk the text for vector search embeddings.
    
    Sample data structure:
    ${JSON.stringify(sampleData[0], null, 2)}
    
    Please provide:
    1. Recommended text chunks (specific field combinations that should be embedded together)
    2. Description of what each chunk represents
    3. Optimization notes for vector search performance
    
    Consider:
    - Semantic coherence (related information should be together)
    - Search relevance (what users typically search for)
    - Token limits and embedding costs
    - Search accuracy and precision
    
    Return your response as a JSON object with:
    {
      "recommendedChunks": ["chunk1", "chunk2", ...],
      "chunkDescriptions": ["description1", "description2", ...],
      "optimizationNotes": ["note1", "note2", ...]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse the JSON response
    try {
      const parsed = JSON.parse(text);
      return {
        recommendedChunks: parsed.recommendedChunks || [],
        chunkDescriptions: parsed.chunkDescriptions || [],
        optimizationNotes: parsed.optimizationNotes || []
      };
    } catch (parseError) {
      console.warn('Failed to parse Gemini response as JSON, using fallback strategy');
      return {
        recommendedChunks: dataType === 'jobs' 
          ? ['title', 'summary', 'requirements', 'duties', 'combined']
          : ['name', 'summary', 'skills', 'experience', 'education', 'combined'],
        chunkDescriptions: dataType === 'jobs'
          ? ['Job title only', 'Job summary and description', 'Requirements and qualifications', 'Job duties and responsibilities', 'All job information combined']
          : ['Candidate name', 'Professional summary', 'Skills and competencies', 'Work experience', 'Education and training', 'All resume information combined'],
        optimizationNotes: [
          'Separate chunks allow for more targeted searches',
          'Combined chunk provides general semantic search',
          'Consider search patterns when choosing chunk strategy'
        ]
      };
    }
  } catch (error) {
    console.error('Error analyzing text chunking strategy:', error);
    // Return fallback strategy
    return {
      recommendedChunks: dataType === 'jobs' 
        ? ['title', 'summary', 'requirements', 'duties', 'combined']
        : ['name', 'summary', 'skills', 'experience', 'education', 'combined'],
      chunkDescriptions: dataType === 'jobs'
        ? ['Job title only', 'Job summary and description', 'Requirements and qualifications', 'Job duties and responsibilities', 'All job information combined']
        : ['Candidate name', 'Professional summary', 'Skills and competencies', 'Work experience', 'Education and training', 'All resume information combined'],
      optimizationNotes: [
        'Fallback strategy used due to analysis error',
        'Separate chunks allow for more targeted searches',
        'Combined chunk provides general semantic search'
      ]
    };
  }
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
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

// Rate limiting helper for API calls
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 