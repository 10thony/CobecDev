// Database types
export interface JobPosting {
  id: string;
  jobTitle: string;
  location: string;
  salary: string;
  openDate: string;
  closeDate: string;
  jobLink: string;
  jobType: string;
  jobSummary: string;
  duties: string;
  requirements: string;
  qualifications: string;
  education: string;
  howToApply: string;
  additionalInformation: string;
  department: string;
  seriesGrade: string;
  travelRequired: string;
  workSchedule: string;
  securityClearance: string;
  experienceRequired: string;
  educationRequired: string;
  applicationDeadline: string;
  contactInfo: string;
  searchableText?: string;
  extractedSkills?: string[];
  embedding?: number[];
  _metadata?: {
    originalIndex?: number;
    importedAt: Date;
    sourceFile?: string;
    dataType: string;
  };
}

export interface Resume {
  id: string;
  filename: string;
  originalText: string;
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    yearsOfExperience: number;
  };
  professionalSummary: string;
  education: string[];
  experience: Array<{
    title: string;
    company: string;
    location: string;
    duration: string;
    responsibilities: string[];
  }>;
  skills: string[];
  certifications: string;
  professionalMemberships: string;
  securityClearance: string;
  searchableText?: string;
  extractedSkills?: string[];
  embedding?: number[];
  _metadata?: {
    filePath?: string;
    fileName: string;
    importedAt: Date;
    parsedAt: Date;
  };
}

export interface Nomination {
  id: string;
  nomineeId: string;
  nomineeName: string;
  nominatorId: string;
  nominatorName: string;
  reason: string;
  points: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

// API types
export interface SearchRequest {
  query: string;
  type: 'jobs' | 'resumes' | 'both';
  limit?: number;
  filters?: {
    jobTitle?: string;
    location?: string;
    department?: string;
    skills?: string[];
    minSimilarity?: number;
  };
}

export interface SearchResponse {
  jobs?: JobPosting[];
  resumes?: Resume[];
  totalResults: number;
  query: string;
  executionTime: number;
}

export interface UploadRequest {
  file: Buffer;
  fileName: string;
  fileType: string;
  contentType: 'job' | 'resume';
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  message: string;
  processedCount?: number;
  errors?: string[];
}

// AI Service types
export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  tokens: number;
}

export interface AISearchRequest {
  query: string;
  documents: Array<{
    id: string;
    content: string;
    metadata: any;
  }>;
  model?: string;
}

export interface AISearchResponse {
  results: Array<{
    id: string;
    score: number;
    content: string;
    metadata: any;
  }>;
  model: string;
  executionTime: number;
}

// SharePoint types
export interface SharePointFile {
  id: string;
  name: string;
  size: number;
  lastModified: Date;
  webUrl: string;
  downloadUrl: string;
}

export interface SharePointUploadRequest {
  file: Buffer;
  fileName: string;
  library: string;
  folder?: string;
}

export interface SharePointUploadResponse {
  success: boolean;
  fileId: string;
  webUrl: string;
  message: string;
}

// Teams types
export interface TeamsUser {
  id: string;
  displayName: string;
  email: string;
  tenantId: string;
}

export interface TeamsMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

// Error types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Configuration types
export interface AzureConfig {
  cosmosDb: {
    endpoint: string;
    key: string;
    database: string;
  };
  cognitiveServices: {
    endpoint: string;
    key: string;
  };
  searchService: {
    name: string;
    key: string;
  };
  signalR: {
    connectionString: string;
  };
  storage: {
    connectionString: string;
    containerName: string;
  };
  aiServices: {
    openai: {
      apiKey: string;
      endpoint: string;
    };
    anthropic: {
      apiKey: string;
    };
    gemini: {
      apiKey: string;
    };
  };
} 