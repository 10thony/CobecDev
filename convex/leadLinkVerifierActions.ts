"use node";

import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";

/**
 * Lead Link Verifier Actions
 * 
 * AI-powered actions for verifying and discovering correct URLs for leads.
 * Uses HTTP fetch (works in Convex Cloud) and GPT-4o-mini for intelligent analysis.
 */

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL_ID = "gpt-4o-mini";

// URL patterns that indicate a generic/portal URL (not specific to an opportunity)
const GENERIC_URL_PATTERNS = [
  /\/procurement\/?$/i,
  /\/bids\/?$/i,
  /\/solicitations\/?$/i,
  /\/rfp\/?$/i,
  /\/purchasing\/?$/i,
  /\/contracts\/?$/i,
  /\/vendor\/?$/i,
  /\/opportunities\/?$/i,
  /\/bidding\/?$/i,
];

// Domain patterns that are typically government/official
const OFFICIAL_DOMAIN_PATTERNS = [
  /\.gov$/i,
  /\.gov\.[a-z]{2}$/i, // e.g., .gov.uk
  /\.org$/i,
  /\.edu$/i,
  /state\.[a-z]{2}\.us$/i,
  /city\.[a-z]+\.us$/i,
];

/**
 * Check if a URL appears to be generic (portal homepage) vs specific (opportunity detail page)
 */
function isGenericUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Check against generic patterns
    for (const pattern of GENERIC_URL_PATTERNS) {
      if (pattern.test(path)) {
        return true;
      }
    }
    
    // Check if path is very short (likely a landing page)
    if (path === "/" || path === "" || path.split("/").filter(Boolean).length <= 1) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if URL contains opportunity-specific identifiers
 */
