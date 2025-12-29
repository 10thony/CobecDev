"use node";

import { Agent, createTool } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v3";
import { components, internal } from "./_generated/api";
import { DEFAULT_SYSTEM_PROMPT } from "./procurementScraperSystemPrompts";
import { DEFAULT_AI_MODEL } from "./procurementScraperConstants";
import {
  scrapeWithStrategy,
  ScrapingStrategyOptions,
  FetchResult,
  SCRAPING_METHOD,
  ScrapingMethod,
} from "./procurementScrapingServices";
import {
  FetchMetadata,
  PAGE_TYPE,
  PageType,
} from "./procurementScraperTypes";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result type for the fetchWebpageContent tool
 * Provides comprehensive information about the fetch attempt
 */
interface FetchWebpageContentResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  html: string;
  text: string;
  error?: string;
  blocked: boolean;
  metadata: {
    /** Whether the site requires JavaScript rendering */
    requiresJavaScript: boolean;
    /** Whether Cloudflare protection was detected */
    cloudflareDetected: boolean;
    /** Whether authentication is required */
    requiresAuth: boolean;
    /** Whether CAPTCHA was detected */
    captchaDetected: boolean;
    /** Detected page type */
    pageType: PageType;
    /** Raw HTML length */
    rawHtmlLength: number;
    /** Extracted text length */
    extractedTextLength: number;
    /** Scraping method used */
    scrapingMethod: ScrapingMethod;
    /** All methods that were attempted */
    methodsAttempted: ScrapingMethod[];
    /** Whether fallback methods were used */
    fallbackUsed: boolean;
    /** Total fetch duration in ms */
    fetchDuration: number;
    /** Any warnings during fetch */
    warnings: string[];
  };
}

/**
 * Schema for the tool result - for Zod validation
 */
const fetchResultSchema = z.object({
  url: z.string(),
  finalUrl: z.string(),
  statusCode: z.number(),
  html: z.string(),
  text: z.string(),
  error: z.string().optional(),
  blocked: z.boolean(),
  metadata: z.object({
    requiresJavaScript: z.boolean(),
    cloudflareDetected: z.boolean(),
    requiresAuth: z.boolean(),
    captchaDetected: z.boolean(),
    pageType: z.string(),
    rawHtmlLength: z.number(),
    extractedTextLength: z.number(),
    scrapingMethod: z.string(),
    methodsAttempted: z.array(z.string()),
    fallbackUsed: z.boolean(),
    fetchDuration: z.number(),
    warnings: z.array(z.string()),
  }),
});

// ============================================================================
// TOOL: FETCH WEBPAGE CONTENT (ENHANCED)
// ============================================================================

/**
 * Enhanced fetchWebpageContent tool with automatic fallback strategies
 * 
 * Strategy:
 * 1. Try direct HTTP fetch first (fastest)
 * 2. If blocked/JS-required, fall back to ScrapingBee (if configured)
 * 3. If still failing, fall back to Browserless (if configured)
 */
