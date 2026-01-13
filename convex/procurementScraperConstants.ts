/**
 * Scraping status values
 */
export const SCRAPING_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  PARTIAL: "partial", // Some data scraped but errors occurred
  CANCELLED: "cancelled",
} as const;

export type ScrapingStatus = typeof SCRAPING_STATUS[keyof typeof SCRAPING_STATUS];

/**
 * Data quality values
 */
export const DATA_QUALITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  FAILED: "failed", // Complete failure - no data retrieved
} as const;

export type DataQuality = typeof DATA_QUALITY[keyof typeof DATA_QUALITY];

/**
 * Scraping method values
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
 * Default AI model name
 */
export const DEFAULT_AI_MODEL = "gpt-4o-mini";

/**
 * Default scraped by value
 */
export const DEFAULT_SCRAPED_BY = "AI Agent";

/**
 * Default data quality when parsing fails
 */
export const DEFAULT_DATA_QUALITY: DataQuality = DATA_QUALITY.MEDIUM;

/**
 * Default data completeness score
 */
export const DEFAULT_DATA_COMPLETENESS = 0.5;

/**
 * Scraping timeout in milliseconds
 */
export const SCRAPING_TIMEOUT_MS = 60000;/**
 * Minimum text length to consider a page successfully scraped
 */
export const MIN_TEXT_LENGTH_FOR_SUCCESS = 100;/**
 * Maximum HTML size to store (in characters)
 */
export const MAX_HTML_SIZE = 100000;/**
 * Maximum text size for AI processing (in characters)
 */
export const MAX_TEXT_SIZE = 50000;/**
 * Environment variable names for scraping services
 */
export const ENV_VARS = {
  SCRAPINGBEE_API_KEY: "SCRAPINGBEE_API_KEY",
  BROWSERLESS_API_KEY: "BROWSERLESS_API_KEY",
  OPENAI_API_KEY: "OPENAI_API_KEY",
} as const;