"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createSimpleChatAgent, getSystemPrompt } from "./simpleChatAgent";
import { parseAgentResponse } from "./lib/parseAgentResponse";

// Simple synchronous chat - MVP version
export const sendMessage = action({
  args: {
    prompt: v.string(),
    sessionId: v.id("procurementChatSessions"),
    systemPromptId: v.optional(v.union(v.id("chatSystemPrompts"), v.null())), // ID of system prompt to use, or null for none
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
      // Get the system prompt from the database
      // If systemPromptId is null, use empty string (no prompt)
      // If systemPromptId is provided, use that specific prompt
      // If systemPromptId is undefined, default to primary prompt
      const systemPrompt = args.systemPromptId === null
        ? "" // Empty prompt when "None" is selected
        : await getSystemPrompt(ctx, args.systemPromptId, args.prompt);
      
      // Create agent with the fetched prompt (or empty string)
      const simpleChatAgent = createSimpleChatAgent(systemPrompt);
      
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
      
      // If textContent is empty but we have structured data, create a summary message
      // This happens when the AI response is purely JSON (common for structured responses)
      let displayContent = parsed.textContent;
      let analyticsContent = parsed.textContent;
      
      if (!displayContent.trim() && parsed.hasStructuredData && parsed.responseData) {
        const linkCount = parsed.responseData.procurement_links?.length || 0;
        const regions = parsed.responseData.search_metadata?.target_regions?.join(', ') || 'requested regions';
        displayContent = `Found ${linkCount} procurement link${linkCount !== 1 ? 's' : ''} for ${regions}.`;
        // For analytics, include the raw text so we can see what GPT actually returned
        analyticsContent = rawText.length > 5000 ? rawText.substring(0, 5000) + '...' : rawText;
      } else if (!displayContent.trim()) {
        // Fallback: use raw text if parsing resulted in empty content
        displayContent = rawText.length > 1000 ? rawText.substring(0, 1000) + '...' : rawText;
        analyticsContent = rawText.length > 5000 ? rawText.substring(0, 5000) + '...' : rawText;
      } else {
        // Use parsed content, but for analytics include full raw text if different
        analyticsContent = parsed.textContent !== rawText 
          ? `${parsed.textContent}\n\n[Full response: ${rawText.length > 4000 ? rawText.substring(0, 4000) + '...' : rawText}]`
          : parsed.textContent;
      }
      
      // Save the assistant response with parsed structured data
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: displayContent,
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
        userId: session.userId || session.anonymousId || "unknown",
        userPrompt: args.prompt,
        assistantResponse: analyticsContent,
        model: "gpt-5-mini", // From simpleChatAgent config
        provider: "openai",
        requestTokens,
        responseTokens,
        latencyMs,
        isError: false,
      });
      
      return { 
        success: true, 
        response: displayContent,
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
          userId: session.userId || session.anonymousId || "unknown",
          userPrompt: args.prompt,
          assistantResponse: "",
          model: "gpt-5-mini",
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
