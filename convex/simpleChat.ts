"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { simpleChatAgent } from "./simpleChatAgent";
import { parseAgentResponse } from "./lib/parseAgentResponse";

// Simple synchronous chat - MVP version
export const sendMessage = action({
  args: {
    prompt: v.string(),
    sessionId: v.id("procurementChatSessions"),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Get session to retrieve userId for analytics
    const session = await ctx.runQuery(internal.procurementChatSessions.getSessionInternal, {
      sessionId: args.sessionId,
    });
    
    if (!session) {
      throw new Error("Session not found");
    }
    
    try {
      // Create a new thread for each message (stateless for MVP)
      const { threadId } = await simpleChatAgent.createThread(ctx);
      
      // Generate text response
      const result = await simpleChatAgent.generateText(
        ctx, 
        { threadId }, 
        { prompt: args.prompt }
      );
      
      const rawText = result.text || "I apologize, but I couldn't generate a response. Please try again.";
      
      // Parse the response to extract structured procurement link data
      const parsed = parseAgentResponse(rawText);
      
      // Save the assistant response with parsed structured data
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: parsed.textContent,
        responseData: parsed.responseData,
        isError: false,
      });
      
      // Record analytics for successful response
      const latencyMs = Date.now() - startTime;
      // AI SDK uses inputTokens/outputTokens, fallback for safety
      const usage = result.usage as { inputTokens?: number; outputTokens?: number; promptTokens?: number; completionTokens?: number } | undefined;
      const requestTokens = usage?.inputTokens ?? usage?.promptTokens ?? 0;
      const responseTokens = usage?.outputTokens ?? usage?.completionTokens ?? 0;
      
      await ctx.runMutation(internal.procurementChatAnalytics.recordAnalytics, {
        sessionId: args.sessionId,
        userId: session.userId,
        userPrompt: args.prompt,
        assistantResponse: parsed.textContent,
        model: "gpt-4o-mini", // From simpleChatAgent config
        provider: "openai",
        requestTokens,
        responseTokens,
        latencyMs,
        isError: false,
      });
      
      return { 
        success: true, 
        response: parsed.textContent,
        hasStructuredData: parsed.hasStructuredData,
        linksCount: parsed.responseData?.procurement_links?.length || 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Chat error:", errorMessage);
      
      // Save error message
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: `Error: ${errorMessage}`,
        isError: true,
      });
      
      // Record error analytics
      const latencyMs = Date.now() - startTime;
      try {
        await ctx.runMutation(internal.procurementChatAnalytics.recordAnalytics, {
          sessionId: args.sessionId,
          userId: session.userId,
          userPrompt: args.prompt,
          assistantResponse: "",
          model: "gpt-4o-mini",
          provider: "openai",
          requestTokens: 0,
          responseTokens: 0,
          latencyMs,
          isError: true,
          errorMessage: errorMessage,
        });
      } catch (analyticsError) {
        console.error("Failed to record error analytics:", analyticsError);
      }
      
      throw new Error(errorMessage);
    }
  },
});
