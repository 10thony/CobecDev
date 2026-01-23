"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";

// Model to use for lead hunting
const LEAD_HUNT_MODEL = "gpt-4o-mini";

// Call OpenAI API for lead generation
export const callOpenAIForLeads = internalAction({
  args: {
    systemPrompt: v.string(),
    userPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable not set. Please set it in your Convex dashboard under Settings > Environment Variables."
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    try {
      const response = await openai.chat.completions.create({
        model: LEAD_HUNT_MODEL,
        messages: [
          { role: "system", content: args.systemPrompt },
          { role: "user", content: args.userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent outputs
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // Return both raw content and parsed (null) so we can debug
          return {
            parsed: null,
            rawContent: content,
            parseError: parseError instanceof Error ? parseError.message : "Could not parse JSON from OpenAI response",
          };
        }
      }

      return {
        parsed: parsed,
        rawContent: content,
      };
    } catch (error) {
      console.error("Error in callOpenAIForLeads:", error);
      throw new Error(
        `Failed to fetch leads from OpenAI: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },
});

// Store leads from AI response
export const storeLeadsFromResponse = internalAction({
  args: {
    workflowRecordId: v.id("leadHuntWorkflows"),
    aiResponse: v.any(), // Flexible JSON structure
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.runQuery(
      internal.leadHuntWorkflows.getWorkflowRecord,
      { workflowRecordId: args.workflowRecordId }
    );

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Log what we received for debugging
    console.log("storeLeadsFromResponse received:", {
      type: typeof args.aiResponse,
      isNull: args.aiResponse === null,
      isArray: Array.isArray(args.aiResponse),
      keys: typeof args.aiResponse === 'object' && args.aiResponse !== null ? Object.keys(args.aiResponse) : 'N/A',
      hasLeads: args.aiResponse?.leads ? true : false,
      hasProcurementLinks: args.aiResponse?.procurement_links ? true : false,
      hasParseError: args.aiResponse?.parseError ? true : false,
    });

    // Parse the AI response - expect either { leads: [...] } or { procurement_links: [...] }
    let leadsArray: any[] = [];

    // Handle case where response might have parseError
    if (args.aiResponse && typeof args.aiResponse === 'object' && 'parseError' in args.aiResponse && args.aiResponse.parseError) {
      console.error("AI Response Parse Error:", args.aiResponse.parseError);
      console.error("Raw Content:", args.aiResponse.rawContent);
      // Still try to extract leads if possible
      if (args.aiResponse.rawContent) {
        // Try to find JSON in the raw content
        const jsonMatch = args.aiResponse.rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.leads && Array.isArray(parsed.leads)) {
              leadsArray = parsed.leads;
            } else if (parsed.procurement_links && Array.isArray(parsed.procurement_links)) {
              // Convert procurement links to leads format
              leadsArray = parsed.procurement_links.map((link: any) => ({
                opportunityType: "RFP",
                opportunityTitle: `Procurement Opportunity in ${link.capital || link.state}`,
                location: {
                  region: link.state,
                  city: link.capital,
                },
                issuingBody: {
                  name: link.entity_type || "Government Entity",
                  level: link.entity_type || "Unknown",
                },
                status: "Open for Bidding",
                source: {
                  documentName: "AI Generated Lead",
                  url: link.procurement_link || link.official_website,
                },
                contacts: [],
                summary: `Procurement opportunity found in ${link.capital || link.state}. Link: ${link.procurement_link || link.official_website}`,
              }));
            }
          } catch (e) {
            console.error("Failed to parse extracted JSON:", e);
          }
        }
      }
      // If we couldn't extract leads, return empty array but don't throw
      return {
        count: 0,
        leadIds: [],
      };
    }

    // First, check if we have the expected structure directly
    if (args.aiResponse && typeof args.aiResponse === 'object' && args.aiResponse.leads && Array.isArray(args.aiResponse.leads)) {
      leadsArray = args.aiResponse.leads;
    } else if (
      args.aiResponse &&
      typeof args.aiResponse === 'object' &&
      args.aiResponse.procurement_links &&
      Array.isArray(args.aiResponse.procurement_links)
    ) {
      // If it's procurement links format, we need to convert them to leads
      // This is a fallback for compatibility
      leadsArray = args.aiResponse.procurement_links.map((link: any) => ({
        opportunityType: "RFP",
        opportunityTitle: `Procurement Opportunity in ${link.capital || link.state}`,
        location: {
          region: link.state,
          city: link.capital,
        },
        issuingBody: {
          name: link.entity_type || "Government Entity",
          level: link.entity_type || "Unknown",
        },
        status: "Open for Bidding",
        source: {
          documentName: "AI Generated Lead",
          url: link.procurement_link || link.official_website,
        },
        contacts: [],
        summary: `Procurement opportunity found in ${link.capital || link.state}. Link: ${link.procurement_link || link.official_website}`,
      }));
    } else {
      // Last resort: try to extract from rawContent if it exists
      if (args.aiResponse && typeof args.aiResponse === 'object' && 'rawContent' in args.aiResponse && args.aiResponse.rawContent) {
        console.log("Attempting to parse from rawContent as fallback");
        try {
          const parsedFromRaw = JSON.parse(args.aiResponse.rawContent);
          if (parsedFromRaw.leads && Array.isArray(parsedFromRaw.leads)) {
            leadsArray = parsedFromRaw.leads;
            console.log("Successfully extracted leads from rawContent");
          } else if (parsedFromRaw.procurement_links && Array.isArray(parsedFromRaw.procurement_links)) {
            // Convert procurement links to leads format
            leadsArray = parsedFromRaw.procurement_links.map((link: any) => ({
              opportunityType: "RFP",
              opportunityTitle: `Procurement Opportunity in ${link.capital || link.state}`,
              location: {
                region: link.state,
                city: link.capital,
              },
              issuingBody: {
                name: link.entity_type || "Government Entity",
                level: link.entity_type || "Unknown",
              },
              status: "Open for Bidding",
              source: {
                documentName: "AI Generated Lead",
                url: link.procurement_link || link.official_website,
              },
              contacts: [],
              summary: `Procurement opportunity found in ${link.capital || link.state}. Link: ${link.procurement_link || link.official_website}`,
            }));
            console.log("Successfully extracted procurement_links from rawContent");
          } else {
            throw new Error("No leads or procurement_links found in parsed rawContent");
          }
        } catch (parseError) {
          console.error("Failed to parse rawContent:", parseError);
          // Try to extract JSON from rawContent string
          const jsonMatch = args.aiResponse.rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const extracted = JSON.parse(jsonMatch[0]);
              if (extracted.leads && Array.isArray(extracted.leads)) {
                leadsArray = extracted.leads;
                console.log("Successfully extracted leads from rawContent using regex");
              } else if (extracted.procurement_links && Array.isArray(extracted.procurement_links)) {
                // Convert procurement links to leads format
                leadsArray = extracted.procurement_links.map((link: any) => ({
                  opportunityType: "RFP",
                  opportunityTitle: `Procurement Opportunity in ${link.capital || link.state}`,
                  location: {
                    region: link.state,
                    city: link.capital,
                  },
                  issuingBody: {
                    name: link.entity_type || "Government Entity",
                    level: link.entity_type || "Unknown",
                  },
                  status: "Open for Bidding",
                  source: {
                    documentName: "AI Generated Lead",
                    url: link.procurement_link || link.official_website,
                  },
                  contacts: [],
                  summary: `Procurement opportunity found in ${link.capital || link.state}. Link: ${link.procurement_link || link.official_website}`,
                }));
                console.log("Successfully extracted procurement_links from rawContent using regex");
              } else {
                throw new Error("No leads or procurement_links found in extracted JSON");
              }
            } catch (extractError) {
              console.error("Failed to extract JSON from rawContent:", extractError);
              // Fall through to error below
            }
          }
        }
      }
      
      // If we still don't have leads, throw an error
      if (leadsArray.length === 0) {
        // Provide detailed error information for debugging
        const responseKeys = typeof args.aiResponse === 'object' && args.aiResponse !== null
          ? Object.keys(args.aiResponse).join(', ')
          : typeof args.aiResponse;
        const responsePreview = typeof args.aiResponse === 'object' && args.aiResponse !== null
          ? JSON.stringify(args.aiResponse).substring(0, 200)
          : String(args.aiResponse).substring(0, 200);
        
        console.error("Invalid AI response format. Received:", {
          type: typeof args.aiResponse,
          keys: responseKeys,
          preview: responsePreview,
          fullResponse: args.aiResponse,
        });
        
        throw new Error(
          `Invalid AI response format: expected 'leads' or 'procurement_links' array. ` +
          `Received object with keys: ${responseKeys || 'none'}. ` +
          `Preview: ${responsePreview}...`
        );
      }
    }

    const now = Date.now();
    const leadIds: Array<Id<"leads">> = [];
    let validCount = 0;

    for (const leadData of leadsArray) {
      try {
        // Validate required fields
        if (!leadData.opportunityTitle || !leadData.location?.region) {
          console.warn("Skipping lead with missing required fields:", leadData);
          continue;
        }

        // Map the lead data to our schema
        const processedLead = {
          opportunityType: leadData.opportunityType || "Unknown",
          opportunityTitle: leadData.opportunityTitle || "Untitled Opportunity",
          contractID: leadData.contractID || undefined,
          issuingBody: {
            name: leadData.issuingBody?.name || "Unknown Organization",
            level: leadData.issuingBody?.level || "Unknown",
          },
          location: {
            city: leadData.location?.city || undefined,
            county: leadData.location?.county || undefined,
            region: leadData.location?.region || workflow.state,
          },
          status: leadData.status || "Unknown",
          estimatedValueUSD: leadData.estimatedValueUSD || undefined,
          keyDates: {
            publishedDate: leadData.keyDates?.publishedDate || undefined,
            bidDeadline: leadData.keyDates?.bidDeadline || undefined,
            projectedStartDate: leadData.keyDates?.projectedStartDate || undefined,
          },
          source: {
            documentName: leadData.source?.documentName || "AI Generated Lead",
            url: leadData.source?.url || "",
          },
          contacts: Array.isArray(leadData.contacts) ? leadData.contacts : [],
          summary: leadData.summary || "No summary available",
          verificationStatus: leadData.verificationStatus || undefined,
          category: leadData.category || undefined,
          subcategory: leadData.subcategory || undefined,
          searchableText: leadData.searchableText || "",
          isActive: leadData.isActive !== undefined ? leadData.isActive : true,
          lastChecked: now,
        };

        const leadId = await ctx.runMutation(internal.leads.createLeadFromHunt, {
          ...processedLead,
          leadHuntWorkflowId: args.workflowRecordId,
        });
        leadIds.push(leadId);
        validCount++;
      } catch (error) {
        console.error("Error storing lead:", error, leadData);
        // Continue with next lead
      }
    }

    return {
      count: validCount,
      leadIds: leadIds,
    };
  },
});

// Trigger resume event for paused workflows
export const triggerResumeEvent = internalAction({
  args: {
    workflowRecordId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    // The resume event will be handled by the workflow system
    // This action can be used to trigger additional logic if needed
    return { success: true };
  },
});
