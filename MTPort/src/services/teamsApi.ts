import { SearchFilters, JobResult, ResumeResult, UploadResult, DataSummary, Nomination, NominationData, TeamsContext } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:7071/api';

export interface AISearchRequest {
  query: string;
  searchType?: 'jobs' | 'resumes' | 'both';
  embeddingType?: 'title' | 'summary' | 'requirements' | 'duties' | 'skills' | 'experience' | 'education' | 'combined';
  limit?: number;
  minSimilarity?: number;
  skillFilter?: string[];
}

export interface AISearchResponse {
  results: Array<{
    id: string;
    score: number;
    similarity: number;
    skillScore: number;
    content: string;
    metadata: any;
    bestEmbeddingType: string;
    extractedSkills: string[];
  }>;
  model: string;
  executionTime: number;
  queryEmbedding: number[];
  searchType: string;
  filters: {
    embeddingType: string;
    minSimilarity: number;
    skillFilter: string[];
    extractedSkills: string[];
  };
}

export interface EmbeddingRequest {
  text: string;
  model?: 'openai' | 'gemini';
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  tokens: number;
}

export interface DocumentProcessingRequest {
  content: string;
  documentType: 'job' | 'resume';
  metadata?: any;
}

export interface DocumentProcessingResponse {
  processedDocument: {
    searchableText: string;
    extractedSkills: string[];
    embedding: number[];
  };
  embeddings: any;
  documentType: string;
}

export class TeamsApiService {
  private accessToken: string | null = null;
  private baseUrl: string;
  private teamsContext: TeamsContext | null;

  constructor(accessToken?: string, teamsContext: TeamsContext | null = null) {
    this.accessToken = accessToken || null;
    this.baseUrl = process.env.REACT_APP_AZURE_FUNCTIONS_URL || 'http://localhost:7071/api';
    this.teamsContext = teamsContext;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Teams authentication if available
    if (this.teamsContext && (window as any).microsoftTeams) {
      try {
        const authToken = await (window as any).microsoftTeams.authentication.getAuthToken();
        headers['Authorization'] = `Bearer ${authToken}`;
      } catch (error) {
        console.warn('Failed to get Teams auth token:', error);
      }
    }

    return headers;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const headers = await this.getAuthHeaders();

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // AI Vector Search
  async enhancedVectorSearch(request: AISearchRequest): Promise<AISearchResponse> {
    return this.makeRequest<AISearchResponse>('enhancedVectorSearch', 'POST', request);
  }

  // Generate embeddings
  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.makeRequest<EmbeddingResponse>('generateEmbeddings', 'POST', request);
  }

  // Process document
  async processDocument(request: DocumentProcessingRequest): Promise<DocumentProcessingResponse> {
    return this.makeRequest<DocumentProcessingResponse>('processDocument', 'POST', request);
  }

  // Extract skills from text
  async extractSkills(text: string): Promise<{ skills: string[] }> {
    return this.makeRequest<{ skills: string[] }>('extractSkills', 'POST', { text });
  }

  // Analyze sentiment
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }> {
    return this.makeRequest<{
      sentiment: 'positive' | 'negative' | 'neutral';
      confidence: number;
    }>('analyzeSentiment', 'POST', { text });
  }

  // Search Azure Cognitive Search
  async searchAzureSearch(query: string, filters?: any): Promise<{ results: any[] }> {
    return this.makeRequest<{ results: any[] }>('searchAzureSearch', 'POST', { query, filters });
  }

  // Batch process embeddings
  async batchProcessEmbeddings(documents: any[], documentType: 'job' | 'resume'): Promise<{
    results: Array<{
      id: any;
      success: boolean;
      embeddings?: any;
      error?: string;
    }>;
  }> {
    return this.makeRequest<{
      results: Array<{
        id: any;
        success: boolean;
        embeddings?: any;
        error?: string;
      }>;
    }>('batchProcessEmbeddings', 'POST', { documents, documentType });
  }

  // Data Management Operations
  async getJobPostings(): Promise<any[]> {
    return this.makeRequest<any[]>('getJobPostings');
  }

  async getResumes(): Promise<any[]> {
    return this.makeRequest<any[]>('getResumes');
  }

  async uploadFile(file: File, contentType: 'job' | 'resume'): Promise<{
    success: boolean;
    fileId: string;
    message: string;
    processedCount?: number;
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contentType', contentType);

    const url = `${this.baseUrl}/uploadFile`;
         const headers = await this.getAuthHeaders();
     const headersObj = headers as Record<string, string>;
     delete headersObj['Content-Type']; // Let browser set content-type for FormData

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // KFC Management Operations
  async getNominations(): Promise<any[]> {
    return this.makeRequest<any[]>('getNominations');
  }

  async createNomination(nomination: any): Promise<any> {
    return this.makeRequest<any>('createNomination', 'POST', nomination);
  }

  async approveNomination(id: string, approver: string): Promise<void> {
    return this.makeRequest<void>('approveNomination', 'POST', { id, approver });
  }

  // Teams-specific operations
  async getTeamsUserProfile(): Promise<{
    id: string;
    displayName: string;
    email: string;
    tenantId: string;
  }> {
    if (!this.teamsContext) {
      throw new Error('Teams context not available');
    }

    try {
      if ((window as any).microsoftTeams) {
        const context = await (window as any).microsoftTeams.getContext();
        return {
          id: context.userObjectId,
          displayName: context.userDisplayName,
          email: context.userPrincipalName,
          tenantId: context.tenantId,
        };
      } else {
        // Fallback to TeamsContext data
        return {
          id: this.teamsContext.user.id,
          displayName: this.teamsContext.user.displayName,
          email: this.teamsContext.user.email,
          tenantId: this.teamsContext.user.tenantId,
        };
      }
    } catch (error) {
      console.error('Failed to get Teams user profile:', error);
      throw error;
    }
  }

  async getTeamMembers(): Promise<Array<{
    id: string;
    displayName: string;
    email: string;
    role: string;
  }>> {
    if (!this.teamsContext) {
      throw new Error('Teams context not available');
    }

    try {
      if ((window as any).microsoftTeams) {
        const context = await (window as any).microsoftTeams.getContext();
        // This would require Microsoft Graph API permissions
        // For now, return basic user info
        return [{
          id: context.userObjectId,
          displayName: context.userDisplayName,
          email: context.userPrincipalName,
          role: 'member',
        }];
      } else {
        // Fallback to TeamsContext data
        return [{
          id: this.teamsContext.user.id,
          displayName: this.teamsContext.user.displayName,
          email: this.teamsContext.user.email,
          role: 'member',
        }];
      }
    } catch (error) {
      console.error('Failed to get team members:', error);
      throw error;
    }
  }

  // Utility methods
  async testConnection(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.makeRequest<{ status: string; timestamp: string }>('health');
      return response;
    } catch (error) {
      throw new Error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    averageSearchTime: number;
    totalSearches: number;
    averageEmbeddingTime: number;
    totalEmbeddings: number;
  }> {
    return this.makeRequest<{
      averageSearchTime: number;
      totalSearches: number;
      averageEmbeddingTime: number;
      totalEmbeddings: number;
    }>('performanceMetrics');
  }
}

// Singleton instance
export const teamsApiService = new TeamsApiService(); 