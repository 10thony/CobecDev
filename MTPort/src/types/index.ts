// Teams-specific types
export interface TeamsUser {
  id: string;
  displayName: string;
  email: string;
  tenantId: string;
  teamsContext: any;
}

export interface TeamsContext {
  app: {
    sessionId: string;
    theme: string;
    locale: string;
  };
  page: {
    id: string;
    frameContext: string;
    subPageId?: string;
  };
  user: {
    id: string;
    displayName: string;
    email: string;
    tenantId: string;
  };
  team?: {
    id: string;
    displayName: string;
    internalId: string;
  };
  channel?: {
    id: string;
    displayName: string;
    relativeUrl: string;
  };
}

// Authentication types
export interface AuthState {
  isAuthenticated: boolean;
  user: TeamsUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}

// API types
export interface SearchFilters {
  jobTitle?: string;
  location?: string;
  jobType?: string;
  department?: string;
  minSimilarity?: number;
  limit?: number;
}

export interface JobPosting {
  _id?: string;
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
  similarity?: number;
  _metadata?: {
    originalIndex?: number;
    importedAt: Date;
    sourceFile?: string;
    dataType: string;
  };
}

export interface Resume {
  _id?: string;
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
  similarity?: number;
  _metadata?: {
    filePath?: string;
    fileName: string;
    importedAt: Date;
    parsedAt: Date;
  };
}

export interface SearchResult {
  jobs: JobPosting[];
  resumes: Resume[];
  totalResults?: number;
  searchTime?: number;
}

export interface JobResult extends JobPosting {
  similarity: number;
}

export interface ResumeResult extends Resume {
  similarity: number;
}

export interface UploadResult {
  success: boolean;
  fileId: string;
  message: string;
  processedCount?: number;
}

export interface DataSummary {
  totalJobs: number;
  totalResumes: number;
  totalNominations: number;
  lastUpdated: Date;
  storageUsed: number;
  storageLimit: number;
}

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  error?: string;
  fileUrl?: string;
}

// KFC Management types
export interface Nomination {
  _id?: string;
  nomineeId: string;
  nomineeName: string;
  nomineeEmail: string;
  nominatorId: string;
  nominatorName: string;
  nominatorEmail: string;
  reason: string;
  category: 'excellence' | 'innovation' | 'leadership' | 'teamwork' | 'customer_service';
  status: 'pending' | 'approved' | 'rejected';
  points: number;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  teamId?: string;
  channelId?: string;
}

export interface NominationData {
  nomineeId: string;
  nomineeName: string;
  nomineeEmail: string;
  reason: string;
  category: Nomination['category'];
  teamId?: string;
  channelId?: string;
}

export interface KfcPoints {
  userId: string;
  userName: string;
  userEmail: string;
  totalPoints: number;
  nominationsReceived: number;
  nominationsGiven: number;
  lastUpdated: Date;
}

export interface TeamMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
  points?: number;
}

// SharePoint types
export interface SharePointFile {
  id: string;
  name: string;
  size: number;
  lastModified: Date;
  webUrl: string;
  downloadUrl: string;
  contentType: string;
  createdBy: {
    user: {
      displayName: string;
      email: string;
    };
  };
}

export interface TeamsFile {
  id: string;
  name: string;
  size: number;
  lastModified: Date;
  downloadUrl: string;
}

// Adaptive Cards types
export interface AdaptiveCard {
  type: string;
  version: string;
  body: AdaptiveCardElement[];
  actions?: AdaptiveCardAction[];
}

export interface AdaptiveCardElement {
  type: string;
  text?: string;
  title?: string;
  value?: string;
  items?: AdaptiveCardElement[];
  [key: string]: any;
}

export interface AdaptiveCardAction {
  type: string;
  title: string;
  data?: any;
  [key: string]: any;
}

// Azure AI types
export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface VectorSearchRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  minSimilarity?: number;
}

export interface VectorSearchResponse {
  results: SearchResult;
  searchTime: number;
  totalResults: number;
}

export interface DocumentProcessingRequest {
  file: File;
  type: 'resume' | 'job' | 'general';
}

export interface ProcessedDocument {
  text: string;
  metadata: {
    fileName: string;
    fileSize: number;
    contentType: string;
    extractedSkills?: string[];
    confidence: number;
  };
}

// Teams Integration types
export interface TeamsUserProfile {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
}

export interface TeamsIntegration {
  sendAdaptiveCard(card: AdaptiveCard): Promise<void>;
  sendMessageToChannel(channelId: string, message: string): Promise<void>;
  openFileInTeams(fileId: string): Promise<void>;
  shareFileWithTeam(fileId: string, teamId: string): Promise<void>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  getUserProfile(userId: string): Promise<TeamsUserProfile>;
}

// Teams API Service Types
export interface TeamsApiService {
  // Vector Search
  searchJobs(query: string, filters: SearchFilters): Promise<JobResult[]>;
  searchResumes(query: string, filters: SearchFilters): Promise<ResumeResult[]>;
  searchBoth(query: string, filters: SearchFilters): Promise<SearchResult>;
  
  // Data Management
  uploadFile(file: File, type: 'job' | 'resume'): Promise<FileUploadResult>;
  getDataSummary(): Promise<DataSummary>;
  exportData(format: 'json' | 'excel'): Promise<Blob>;
  clearData(): Promise<boolean>;
  
  // KFC Management
  getNominations(): Promise<Nomination[]>;
  createNomination(nomination: NominationData): Promise<Nomination>;
  approveNomination(id: string, approver: string): Promise<void>;
  rejectNomination(id: string, rejector: string, reason?: string): Promise<void>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  getKfcPoints(userId: string): Promise<KfcPoints>;
  
  // SharePoint Integration
  uploadToSharePoint(file: File, library: string): Promise<string>;
  getSharePointFiles(library: string): Promise<SharePointFile[]>;
  downloadFile(fileId: string): Promise<Blob>;
}

// Authentication Types
export interface AuthConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

export interface AuthResult {
  accessToken: string;
  expiresOn: Date;
  account: any;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Component Props Types
export interface TeamsVectorSearchProps {
  teamsContext: TeamsContext;
  onNavigate: (route: string) => void;
}

export interface TeamsDataManagementProps {
  teamsContext: TeamsContext;
  onNavigate: (route: string) => void;
}

export interface TeamsKfcManagementProps {
  teamsContext: TeamsContext;
  onNavigate: (route: string) => void;
}

// Hook Return Types
export interface UseTeamsAuthReturn {
  user: TeamsUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

export interface UseTeamsContextReturn {
  context: TeamsContext | null;
  isLoading: boolean;
  error: string | null;
}

// Utility Types
export type SearchType = 'jobs' | 'resumes' | 'both';
export type NominationCategory = 'excellence' | 'innovation' | 'leadership' | 'teamwork' | 'customer_service';
export type NominationStatus = 'pending' | 'approved' | 'rejected';
export type FileType = 'job' | 'resume' | 'general';
export type ExportFormat = 'json' | 'excel'; 