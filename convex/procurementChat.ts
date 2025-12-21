"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { procurementAgent } from "./procurementAgent";
import { DEFAULT_SYSTEM_PROMPT } from "./procurementChatSystemPrompts";

// Model to use for procurement chat
const PROCUREMENT_CHAT_MODEL = "gpt-5-mini";

export const fetchProcurementLinks = action({
  args: { 
    prompt: v.string(),
    targetRegions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set. Please set it in your Convex dashboard under Settings > Environment Variables.");
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    try {
      // Fetch the primary system prompt from the database
      const primaryPrompt = await ctx.runQuery(internal.procurementChatSystemPrompts.getPrimaryInternal, {});
      const systemPromptText = primaryPrompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;
      
      const response = await openai.chat.completions.create({
        model: PROCUREMENT_CHAT_MODEL,
        messages: [
          { role: "system", content: systemPromptText },
          { role: "user", content: args.prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent outputs
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response
      const parsed = JSON.parse(content);
      
      // Validate the structure
      if (!parsed.search_metadata || !parsed.procurement_links) {
        throw new Error("Invalid response structure from OpenAI");
      }

      // Ensure timestamp is set if not provided
      if (!parsed.search_metadata.timestamp) {
        parsed.search_metadata.timestamp = new Date().toISOString();
      }

      return parsed;
    } catch (error) {
      console.error("Error in fetchProcurementLinks:", error);
      throw new Error(`Failed to fetch procurement links: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Action that fetches procurement links AND saves to a session
export const fetchAndSaveProcurementLinks = action({
  args: { 
    prompt: v.string(),
    sessionId: v.id("procurementChatSessions"),
    targetRegions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    try {
      // Get or create a thread ID for this session
      // First, check if the session has a threadId stored
      const session = await ctx.runQuery(internal.procurementChatSessions.getSessionInternal, {
        sessionId: args.sessionId,
      });
      
      if (!session) {
        throw new Error("Session not found");
      }
      
      let threadId: string;
      let needsNewThread = !session.threadId;
      
      // Try to use existing thread, but handle corrupted thread IDs
      if (session.threadId) {
        try {
          // Attempt to use the existing thread
          const result = await procurementAgent.generateText(ctx, { threadId: session.threadId }, { prompt: args.prompt });
          
          // If successful, parse and return the result
          let parsed;
          try {
            parsed = JSON.parse(result.text);
          } catch (parseError) {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                parsed = JSON.parse(jsonMatch[0]);
              } catch (innerError) {
                // Save the raw response so user can see what the agent returned
                await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
                  sessionId: args.sessionId,
                  content: `**Raw Agent Response (JSON parse failed):**\n\n${result.text}`,
                  isError: true,
                });
                throw new Error("Could not parse JSON from agent response - invalid JSON format");
              }
            } else {
              // Save the raw response so user can see what the agent returned
              await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
                sessionId: args.sessionId,
                content: `**Raw Agent Response (no JSON found):**\n\n${result.text}`,
                isError: true,
              });
              throw new Error("Could not parse JSON from agent response");
            }
          }
          
          if (!parsed.search_metadata || !parsed.procurement_links) {
            // Save the raw response so user can see what the agent returned
            await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
              sessionId: args.sessionId,
              content: `**Raw Agent Response (missing required fields):**\n\n${result.text}`,
              isError: true,
            });
            throw new Error("Invalid response structure from Agent");
          }

          if (!parsed.search_metadata.timestamp) {
            parsed.search_metadata.timestamp = new Date().toISOString();
          }

          const summaryContent = `Found ${parsed.search_metadata.count_found} procurement links for: ${parsed.search_metadata.target_regions.join(', ')}`;
          
          await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
            sessionId: args.sessionId,
            content: summaryContent,
            responseData: parsed,
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
            assistantResponse: summaryContent,
            model: PROCUREMENT_CHAT_MODEL,
            provider: "openai",
            requestTokens,
            responseTokens,
            latencyMs,
            isError: false,
          });

          return parsed;
        } catch (threadError) {
          // Check if error is due to corrupted/invalid thread ID
          const errorMessage = threadError instanceof Error ? threadError.message : String(threadError);
          if (errorMessage.includes('does not match the table') || 
              errorMessage.includes('embeddings') ||
              errorMessage.includes('threads')) {
            console.log("Detected corrupted threadId, clearing and creating new thread");
            // Clear the corrupted thread ID
            await ctx.runMutation(internal.procurementChatSessions.updateThreadId, {
              sessionId: args.sessionId,
              threadId: "", // Clear the corrupted ID
            });
            needsNewThread = true;
          } else {
            // Re-throw if it's a different error
            throw threadError;
          }
        }
      }
      
      // Create a new thread if needed
      if (needsNewThread) {
        const { threadId: newThreadId } = await procurementAgent.createThread(ctx);
        threadId = newThreadId;
        
        // Store the threadId in the session for future use
        await ctx.runMutation(internal.procurementChatSessions.updateThreadId, {
          sessionId: args.sessionId,
          threadId: threadId,
        });
      } else {
        threadId = session.threadId!;
      }
      
      const result = await procurementAgent.generateText(ctx, { threadId }, { prompt: args.prompt });

      // Parse the structured response
      // The agent should return JSON, but we need to extract it from the text
      let parsed;
      try {
        // Try to parse as JSON directly
        parsed = JSON.parse(result.text);
      } catch (parseError) {
        // If not JSON, try to extract JSON from markdown code blocks or text
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (innerError) {
            console.error("Failed to parse extracted JSON:", jsonMatch[0].substring(0, 500));
            // Save the raw response so user can see what the agent returned
            await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
              sessionId: args.sessionId,
              content: `**Raw Agent Response (JSON parse failed):**\n\n${result.text}`,
              isError: true,
            });
            throw new Error("Could not parse JSON from agent response - invalid JSON format");
          }
        } else {
          // Log what the agent actually returned for debugging
          console.error("Agent did not return JSON. Response text:", result.text);
          // Save the raw response so user can see what the agent returned
          await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
            sessionId: args.sessionId,
            content: `**Raw Agent Response (no JSON found):**\n\n${result.text}`,
            isError: true,
          });
          throw new Error("Could not parse JSON from agent response - no JSON found in response");
        }
      }
      
      if (!parsed.search_metadata || !parsed.procurement_links) {
        // Save the raw response so user can see what the agent returned
        await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
          sessionId: args.sessionId,
          content: `**Raw Agent Response (missing required fields):**\n\n${result.text}`,
          isError: true,
        });
        throw new Error("Invalid response structure from Agent");
      }

      // Ensure timestamp is set if not provided
      if (!parsed.search_metadata.timestamp) {
        parsed.search_metadata.timestamp = new Date().toISOString();
      }

      // Save the assistant response to the session
      const summaryContent = `Found ${parsed.search_metadata.count_found} procurement links for: ${parsed.search_metadata.target_regions.join(', ')}`;
      
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: summaryContent,
        responseData: parsed,
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
        assistantResponse: summaryContent,
        model: PROCUREMENT_CHAT_MODEL,
        provider: "openai",
        requestTokens,
        responseTokens,
        latencyMs,
        isError: false,
      });

      return parsed;
    } catch (error) {
      console.error("Error in fetchAndSaveProcurementLinks:", error);
      const latencyMs = Date.now() - startTime;
      const errorMessage = `Failed to fetch procurement links: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Save error message to session
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: errorMessage,
        isError: true,
      });

      // Record error analytics
      // Try to get session for userId
      try {
        const session = await ctx.runQuery(internal.procurementChatSessions.getSessionInternal, {
          sessionId: args.sessionId,
        });
        
        if (session) {
          await ctx.runMutation(internal.procurementChatAnalytics.recordAnalytics, {
            sessionId: args.sessionId,
            userId: session.userId,
            userPrompt: args.prompt,
            assistantResponse: "",
            model: PROCUREMENT_CHAT_MODEL,
            provider: "openai",
            requestTokens: 0,
            responseTokens: 0,
            latencyMs,
            isError: true,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } catch (analyticsError) {
        console.error("Failed to record error analytics:", analyticsError);
      }
      
      throw new Error(errorMessage);
    }
  },
});
