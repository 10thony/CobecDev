/**
 * Action plan from LLM
 */
export interface ActionPlan {
  action: "extract" | "click" | "scroll" | "navigate" | "fill" | "wait" | "done" | "error";
  target?: {
    selector?: string;
    description: string;
    coordinates?: { x: number; y: number };
  };
  value?: string; // For fill actions
  reason: string;
  expectedOutcome: string;
}

/**
 * Page analysis result
 */
export interface PageAnalysis {
  pageType: "list" | "detail" | "login" | "error" | "captcha" | "unknown";
  hasOpportunities: boolean;
  opportunityCount?: number;
  hasPagination: boolean;
  paginationType?: "numbered" | "next_prev" | "load_more" | "infinite_scroll";
  currentPageNumber?: number;
  totalPages?: number;
  recommendedAction: ActionPlan;
  confidence: number;
  notes?: string;
}

/**
 * Extracted data from page
 */
export interface ExtractedData {
  opportunities: Array<{
    title: string;
    referenceNumber?: string | null;
    opportunityType?: string | null;
    status?: string | null;
    postedDate?: string | null;
    closingDate?: string | null;
    description?: string | null;
    category?: string | null;
    department?: string | null;
    estimatedValue?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    detailUrl?: string | null;
    documents?: Array<{
      name: string;
      url: string;
      type?: string | null;
    }> | null;
    rawText: string;
    confidence: number;
  }>;
  extractionNotes?: string | null;
  hasMoreOpportunities: boolean;
  needsScrolling: boolean;
}

/**
 * Agent state
 */
export type AgentState = 
  | "idle"
  | "navigating"
  | "analyzing"
  | "extracting"
  | "clicking"
  | "scrolling"
  | "recovering"
  | "completed"
  | "failed";

/**
 * Scrape job
 */
export interface ScrapeJob {
  jobId: string;
  url: string;
  portalId: string;
  configuration: import('./scraping').PortalConfiguration;
}

/**
 * Scrape result
 */
export interface ScrapeResult {
  success: boolean;
  opportunities: import('./scraping').Opportunity[];
  interactions: import('./scraping').Interaction[];
  pagesScraped: number;
  duration: number;
  tokensUsed: number;
  errors: AgentError[];
}

/**
 * Agent error
 */
export interface AgentError {
  type: string;
  message: string;
  recoverable: boolean;
  timestamp: number;
}

