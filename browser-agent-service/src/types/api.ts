import { Opportunity, Interaction, PortalConfiguration } from './scraping';

/**
 * POST /scrape request
 */
export interface ScrapeRequest {
  jobId: string;
  url: string;
  portalId: string;
  configuration: PortalConfiguration;
  callbackUrl?: string;
}

/**
 * POST /scrape response
 */
export interface ScrapeResponse {
  success: boolean;
  jobId: string;
  status: "queued" | "started" | "completed" | "failed";
  message?: string;
}

/**
 * GET /status/:jobId response
 */
export interface StatusResponse {
  jobId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: {
    currentPage: number;
    totalPages?: number;
    opportunitiesFound: number;
    currentAction?: string;
  };
  result?: {
    opportunities: Opportunity[];
    interactions: Interaction[];
    duration: number;
  };
  error?: {
    message: string;
    type: string;
    recoverable: boolean;
  };
}

/**
 * GET /health response
 */
export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  activeBrowsers: number;
  activeJobs: number;
  lastJobAt?: number;
}

/**
 * POST /cancel/:jobId response
 */
export interface CancelResponse {
  success: boolean;
  jobId: string;
  message: string;
}

