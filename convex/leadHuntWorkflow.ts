import { v } from "convex/values";
import { internal } from "./_generated/api";
import { resumeEvent } from "./leadHuntEvents";
import { workflow } from "./workflowManager";

export const huntLeads = workflow.define({
  args: {
    workflowRecordId: v.id("leadHuntWorkflows"),
    state: v.string(),
    userInput: v.string(),
    systemPromptId: v.optional(v.id("chatSystemPrompts")),
  },
  returns: v.object({
    success: v.boolean(),
    leadsFound: v.number(),
    message: v.string(),
  }),
  handler: async (step, args): Promise<{ success: boolean; leadsFound: number; message: string }> => {
    // Step 1: Update status to running
    await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
      workflowRecordId: args.workflowRecordId,
      status: "running",
      currentTask: "Fetching system prompt",
      currentStep: 1,
      totalSteps: 4,
    });

    // Step 2: Get the Lead system prompt
    const leadPrompt: { systemPromptText: string } | null = await step.runQuery(
      internal.chatSystemPrompts.getDefaultLeadPromptInternal,
      {}
    );

    if (!leadPrompt) {
      await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
        workflowRecordId: args.workflowRecordId,
        status: "failed",
        currentTask: "Failed: No Lead system prompt found",
      });
      throw new Error("No Lead system prompt found");
    }

    // Check for cancellation before proceeding
    const checkCancel1 = await step.runQuery(
      internal.leadHuntWorkflows.getWorkflowRecord,
      { workflowRecordId: args.workflowRecordId }
    );
    if (checkCancel1?.status === "canceled") {
      return {
        success: false,
        leadsFound: 0,
        message: "Workflow was canceled",
      };
    }

    // Step 3: Construct the full prompt
    const systemPrompt: string = leadPrompt.systemPromptText;
    const userPrompt = `Find procurement leads in ${args.state}. ${args.userInput}`;

    // Store system prompt for display
    await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
      workflowRecordId: args.workflowRecordId,
      systemPromptText: systemPrompt,
      userPromptText: userPrompt,
    });

    // Step 4: Call OpenAI
    await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
      workflowRecordId: args.workflowRecordId,
      currentTask: "Searching for leads using AI",
      currentStep: 2,
    });

    // Check for cancellation before OpenAI call
    const checkCancel2 = await step.runQuery(
      internal.leadHuntWorkflows.getWorkflowRecord,
      { workflowRecordId: args.workflowRecordId }
    );
    if (checkCancel2?.status === "canceled") {
      return {
        success: false,
        leadsFound: 0,
        message: "Workflow was canceled",
      };
    }

    let aiResponse;
    let rawResponseText = '';
    try {
      aiResponse = await step.runAction(internal.leadHuntActions.callOpenAIForLeads, {
        systemPrompt,
        userPrompt,
      });
      
      // Extract raw content from response - handle both success and error cases
      if (typeof aiResponse === 'object' && aiResponse !== null) {
        if ('rawContent' in aiResponse && aiResponse.rawContent) {
          rawResponseText = aiResponse.rawContent;
        } else if ('parsed' in aiResponse) {
          // If we have parsed but no rawContent, stringify the whole response
          rawResponseText = JSON.stringify(aiResponse, null, 2);
        } else {
          // Fallback: stringify the whole response
          rawResponseText = JSON.stringify(aiResponse, null, 2);
        }
      } else {
        // If it's not an object, stringify it
        rawResponseText = JSON.stringify(aiResponse, null, 2);
      }
      
      // Always store the raw AI response for debugging
      await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
        workflowRecordId: args.workflowRecordId,
        rawAiResponse: rawResponseText || 'No response content available',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
        workflowRecordId: args.workflowRecordId,
        status: "failed",
        currentTask: `Failed: ${errorMessage}`,
        rawAiResponse: `Error occurred: ${errorMessage}\n\nNo AI response was received due to the error above.`,
      });
      throw error;
    }

    // Check for cancellation after OpenAI call
    const checkCancel3 = await step.runQuery(
      internal.leadHuntWorkflows.getWorkflowRecord,
      { workflowRecordId: args.workflowRecordId }
    );
    if (checkCancel3?.status === "canceled") {
      return {
        success: false,
        leadsFound: 0,
        message: "Workflow was canceled",
      };
    }

    // Step 5: Parse and store leads
    await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
      workflowRecordId: args.workflowRecordId,
      currentTask: "Processing and storing leads",
      currentStep: 3,
    });

    // Check for cancellation before storing leads
    const checkCancel4 = await step.runQuery(
      internal.leadHuntWorkflows.getWorkflowRecord,
      { workflowRecordId: args.workflowRecordId }
    );
    if (checkCancel4?.status === "canceled") {
      return {
        success: false,
        leadsFound: 0,
        message: "Workflow was canceled",
      };
    }

    let storedLeads;
    try {
      // Extract parsed response or use the response directly
      // If parsing succeeded, pass just the parsed content (which should have 'leads' or 'procurement_links')
      // If parsing failed, pass the whole response object so storeLeadsFromResponse can handle it
      let responseToStore: any;
      
      if (typeof aiResponse === 'object' && aiResponse !== null && 'parsed' in aiResponse) {
        // Check if parsed exists and is not null/undefined
        if (aiResponse.parsed !== null && aiResponse.parsed !== undefined) {
          // If parsed is a string, try to parse it (shouldn't happen, but just in case)
          if (typeof aiResponse.parsed === 'string') {
            try {
              responseToStore = JSON.parse(aiResponse.parsed);
              console.log("Parsed string response. Keys:", Object.keys(responseToStore));
            } catch (e) {
              console.error("Failed to parse string response:", e);
              responseToStore = aiResponse;
            }
          } else {
            responseToStore = aiResponse.parsed;  // Pass just the parsed content
            console.log("Using parsed response. Keys:", Object.keys(aiResponse.parsed));
          }
        } else {
          // Parsed is null/undefined, but we have rawContent - try to extract from it
          if (aiResponse.rawContent && typeof aiResponse.rawContent === 'string') {
            try {
              const extracted = JSON.parse(aiResponse.rawContent);
              responseToStore = extracted;
              console.log("Extracted from rawContent. Keys:", Object.keys(extracted));
            } catch (e) {
              // Try to find JSON in rawContent
              const jsonMatch = aiResponse.rawContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  responseToStore = JSON.parse(jsonMatch[0]);
                  console.log("Extracted JSON from rawContent. Keys:", Object.keys(responseToStore));
                } catch (e2) {
                  console.error("Failed to parse extracted JSON:", e2);
                  responseToStore = aiResponse;
                }
              } else {
                responseToStore = aiResponse;
                console.log("Could not extract JSON from rawContent, using full response object");
              }
            }
          } else {
            responseToStore = aiResponse;
            console.log("Parsed is null/undefined and no rawContent, using full response object");
          }
        }
      } else {
        // Response is not in expected format, pass as-is
        responseToStore = aiResponse;
        console.log("Response not in expected format, passing as-is");
      }
      
      // Log what we're about to send for debugging
      console.log("Sending to storeLeadsFromResponse:", {
        type: typeof responseToStore,
        hasLeads: responseToStore?.leads ? true : false,
        hasProcurementLinks: responseToStore?.procurement_links ? true : false,
        keys: typeof responseToStore === 'object' && responseToStore !== null ? Object.keys(responseToStore) : 'N/A',
      });
        
      storedLeads = await step.runAction(
        internal.leadHuntActions.storeLeadsFromResponse,
        {
          workflowRecordId: args.workflowRecordId,
          aiResponse: responseToStore,
        }
      );
      
      // If no leads were stored and we have a parse error, update status to show this
      if (storedLeads.count === 0 && typeof aiResponse === 'object' && aiResponse.parseError) {
        await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
          workflowRecordId: args.workflowRecordId,
          currentTask: `Warning: Could not parse AI response. Check raw response below.`,
        });
      }
    } catch (error) {
      await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
        workflowRecordId: args.workflowRecordId,
        status: "failed",
        currentTask: `Failed to store leads: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      throw error;
    }

    // Step 6: Pause workflow and wait for user review
    await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
      workflowRecordId: args.workflowRecordId,
      status: "paused",
      currentTask: "Waiting for user review",
      currentStep: 4,
      leadsPendingReview: storedLeads.leadIds,
      leadsFound: storedLeads.count,
    });

    // Wait for resume event (triggered when user clicks "Continue" or reviews all leads)
    await step.awaitEvent(resumeEvent);

    // Step 7: Check if workflow was canceled
    const workflowRecord = await step.runQuery(
      internal.leadHuntWorkflows.getWorkflowRecord,
      { workflowRecordId: args.workflowRecordId }
    );

    if (!workflowRecord) {
      return {
        success: false,
        leadsFound: storedLeads.count,
        message: "Workflow record not found",
      };
    }

    if (workflowRecord.status === "canceled") {
      return {
        success: false,
        leadsFound: storedLeads.count,
        message: "Workflow was canceled",
      };
    }

    // Step 8: Mark as completed
    await step.runMutation(internal.leadHuntWorkflows.updateStatus, {
      workflowRecordId: args.workflowRecordId,
      status: "completed",
      currentTask: "Complete",
      completedAt: Date.now(),
    });

    return {
      success: true,
      leadsFound: storedLeads.count,
      message: `Successfully found ${storedLeads.count} leads`,
    };
  },
});
