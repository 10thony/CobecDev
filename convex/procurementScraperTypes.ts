/**
 * Procurement Scraper Types
 * 
 * Comprehensive type definitions for the procurement scraping system.
 * Ensures type safety across all scraping strategies (HTTP, Browser, Proxy).
 */

import { Id } from "./_generated/dataModel";

// ============================================================================
// SCRAPING METHOD TYPES
// ============================================================================

/**
 * Available scraping methods
 */
export const SCRAPING_METHOD = {
  /** Direct HTTP fetch - fast but limited (no JS, blocked by Cloudflare) */
  HTTP_FETCH: "http_fetch",
  /** Proxy service like ScrapingBee - handles Cloudflare, renders JS */
  PROXY_SERVICE: "proxy_service",
  /** Server-side browser via Browserless/Browserbase */
  BROWSER_SERVICE: "browser_service",
  /** Frontend browser via MCP tools (requires user browser) */
  FRONTEND_BROWSER: "frontend_browser",
} as const;

export type ScrapingMethod = typeof SCRAPING_METHOD[keyof typeof SCRAPING_METHOD];

/**
 * Scraping method configuration
 */
export interface ScrapingMethodConfig {
  method: ScrapingMethod;
  enabled: boolean;
  priority: number; // Lower = higher priority
  /** Methods to try if this one fails */
  fallbackMethods: ScrapingMethod[];
}

// ============================================================================
// FETCH RESULT TYPES
// ============================================================================

/**
 * Result from fetching webpage content
 */
export interface FetchResult {
  url: string;
  finalUrl: string; // After redirects
  statusCode: number;
  contentType: string;
  html: string;
  text: string;
  method: ScrapingMethod;
  duration: number;
  success: boolean;
  error?: string;
  /** Additional metadata about the fetch */
  metadata: FetchMetadata;
}

/**
 * Metadata about the fetch operation
 */
export interface FetchMetadata {
  /** Whether the site blocked access (403/401/etc) */
  blocked: boolean;
  /** Whether the site requires JavaScript to render content */
  requiresJavaScript: boolean;
  /** Whether the site requires login/authentication */
  requiresAuth: boolean;
  /** Whether Cloudflare protection was detected */
  cloudflareDetected: boolean;
  /** Whether CAPTCHA was detected */
  captchaDetected: boolean;
  /** Raw HTML length before processing */
  rawHtmlLength: number;
  /** Extracted text length */
  extractedTextLength: number;
  /** Detected page type */
  pageType: PageType;
  /** Any warnings during fetch */
  warnings: string[];
}

/**
 * Page type detection
 */
export const PAGE_TYPE = {
  PROCUREMENT_LIST: "procurement_list",
  PROCUREMENT_DETAIL: "procurement_detail",
  LOGIN_PAGE: "login_page",
  ERROR_PAGE: "error_page",
  EMPTY_PAGE: "empty_page",
  CLOUDFLARE_CHALLENGE: "cloudflare_challenge",
  CAPTCHA_PAGE: "captcha_page",
  UNKNOWN: "unknown",
} as const;

export type PageType = typeof PAGE_TYPE[keyof typeof PAGE_TYPE];

// ============================================================================
// SCRAPING SESSION TYPES
// ============================================================================

/**
 * Scraping session status
 */
export const SESSION_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  PARTIAL: "partial", // Some data scraped but errors occurred
} as const;

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

/**
 * Scraping session data
 */
export interface ScrapingSession {
  id: Id<"scrapedProcurementData">;
  url: string;
  state: string;
  capital: string;
  status: SessionStatus;
  method: ScrapingMethod;
  methodsAttempted: ScrapingMethod[];
  startTime: number;
  endTime?: number;
  opportunitiesFound: number;
  opportunitiesScraped: number;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// SCRAPED DATA TYPES
// ============================================================================

/**
 * Data quality assessment
 */
export const DATA_QUALITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  FAILED: "failed", // Added for explicit failure reporting
} as const;

export type DataQuality = typeof DATA_QUALITY[keyof typeof DATA_QUALITY];

/**
 * Individual procurement opportunity
 */
