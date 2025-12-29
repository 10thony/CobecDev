"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { createProcurementScraperAgent, getPrimarySystemPrompt } from "./procurementScraperAgent";
import {
  SCRAPING_STATUS,
  DATA_QUALITY,
  DEFAULT_DATA_QUALITY,
  DEFAULT_DATA_COMPLETENESS,
} from "./procurementScraperConstants";
import { Id } from "./_generated/dataModel";

/**
 * Scrape a single procurement URL
 */
export const scrapeProcurementUrl = action({
  args: {
    url: v.string(),
    procurementLinkId: v.optional(v.id("procurementUrls")),
    state: v.string(),
    capital: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    recordId: Id<"scrapedProcurementData">;
    dataQuality?: typeof DATA_QUALITY[keyof typeof DATA_QUALITY];
    dataCompleteness?: number;
    error?: string;
  }> => {
    // Get the primary system prompt from database
    const systemPrompt = await getPrimarySystemPrompt(ctx);
    
    // Create the agent with the system prompt
    const agent = createProcurementScraperAgent(systemPrompt);
    
    // Create scraping record with "in_progress" status
    const scrapingRecordId: Id<"scrapedProcurementData"> = await ctx.runMutation(
      internal.procurementScraperMutations.createScrapingRecord,
      {
        url: args.url,
        procurementLinkId: args.procurementLinkId,
        state: args.state,
        capital: args.capital,
      }
    );

    try {
      // Use the agent to scrape the URL
      // Note: createThread requires ctx as first argument
      const { threadId } = await agent.createThread(ctx);
      
      console.log(`[Procurement Scraper] Starting scrape for URL: ${args.url}, Thread ID: ${threadId}`);
      
      const userPrompt = `Please scrape procurement data from this URL: ${args.url}

Extract all available procurement opportunities, RFPs, RFQs, and related information. Return the data in the JSON format specified in your instructions.`;
      
      console.log(`[Procurement Scraper] Calling agent with prompt length: ${userPrompt.length}`);
      
      // Use agent.run() instead of generateText() for agents with tools
      // run() will continue executing until the agent generates a final response,
      // even after tool calls. generateText() stops after tool calls (finishReason: 'tool-calls')
      const startTime = Date.now();
      
      let response;
      try {
        // Try using run() method which should handle tool calls and continue to final response
        // If run() doesn't exist or doesn't work, fall back to generateText()
        if (typeof (agent as any).run === 'function') {
          console.log(`[Procurement Scraper] Using agent.run() method`);
          const runResult = await (agent as any).run(ctx, { threadId }, { prompt: userPrompt });
          // run() might return a different structure, extract text if available
          response = {
            text: runResult?.text || runResult?.response || runResult?.output || '',
            usage: runResult?.usage || null,
            finishReason: runResult?.finishReason || 'unknown',
          };
        } else {
          console.log(`[Procurement Scraper] Using agent.generateText() method (run() not available)`);
          // Fallback: use generateText but we'll need to handle tool-calls finishReason
          const generateResponse = await agent.generateText(
            ctx,
            { threadId },
            { prompt: userPrompt }
          );
          
          // If finishReason is 'tool-calls', the agent stopped after calling tools
          // We need to continue the conversation to get a final response
          if ((generateResponse as any)?.finishReason === 'tool-calls') {
            console.log(`[Procurement Scraper] Agent stopped after tool calls, continuing to get final response...`);
            // Continue the conversation to get the final response
            const continueResponse = await agent.generateText(
              ctx,
              { threadId },
              { prompt: "Please provide your final response with the scraped data in JSON format as specified in your instructions." }
            );
            response = continueResponse;
          } else {
            response = generateResponse;
          }
        }
      } catch (generateError) {
        console.error(`[Procurement Scraper] Agent execution failed:`, generateError);
        throw generateError;
      }
      const duration = Date.now() - startTime;
      
      // Log comprehensive response metadata for debugging
      const responseMetadata = {
        hasResponse: !!response,
        hasText: !!response?.text,
        textType: typeof response?.text,
        textLength: response?.text?.length || 0,
        textPreview: response?.text?.substring(0, 200) || '(empty)',
        usage: response?.usage || null,
        finishReason: (response as any)?.finishReason || 'unknown',
        responseKeys: response ? Object.keys(response) : [],
      };
      console.log(`[Procurement Scraper] Response received after ${duration}ms. Full response object:`, responseMetadata);

      // If response is empty, log additional diagnostic information
      if (!response || !response.text || typeof response.text !== 'string' || response.text.trim().length === 0) {
        console.log(`[Procurement Scraper] Empty response detected. This may indicate:`);
        console.log(`  - Agent called tools but did not generate a final text response`);
        console.log(`  - Token limit was reached during tool execution`);
        console.log(`  - Agent configuration issue with tool handling`);
        console.log(`  - Check tool execution logs above for fetchWebpageContent calls`);
      }

      // Validate response before parsing
      if (!response || !response.text || typeof response.text !== 'string' || response.text.trim().length === 0) {
        const errorMsg = `Agent returned empty or invalid response. Response object: ${JSON.stringify({
          hasResponse: !!response,
          hasText: !!response?.text,
          textType: typeof response?.text,
          textLength: response?.text?.length || 0,
          usage: response?.usage || null,
        })}`;
        console.error(`[Procurement Scraper] ${errorMsg}`);
        
        // Store the error information in the database before throwing
        await ctx.runMutation(
          internal.procurementScraperMutations.updateScrapingRecord,
          {
            recordId: scrapingRecordId,
            status: SCRAPING_STATUS.FAILED,
            errorMessage: `AI agent returned empty response. This may indicate an issue with the agent configuration, API limits, or the website content.`,
            scrapedData: {
              error: "Empty response from AI agent",
              responseMetadata: {
                hasResponse: !!response,
                hasText: !!response?.text,
                textType: typeof response?.text,
                textLength: response?.text?.length || 0,
                usage: response?.usage || null,
              },
              troubleshooting: "Possible causes: 1) Agent tool execution failed, 2) API rate limit exceeded, 3) Website blocked the request, 4) Agent timeout",
            },
            dataQuality: DATA_QUALITY.LOW,
          }
        );
        
        throw new Error(`AI agent returned empty response. This may indicate an issue with the agent configuration or the website content.`);
      }

      // Parse the response
      let scrapedData: any;
      let dataQuality: typeof DATA_QUALITY[keyof typeof DATA_QUALITY] = DEFAULT_DATA_QUALITY;
      let dataCompleteness: number = DEFAULT_DATA_COMPLETENESS;
      let tokensUsed: number | undefined;

      try {
        // Try to extract JSON from the response
        const content = response.text.trim();
        
        // Log response for debugging (first 500 chars)
        console.log(`[Procurement Scraper] Agent response (first 500 chars): ${content.substring(0, 500)}`);
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            scrapedData = JSON.parse(jsonMatch[0]);
            // Validate data quality value
            const quality = scrapedData.metadata?.dataQuality;
            if (quality === DATA_QUALITY.HIGH || quality === DATA_QUALITY.MEDIUM || quality === DATA_QUALITY.LOW) {
              dataQuality = quality;
            } else {
              dataQuality = DEFAULT_DATA_QUALITY;
            }
            dataCompleteness = scrapedData.metadata?.dataCompleteness || DEFAULT_DATA_COMPLETENESS;
          } catch (jsonParseError) {
            // JSON structure found but invalid - store with error
            console.error(`[Procurement Scraper] JSON parse error: ${jsonParseError}`);
            scrapedData = { 
              rawResponse: content, 
              parseError: String(jsonParseError),
              attemptedJson: jsonMatch[0].substring(0, 1000) // Store first 1000 chars for debugging
            };
            dataQuality = DATA_QUALITY.LOW;
          }
        } else {
          // If no JSON found, store the raw response with a note
          console.warn(`[Procurement Scraper] No JSON found in response. Content length: ${content.length}`);
          scrapedData = { 
            rawResponse: content,
            note: "No JSON structure found in agent response"
          };
          dataQuality = DATA_QUALITY.LOW;
        }
      } catch (parseError) {
        // If parsing fails, store raw response with error details
        console.error(`[Procurement Scraper] Parse error: ${parseError}`);
        scrapedData = { 
          rawResponse: response.text || '', 
          parseError: String(parseError),
          errorType: parseError instanceof Error ? parseError.name : 'Unknown'
        };
        dataQuality = DATA_QUALITY.LOW;
      }

      // Get token usage if available
      if (response.usage) {
        tokensUsed = response.usage.totalTokens;
      }

      // Update the scraping record with results
      // Filter out "failed" from dataQuality since mutation only accepts "high" | "medium" | "low"
      const validDataQuality: "high" | "medium" | "low" | undefined = 
        dataQuality === DATA_QUALITY.FAILED ? undefined : dataQuality;
      await ctx.runMutation(
        internal.procurementScraperMutations.updateScrapingRecord,
        {
          recordId: scrapingRecordId,
          status: SCRAPING_STATUS.COMPLETED,
          scrapedData,
          dataQuality: validDataQuality,
          dataCompleteness,
          tokensUsed,
          aiPrompt: `Scrape procurement data from ${args.url}`,
        }
      );

      return {
        success: true,
        recordId: scrapingRecordId,
        dataQuality,
        dataCompleteness,
      };
    } catch (error) {
      // Update record with error
      await ctx.runMutation(
        internal.procurementScraperMutations.updateScrapingRecord,
        {
          recordId: scrapingRecordId,
          status: SCRAPING_STATUS.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        }
      );

      return {
        success: false,
        recordId: scrapingRecordId,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Scrape multiple procurement URLs (batch operation)
 */
export const scrapeMultipleProcurementUrls = action({
  args: {
    urls: v.array(
      v.object({
        url: v.string(),
        procurementLinkId: v.optional(v.id("procurementUrls")),
        state: v.string(),
        capital: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      success: boolean;
      recordId: Id<"scrapedProcurementData">;
      dataQuality?: typeof DATA_QUALITY[keyof typeof DATA_QUALITY];
      dataCompleteness?: number;
      error?: string;
    }>;
  }> => {
    const results: Array<{
      success: boolean;
      recordId: Id<"scrapedProcurementData">;
      dataQuality?: typeof DATA_QUALITY[keyof typeof DATA_QUALITY];
      dataCompleteness?: number;
      error?: string;
    }> = [];

    for (const urlData of args.urls) {
      const result = await ctx.runAction(api.procurementScraperActions.scrapeProcurementUrl, {
        url: urlData.url,
        procurementLinkId: urlData.procurementLinkId,
        state: urlData.state,
        capital: urlData.capital,
      });
      results.push(result);

      // Add a small delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return {
      total: args.urls.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

/**
 * Scrape all approved procurement links (fire-and-forget with batch job tracking)
 */
export const scrapeAllApprovedLinks = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    jobId?: Id<"scrapingBatchJobs">;
    error?: string;
  }> => {
    try {
      // Get current user ID
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return {
          success: false,
          error: "Not authenticated",
        };
      }
      const userId = identity.subject;

      // Get all approved procurement links
      const lookup: any = await ctx.runQuery(
        api.approvedProcurementLinksLookup.getLookup
      );

      if (!lookup || !lookup.approvedProcurementLinks || lookup.approvedProcurementLinks.length === 0) {
        return {
          success: false,
          error: "No approved procurement links found",
        };
      }

      // Transform to scraping format
      const urlsToScrape: Array<{
        url: string;
        procurementLinkId?: Id<"procurementUrls">;
        state: string;
        capital: string;
      }> = lookup.approvedProcurementLinks.map((link: {
        procurementLink: string;
        state: string;
        capital: string;
      }) => ({
        url: link.procurementLink,
        state: link.state,
        capital: link.capital,
      }));

      // Create batch job
      const jobId = await ctx.runMutation(
        internal.procurementScraperBatchJobs.createBatchJob,
        {
          userId,
          jobType: "all_approved",
          totalUrls: urlsToScrape.length,
          urls: urlsToScrape.map((u) => u.url),
        }
      );

      // Start processing asynchronously (fire-and-forget)
      await ctx.scheduler.runAfter(0, internal.procurementScraperActions.processBatchJob, {
        jobId,
        urls: urlsToScrape,
      });

      return {
        success: true,
        jobId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Internal action to process a batch scraping job
 */
export const processBatchJob = internalAction({
  args: {
    jobId: v.id("scrapingBatchJobs"),
    urls: v.array(
      v.object({
        url: v.string(),
        procurementLinkId: v.optional(v.id("procurementUrls")),
        state: v.string(),
        capital: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if job was cancelled before starting
    let job = await ctx.runQuery(internal.procurementScraperBatchJobs.getBatchJobInternal, {
      jobId: args.jobId,
    });
    
    if (!job) {
      throw new Error("Batch job not found");
    }

    if (job.status === "cancelled") {
      return; // Job was cancelled before processing started
    }

    // Update job status to in_progress
    await ctx.runMutation(internal.procurementScraperBatchJobs.updateBatchJobProgress, {
      jobId: args.jobId,
      status: "in_progress",
    });

    let completedUrls = 0;
    let failedUrls = 0;

    // Process each URL
    for (const urlData of args.urls) {
      // Check if job was cancelled before processing each URL
      job = await ctx.runQuery(internal.procurementScraperBatchJobs.getBatchJobInternal, {
        jobId: args.jobId,
      });

      if (!job || job.status === "cancelled") {
        // Job was cancelled, stop processing
        return;
      }

      try {
        const result = await ctx.runAction(api.procurementScraperActions.scrapeProcurementUrl, {
          url: urlData.url,
          procurementLinkId: urlData.procurementLinkId,
          state: urlData.state,
          capital: urlData.capital,
        });

        if (result.success) {
          completedUrls++;
          await ctx.runMutation(internal.procurementScraperBatchJobs.updateBatchJobProgress, {
            jobId: args.jobId,
            completedUrls,
            recordId: result.recordId,
          });
        } else {
          failedUrls++;
          await ctx.runMutation(internal.procurementScraperBatchJobs.updateBatchJobProgress, {
            jobId: args.jobId,
            failedUrls,
          });
        }
      } catch (error) {
        failedUrls++;
        await ctx.runMutation(internal.procurementScraperBatchJobs.updateBatchJobProgress, {
          jobId: args.jobId,
          failedUrls,
        });
      }

      // Check again after processing (in case it was cancelled during processing)
      job = await ctx.runQuery(internal.procurementScraperBatchJobs.getBatchJobInternal, {
        jobId: args.jobId,
      });

      if (!job || job.status === "cancelled") {
        // Job was cancelled, stop processing
        return;
      }

      // Add a small delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check one more time after delay (for more responsive cancellation)
      job = await ctx.runQuery(internal.procurementScraperBatchJobs.getBatchJobInternal, {
        jobId: args.jobId,
      });

      if (!job || job.status === "cancelled") {
        // Job was cancelled, stop processing
        return;
      }
    }

    // Check one more time if job was cancelled before marking as completed
    job = await ctx.runQuery(internal.procurementScraperBatchJobs.getBatchJobInternal, {
      jobId: args.jobId,
    });

    if (job && job.status !== "cancelled") {
      // Mark job as completed only if it wasn't cancelled
      await ctx.runMutation(internal.procurementScraperBatchJobs.updateBatchJobProgress, {
        jobId: args.jobId,
        status: "completed",
      });
    }
  },
});

