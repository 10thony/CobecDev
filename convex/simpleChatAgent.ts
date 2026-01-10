"use node";

import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components, internal } from "./_generated/api";
import { DEFAULT_SYSTEM_PROMPT } from "./chatSystemPrompts";

// Type for the approved link structure from lookup table
interface ApprovedLink {
  state: string;
  capital: string;
  officialWebsite: string;
  procurementLink: string;
  entityType: string | null;
  linkType: string | null;
  requiresRegistration: boolean | null;
}

/**
 * Creates a simple chat agent with the provided system prompt.
 * @param systemPrompt - The system prompt to use for the agent
 * @returns A configured Agent instance
 */
export function createSimpleChatAgent(systemPrompt: string): Agent {
  return new Agent(components.agent, {
    name: "Procurement Chat Assistant",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: systemPrompt,
    // No tools for MVP - just plain chat
  });
}

/**
 * Gets a system prompt by ID from the database or returns the default.
 * Optionally injects approved procurement links based on user message context.
 * 
 * This function should be called from an action context.
 * 
 * @param ctx - The action context
 * @param promptId - Optional ID of the system prompt to use. If not provided, uses primary prompt.
 * @param userMessage - Optional user message for state detection
 */
export async function getSystemPrompt(
  ctx: any,
  promptId?: string | null,
  userMessage?: string
): Promise<string> {
  // If promptId is explicitly null, return empty string (no prompt)
  if (promptId === null) {
    return "";
  }
  
  let basePrompt = DEFAULT_SYSTEM_PROMPT;
  
  if (promptId) {
    // Get the specific prompt by ID
    const selectedPrompt = await ctx.runQuery(
      internal.chatSystemPrompts.getByIdInternal,
      { id: promptId as any }
    );
    if (selectedPrompt) {
      basePrompt = selectedPrompt.systemPromptText;
    }
  } else {
    // promptId is undefined - use primary system prompt from database
    const primaryPrompt = await ctx.runQuery(
      internal.chatSystemPrompts.getPrimaryInternal,
      {}
    );
    basePrompt = primaryPrompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;
  }
  
  // Get approved procurement links from the lookup table
  let approvedLinks: ApprovedLink[] = [];
  try {
    // Type assertion needed until Convex regenerates API types for the new file
    approvedLinks = await ctx.runQuery(
      (internal as any).approvedProcurementLinksLookup.getApprovedLinksForPromptInternal,
      {}
    );
  } catch (error) {
    // If the lookup table doesn't exist yet, continue without approved links
    console.warn("Could not fetch approved links (lookup may not be initialized):", error);
    approvedLinks = [];
  }
  
  // If we have approved links, inject them into the prompt
  if (approvedLinks && approvedLinks.length > 0) {
    // Detect target state from user message (if provided)
    const targetState = detectStateFromMessage(userMessage);
    
    const linksSection = formatApprovedLinksForPrompt(
      approvedLinks,
      targetState
    );
    basePrompt = injectApprovedLinksIntoPrompt(basePrompt, linksSection);
  }
  
  return basePrompt;
}

/**
 * Detect state name from user message (simple keyword matching)
 * Returns state name if detected, null otherwise
 */
