/**
 * Opportunity data structure extracted from procurement portals
 */
export interface Opportunity {
  // Identification
  externalId?: string;
  referenceNumber?: string;
  
  // Core Information
  title: string;
  description?: string;
  opportunityType?: string; // RFP, RFQ, ITB, IFB, etc.
  status?: string; // Open, Closed, Awarded
  
  // Dates
  postedDate?: string; // ISO 8601 format preferred
  closingDate?: string;
  lastModified?: string;
  
  // Classification
  category?: string;
  department?: string;
  agency?: string;
  
  // Value
  estimatedValue?: string;
  valueMin?: number;
  valueMax?: number;
  currency?: string;
  
  // Contact
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // Links & Documents
  detailUrl?: string;
  documents?: Array<{
    name: string;
    url: string;
    type?: string;
  }>;
  
  // Raw Data
  rawText?: string;
  sourceHtml?: string;
  
  // Metadata
  confidence: number; // 0-1, LLM's confidence in extraction
  extractedAt: string; // ISO 8601 timestamp
}

/**
 * Interaction log entry
 */
export interface Interaction {
  step: number;
  timestamp: string; // ISO 8601
  action: "navigate" | "click" | "scroll" | "extract" | "wait" | "fill" | "analyze";
  description: string;
  target?: {
    type: string; // "button", "link", "table", etc.
    selector?: string; // CSS selector if available
    visualDescription: string; // LLM's description
  };
  result: "success" | "failure" | "partial";
  error?: string;
  screenshot?: string; // Base64 or filename
  duration: number; // Milliseconds
  llmTokensUsed?: number;
}

/**
 * Portal configuration
 */
export interface PortalConfiguration {
  requiresAuth: boolean;
  authCredentials?: {
    username?: string;
    password?: string;
  };
  navigationHints?: {
    opportunityListSelector?: string;
    nextButtonSelector?: string;
    detailLinkSelector?: string;
  };
  maxPages?: number;
  customInstructions?: string;
}

