"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";

// Model to use for lead hunting
const LEAD_HUNT_MODEL = "gpt-4o-mini";

/**
 * Check if a URL appears to be generic/non-specific
 */
function isGenericUrl(url: string): boolean {
  if (!url) return true;
  const lowerUrl = url.toLowerCase();
  
  // Common generic patterns
  const genericPatterns = [
    /^https?:\/\/[^\/]+\/?$/, // Just domain, no path
    /\/procurement\/?$/, // Just /procurement
    /\/bids\/?$/, // Just /bids
    /\/rfp\/?$/, // Just /rfp
    /\/opportunities\/?$/, // Just /opportunities
    /example\.(gov|com|org)/, // Example domains
  ];
  
  return genericPatterns.some(pattern => pattern.test(lowerUrl));
}

/**
 * Enhance a source URL to be more specific to the lead
 */
function enhanceSourceUrl(originalUrl: string, leadData: any): string {
  if (!originalUrl) return originalUrl;
  
  try {
    const url = new URL(originalUrl);
    const path = url.pathname;
    
    // If URL is just the domain or generic path, try to make it more specific
    if (isGenericUrl(originalUrl)) {
      // Try to construct a more specific URL based on lead data
      const contractId = leadData.contractID;
      const title = leadData.opportunityTitle;
      
      // If we have a contract ID, try to append it
      if (contractId) {
        const cleanContractId = contractId.replace(/[^a-zA-Z0-9\-_]/g, '-').toLowerCase();
        // Append to path if it's a generic path
        if (path === '/' || path === '/procurement' || path === '/bids' || path === '/rfp') {
          return `${url.origin}${path}${path.endsWith('/') ? '' : '/'}${cleanContractId}`;
        }
      }
      
      // If we have a title, try to create a slug
      if (title && !contractId) {
        const titleSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 50); // Limit length
        if (titleSlug) {
          if (path === '/' || path === '/procurement' || path === '/bids' || path === '/rfp') {
            return `${url.origin}${path}${path.endsWith('/') ? '' : '/'}${titleSlug}`;
          }
        }
      }
    }
    
    return originalUrl;
  } catch (e) {
    // If URL parsing fails, return original
    return originalUrl;
  }
}

/**
 * Generate a default URL when none is provided
 */
function generateDefaultUrl(leadData: any, state: string): string {
  // Try to construct a reasonable default URL based on lead data
  const issuingBody = leadData.issuingBody?.name || '';
  const city = leadData.location?.city || '';
  const region = leadData.location?.region || state;
  
  // Try to construct a .gov URL based on city or state
  if (city) {
    const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return `https://www.${citySlug}.gov/procurement`;
  } else if (region) {
    const stateSlug = region.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return `https://www.${stateSlug}.gov/procurement`;
  }
  
  // Fallback
  return `https://example.gov/procurement`;
}

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
  handler: async (ctx, args): Promise<{
    count: number;
    leadIds: any[];
  }> => {
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

    // Filter out leads with missing required fields
    const validLeads = leadsArray.filter((leadData) => {
      if (!leadData.opportunityTitle || !leadData.location?.region) {
        console.warn("Skipping lead with missing required fields:", leadData);
        return false;
      }
      return true;
    });

    if (validLeads.length === 0) {
      return {
        count: 0,
        leadIds: [],
      };
    }

    // Validate and enhance source URLs to ensure uniqueness
    const urlCounts = new Map<string, number>();
    const urlToLeads = new Map<string, any[]>();
    
    // First pass: collect all URLs and identify duplicates
    validLeads.forEach((leadData, index) => {
      const sourceUrl = leadData.source?.url || '';
      if (sourceUrl) {
        const normalizedUrl = sourceUrl.toLowerCase().trim();
        urlCounts.set(normalizedUrl, (urlCounts.get(normalizedUrl) || 0) + 1);
        if (!urlToLeads.has(normalizedUrl)) {
          urlToLeads.set(normalizedUrl, []);
        }
        urlToLeads.get(normalizedUrl)!.push({ leadData, index });
      }
    });

    // Identify duplicate URLs
    const duplicateUrls: string[] = Array.from(urlCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([url, _]) => url);

    if (duplicateUrls.length > 0) {
      console.warn(`⚠️ Found ${duplicateUrls.length} duplicate source URLs across leads:`, duplicateUrls);
      duplicateUrls.forEach(dupUrl => {
        const leadsWithUrl = urlToLeads.get(dupUrl) || [];
        console.warn(`  - URL "${dupUrl}" appears in ${leadsWithUrl.length} leads:`, 
          leadsWithUrl.map(l => l.leadData.opportunityTitle || `Lead ${l.index + 1}`));
      });
    }

    // Enhance leads with better URLs if they're duplicates or generic
    const enhancedLeads = validLeads.map((leadData, index) => {
      const sourceUrl = leadData.source?.url || '';
      let enhancedUrl = sourceUrl;
      
      if (sourceUrl) {
        const normalizedUrl = sourceUrl.toLowerCase().trim();
        const isDuplicate = duplicateUrls.includes(normalizedUrl);
        
        // If URL is duplicate or appears generic, try to enhance it
        if (isDuplicate || isGenericUrl(sourceUrl)) {
          enhancedUrl = enhanceSourceUrl(sourceUrl, leadData);
          if (enhancedUrl !== sourceUrl) {
            console.log(`Enhanced URL for lead "${leadData.opportunityTitle}": ${sourceUrl} → ${enhancedUrl}`);
          }
        }
      } else {
        // If no URL provided, generate a reasonable default based on lead data
        enhancedUrl = generateDefaultUrl(leadData, workflow.state);
        console.log(`Generated default URL for lead "${leadData.opportunityTitle}": ${enhancedUrl}`);
      }

      return {
        ...leadData,
        source: {
          ...leadData.source,
          url: enhancedUrl,
          documentName: leadData.source?.documentName || "AI Generated Lead",
        },
      };
    });

    // Add leadHuntWorkflowId to each lead and ensure region is set
    const leadsWithWorkflowId = enhancedLeads.map((leadData) => ({
      ...leadData,
      leadHuntWorkflowId: args.workflowRecordId,
      // Ensure region is set (use workflow state as fallback)
      location: {
        ...leadData.location,
        region: leadData.location?.region || workflow.state,
      },
    }));

    // Use the JSON import system with schema evolution
    // This will handle unexpected fields gracefully and adjust the schema automatically
    const importResult: {
      success: boolean;
      importedCount: number;
      skippedCount: number;
      leadIds: any[];
      schemaChanges: string[];
      duplicates?: {
        skipped: number;
        skippedDetails: Array<{ title: string; reason: string }>;
      };
      promptUpdates?: {
        statesProcessed: string[];
        promptsUpdated: number;
        errors: string[];
      };
    } = await ctx.runAction(api.leadsActions.importJsonWithSchemaEvolution, {
      jsonData: leadsWithWorkflowId,
      sourceFile: `lead_hunt_workflow_${args.workflowRecordId}`,
    });

    // Update workflow with URL validation results
    if (duplicateUrls.length > 0) {
      const warningMessage = `⚠️ Warning: ${duplicateUrls.length} duplicate source URL(s) detected and enhanced. Please review leads to ensure URLs are correct.`;
      await ctx.runMutation(internal.leadHuntWorkflows.updateStatus, {
        workflowRecordId: args.workflowRecordId,
        currentTask: warningMessage,
      });
      console.warn(`Workflow ${args.workflowRecordId}: ${warningMessage}`);
    }

    return {
      count: importResult.importedCount,
      leadIds: importResult.leadIds,
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