function detectStateFromMessage(message?: string): string | null {
  if (!message) return null;
  
  const messageLower = message.toLowerCase();
  
  // List of US states for matching
  const states = [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
    "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
    "maine", "maryland", "massachusetts", "michigan", "minnesota",
    "mississippi", "missouri", "montana", "nebraska", "nevada",
    "new hampshire", "new jersey", "new mexico", "new york",
    "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
    "pennsylvania", "rhode island", "south carolina", "south dakota",
    "tennessee", "texas", "utah", "vermont", "virginia", "washington",
    "west virginia", "wisconsin", "wyoming"
  ];
  
  for (const state of states) {
    if (messageLower.includes(state)) {
      // Capitalize first letter of each word
      return state
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }
  
  return null;
}

/**
 * Format approved links into a readable section for the system prompt
 * @param links - Array of approved procurement links
 * @param targetState - Optional state name to filter links (if user asked for specific state)
 */
function formatApprovedLinksForPrompt(
  links: ApprovedLink[],
  targetState?: string | null
): string {
  if (links.length === 0) return "";
  
  // Filter links by target state if specified
  let filteredLinks = links;
  if (targetState) {
    filteredLinks = links.filter(
      link => link.state.toLowerCase() === targetState.toLowerCase()
    );
  }
  
  // If no state filter and we have many links, show summary only
  if (!targetState && filteredLinks.length > 20) {
    // Group by state and show summary
    const byState: Record<string, number> = {};
    for (const link of filteredLinks) {
      byState[link.state] = (byState[link.state] || 0) + 1;
    }
    
    let formatted = "\n\n## ALREADY APPROVED PROCUREMENT LINKS\n";
    formatted += `We have ${filteredLinks.length} approved procurement links across ${Object.keys(byState).length} states. `;
    formatted += "DO NOT suggest links that are already in our system.\n\n";
    formatted += "**States with approved links:**\n";
    
    // Sort states alphabetically
    const sortedStates = Object.keys(byState).sort();
    for (const state of sortedStates) {
      const count = byState[state];
      formatted += `- ${state}: ${count} link${count > 1 ? 's' : ''}\n`;
    }
    
    formatted += "\nCRITICAL: Before suggesting any procurement link, check if we already have it. ";
    formatted += "If the link already exists in our system, acknowledge that it's already collected.\n";
    
    return formatted;
  }
  
  // If we have a specific state or fewer than 20 links, show full details
  // Group by state for better organization
  const byState: Record<string, ApprovedLink[]> = {};
  for (const link of filteredLinks) {
    if (!byState[link.state]) {
      byState[link.state] = [];
    }
    byState[link.state].push(link);
  }
  
  let formatted = "\n\n## ALREADY APPROVED PROCUREMENT LINKS\n";
  if (targetState && filteredLinks.length > 0) {
    formatted += `The following procurement links for **${targetState}** have already been collected and approved in our system. `;
  } else if (filteredLinks.length > 0) {
    formatted += "The following procurement links have already been collected and approved in our system. ";
  } else {
    // No links found for the target state
    formatted += `No approved procurement links found for **${targetState}** yet. `;
    formatted += "You may suggest new links for this state.\n";
    return formatted;
  }
  formatted += "DO NOT suggest these links again. If a user requests a link for one of these locations, ";
  formatted += "inform them that we already have it in our system.\n\n";
  
  // Sort states alphabetically
  const sortedStates = Object.keys(byState).sort();
  for (const state of sortedStates) {
    const stateLinks = byState[state];
    formatted += `### ${state}\n`;
    for (const link of stateLinks) {
      formatted += `- **${link.capital}**: ${link.procurementLink}`;
      if (link.requiresRegistration) {
        formatted += " (Requires Registration)";
      }
      formatted += "\n";
    }
    formatted += "\n";
  }
  
  formatted += "CRITICAL: Before suggesting any procurement link, check this list. ";
  formatted += "If the link already exists here, do NOT include it in your response. ";
  formatted += "Instead, acknowledge that the link is already in our system.\n";
  
  return formatted;
}

/**
 * Inject approved links section into the system prompt
 */
function injectApprovedLinksIntoPrompt(basePrompt: string, linksSection: string): string {
  if (!linksSection) return basePrompt;
  
  // Insert the links section before the final "Remember:" instruction
  const rememberIndex = basePrompt.lastIndexOf("Remember:");
  
  if (rememberIndex !== -1) {
    return basePrompt.slice(0, rememberIndex) + linksSection + "\n\n" + basePrompt.slice(rememberIndex);
  }
  
  // If "Remember:" not found, append at the end
  return basePrompt + linksSection;
}