export interface ProcurementOpportunity {
  title: string;
  referenceNumber?: string;
  opportunityType?: string; // RFP, RFQ, ITB, IFB, etc.
  status?: string; // Open, Closed, Awarded
  postedDate?: string;
  closingDate?: string;
  lastModified?: string;
  description?: string;
  category?: string;
  department?: string;
  estimatedValue?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  detailUrl?: string;
  sourceUrl: string;
  documents?: ProcurementDocument[];
  rawScrapedText?: string;
}

/**
 * Document attached to a procurement opportunity
 */
export interface ProcurementDocument {
  name: string;
  url: string;
  type?: string;
  size?: string;
}

/**
 * Contact information extracted from procurement page
 */
export interface ContactInfo {
  officeName: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
}

/**
 * Full scraped data structure returned by AI agent
 */
export interface ScrapedProcurementData {
  sourceUrl: string;
  scrapedAt: string;
  data: {
    rfps: ProcurementOpportunity[];
    rfqs: ProcurementOpportunity[];
    bidOpportunities: ProcurementOpportunity[];
    procurementCalendar: Array<{
      title: string;
      date: string;
      description?: string;
    }>;
    contactInfo: ContactInfo;
    registrationInfo: {
      registrationRequired?: boolean;
      registrationLink?: string;
      instructions?: string;
    };
    otherInfo?: string;
  };
  metadata: ScrapedDataMetadata;
}

/**
 * Metadata about the scraped data
 */
export interface ScrapedDataMetadata {
  dataQuality: DataQuality;
  dataCompleteness: number; // 0.0 to 1.0
  scrapingMethod: ScrapingMethod;
  methodsAttempted: ScrapingMethod[];
  fetchDuration: number;
  processingDuration: number;
  totalDuration: number;
  notes: string;
  warnings: string[];
  /** Whether the scrape failed entirely */
  failed: boolean;
  /** Specific failure reason if applicable */
  failureReason?: string;
}

// ============================================================================
// PROXY SERVICE TYPES (ScrapingBee, etc.)
// ============================================================================

/**
 * ScrapingBee configuration
 */
export interface ScrapingBeeConfig {
  apiKey: string;
  renderJs: boolean;
  premiumProxy: boolean;
  countryCode?: string;
  waitFor?: string; // CSS selector to wait for
  timeout?: number;
  returnScreenshot?: boolean;
}

/**
 * ScrapingBee response
 */
export interface ScrapingBeeResponse {
  body: string;
  cost: number;
  initialStatusCode: number;
  resolvedUrl: string;
  type: string;
  screenshot?: string; // Base64 if requested
}

// ============================================================================
// BROWSER SERVICE TYPES (Browserless, Browserbase)
// ============================================================================

/**
 * Browserless configuration
 */
export interface BrowserlessConfig {
  apiKey: string;
  timeout?: number;
  stealth?: boolean;
  blockAds?: boolean;
  waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
}

/**
 * Browser action for page interaction
 */
export interface BrowserAction {
  type: "click" | "type" | "wait" | "scroll" | "navigate" | "screenshot";
  selector?: string;
  value?: string;
  timeout?: number;
}

/**
 * Browser scraping session
 */
export interface BrowserSession {
  sessionId: string;
  connected: boolean;
  currentUrl: string;
  pageTitle: string;
  actions: BrowserAction[];
}

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

/**
 * Patterns for detecting various page states
 */
