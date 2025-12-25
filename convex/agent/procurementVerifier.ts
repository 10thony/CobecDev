"use node";

/**
 * Procurement URL Verifier - HTTP-based approach for Convex Cloud
 * 
 * IMPORTANT: This module uses HTTP fetch instead of Puppeteer because:
 * - Convex Cloud runs actions in sandboxed serverless containers
 * - Chrome/Puppeteer binaries cannot be installed at runtime in Convex Cloud
 * - The filesystem is ephemeral and read-only for most paths
 * - Even if Chrome could be downloaded, it wouldn't persist between invocations
 * 
 * Most government procurement pages are server-rendered, so HTTP fetch works well.
 * For JavaScript-heavy sites, we note this in the reasoning and suggest manual review.
 */

import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Model to use for verification
const MODEL_ID = "gpt-4o-mini";

/**
 * Clean HTML content to reduce token usage while preserving structure
 */
function cleanHtml(html: string): string {
  // Remove script and style tags
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  
  // Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, " ");
  
  // Truncate if too long (keep first 50k characters to stay within context limits)
  if (cleaned.length > 50000) {
    cleaned = cleaned.substring(0, 50000) + "... [truncated]";
  }
  
  return cleaned.trim();
}

/**
 * Extract text content from HTML
 */
function extractTextContent(html: string): string {
  // Remove HTML tags but keep text
  let text = html.replace(/<[^>]+>/g, " ");
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  // Truncate if too long
  if (text.length > 30000) {
    text = text.substring(0, 30000) + "... [truncated]";
  }
  return text;
}

/**
 * Fetch HTML content from a URL using native fetch
 * Works in Convex Cloud serverless environment without requiring Chrome
 */
