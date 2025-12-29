"use node";

/**
 * Procurement Scraping Services
 * 
 * Provides multiple scraping strategies:
 * 1. Direct HTTP fetch (fast, but limited)
 * 2. ScrapingBee proxy (handles Cloudflare, renders JS)
 * 3. Browserless service (full browser, complex interactions)
 * 
 * Includes automatic fallback between methods.
 */

import {
  FetchResult,
  FetchMetadata,
  ScrapingMethod,
  SCRAPING_METHOD,
  PAGE_TYPE,
  detectCloudflare,
  detectJavaScriptRequired,
  detectAuthRequired,
  detectCaptcha,
  detectPageType,
  createEmptyFetchMetadata,
  createFailedFetchResult,
  ScrapingBeeConfig,
  BrowserlessConfig,
} from "./procurementScraperTypes";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get scraping service configuration from environment
 */
export function getScrapingConfig(): {
  scrapingBeeApiKey?: string;
  browserlessApiKey?: string;
  preferredMethod: ScrapingMethod;
  enableFallback: boolean;
} {
  return {
    scrapingBeeApiKey: process.env.SCRAPINGBEE_API_KEY,
    browserlessApiKey: process.env.BROWSERLESS_API_KEY,
    preferredMethod: SCRAPING_METHOD.HTTP_FETCH,
    enableFallback: true,
  };
}

// ============================================================================
// TEXT EXTRACTION
// ============================================================================

/**
 * Extract clean text from HTML
 */
export function extractTextFromHtml(html: string, maxLength: number = 50000): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, maxLength);
}

// ============================================================================
// DIRECT HTTP FETCH
// ============================================================================

/**
 * Fetch URL using direct HTTP (fast but limited)
 */
export async function fetchWithHttp(url: string): Promise<FetchResult> {
  const startTime = Date.now();
  const metadata: FetchMetadata = createEmptyFetchMetadata();
  
  console.log(`[HTTP Fetch] Starting fetch for: ${url}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const html = await response.text();
    const duration = Date.now() - startTime;
    
    metadata.rawHtmlLength = html.length;
    
    // Detect various issues
    metadata.cloudflareDetected = detectCloudflare(html);
    metadata.captchaDetected = detectCaptcha(html);
    metadata.blocked = response.status === 403 || response.status === 401;
    metadata.requiresAuth = detectAuthRequired(html, response.status);
    
    // Extract text
    const text = extractTextFromHtml(html);
    metadata.extractedTextLength = text.length;
    
    // Detect if JavaScript is required
    metadata.requiresJavaScript = detectJavaScriptRequired(html, text.length);
    
    // Detect page type
    metadata.pageType = detectPageType(html, response.status, text.length);
    
    // Add warnings
    if (metadata.cloudflareDetected) {
      metadata.warnings.push("Cloudflare protection detected - content may be incomplete");
    }
    if (metadata.requiresJavaScript) {
      metadata.warnings.push("Site appears to require JavaScript rendering");
    }
    if (metadata.captchaDetected) {
      metadata.warnings.push("CAPTCHA detected - cannot proceed");
    }
    
    console.log(`[HTTP Fetch] Completed in ${duration}ms. Status: ${response.status}, HTML: ${html.length}, Text: ${text.length}`);
    
    // Determine success
    const success = response.ok && 
                   !metadata.cloudflareDetected && 
                   !metadata.captchaDetected &&
                   text.length > 100;
    
    return {
      url,
      finalUrl: response.url,
      statusCode: response.status,
      contentType: response.headers.get("content-type") || "",
      html: html.substring(0, 100000),
      text,
      method: SCRAPING_METHOD.HTTP_FETCH,
      duration,
      success,
      error: success ? undefined : buildErrorMessage(response.status, metadata),
      metadata,
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[HTTP Fetch] Failed after ${duration}ms:`, errorMessage);
    
    if (error instanceof Error && error.name === "AbortError") {
      return createFailedFetchResult(url, "Request timeout after 30 seconds", SCRAPING_METHOD.HTTP_FETCH);
    }
    
    return createFailedFetchResult(url, errorMessage, SCRAPING_METHOD.HTTP_FETCH);
  }
}

/**
 * Build error message from response and metadata
 */
