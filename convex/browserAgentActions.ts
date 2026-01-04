"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Trigger scraping for a single portal using browser agent service
 */
export const scrapePortal = action({
  args: {
    portalId: v.optional(v.id("portals")),
    url: v.string(),
    procurementLinkId: v.optional(v.id("procurementUrls")),
    state: v.string(),
    capital: v.string(),
    priority: v.optional(v.union(v.literal("high"), v.literal("normal"), v.literal("low"))),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    scrapingJobId: Id<"scrapingJobs">;
    agentJobId: string;
  }> => {
    // 1. Get portal details if portalId provided
    // Note: Portal configuration would be queried here if portals table exists
    // For now, we use default configuration
    
    // 2. Create scraping job record
    const jobId = crypto.randomUUID();
    const scrapingJobId: Id<"scrapingJobs"> = await ctx.runMutation(
      internal.browserAgentMutations.createScrapingJob,
      {
        portalId: args.portalId,
        agentJobId: jobId,
        url: args.url,
        procurementLinkId: args.procurementLinkId,
        state: args.state,
        capital: args.capital,
      }
    );
    
    // 3. Call browser agent service
    const browserAgentUrl = process.env.BROWSER_AGENT_URL;
    const browserAgentApiKey = process.env.BROWSER_AGENT_API_KEY;
    
    if (!browserAgentUrl) {
      throw new Error("BROWSER_AGENT_URL not configured");
    }
    
    if (!browserAgentApiKey) {
      throw new Error("BROWSER_AGENT_API_KEY not configured");
    }
    
    try {
      const response = await fetch(`${browserAgentUrl}/api/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${browserAgentApiKey}`,
        },
        body: JSON.stringify({
          jobId,
          url: args.url,
          portalId: args.portalId || "",
          configuration: {
            requiresAuth: false, // Default to false, can be configured per portal
            authCredentials: undefined,
            navigationHints: undefined,
            maxPages: 20, // Default max pages
            customInstructions: undefined,
          },
          callbackUrl: `${process.env.CONVEX_SITE_URL}/api/scraping/callback`,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Browser agent error: ${error}`);
      }
      
      const result = await response.json() as { status: string };
      
      // 4. Update job status
      await ctx.runMutation(internal.browserAgentMutations.updateScrapingJob, {
        scrapingJobId,
        status: "queued",
        agentStatus: result.status,
      });
      
      return {
        success: true,
        scrapingJobId,
        agentJobId: jobId,
      };
    } catch (error) {
      // Update job as failed
      await ctx.runMutation(internal.browserAgentMutations.updateScrapingJob, {
        scrapingJobId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      
      throw error;
    }
  },
});

/**
 * Process scraping results from browser agent callback
 */
export const processScrapingResults = internalAction({
  args: {
    agentJobId: v.string(),
    success: v.boolean(),
    opportunities: v.optional(v.array(v.any())),
    interactions: v.optional(v.array(v.any())),
    pagesScraped: v.optional(v.number()),
    duration: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    error: v.optional(v.object({
      message: v.string(),
      type: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // 1. Find the scraping job
    const job = await ctx.runQuery(internal.browserAgentQueries.getByAgentJobId, {
      agentJobId: args.agentJobId,
    });
    
    if (!job) {
      console.error(`Scraping job not found for agentJobId: ${args.agentJobId}`);
      return;
    }
    
    if (!args.success) {
      // Handle failure
      await ctx.runMutation(internal.browserAgentMutations.updateScrapingJob, {
        scrapingJobId: job._id,
        status: "failed",
        errorMessage: args.error?.message,
        errorType: args.error?.type,
        completedAt: Date.now(),
        duration: args.duration,
      });
      
      return;
    }
    
    // 2. Create scraped data record
    const scrapedDataId = await ctx.runMutation(
      internal.procurementScraperMutations.createScrapingRecord,
      {
        url: job.url || "",
        procurementLinkId: job.procurementLinkId,
        state: job.state || "",
        capital: job.capital || "",
      }
    );
    
    // 3. Update scraped data with results
    await ctx.runMutation(internal.procurementScraperMutations.updateScrapingRecord, {
      recordId: scrapedDataId,
      status: "completed",
      scrapedData: {
        opportunities: args.opportunities || [],
        interactions: args.interactions || [],
        pagesScraped: args.pagesScraped || 0,
        duration: args.duration || 0,
        tokensUsed: args.tokensUsed || 0,
      },
    });
    
    // 4. Save individual opportunities if provided
    if (args.opportunities && args.opportunities.length > 0) {
      // You would save opportunities here using your existing mutations
      // This depends on your opportunities table structure
    }
    
    // 5. Update scraping job
    await ctx.runMutation(internal.browserAgentMutations.updateScrapingJob, {
      scrapingJobId: job._id,
      status: "completed",
      completedAt: Date.now(),
      duration: args.duration,
      opportunitiesFound: args.opportunities?.length ?? 0,
      resultRecordId: scrapedDataId,
    });
  },
});