function containsOpportunityIdentifier(url: string, contractId?: string, title?: string): boolean {
  const urlLower = url.toLowerCase();
  
  // Check for contract ID
  if (contractId) {
    const contractIdNormalized = contractId.toLowerCase().replace(/[^a-z0-9]/g, "");
    const urlNormalized = urlLower.replace(/[^a-z0-9]/g, "");
    if (urlNormalized.includes(contractIdNormalized)) {
      return true;
    }
  }
  
  // Check for common opportunity identifiers in URL
  const identifierPatterns = [
    /rfp[-_]?\d+/i,
    /rfq[-_]?\d+/i,
    /itb[-_]?\d+/i,
    /ifb[-_]?\d+/i,
    /solicitation[-_]?\d+/i,
    /contract[-_]?\d+/i,
    /bid[-_]?\d+/i,
    /\d{4}[-_]\d{2,}/i, // Year-based IDs like 2024-001
    /id[=\/]\d+/i,
    /detail[s]?[\/\?]/i,
    /view[\/\?]/i,
  ];
  
  for (const pattern of identifierPatterns) {
    if (pattern.test(url)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Fetch HTML content from a URL
 */
async function fetchHtmlContent(url: string): Promise<{
  html: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  error?: string;
}> {
  console.log(`[LeadLinkVerifier] Fetching URL: ${url}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();
    
    return {
      html,
      finalUrl: response.url,
      statusCode: response.status,
      contentType,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      html: "",
      finalUrl: url,
      statusCode: 0,
      contentType: "",
      error: errorMessage,
    };
  }
}

/**
 * Clean HTML for AI analysis
 */
function cleanHtmlForAnalysis(html: string): string {
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  cleaned = cleaned.replace(/\s+/g, " ");
  
  if (cleaned.length > 30000) {
    cleaned = cleaned.substring(0, 30000) + "... [truncated]";
  }
  
  return cleaned.trim();
}

/**
 * Extract text content from HTML
 */
function extractTextContent(html: string): string {
  let text = html.replace(/<[^>]+>/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  
  if (text.length > 15000) {
    text = text.substring(0, 15000) + "... [truncated]";
  }
  
  return text;
}

/**
 * Assess URL quality for a lead
 */
export const assessUrlQuality = internalAction({
  args: {
    leadId: v.id("leads"),
    url: v.string(),
    contractId: v.optional(v.string()),
    opportunityTitle: v.string(),
    issuingBodyName: v.string(),
  },
  handler: async (ctx, args): Promise<{
    isAccessible: boolean;
    containsOpportunityId: boolean;
    contentMatchesLead: boolean;
    isSpecificUrl: boolean;
    score: number;
    reasoning: string;
    suggestedAction: "skip" | "verify" | "research";
  }> => {
    const startTime = Date.now();
    
    // Check URL structure first
    const isSpecific = !isGenericUrl(args.url);
    const hasIdentifier = containsOpportunityIdentifier(args.url, args.contractId, args.opportunityTitle);
    
    // Fetch the URL
    const fetchResult = await fetchHtmlContent(args.url);
    const isAccessible = fetchResult.statusCode >= 200 && fetchResult.statusCode < 400;
    
    if (!isAccessible) {
      return {
        isAccessible: false,
        containsOpportunityId: hasIdentifier,
        contentMatchesLead: false,
        isSpecificUrl: isSpecific,
        score: 0.1,
        reasoning: `URL not accessible (status: ${fetchResult.statusCode || "timeout"}, error: ${fetchResult.error || "none"})`,
        suggestedAction: "research",
      };
    }
    
    // Use AI to analyze content match
    const cleanedHtml = cleanHtmlForAnalysis(fetchResult.html);
    const textContent = extractTextContent(fetchResult.html);
    
    const systemPrompt = `You are analyzing a web page to determine if it matches a specific procurement opportunity.

Return JSON only:
{
  "contentMatchesLead": true/false,
  "matchConfidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "foundOpportunityDetails": true/false,
  "pageType": "opportunity_detail" | "bid_list" | "portal_homepage" | "error_page" | "other"
}`;

    const userPrompt = `Analyze if this page content matches the following procurement opportunity:

Opportunity Title: ${args.opportunityTitle}
Contract ID: ${args.contractId || "N/A"}
Issuing Body: ${args.issuingBodyName}
URL: ${args.url}
Final URL (after redirects): ${fetchResult.finalUrl}

Page Text Content (first 5000 chars):
${textContent.substring(0, 5000)}

Does this page contain specific details about THIS opportunity (not just a list of opportunities)?`;

    try {
      const response = await openai.chat.completions.create({
        model: MODEL_ID,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      const analysis = content ? JSON.parse(content) : {};
      
      const contentMatches = analysis.contentMatchesLead === true;
      const matchConfidence = analysis.matchConfidence || 0;
      
      // Calculate overall score
      let score = 0;
      if (isAccessible) score += 0.2;
      if (isSpecific) score += 0.2;
      if (hasIdentifier) score += 0.2;
      if (contentMatches) score += 0.3;
      score += matchConfidence * 0.1;
      
      // Determine suggested action
      let suggestedAction: "skip" | "verify" | "research" = "research";
      if (score >= 0.7 && contentMatches) {
        suggestedAction = "skip"; // URL is good
      } else if (score >= 0.4 || isSpecific) {
        suggestedAction = "verify"; // URL might be okay, worth checking
      }
      
      return {
        isAccessible,
        containsOpportunityId: hasIdentifier,
        contentMatchesLead: contentMatches,
        isSpecificUrl: isSpecific,
        score: Math.round(score * 100) / 100,
        reasoning: analysis.reasoning || "Analysis completed",
        suggestedAction,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Return basic assessment without AI
      let score = 0;
      if (isAccessible) score += 0.25;
      if (isSpecific) score += 0.25;
      if (hasIdentifier) score += 0.25;
      
      return {
        isAccessible,
        containsOpportunityId: hasIdentifier,
        contentMatchesLead: false,
        isSpecificUrl: isSpecific,
        score: Math.round(score * 100) / 100,
        reasoning: `Basic assessment (AI error: ${errorMsg})`,
        suggestedAction: score >= 0.5 ? "verify" : "research",
      };
    }
  },
});

/**
 * Discover correct URL for a lead using AI research
 */
export const discoverLeadUrl = internalAction({
  args: {
    leadId: v.id("leads"),
    opportunityTitle: v.string(),
    contractId: v.optional(v.string()),
    issuingBodyName: v.string(),
    issuingBodyLevel: v.string(),
    region: v.string(),
    currentUrl: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    discoveredUrl: string | null;
    urlQuality: {
      isAccessible: boolean;
      containsOpportunityId: boolean;
      contentMatchesLead: boolean;
      isSpecificUrl: boolean;
      score: number;
    } | null;
    reasoning: string;
    searchStrategy: string;
  }> => {
    console.log(`[LeadLinkVerifier] Discovering URL for lead: ${args.leadId}`);
    
    // First, try to traverse the current URL to find specific opportunity links
    const currentFetch = await fetchHtmlContent(args.currentUrl);
    
    if (currentFetch.statusCode >= 200 && currentFetch.statusCode < 400) {
      // Analyze the current page to find links to specific opportunities
      const cleanedHtml = cleanHtmlForAnalysis(currentFetch.html);
      
      const traversalPrompt = `You are analyzing a procurement portal page to find a specific opportunity.

Target Opportunity:
- Title: ${args.opportunityTitle}
- Contract ID: ${args.contractId || "N/A"}
- Issuing Body: ${args.issuingBodyName}
- Region: ${args.region}

Current URL: ${args.currentUrl}

HTML Content (relevant portions):
${cleanedHtml.substring(0, 25000)}

Task: Find the specific URL link to this opportunity on the page.

Return JSON only:
{
  "foundSpecificUrl": true/false,
  "specificUrl": "full URL if found, null otherwise",
  "confidence": 0.0-1.0,
  "reasoning": "explanation of how you found it or why not found",
  "alternativeSearchSuggestion": "search query to try if not found"
}`;

      try {
        const response = await openai.chat.completions.create({
          model: MODEL_ID,
          messages: [
            { role: "system", content: "You are an expert at navigating government procurement websites to find specific bid opportunities." },
            { role: "user", content: traversalPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content;
        const traversalResult = content ? JSON.parse(content) : {};
        
        if (traversalResult.foundSpecificUrl && traversalResult.specificUrl) {
          // Validate the discovered URL
          const validationFetch = await fetchHtmlContent(traversalResult.specificUrl);
          
          if (validationFetch.statusCode >= 200 && validationFetch.statusCode < 400) {
            const isSpecific = !isGenericUrl(traversalResult.specificUrl);
            const hasIdentifier = containsOpportunityIdentifier(
              traversalResult.specificUrl,
              args.contractId,
              args.opportunityTitle
            );
            
            // Quick content check
            const textContent = extractTextContent(validationFetch.html);
            const titleWords = args.opportunityTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const matchedWords = titleWords.filter(w => textContent.toLowerCase().includes(w));
            const contentMatches = matchedWords.length >= Math.min(3, titleWords.length * 0.5);
            
            let score = 0;
            if (validationFetch.statusCode >= 200 && validationFetch.statusCode < 400) score += 0.25;
            if (isSpecific) score += 0.25;
            if (hasIdentifier) score += 0.25;
            if (contentMatches) score += 0.25;
            
            return {
              success: true,
              discoveredUrl: traversalResult.specificUrl,
              urlQuality: {
                isAccessible: true,
                containsOpportunityId: hasIdentifier,
                contentMatchesLead: contentMatches,
                isSpecificUrl: isSpecific,
                score: Math.round(score * 100) / 100,
              },
              reasoning: traversalResult.reasoning || "Found specific URL through page traversal",
              searchStrategy: "page_traversal",
            };
          }
        }
      } catch (error) {
        console.error("[LeadLinkVerifier] Traversal error:", error);
      }
    }
    
    // If traversal didn't work, try to construct a likely URL based on patterns
    const constructedUrls = constructPossibleUrls(args);
    
    for (const candidateUrl of constructedUrls) {
      try {
        const fetchResult = await fetchHtmlContent(candidateUrl);
        
        if (fetchResult.statusCode >= 200 && fetchResult.statusCode < 400) {
          const textContent = extractTextContent(fetchResult.html);
          const titleWords = args.opportunityTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const matchedWords = titleWords.filter(w => textContent.toLowerCase().includes(w));
          
          if (matchedWords.length >= Math.min(2, titleWords.length * 0.3)) {
            const isSpecific = !isGenericUrl(candidateUrl);
            const hasIdentifier = containsOpportunityIdentifier(candidateUrl, args.contractId);
            
            let score = 0.25; // Accessible
            if (isSpecific) score += 0.25;
            if (hasIdentifier) score += 0.25;
            if (matchedWords.length >= titleWords.length * 0.5) score += 0.25;
            
            return {
              success: true,
              discoveredUrl: candidateUrl,
              urlQuality: {
                isAccessible: true,
                containsOpportunityId: hasIdentifier,
                contentMatchesLead: true,
                isSpecificUrl: isSpecific,
                score: Math.round(score * 100) / 100,
              },
              reasoning: `Found via URL pattern construction: ${candidateUrl}`,
              searchStrategy: "url_construction",
            };
          }
        }
      } catch (error) {
        // Continue to next URL
      }
    }
    
    // If nothing worked, return failure with guidance
    return {
      success: false,
      discoveredUrl: null,
      urlQuality: null,
      reasoning: "Could not find specific opportunity URL through traversal or construction. Manual verification may be required.",
      searchStrategy: "exhausted",
    };
  },
});

/**
 * Construct possible URLs based on the lead data
 */
function constructPossibleUrls(args: {
  currentUrl: string;
  contractId?: string;
  opportunityTitle: string;
  issuingBodyName: string;
}): string[] {
  const urls: string[] = [];
  
  try {
    const currentUrlObj = new URL(args.currentUrl);
    const baseUrl = `${currentUrlObj.protocol}//${currentUrlObj.host}`;
    
    // Try common patterns
    if (args.contractId) {
      const cleanContractId = args.contractId.replace(/[^a-zA-Z0-9-_]/g, "");
      urls.push(`${baseUrl}/procurement/${cleanContractId}`);
      urls.push(`${baseUrl}/bids/${cleanContractId}`);
      urls.push(`${baseUrl}/solicitations/${cleanContractId}`);
      urls.push(`${baseUrl}/rfp/${cleanContractId}`);
      urls.push(`${currentUrlObj.href}?id=${cleanContractId}`);
      urls.push(`${currentUrlObj.href}/${cleanContractId}`);
    }
    
    // Try title-based slug
    const titleSlug = args.opportunityTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50);
    
    if (titleSlug.length > 10) {
      urls.push(`${baseUrl}/procurement/${titleSlug}`);
      urls.push(`${baseUrl}/bids/${titleSlug}`);
    }
  } catch (error) {
    // Invalid URL, return empty
  }
  
  return urls;
}

/**
 * Main action: Verify and potentially update a single lead's URL
 */
export const verifyAndUpdateLeadUrl = internalAction({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
    leadId: v.id("leads"),
  },
  handler: async (ctx, args): Promise<{
    result: "skipped" | "updated" | "no_change" | "failed";
    originalUrl: string;
    newUrl?: string;
    reasoning: string;
    durationMs: number;
  }> => {
    const startTime = Date.now();
    
    // Get lead data
    const lead = await ctx.runQuery(internal.leadLinkVerifierQueries.getLeadForVerificationInternal, {
      leadId: args.leadId,
    });
    
    if (!lead) {
      return {
        result: "failed",
        originalUrl: "",
        reasoning: "Lead not found",
        durationMs: Date.now() - startTime,
      };
    }
    
    const originalUrl = lead.source?.url || "";
    
    if (!originalUrl) {
      return {
        result: "failed",
        originalUrl: "",
        reasoning: "Lead has no source URL",
        durationMs: Date.now() - startTime,
      };
    }
    
    // Step 1: Assess current URL quality
    const qualityAssessment = await ctx.runAction(internal.leadLinkVerifierActions.assessUrlQuality, {
      leadId: args.leadId,
      url: originalUrl,
      contractId: lead.contractID,
      opportunityTitle: lead.opportunityTitle,
      issuingBodyName: lead.issuingBody?.name || "",
    });
    
    // Record the result
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    
    // If URL is already good, skip
    if (qualityAssessment.suggestedAction === "skip" && qualityAssessment.score >= 0.7) {
      await ctx.runMutation(internal.leadLinkVerifierMutations.recordVerificationResult, {
        jobId: args.jobId,
        leadId: args.leadId,
        originalUrl,
        result: "skipped",
        originalUrlQuality: {
          isAccessible: qualityAssessment.isAccessible,
          containsOpportunityId: qualityAssessment.containsOpportunityId,
          contentMatchesLead: qualityAssessment.contentMatchesLead,
          isSpecificUrl: qualityAssessment.isSpecificUrl,
          score: qualityAssessment.score,
        },
        aiReasoning: qualityAssessment.reasoning,
        durationMs,
      });
      
      await ctx.runMutation(internal.leadLinkVerifierMutations.markLeadVerified, {
        leadId: args.leadId,
      });
      
      return {
        result: "skipped",
        originalUrl,
        reasoning: `URL already good (score: ${qualityAssessment.score}): ${qualityAssessment.reasoning}`,
        durationMs,
      };
    }
    
    // Step 2: Try to discover better URL
    const discoveryResult = await ctx.runAction(internal.leadLinkVerifierActions.discoverLeadUrl, {
      leadId: args.leadId,
      opportunityTitle: lead.opportunityTitle,
      contractId: lead.contractID,
      issuingBodyName: lead.issuingBody?.name || "",
      issuingBodyLevel: lead.issuingBody?.level || "",
      region: lead.location?.region || "",
      currentUrl: originalUrl,
      summary: lead.summary || "",
    });
    
    const totalDurationMs = Date.now() - startTime;
    
    if (discoveryResult.success && discoveryResult.discoveredUrl) {
      // Update the lead with the new URL
      await ctx.runMutation(internal.leadLinkVerifierMutations.updateLeadSourceUrl, {
        leadId: args.leadId,
        newUrl: discoveryResult.discoveredUrl,
      });
      
      await ctx.runMutation(internal.leadLinkVerifierMutations.recordVerificationResult, {
        jobId: args.jobId,
        leadId: args.leadId,
        originalUrl,
        result: "updated",
        newUrl: discoveryResult.discoveredUrl,
        originalUrlQuality: {
          isAccessible: qualityAssessment.isAccessible,
          containsOpportunityId: qualityAssessment.containsOpportunityId,
          contentMatchesLead: qualityAssessment.contentMatchesLead,
          isSpecificUrl: qualityAssessment.isSpecificUrl,
          score: qualityAssessment.score,
        },
        newUrlQuality: discoveryResult.urlQuality || undefined,
        aiReasoning: discoveryResult.reasoning,
        durationMs: totalDurationMs,
      });
      
      return {
        result: "updated",
        originalUrl,
        newUrl: discoveryResult.discoveredUrl,
        reasoning: discoveryResult.reasoning,
        durationMs: totalDurationMs,
      };
    } else {
      // Could not find better URL
      await ctx.runMutation(internal.leadLinkVerifierMutations.markLeadVerified, {
        leadId: args.leadId,
      });
      
      await ctx.runMutation(internal.leadLinkVerifierMutations.recordVerificationResult, {
        jobId: args.jobId,
        leadId: args.leadId,
        originalUrl,
        result: "no_change",
        originalUrlQuality: {
          isAccessible: qualityAssessment.isAccessible,
          containsOpportunityId: qualityAssessment.containsOpportunityId,
          contentMatchesLead: qualityAssessment.contentMatchesLead,
          isSpecificUrl: qualityAssessment.isSpecificUrl,
          score: qualityAssessment.score,
        },
        aiReasoning: discoveryResult.reasoning,
        durationMs: totalDurationMs,
      });
      
      return {
        result: "no_change",
        originalUrl,
        reasoning: discoveryResult.reasoning,
        durationMs: totalDurationMs,
      };
    }
  },
});

/**
 * Process a batch of leads for verification
 */
export const processBatch = internalAction({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
    leadIds: v.array(v.id("leads")),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> => {
    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const leadId of args.leadIds) {
      try {
        const result = await ctx.runAction(internal.leadLinkVerifierActions.verifyAndUpdateLeadUrl, {
          jobId: args.jobId,
          leadId,
        });
        
        results.processed++;
        
        switch (result.result) {
          case "updated":
            results.updated++;
            break;
          case "skipped":
            results.skipped++;
            break;
          case "no_change":
            // Count as processed but not updated or skipped
            break;
          case "failed":
            results.failed++;
            results.errors.push(`Lead ${leadId}: ${result.reasoning}`);
            break;
        }
        
        // Update job progress
        await ctx.runMutation(internal.leadLinkVerifierMutations.incrementJobProgress, {
          jobId: args.jobId,
          processed: 1,
          updated: result.result === "updated" ? 1 : 0,
          skipped: result.result === "skipped" ? 1 : 0,
          failed: result.result === "failed" ? 1 : 0,
        });
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errors.push(`Lead ${leadId}: ${errorMsg}`);
        
        await ctx.runMutation(internal.leadLinkVerifierMutations.addJobError, {
          jobId: args.jobId,
          leadId,
          error: errorMsg,
        });
        
        await ctx.runMutation(internal.leadLinkVerifierMutations.incrementJobProgress, {
          jobId: args.jobId,
          processed: 1,
          failed: 1,
        });
      }
    }
    
    return results;
  },
});

/**
 * Public action to trigger verification for a single lead (for manual testing)
 */
export const verifySingleLead = action({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    result: string;
    originalUrl: string;
    newUrl?: string;
    reasoning: string;
  }> => {
    // Create a temporary job for tracking
    const jobId = await ctx.runMutation(api.leadLinkVerifierMutations.createVerificationJob, {
      batchSize: 1,
      processingOrder: "newest_first",
      startedBy: "manual_test",
    });
    
    try {
      const result = await ctx.runAction(internal.leadLinkVerifierActions.verifyAndUpdateLeadUrl, {
        jobId,
        leadId: args.leadId,
      });
      
      return {
        success: result.result !== "failed",
        result: result.result,
        originalUrl: result.originalUrl,
        newUrl: result.newUrl,
        reasoning: result.reasoning,
      };
    } finally {
      // Mark job as completed
      await ctx.runMutation(internal.leadLinkVerifierMutations.updateVerificationJobStatus, {
        jobId,
        status: "completed",
        completedAt: Date.now(),
      });
    }
  },
});
