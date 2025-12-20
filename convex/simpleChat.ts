"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { simpleChatAgent } from "./simpleChatAgent";

// Simple synchronous chat - MVP version
export const sendMessage = action({
  args: {
    prompt: v.string(),
    sessionId: v.id("procurementChatSessions"),
  },
  handler: async (ctx, args) => {
    try {
      // Create a new thread for each message (stateless for MVP)
      const { threadId } = await simpleChatAgent.createThread(ctx);
      
      // Generate text response
      const result = await simpleChatAgent.generateText(
        ctx, 
        { threadId }, 
        { prompt: args.prompt }
      );
      
      // Save the assistant response
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: result.text || "I apologize, but I couldn't generate a response. Please try again.",
        isError: false,
      });
      
      return { 
        success: true, 
        response: result.text 
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
      
      throw new Error(errorMessage);
    }
  },
});
