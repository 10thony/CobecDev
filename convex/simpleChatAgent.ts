"use node";

import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components, internal } from "./_generated/api";
import { DEFAULT_SYSTEM_PROMPT } from "./procurementChatSystemPrompts";

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
 * Gets the primary system prompt from the database or returns the default.
 * This function should be called from an action context.
 */
export async function getPrimarySystemPrompt(ctx: any): Promise<string> {
  const primaryPrompt = await ctx.runQuery(
    internal.procurementChatSystemPrompts.getPrimaryInternal,
    {}
  );
  return primaryPrompt?.systemPromptText || DEFAULT_SYSTEM_PROMPT;
}