function buildErrorMessage(statusCode: number, metadata: FetchMetadata): string {
  const errors: string[] = [];
  
  if (statusCode === 403) errors.push("HTTP 403 Forbidden");
  if (statusCode === 401) errors.push("HTTP 401 Unauthorized");
  if (statusCode >= 400) errors.push(`HTTP ${statusCode}`);
  if (metadata.cloudflareDetected) errors.push("Cloudflare protection detected");
  if (metadata.captchaDetected) errors.push("CAPTCHA required");
  if (metadata.requiresJavaScript) errors.push("JavaScript rendering required");
  if (metadata.extractedTextLength < 100) errors.push("Insufficient content extracted");
  
  return errors.join("; ") || "Unknown error";
}

// ============================================================================
// SCRAPINGBEE INTEGRATION
// ============================================================================

/**
 * Fetch URL using ScrapingBee proxy service
 * 
 * Handles:
 * - Cloudflare bypass
 * - JavaScript rendering
 * - Residential IP rotation
 */
export async function fetchWithScrapingBee(
  url: string,
  config?: Partial<ScrapingBeeConfig>
): Promise<FetchResult> {
  const startTime = Date.now();
  const apiKey = config?.apiKey || process.env.SCRAPINGBEE_API_KEY;
  
  if (!apiKey) {
    return createFailedFetchResult(
      url,
      "ScrapingBee API key not configured",
      SCRAPING_METHOD.PROXY_SERVICE
    );
  }
  
  console.log(`[ScrapingBee] Starting fetch for: ${url}`);
  
  const metadata: FetchMetadata = createEmptyFetchMetadata();
  
  try {
    // Build ScrapingBee API URL
    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      render_js: String(config?.renderJs ?? true),
      premium_proxy: String(config?.premiumProxy ?? false),
    });
    
    if (config?.countryCode) {
      params.set("country_code", config.countryCode);
    }
    if (config?.waitFor) {
      params.set("wait_for", config.waitFor);
    }
    if (config?.timeout) {
      params.set("timeout", String(config.timeout));
    }
    if (config?.returnScreenshot) {
      params.set("screenshot", "true");
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || 60000);
    
    const response = await fetch(`https://app.scrapingbee.com/api/v1?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ScrapingBee] API error: ${response.status} - ${errorText}`);
      
      return createFailedFetchResult(
        url,
        `ScrapingBee API error: ${response.status}`,
        SCRAPING_METHOD.PROXY_SERVICE,
        response.status
      );
    }
    
    const html = await response.text();
    const duration = Date.now() - startTime;
    
    metadata.rawHtmlLength = html.length;
    
    // Extract text
    const text = extractTextFromHtml(html);
    metadata.extractedTextLength = text.length;
    
    // With JS rendering, we shouldn't have JS-required issues
    metadata.requiresJavaScript = false;
    
    // Detect page type
    metadata.pageType = detectPageType(html, 200, text.length);
    
    // Get cost from headers if available
    const cost = response.headers.get("Spb-Cost");
    const resolvedUrl = response.headers.get("Spb-Resolved-Url") || url;
    
    console.log(`[ScrapingBee] Completed in ${duration}ms. Cost: ${cost}, HTML: ${html.length}, Text: ${text.length}`);
    
    const success = text.length > 100;
    
    return {
      url,
      finalUrl: resolvedUrl,
      statusCode: 200,
      contentType: response.headers.get("content-type") || "text/html",
      html: html.substring(0, 100000),
      text,
      method: SCRAPING_METHOD.PROXY_SERVICE,
      duration,
      success,
      error: success ? undefined : "Insufficient content extracted",
      metadata,
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[ScrapingBee] Failed after ${duration}ms:`, errorMessage);
    
    if (error instanceof Error && error.name === "AbortError") {
      return createFailedFetchResult(url, "ScrapingBee request timeout", SCRAPING_METHOD.PROXY_SERVICE);
    }
    
    return createFailedFetchResult(url, errorMessage, SCRAPING_METHOD.PROXY_SERVICE);
  }
}

// ============================================================================
// BROWSERLESS INTEGRATION
// ============================================================================

/**
 * Fetch URL using Browserless.io browser service
 * 
 * Provides:
 * - Full Chrome browser
 * - JavaScript execution
 * - Complex page interactions
 * - Stealth mode for bot detection bypass
 */
export async function fetchWithBrowserless(
  url: string,
  config?: Partial<BrowserlessConfig>
): Promise<FetchResult> {
  const startTime = Date.now();
  const apiKey = config?.apiKey || process.env.BROWSERLESS_API_KEY;
  
  if (!apiKey) {
    return createFailedFetchResult(
      url,
      "Browserless API key not configured",
      SCRAPING_METHOD.BROWSER_SERVICE
    );
  }
  
  console.log(`[Browserless] Starting fetch for: ${url}`);
  
  const metadata: FetchMetadata = createEmptyFetchMetadata();
  
  try {
    // Use Browserless /content endpoint for simple page content
    const controller = new AbortController();
    const timeoutMs = config?.timeout || 60000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const requestBody = {
      url,
      waitUntil: config?.waitUntil || "networkidle2",
      stealth: config?.stealth ?? true,
      blockAds: config?.blockAds ?? true,
    };
    
    const response = await fetch(`https://chrome.browserless.io/content?token=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Browserless] API error: ${response.status} - ${errorText}`);
      
      return createFailedFetchResult(
        url,
        `Browserless API error: ${response.status}`,
        SCRAPING_METHOD.BROWSER_SERVICE,
        response.status
      );
    }
    
    const html = await response.text();
    const duration = Date.now() - startTime;
    
    metadata.rawHtmlLength = html.length;
    
    // Extract text
    const text = extractTextFromHtml(html);
    metadata.extractedTextLength = text.length;
    
    // With full browser, JS is already rendered
    metadata.requiresJavaScript = false;
    
    // Detect page type
    metadata.pageType = detectPageType(html, 200, text.length);
    
    console.log(`[Browserless] Completed in ${duration}ms. HTML: ${html.length}, Text: ${text.length}`);
    
    const success = text.length > 100;
    
    return {
      url,
      finalUrl: url,
      statusCode: 200,
      contentType: "text/html",
      html: html.substring(0, 100000),
      text,
      method: SCRAPING_METHOD.BROWSER_SERVICE,
      duration,
      success,
      error: success ? undefined : "Insufficient content extracted",
      metadata,
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[Browserless] Failed after ${duration}ms:`, errorMessage);
    
    if (error instanceof Error && error.name === "AbortError") {
      return createFailedFetchResult(url, "Browserless request timeout", SCRAPING_METHOD.BROWSER_SERVICE);
    }
    
    return createFailedFetchResult(url, errorMessage, SCRAPING_METHOD.BROWSER_SERVICE);
  }
}

// ============================================================================
// UNIFIED SCRAPING STRATEGY
// ============================================================================

/**
 * Scraping strategy options
 */
export interface ScrapingStrategyOptions {
  /** Preferred scraping method */
  preferredMethod?: ScrapingMethod;
  /** Enable automatic fallback to other methods */
  enableFallback?: boolean;
  /** ScrapingBee configuration */
  scrapingBeeConfig?: Partial<ScrapingBeeConfig>;
  /** Browserless configuration */
  browserlessConfig?: Partial<BrowserlessConfig>;
  /** Maximum retry attempts per method */
  maxRetries?: number;
}

/**
 * Result from scraping strategy
 */
export interface ScrapingStrategyResult {
  result: FetchResult;
  methodsAttempted: ScrapingMethod[];
  fallbackUsed: boolean;
}

/**
 * Intelligent scraping strategy that automatically selects the best method
 * and falls back to alternatives on failure.
 */
export async function scrapeWithStrategy(
  url: string,
  options: ScrapingStrategyOptions = {}
): Promise<ScrapingStrategyResult> {
  const {
    preferredMethod = SCRAPING_METHOD.HTTP_FETCH,
    enableFallback = true,
    scrapingBeeConfig,
    browserlessConfig,
    maxRetries = 1,
  } = options;
  
  const methodsAttempted: ScrapingMethod[] = [];
  const config = getScrapingConfig();
  
  // Determine method order based on preference and availability
  const methodOrder = getMethodOrder(preferredMethod, config);
  
  console.log(`[Scraping Strategy] Starting with method order: ${methodOrder.join(" -> ")}`);
  
  for (const method of methodOrder) {
    methodsAttempted.push(method);
    
    let result: FetchResult | null = null;
    let attempts = 0;
    
    while (attempts < maxRetries && !result?.success) {
      attempts++;
      
      console.log(`[Scraping Strategy] Attempting ${method} (attempt ${attempts}/${maxRetries})`);
      
      switch (method) {
        case SCRAPING_METHOD.HTTP_FETCH:
          result = await fetchWithHttp(url);
          break;
          
        case SCRAPING_METHOD.PROXY_SERVICE:
          if (config.scrapingBeeApiKey) {
            result = await fetchWithScrapingBee(url, {
              apiKey: config.scrapingBeeApiKey,
              ...scrapingBeeConfig,
            });
          } else {
            result = createFailedFetchResult(url, "ScrapingBee not configured", method);
          }
          break;
          
        case SCRAPING_METHOD.BROWSER_SERVICE:
          if (config.browserlessApiKey) {
            result = await fetchWithBrowserless(url, {
              apiKey: config.browserlessApiKey,
              ...browserlessConfig,
            });
          } else {
            result = createFailedFetchResult(url, "Browserless not configured", method);
          }
          break;
          
        default:
          result = createFailedFetchResult(url, `Unknown method: ${method}`, method);
      }
    }
    
    if (result?.success) {
      console.log(`[Scraping Strategy] Success with ${method}`);
      return {
        result,
        methodsAttempted,
        fallbackUsed: methodsAttempted.length > 1,
      };
    }
    
    // Check if we should try fallback
    if (!enableFallback) {
      console.log(`[Scraping Strategy] Fallback disabled, returning failure`);
      return {
        result: result || createFailedFetchResult(url, "No result", method),
        methodsAttempted,
        fallbackUsed: false,
      };
    }
    
    // Analyze failure to decide on fallback
    if (result && shouldTryFallback(result)) {
      console.log(`[Scraping Strategy] ${method} failed, trying next method. Reason: ${result.error}`);
      continue;
    }
    
    // If we shouldn't try fallback (e.g., site doesn't exist), stop
    console.log(`[Scraping Strategy] ${method} failed with non-recoverable error`);
    return {
      result: result || createFailedFetchResult(url, "No result", method),
      methodsAttempted,
      fallbackUsed: methodsAttempted.length > 1,
    };
  }
  
  // All methods exhausted
  console.log(`[Scraping Strategy] All methods exhausted`);
  return {
    result: createFailedFetchResult(url, "All scraping methods failed", SCRAPING_METHOD.HTTP_FETCH),
    methodsAttempted,
    fallbackUsed: methodsAttempted.length > 1,
  };
}

/**
 * Determine method order based on preference and availability
 */
function getMethodOrder(
  preferredMethod: ScrapingMethod,
  config: ReturnType<typeof getScrapingConfig>
): ScrapingMethod[] {
  const allMethods: ScrapingMethod[] = [
    SCRAPING_METHOD.HTTP_FETCH,
    SCRAPING_METHOD.PROXY_SERVICE,
    SCRAPING_METHOD.BROWSER_SERVICE,
  ];
  
  // Start with preferred method
  const order: ScrapingMethod[] = [preferredMethod];
  
  // Add others in priority order
  for (const method of allMethods) {
    if (!order.includes(method)) {
      // Only add if configured
      if (method === SCRAPING_METHOD.PROXY_SERVICE && !config.scrapingBeeApiKey) {
        continue;
      }
      if (method === SCRAPING_METHOD.BROWSER_SERVICE && !config.browserlessApiKey) {
        continue;
      }
      order.push(method);
    }
  }
  
  return order;
}

/**
 * Determine if fallback should be attempted based on failure type
 */
function shouldTryFallback(result: FetchResult): boolean {
  // Always try fallback for these conditions
  if (result.metadata.cloudflareDetected) return true;
  if (result.metadata.requiresJavaScript) return true;
  if (result.metadata.blocked) return true;
  if (result.metadata.captchaDetected) return true;
  if (result.statusCode === 403 || result.statusCode === 401) return true;
  if (result.metadata.extractedTextLength < 100) return true;
  
  // Don't retry for these
  if (result.statusCode === 404) return false; // Page doesn't exist
  if (result.statusCode >= 500) return true; // Server error, might work with different approach
  
  return true;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  FetchResult,
  FetchMetadata,
  ScrapingMethod,
};
export {
  SCRAPING_METHOD,
};


