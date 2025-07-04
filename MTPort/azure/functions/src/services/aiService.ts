import { TextAnalyticsClient, AzureKeyCredential } from '@azure/cognitiveservices-textanalytics';
import { SearchClient, AzureKeyCredential as SearchKeyCredential } from '@azure/search-documents';
import { EmbeddingRequest, EmbeddingResponse, AISearchRequest, AISearchResponse } from '../types';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIService {
  private textAnalyticsClient: TextAnalyticsClient;
  private searchClient: SearchClient;
  private openai: OpenAI;
  private genAI: GoogleGenerativeAI;

  constructor() {
    const cognitiveServicesEndpoint = process.env.COGNITIVE_SERVICES_ENDPOINT!;
    const cognitiveServicesKey = process.env.COGNITIVE_SERVICES_KEY!;
    const searchServiceName = process.env.SEARCH_SERVICE_NAME!;
    const searchServiceKey = process.env.SEARCH_SERVICE_KEY!;

    this.textAnalyticsClient = new TextAnalyticsClient(
      cognitiveServicesEndpoint,
      new AzureKeyCredential(cognitiveServicesKey)
    );

    this.searchClient = new SearchClient(
      `https://${searchServiceName}.search.windows.net`,
      'ajai-index',
      new SearchKeyCredential(searchServiceKey)
    );

    // Initialize OpenAI for embeddings
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Initialize Google AI for Gemini embeddings
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  }

  // Generate embeddings using OpenAI
  async generateOpenAIEmbedding(text: string, model: string = 'text-embedding-ada-002'): Promise<EmbeddingResponse> {
    try {
      const response = await this.openai.embeddings.create({
        model,
        input: text.trim(),
      });
      
      return {
        embedding: response.data[0].embedding,
        model: 'openai-' + model,
        tokens: response.usage.total_tokens
      };
    } catch (error) {
      console.error('Error generating OpenAI embedding:', error);
      throw new Error('Failed to generate OpenAI embedding');
    }
  }

  // Generate embeddings using Google Gemini
  async generateGeminiEmbedding(text: string): Promise<EmbeddingResponse> {
    try {
      const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" });
      const result = await embeddingModel.embedContent(text.trim());
      
      return {
        embedding: result.embedding.values,
        model: 'gemini-embedding-001',
        tokens: text.length
      };
    } catch (error) {
      console.error('Error generating Gemini embedding:', error);
      throw new Error('Failed to generate Gemini embedding');
    }
  }

  // Generate multi-embeddings for job postings
  async generateJobEmbeddings(jobData: any): Promise<{
    titleEmbedding: number[];
    summaryEmbedding: number[];
    requirementsEmbedding: number[];
    dutiesEmbedding: number[];
    combinedEmbedding: number[];
  }> {
    try {
      const titleText = jobData.jobTitle || '';
      const summaryText = jobData.jobSummary || jobData.summary || '';
      const requirementsText = jobData.requirements || jobData.qualifications || '';
      const dutiesText = jobData.duties || jobData.responsibilities || '';
      const combinedText = `${titleText} ${summaryText} ${requirementsText} ${dutiesText}`.trim();

      // Generate embeddings in parallel for efficiency
      const [titleEmbedding, summaryEmbedding, requirementsEmbedding, dutiesEmbedding, combinedEmbedding] = 
        await Promise.all([
          titleText ? this.generateGeminiEmbedding(titleText) : Promise.resolve({ embedding: [] }),
          summaryText ? this.generateGeminiEmbedding(summaryText) : Promise.resolve({ embedding: [] }),
          requirementsText ? this.generateGeminiEmbedding(requirementsText) : Promise.resolve({ embedding: [] }),
          dutiesText ? this.generateGeminiEmbedding(dutiesText) : Promise.resolve({ embedding: [] }),
          combinedText ? this.generateGeminiEmbedding(combinedText) : Promise.resolve({ embedding: [] })
        ]);

      return {
        titleEmbedding: titleEmbedding.embedding,
        summaryEmbedding: summaryEmbedding.embedding,
        requirementsEmbedding: requirementsEmbedding.embedding,
        dutiesEmbedding: dutiesEmbedding.embedding,
        combinedEmbedding: combinedEmbedding.embedding
      };
    } catch (error) {
      console.error('Error generating job embeddings:', error);
      throw new Error('Failed to generate job embeddings');
    }
  }

  // Generate multi-embeddings for resumes
  async generateResumeEmbeddings(resumeData: any): Promise<{
    nameEmbedding: number[];
    summaryEmbedding: number[];
    skillsEmbedding: number[];
    experienceEmbedding: number[];
    educationEmbedding: number[];
    combinedEmbedding: number[];
  }> {
    try {
      const nameText = resumeData.name || resumeData.personalInfo?.name || '';
      const summaryText = resumeData.summary || resumeData.professionalSummary || '';
      const skillsText = Array.isArray(resumeData.skills) ? resumeData.skills.join(' ') : resumeData.skills || '';
      const experienceText = resumeData.experience || resumeData.workExperience || '';
      const educationText = resumeData.education || resumeData.educationalBackground || '';
      const combinedText = `${nameText} ${summaryText} ${skillsText} ${experienceText} ${educationText}`.trim();

      // Generate embeddings in parallel
      const [nameEmbedding, summaryEmbedding, skillsEmbedding, experienceEmbedding, educationEmbedding, combinedEmbedding] = 
        await Promise.all([
          nameText ? this.generateGeminiEmbedding(nameText) : Promise.resolve({ embedding: [] }),
          summaryText ? this.generateGeminiEmbedding(summaryText) : Promise.resolve({ embedding: [] }),
          skillsText ? this.generateGeminiEmbedding(skillsText) : Promise.resolve({ embedding: [] }),
          experienceText ? this.generateGeminiEmbedding(experienceText) : Promise.resolve({ embedding: [] }),
          educationText ? this.generateGeminiEmbedding(educationText) : Promise.resolve({ embedding: [] }),
          combinedText ? this.generateGeminiEmbedding(combinedText) : Promise.resolve({ embedding: [] })
        ]);

      return {
        nameEmbedding: nameEmbedding.embedding,
        summaryEmbedding: summaryEmbedding.embedding,
        skillsEmbedding: skillsEmbedding.embedding,
        experienceEmbedding: experienceEmbedding.embedding,
        educationEmbedding: educationEmbedding.embedding,
        combinedEmbedding: combinedEmbedding.embedding
      };
    } catch (error) {
      console.error('Error generating resume embeddings:', error);
      throw new Error('Failed to generate resume embeddings');
    }
  }

  // Enhanced vector search with multiple embedding types
  async enhancedVectorSearch(
    query: string,
    documents: Array<{ 
      id: string; 
      content: string; 
      metadata: any; 
      embeddings?: {
        titleEmbedding?: number[];
        summaryEmbedding?: number[];
        requirementsEmbedding?: number[];
        dutiesEmbedding?: number[];
        skillsEmbedding?: number[];
        experienceEmbedding?: number[];
        educationEmbedding?: number[];
        combinedEmbedding?: number[];
      };
    }>,
    options: {
      embeddingType?: 'title' | 'summary' | 'requirements' | 'duties' | 'skills' | 'experience' | 'education' | 'combined';
      limit?: number;
      minSimilarity?: number;
      skillFilter?: string[];
      searchType?: 'jobs' | 'resumes' | 'both';
    } = {}
  ): Promise<AISearchResponse> {
    try {
      const startTime = Date.now();
      const {
        embeddingType = 'combined',
        limit = 10,
        minSimilarity = 0.3,
        skillFilter = [],
        searchType = 'both'
      } = options;

      // Generate query embedding
      const queryEmbedding = await this.generateGeminiEmbedding(query);
      
      // Extract skills from query for filtering
      const extractedSkills = await this.extractSkills(query);
      const effectiveSkillFilter = skillFilter.length > 0 ? skillFilter : extractedSkills;

      // Calculate similarities for each document
      const results = documents
        .map(doc => {
          let similarity = 0;
          let bestEmbeddingType = embeddingType;

          if (doc.embeddings) {
            // Try the specified embedding type first
            const targetEmbedding = doc.embeddings[`${embeddingType}Embedding` as keyof typeof doc.embeddings];
            if (targetEmbedding) {
              similarity = this.cosineSimilarity(queryEmbedding.embedding, targetEmbedding);
            }

            // If similarity is low, try other embedding types
            if (similarity < minSimilarity) {
              const embeddingTypes = ['combined', 'summary', 'title', 'requirements', 'duties', 'skills', 'experience', 'education'];
              for (const type of embeddingTypes) {
                if (type === embeddingType) continue;
                const embedding = doc.embeddings[`${type}Embedding` as keyof typeof doc.embeddings];
                if (embedding) {
                  const typeSimilarity = this.cosineSimilarity(queryEmbedding.embedding, embedding);
                  if (typeSimilarity > similarity) {
                    similarity = typeSimilarity;
                    bestEmbeddingType = type as any;
                  }
                }
              }
            }
          } else {
            // Fallback to text similarity
            similarity = this.textSimilarity(query, doc.content);
          }

          // Apply skill filtering
          let skillScore = 1;
          if (effectiveSkillFilter.length > 0 && doc.metadata.skills) {
            const docSkills = Array.isArray(doc.metadata.skills) ? doc.metadata.skills : [doc.metadata.skills];
            const matchingSkills = effectiveSkillFilter.filter(skill => 
              docSkills.some((docSkill: string) => 
                docSkill.toLowerCase().includes(skill.toLowerCase())
              )
            );
            skillScore = matchingSkills.length / effectiveSkillFilter.length;
          }

          // Combine similarity and skill score
          const finalScore = similarity * skillScore;

          return {
            id: doc.id,
            score: finalScore,
            similarity: similarity,
            skillScore: skillScore,
            content: doc.content,
            metadata: doc.metadata,
            bestEmbeddingType,
            extractedSkills
          };
        })
        .filter(result => result.score > minSimilarity)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        results,
        model: 'azure-enhanced-search',
        executionTime: Date.now() - startTime,
        queryEmbedding: queryEmbedding.embedding,
        searchType,
        filters: {
          embeddingType,
          minSimilarity,
          skillFilter: effectiveSkillFilter,
          extractedSkills
        }
      };
    } catch (error) {
      console.error('Error in enhanced vector search:', error);
      throw new Error('Failed to perform enhanced vector search');
    }
  }

  // Search similar documents using vector similarity
  async searchSimilarDocuments(
    query: string,
    documents: Array<{ id: string; content: string; metadata: any; embedding?: number[] }>,
    limit: number = 10
  ): Promise<AISearchResponse> {
    try {
      const startTime = Date.now();
      
      // Generate embedding for the query
      const queryEmbedding = await this.generateGeminiEmbedding(query);
      
      // Calculate similarities
      const results = documents
        .map(doc => {
          let similarity = 0;
          
          if (doc.embedding) {
            // Use cosine similarity if embedding exists
            similarity = this.cosineSimilarity(queryEmbedding.embedding, doc.embedding);
          } else {
            // Fallback to text similarity
            similarity = this.textSimilarity(query, doc.content);
          }
          
          return {
            id: doc.id,
            score: similarity,
            content: doc.content,
            metadata: doc.metadata
          };
        })
        .filter(result => result.score > 0.3) // Minimum similarity threshold
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        results,
        model: 'azure-cognitive-search',
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error searching similar documents:', error);
      throw new Error('Failed to search similar documents');
    }
  }

  // Extract skills from text using Azure Cognitive Services
  async extractSkills(text: string): Promise<string[]> {
    try {
      const result = await this.textAnalyticsClient.extractKeyPhrases([text]);
      
      if (result[0].error) {
        throw new Error(`Text analytics error: ${result[0].error.message}`);
      }

      return result[0].keyPhrases || [];
    } catch (error) {
      console.error('Error extracting skills:', error);
      throw new Error('Failed to extract skills');
    }
  }

  // Analyze sentiment of text
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }> {
    try {
      const result = await this.textAnalyticsClient.analyzeSentiment([text]);
      
      if (result[0].error) {
        throw new Error(`Sentiment analysis error: ${result[0].error.message}`);
      }

      const sentiment = result[0].documentSentiment;
      return {
        sentiment: sentiment.sentiment as 'positive' | 'negative' | 'neutral',
        confidence: sentiment.confidenceScores[sentiment.sentiment] || 0
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      throw new Error('Failed to analyze sentiment');
    }
  }

  // Process document content for search
  async processDocument(content: string): Promise<{
    searchableText: string;
    extractedSkills: string[];
    embedding: number[];
  }> {
    try {
      // Extract skills
      const extractedSkills = await this.extractSkills(content);
      
      // Generate embedding
      const embeddingResponse = await this.generateGeminiEmbedding(content);
      
      // Create searchable text (remove special characters, normalize)
      const searchableText = this.normalizeText(content);

      return {
        searchableText,
        extractedSkills,
        embedding: embeddingResponse.embedding
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error('Failed to process document');
    }
  }

  // Search Azure Cognitive Search
  async searchAzureSearch(query: string, filters?: any): Promise<any[]> {
    try {
      const searchOptions: any = {
        searchText: query,
        top: 50,
        includeTotalCount: true
      };

      if (filters) {
        searchOptions.filter = this.buildFilterString(filters);
      }

      const searchResults = await this.searchClient.search(searchOptions);
      const results: any[] = [];

      for await (const result of searchResults.results) {
        results.push({
          id: result.document.id,
          score: result.score,
          content: result.document.content,
          metadata: result.document.metadata
        });
      }

      return results;
    } catch (error) {
      console.error('Error searching Azure Search:', error);
      throw new Error('Failed to search Azure Search');
    }
  }

  // Utility methods
  private createSimpleEmbedding(text: string, keyPhrases: string[]): number[] {
    // Create a simple embedding vector based on text characteristics
    // This is a placeholder - in production, use OpenAI's embedding API
    const vector = new Array(768).fill(0); // Gemini embedding size
    
    // Simple hash-based embedding
    const words = text.toLowerCase().split(/\s+/);
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      const position = hash % vector.length;
      vector[position] = (vector[position] + 1) % 1;
    });

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
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

  private textSimilarity(textA: string, textB: string): number {
    const wordsA = new Set(textA.toLowerCase().split(/\s+/));
    const wordsB = new Set(textB.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildFilterString(filters: any): string {
    const filterParts: string[] = [];
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          const arrayFilters = value.map(v => `${key} eq '${v}'`).join(' or ');
          filterParts.push(`(${arrayFilters})`);
        } else {
          filterParts.push(`${key} eq '${value}'`);
        }
      }
    }
    
    return filterParts.join(' and ');
  }
}

// Singleton instance
export const aiService = new AIService(); 