async function fetchHtmlContent(url: string): Promise<{
  html: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  fetchMethod: "http";
}> {
  console.log(`[HTTP Fetch] Fetching URL: ${url}`);
  
  // Use AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // Mimic a real browser to avoid bot detection
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();
    
    console.log(`[HTTP Fetch] Response: ${response.status} ${response.statusText}, Content-Type: ${contentType}, Length: ${html.length}`);
    
    return {
      html,
      finalUrl: response.url,
      statusCode: response.status,
      contentType,
      fetchMethod: "http",
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after 30 seconds for URL: ${url}`);
    }
    
    throw error;
  }
}

/**
 * Verify a single procurement URL using HTTP fetch and GPT-4o-mini
 * This approach works in Convex Cloud without requiring Chrome/Puppeteer
 */
async function verifyProcurementUrl(
  url: string,
  state: string,
  capital: string
): Promise<{
  decision: "approved" | "denied";
  reasoning: string;
  requiresRegistration: boolean;
  foundCorrectedGridUrl?: string;
}> {
  try {
    // Fetch the HTML content using HTTP
    const { html, finalUrl, statusCode, contentType, fetchMethod } = await fetchHtmlContent(url);
    
    // Check for HTTP errors
    if (statusCode >= 400) {
      return {
        decision: "denied",
        reasoning: `HTTP Error ${statusCode}: Page returned an error status. The page may be unavailable or require authentication.`,
        requiresRegistration: statusCode === 401 || statusCode === 403,
      };
    }
    
    // Check if content is not HTML
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return {
        decision: "denied",
        reasoning: `Non-HTML content type: ${contentType}. Expected a web page.`,
        requiresRegistration: false,
      };
    }
    
    // Check for empty or very short content
    if (html.length < 100) {
      return {
        decision: "denied",
        reasoning: "Page content is too short or empty. May indicate a loading issue or redirect.",
        requiresRegistration: false,
      };
    }
    
    // Clean HTML for GPT analysis
    const cleanedHtml = cleanHtml(html);
    const cleanedText = extractTextContent(html);
    
    // Detect if the page appears to require JavaScript to render content
    const jsIndicators = [
      // Common SPA framework indicators
      '<div id="root"></div>',
      '<div id="app"></div>',
      'ng-app',
      'data-reactroot',
      '__NEXT_DATA__',
      // Loading indicators
      'Loading...',
      'Please wait',
      'JavaScript is required',
      'enable JavaScript',
    ];
    
    const looksLikeJsRequired = jsIndicators.some(indicator => 
      html.toLowerCase().includes(indicator.toLowerCase())
    );
    
    // Prepare prompt for GPT
    const systemPrompt = `You are the Procurement Audit Intelligence (PAI). 
Your sole mission is to identify "Active Bid Grids" on government websites.

IMPORTANT CONTEXT:
- This HTML was fetched via HTTP request, not a browser
- Some pages may require JavaScript to render their content fully
- If content appears minimal or says "Loading", note that JavaScript rendering may be needed

CRITERIA FOR APPROVAL:
1. The page must contain a list of at least 2 current or past bidding opportunities.
2. Data must be in a table, grid, or structured list.
3. Keywords found: "Solicitation", "RFP", "ITB", "IFB", "RFQ", "Bid Opening", "Closing Date", "Due Date", "Bid Number".

CRITERIA FOR DENIAL:
1. The page is a generic "Purchasing Department" welcome page without actual bid listings.
2. The page is a 404 or "Access Denied".
3. The page is behind a hard login wall (no data visible).
4. The page appears to require JavaScript to load content (minimal HTML visible).

OUTPUT FORMAT:
Return only JSON:
{
  "decision": "approved" | "denied",
  "reasoning": "Short explanation of what was found or why denied",
  "requiresRegistration": true | false,
  "foundCorrectedGridUrl": "optional direct link if you found one in the HTML",
  "mayNeedJavaScript": true | false
}`;

    const userPrompt = `Analyze this government procurement website for ${state} (${capital}).

URL: ${url}
Final URL (after redirects): ${finalUrl}
Fetch Method: ${fetchMethod}
HTTP Status: ${statusCode}

HTML Structure (cleaned):
${cleanedHtml.substring(0, 20000)}

Text Content:
${cleanedText.substring(0, 10000)}

${looksLikeJsRequired ? "NOTE: This page appears to use JavaScript heavily and may not have fully rendered content." : ""}

Determine if this page contains an active bid grid or table with procurement opportunities.`;

    // Call GPT-4o-mini
    const response = await openai.chat.completions.create({
      model: MODEL_ID,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent structured output
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT model");
    }

    // Parse JSON response
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Failed to parse GPT response: ${content}`);
      }
    }

    // Validate and return result
    if (result.decision !== "approved" && result.decision !== "denied") {
      throw new Error(`Invalid decision value: ${result.decision}`);
    }

    // Add note about JavaScript if needed
    let reasoning = result.reasoning || "No reasoning provided";
    if (result.mayNeedJavaScript && result.decision === "denied") {
      reasoning += " (Note: This page may require JavaScript to render. Consider manual verification.)";
    }

    return {
      decision: result.decision,
      reasoning: reasoning,
      requiresRegistration: result.requiresRegistration === true,
      foundCorrectedGridUrl: result.foundCorrectedGridUrl || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide specific error messages for common issues
    if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
      return {
        decision: "denied",
        reasoning: "Request timeout: The server did not respond within 30 seconds. Site may be slow or unreachable.",
        requiresRegistration: false,
      };
    }
    
    if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
      return {
        decision: "denied",
        reasoning: "DNS resolution failed: Could not resolve the domain. URL may be incorrect or site may be down.",
        requiresRegistration: false,
      };
    }
    
    if (errorMessage.includes("ECONNREFUSED")) {
      return {
        decision: "denied",
        reasoning: "Connection refused: The server actively refused the connection. Site may be down or blocking requests.",
        requiresRegistration: false,
      };
    }
    
    if (errorMessage.includes("certificate") || errorMessage.includes("SSL") || errorMessage.includes("TLS")) {
      return {
        decision: "denied",
        reasoning: "SSL/TLS error: There was a security certificate issue. Site may have an expired or invalid certificate.",
        requiresRegistration: false,
      };
    }
    
    // Return a denied decision with error reasoning for any other errors
    return {
      decision: "denied",
      reasoning: `Error during verification: ${errorMessage}`,
      requiresRegistration: false,
    };
  }
}

/**
 * Main action: Verify a batch of pending procurement URLs
 */