const fetchWebpageContent = createTool({
  description: `Fetch the HTML content from a procurement website URL.
  
This tool automatically handles:
- Cloudflare protection (falls back to proxy/browser services)
- JavaScript-rendered sites (uses headless browser if available)
- Rate limiting and bot detection

The result includes detailed metadata about:
- Whether the site blocked access
- Whether JavaScript rendering is required
- What scraping method was used
- Any warnings or issues encountered

IMPORTANT: Check the metadata.requiresJavaScript and metadata.cloudflareDetected 
fields to understand if the content was fully retrieved.`,
  args: z.object({
    url: z.string().url().describe("The procurement website URL to fetch"),
    preferredMethod: z.enum(["http_fetch", "proxy_service", "browser_service"])
      .optional()
      .describe("Preferred scraping method (default: http_fetch)"),
    enableFallback: z.boolean()
      .optional()
      .describe("Enable automatic fallback to other methods (default: true)"),
  }),
  handler: async (ctx, args): Promise<FetchWebpageContentResult> => {
    const { url, preferredMethod = "http_fetch", enableFallback = true } = args;
    
    console.log(`[Procurement Scraper Tool] fetchWebpageContent called for URL: ${url}`);
    console.log(`[Procurement Scraper Tool] Preferred method: ${preferredMethod}, Fallback enabled: ${enableFallback}`);
    
    const toolStartTime = Date.now();
    
    try {
      // Map string to ScrapingMethod type
      const methodMap: Record<string, ScrapingMethod> = {
        http_fetch: SCRAPING_METHOD.HTTP_FETCH,
        proxy_service: SCRAPING_METHOD.PROXY_SERVICE,
        browser_service: SCRAPING_METHOD.BROWSER_SERVICE,
      };
      
      const strategyOptions: ScrapingStrategyOptions = {
        preferredMethod: methodMap[preferredMethod] || SCRAPING_METHOD.HTTP_FETCH,
        enableFallback,
        scrapingBeeConfig: {
          renderJs: true,
          premiumProxy: false,
        },
        browserlessConfig: {
          stealth: true,
          waitUntil: "networkidle2",
        },
        maxRetries: 1,
      };
      
      // Execute scraping strategy
      const { result, methodsAttempted, fallbackUsed } = await scrapeWithStrategy(url, strategyOptions);
      
      const toolDuration = Date.now() - toolStartTime;
      
      console.log(`[Procurement Scraper Tool] Completed in ${toolDuration}ms`);
      console.log(`[Procurement Scraper Tool] Success: ${result.success}, Method: ${result.method}`);
      console.log(`[Procurement Scraper Tool] Methods attempted: ${methodsAttempted.join(" -> ")}`);
      console.log(`[Procurement Scraper Tool] HTML: ${result.metadata.rawHtmlLength}, Text: ${result.metadata.extractedTextLength}`);
      
      if (result.metadata.warnings.length > 0) {
        console.log(`[Procurement Scraper Tool] Warnings: ${result.metadata.warnings.join("; ")}`);
      }
      
      return {
        url: result.url,
        finalUrl: result.finalUrl,
        statusCode: result.statusCode,
        html: result.html,
        text: result.text,
        error: result.error,
        blocked: result.metadata.blocked,
        metadata: {
          requiresJavaScript: result.metadata.requiresJavaScript,
          cloudflareDetected: result.metadata.cloudflareDetected,
          requiresAuth: result.metadata.requiresAuth,
          captchaDetected: result.metadata.captchaDetected,
          pageType: result.metadata.pageType,
          rawHtmlLength: result.metadata.rawHtmlLength,
          extractedTextLength: result.metadata.extractedTextLength,
          scrapingMethod: result.method,
          methodsAttempted,
          fallbackUsed,
          fetchDuration: result.duration,
          warnings: result.metadata.warnings,
        },
      };
      
    } catch (error) {
      const toolDuration = Date.now() - toolStartTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      console.error(`[Procurement Scraper Tool] Tool failed after ${toolDuration}ms:`, errorMessage);
      
      return {
        url,
        finalUrl: url,
        statusCode: 0,
        html: "",
        text: "",
        error: errorMessage,
        blocked: false,
        metadata: {
          requiresJavaScript: false,
          cloudflareDetected: false,
          requiresAuth: false,
          captchaDetected: false,
          pageType: PAGE_TYPE.ERROR_PAGE,
          rawHtmlLength: 0,
          extractedTextLength: 0,
          scrapingMethod: SCRAPING_METHOD.HTTP_FETCH,
          methodsAttempted: [SCRAPING_METHOD.HTTP_FETCH],
          fallbackUsed: false,
          fetchDuration: toolDuration,
          warnings: [errorMessage],
        },
      };
    }
  },
});

// ============================================================================
// AGENT FACTORY
// ============================================================================

/**
 * Create a procurement scraper agent with a system prompt
 * @param systemPrompt - The system prompt to use (retrieved from database or default)
 */
export function createProcurementScraperAgent(systemPrompt: string): Agent {
  return new Agent(components.agent, {
    languageModel: openai.chat(DEFAULT_AI_MODEL),
    name: "Procurement Data Scraper",
    instructions: systemPrompt,
    tools: {
      fetchWebpageContent,
    },
  });
}

/**
 * Gets the primary system prompt from the database or returns the default.
 * This function should be called from an action context.
 * 
 * @param ctx - The action context
 */
export async function getPrimarySystemPrompt(ctx: any): Promise<string> {
  // Get the primary system prompt from database
  const primaryPrompt = await ctx.runQuery(
    internal.procurementScraperSystemPrompts.getPrimaryInternal,
    {}
  );
  return primaryPrompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { FetchWebpageContentResult };
