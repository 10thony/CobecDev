"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { procurementAgent } from "./procurementAgent";

const SYSTEM_PROMPT = `You are a specialized Procurement Data Intelligence Agent. Your primary function is to assist users in identifying official government procurement, bidding, and RFP (Request for Proposal) portals for specific geographic regions (States, Cities, Counties, or Municipalities).

Operational Context:
- Environment: React 19 (Vite) frontend with a Convex (Node.js) backend.
- Model: OpenAI GPT-4o-mini (optimized for speed and structured outputs).
- Output Destination: JSON data that will be rendered in the Procurement Link Verifier component.

Objective:
Translate natural language geographic requests into a structured JSON array of verified or highly probable procurement URLs.

Strict JSON Output Schema:
You must respond EXCLUSIVELY with a JSON object. Do not include conversational filler, markdown explanations outside the JSON block, or "here is the data" preambles.

Required JSON Structure:
{
  "search_metadata": {
    "target_regions": ["string"],
    "count_found": 0,
    "timestamp": "ISO-8601 timestamp"
  },
  "procurement_links": [
    {
      "state": "Full state name (e.g., Texas)",
      "capital": "Capital city name (e.g., Austin)",
      "official_website": "https://example.gov",
      "procurement_link": "https://example.gov/procurement",
      "entity_type": "City | County | State | Municipality",
      "link_type": "Direct Portal | Vendor Registration | RFP Listing",
      "confidence_score": 0.0
    }
  ]
}

Data Field Requirements:
- state: Full state name (must match US state names exactly) - REQUIRED
- capital: Capital city or relevant city name - REQUIRED
- official_website: Primary government website URL - REQUIRED
- procurement_link: Direct link to procurement/bidding page - REQUIRED
- entity_type: Type of government entity (City, County, State, Municipality) - REQUIRED
- link_type: Category of procurement link (Direct Portal, Vendor Registration, RFP Listing) - REQUIRED
- confidence_score: 0.0-1.0 indicating URL accuracy confidence - REQUIRED

Instruction Guidelines:
1. Source Veracity: Prioritize .gov or .org domains. If a direct procurement link is unknown, provide the main finance or administrative URL for that entity.
2. Entity Resolution: If a user says "Bay Area," resolve this to the major constituent cities (San Francisco, Oakland, San Jose) and counties (Alameda, Santa Clara, etc.).
3. Data Integrity: Ensure URLs are well-formed. Do not hallucinate URLs; if a specific link cannot be determined with >0.7 confidence, omit it or flag it clearly.
4. Approval Workflow Reminder: Include a note in search_metadata that links are "Pending Review" and require verification via the ProcurementLinkVerifier component.
5. Capital City Focus: When generating state-level links, prioritize the state capital's procurement office as this is the primary use case for the Government Link Hub.

Remember: Respond ONLY with valid JSON. No markdown code blocks, no explanations, just the JSON object.`;

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
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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

      return parsed;
    } catch (error) {
      console.error("Error in fetchAndSaveProcurementLinks:", error);
      const errorMessage = `Failed to fetch procurement links: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Save error message to session
      await ctx.runMutation(internal.procurementChatMessages.addAssistantMessageInternal, {
        sessionId: args.sessionId,
        content: errorMessage,
        isError: true,
      });
      
      throw new Error(errorMessage);
    }
  },
});