export const DETECTION_PATTERNS = {
  /** Cloudflare challenge indicators */
  CLOUDFLARE: [
    "Just a moment...",
    "Checking your browser",
    "DDoS protection by Cloudflare",
    "cf-browser-verification",
    "challenge-platform",
    "__cf_chl",
  ],
  
  /** JavaScript-required site indicators */
  JAVASCRIPT_REQUIRED: [
    '<div id="root"></div>',
    '<div id="app"></div>',
    '<div id="__next"></div>',
    "ng-app",
    "data-reactroot",
    "__NEXT_DATA__",
    "window.__INITIAL_STATE__",
    "Loading...",
    "Please wait while we load",
    "JavaScript is required",
    "enable JavaScript",
    "This page requires JavaScript",
  ],
  
  /** Login/authentication required indicators */
  AUTH_REQUIRED: [
    "login",
    "sign in",
    "log in",
    "authentication required",
    "please sign in",
    "access denied",
    "unauthorized",
  ],
  
  /** CAPTCHA indicators */
  CAPTCHA: [
    "recaptcha",
    "hcaptcha",
    "captcha",
    "I'm not a robot",
    "verify you are human",
  ],
  
  /** Error page indicators */
  ERROR_PAGE: [
    "404 Not Found",
    "500 Internal Server Error",
    "503 Service Unavailable",
    "Page not found",
    "Error loading page",
    "Something went wrong",
  ],
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if content indicates Cloudflare protection
 */
export function detectCloudflare(html: string, title?: string): boolean {
  const content = (html + (title || "")).toLowerCase();
  return DETECTION_PATTERNS.CLOUDFLARE.some(
    (pattern) => content.includes(pattern.toLowerCase())
  );
}

/**
 * Check if content indicates JavaScript is required
 */
export function detectJavaScriptRequired(html: string, extractedTextLength: number): boolean {
  // If we have substantial HTML but very little text, likely JS-rendered
  if (html.length > 5000 && extractedTextLength < 500) {
    return true;
  }
  
  return DETECTION_PATTERNS.JAVASCRIPT_REQUIRED.some(
    (pattern) => html.includes(pattern)
  );
}

/**
 * Check if content indicates authentication is required
 */
export function detectAuthRequired(html: string, statusCode: number): boolean {
  if (statusCode === 401 || statusCode === 403) {
    return true;
  }
  
  const content = html.toLowerCase();
  return DETECTION_PATTERNS.AUTH_REQUIRED.some(
    (pattern) => content.includes(pattern.toLowerCase())
  );
}

/**
 * Check if content indicates CAPTCHA
 */
export function detectCaptcha(html: string): boolean {
  const content = html.toLowerCase();
  return DETECTION_PATTERNS.CAPTCHA.some(
    (pattern) => content.includes(pattern.toLowerCase())
  );
}

/**
 * Detect page type from content
 */
export function detectPageType(
  html: string,
  statusCode: number,
  extractedTextLength: number,
  title?: string
): PageType {
  if (detectCloudflare(html, title)) {
    return PAGE_TYPE.CLOUDFLARE_CHALLENGE;
  }
  
  if (detectCaptcha(html)) {
    return PAGE_TYPE.CAPTCHA_PAGE;
  }
  
  if (statusCode >= 400 || DETECTION_PATTERNS.ERROR_PAGE.some((p) => html.includes(p))) {
    return PAGE_TYPE.ERROR_PAGE;
  }
  
  if (detectAuthRequired(html, statusCode)) {
    return PAGE_TYPE.LOGIN_PAGE;
  }
  
  if (extractedTextLength < 100) {
    return PAGE_TYPE.EMPTY_PAGE;
  }
  
  // Check for procurement keywords
  const procurementKeywords = [
    "rfp", "rfq", "bid", "proposal", "procurement", "solicitation",
    "contract", "tender", "opportunity", "vendor",
  ];
  
  const content = html.toLowerCase();
  const hasProcurementContent = procurementKeywords.some((kw) => content.includes(kw));
  
  if (hasProcurementContent) {
    // Check if it looks like a list or detail page
    const listIndicators = ["results", "search", "opportunities", "current bids", "open bids"];
    const isListPage = listIndicators.some((ind) => content.includes(ind));
    
    return isListPage ? PAGE_TYPE.PROCUREMENT_LIST : PAGE_TYPE.PROCUREMENT_DETAIL;
  }
  
  return PAGE_TYPE.UNKNOWN;
}

/**
 * Create empty fetch metadata
 */
export function createEmptyFetchMetadata(): FetchMetadata {
  return {
    blocked: false,
    requiresJavaScript: false,
    requiresAuth: false,
    cloudflareDetected: false,
    captchaDetected: false,
    rawHtmlLength: 0,
    extractedTextLength: 0,
    pageType: PAGE_TYPE.UNKNOWN,
    warnings: [],
  };
}

/**
 * Create failed fetch result
 */
export function createFailedFetchResult(
  url: string,
  error: string,
  method: ScrapingMethod,
  statusCode: number = 0
): FetchResult {
  return {
    url,
    finalUrl: url,
    statusCode,
    contentType: "",
    html: "",
    text: "",
    method,
    duration: 0,
    success: false,
    error,
    metadata: {
      ...createEmptyFetchMetadata(),
      blocked: statusCode === 403 || statusCode === 401,
    },
  };
}









