"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";
import { z } from "zod/v3";

/**
 * Intelligent HTML parsing agent for extracting table data from complex/nested HTML structures
 * Uses GPT-5-mini to intelligently parse HTML when pandas fails
 */
const htmlParsingAgent = new Agent(components.agent, {
  languageModel: openai.chat("gpt-5-mini"),
  name: "HTML Table Parser",
  instructions: `You are an expert at parsing HTML tables and extracting structured data.

Your task is to analyze HTML content and extract table data into a structured JSON format.

CRITICAL REQUIREMENTS:
1. Look for tables at ANY nesting level - they may be nested inside divs, sections, or other containers
2. Extract ALL table data, including headers and rows
3. Handle complex table structures:
   - Tables with merged cells
   - Nested tables
   - Tables with multiple tbody sections
   - Tables with thead/tfoot sections
4. Preserve all data - don't skip empty cells, use empty strings instead
5. Return data as an array of objects where each object represents a row
6. Use the first row as column headers if <thead> is not present
7. Handle both visible and hidden tables (check display:none, visibility:hidden)

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "success": true,
  "data": [
    {
      "column1": "value1",
      "column2": "value2",
      ...
    },
    ...
  ],
  "rowCount": number,
  "columnCount": number,
  "notes": "Any relevant notes about the parsing"
}

If parsing fails, return:
{
  "success": false,
  "error": "Error description",
  "data": []
}

IMPORTANT: 
- Always return valid JSON
- Don't include markdown code blocks
- Don't include explanatory text outside the JSON
- Extract data from ALL tables found in the HTML`,
});

/**
 * Parse HTML content intelligently using AI agent
 * This is called when pandas parsing fails, typically due to nested table structures
 */
export const parseHtmlIntelligently = action({
  args: {
    htmlContent: v.string(),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    data: any[];
    rowCount: number;
    columnCount: number;
    error?: string;
    notes?: string;
  }> => {
    try {
      // Create a thread for this parsing task
      const { threadId } = await htmlParsingAgent.createThread(ctx);

      // Construct the prompt with the HTML content
      const prompt = `Parse the following HTML content and extract ALL table data into structured JSON format.

HTML Content:
${args.htmlContent.substring(0, 100000)}${args.htmlContent.length > 100000 ? '\n\n[Content truncated - showing first 100k characters]' : ''}

${args.sourceUrl ? `Source URL: ${args.sourceUrl}` : ''}

Extract all table data and return as JSON. Look for tables at any nesting level.`;

      // Generate response using the agent
      const result = await htmlParsingAgent.generateText(
        ctx,
        { threadId },
        { prompt }
      );

      const responseText = result.text || "";

      // Try to extract JSON from the response
      // The agent might wrap JSON in markdown code blocks
      let jsonText = responseText.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Try to find JSON object in the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      // Parse the JSON
      const parsed = JSON.parse(jsonText);

      if (parsed.success === false) {
        return {
          success: false,
          data: [],
          rowCount: 0,
          columnCount: 0,
          error: parsed.error || "Unknown parsing error",
        };
      }

      // Validate and return the parsed data
      const data = Array.isArray(parsed.data) ? parsed.data : [];
      const rowCount = parsed.rowCount || data.length;
      const columnCount = parsed.columnCount || (data.length > 0 ? Object.keys(data[0]).length : 0);

      return {
        success: true,
        data,
        rowCount,
        columnCount,
        notes: parsed.notes,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[parseHtmlIntelligently] Error:", errorMessage);
      
      return {
        success: false,
        data: [],
        rowCount: 0,
        columnCount: 0,
        error: errorMessage,
      };
    }
  },
});