export const verifyPendingBatch = internalAction({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;
    
    // Get ONLY pending URLs that haven't been completed by AI yet
    // This query filters by status="pending" and excludes completed/processing links
    const pendingUrls = await ctx.runQuery(internal.procurementUrls.getPendingForAgent, {
      limit: batchSize,
    });

    if (pendingUrls.length === 0) {
      return {
        processed: 0,
        approved: 0,
        denied: 0,
        errors: 0,
      };
    }

    const results = {
      processed: 0,
      approved: 0,
      denied: 0,
      errors: 0,
    };

    // Process each URL
    for (const urlRecord of pendingUrls) {
      try {
        // Safety check: Only process links with status "pending"
        // This is a double-check even though the query should filter correctly
        if (urlRecord.status !== "pending") {
          console.warn(`Skipping URL ${urlRecord._id}: status is "${urlRecord.status}", not "pending"`);
          continue;
        }
        
        // Skip if already completed by AI (shouldn't happen due to query filter, but safety check)
        if (urlRecord.aiReviewStatus === "completed") {
          console.warn(`Skipping URL ${urlRecord._id}: already completed by AI`);
          continue;
        }
        
        // Mark as processing
        await ctx.runMutation(internal.procurementUrls.updateAiReviewStatus, {
          id: urlRecord._id,
          status: "processing",
        });

        // Verify the URL
        const verificationResult = await verifyProcurementUrl(
          urlRecord.procurementLink,
          urlRecord.state,
          urlRecord.capital
        );

        // Report the result
        await ctx.runMutation(internal.procurementUrls.reportAgentResult, {
          id: urlRecord._id,
          status: verificationResult.decision === "approved" ? "approved" : "denied",
          reason: verificationResult.reasoning,
          requiresRegistration: verificationResult.requiresRegistration,
          correctedLink: verificationResult.foundCorrectedGridUrl,
        });

        if (verificationResult.decision === "approved") {
          results.approved++;
        } else {
          results.denied++;
        }
        results.processed++;
      } catch (error) {
        console.error(`Error processing URL ${urlRecord._id}:`, error);
        
        // Mark as failed
        await ctx.runMutation(internal.procurementUrls.updateAiReviewStatus, {
          id: urlRecord._id,
          status: "failed",
        });
        
        results.errors++;
      }
    }

    return results;
  },
});

/**
 * Public action wrapper to trigger AI verification from the UI
 * This allows users to manually start the verification process
 * 
 * Note: We inline the logic here instead of calling verifyPendingBatch to avoid
 * TypeScript circular reference issues when calling an internal action from the same module.
 */
export const triggerVerification = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    approved: v.number(),
    denied: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, args): Promise<{
    processed: number;
    approved: number;
    denied: number;
    errors: number;
  }> => {
    const batchSize = args.batchSize || 10;
    
    // Get ONLY pending URLs that haven't been completed by AI yet
    const pendingUrls = await ctx.runQuery(internal.procurementUrls.getPendingForAgent, {
      limit: batchSize,
    });

    if (pendingUrls.length === 0) {
      return {
        processed: 0,
        approved: 0,
        denied: 0,
        errors: 0,
      };
    }

    const results: {
      processed: number;
      approved: number;
      denied: number;
      errors: number;
    } = {
      processed: 0,
      approved: 0,
      denied: 0,
      errors: 0,
    };

    // Process each URL
    for (const urlRecord of pendingUrls) {
      try {
        // Safety check: Only process links with status "pending"
        if (urlRecord.status !== "pending") {
          console.warn(`Skipping URL ${urlRecord._id}: status is "${urlRecord.status}", not "pending"`);
          continue;
        }
        
        // Skip if already completed by AI
        if (urlRecord.aiReviewStatus === "completed") {
          console.warn(`Skipping URL ${urlRecord._id}: already completed by AI`);
          continue;
        }
        
        // Mark as processing
        await ctx.runMutation(internal.procurementUrls.updateAiReviewStatus, {
          id: urlRecord._id,
          status: "processing",
        });

        // Verify the URL
        const verificationResult = await verifyProcurementUrl(
          urlRecord.procurementLink,
          urlRecord.state,
          urlRecord.capital
        );

        // Report the result
        await ctx.runMutation(internal.procurementUrls.reportAgentResult, {
          id: urlRecord._id,
          status: verificationResult.decision === "approved" ? "approved" : "denied",
          reason: verificationResult.reasoning,
          requiresRegistration: verificationResult.requiresRegistration,
          correctedLink: verificationResult.foundCorrectedGridUrl,
        });

        if (verificationResult.decision === "approved") {
          results.approved++;
        } else {
          results.denied++;
        }
        results.processed++;
      } catch (error) {
        console.error(`Error processing URL ${urlRecord._id}:`, error);
        
        // Mark as failed
        await ctx.runMutation(internal.procurementUrls.updateAiReviewStatus, {
          id: urlRecord._id,
          status: "failed",
        });
        
        results.errors++;
      }
    }

    return results;
  },
});
