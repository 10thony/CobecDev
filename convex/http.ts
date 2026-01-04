import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Callback endpoint for browser agent to report results
 */
http.route({
  path: "/api/scraping/callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify authorization
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.BROWSER_AGENT_CALLBACK_TOKEN;
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Parse body
    const body = await request.json();
    
    // Validate required fields
    if (!body.jobId) {
      return new Response("Missing jobId", { status: 400 });
    }
    
    // Process results
    await ctx.runAction(internal.browserAgentActions.processScrapingResults, {
      agentJobId: body.jobId,
      success: body.success,
      opportunities: body.opportunities,
      interactions: body.interactions,
      pagesScraped: body.pagesScraped,
      duration: body.duration,
      tokensUsed: body.tokensUsed,
      error: body.error,
    });
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Progress update endpoint (for real-time updates during scraping)
 */
http.route({
  path: "/api/scraping/progress",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.BROWSER_AGENT_CALLBACK_TOKEN;
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    const body = await request.json();
    
    if (!body.jobId) {
      return new Response("Missing jobId", { status: 400 });
    }
    
    // Update progress
    // You would implement this mutation to update job progress
    // await ctx.runMutation(internal.browserAgentMutations.updateProgress, {
    //   agentJobId: body.jobId,
    //   currentPage: body.currentPage,
    //   totalPages: body.totalPages,
    //   opportunitiesFound: body.opportunitiesFound,
    //   currentAction: body.currentAction,
    // });
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
