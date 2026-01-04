import { OpenAIClient } from './OpenAIClient';
import { SYSTEM_PROMPT } from './prompts/systemPrompt';
import { getPageAnalysisPrompt } from './prompts/pageAnalysis';
import { getDataExtractionPrompt } from './prompts/dataExtraction';
import { PageAnalysisSchema, PageAnalysis } from './schemas/PageAnalysis';
import { ExtractedDataSchema, ExtractedData } from './schemas/ExtractedData';
import { ActionPlan } from './schemas/ActionPlan';

export interface AnalysisContext {
  currentUrl: string;
  pageNumber: number;
  maxPages: number;
  opportunitiesFound: number;
  previousAction?: string;
  goal: string;
}

export interface ElementLocation {
  selector?: string;
  description: string;
  coordinates?: { x: number; y: number };
}

/**
 * Uses OpenAI's vision capabilities to understand pages
 */
export class VisionAnalyzer {
  private client: OpenAIClient;

  constructor() {
    this.client = new OpenAIClient();
  }

  /**
   * Analyze page and get action plan
   */
  async analyzePage(
    screenshot: string, // Base64
    html: string,
    context: AnalysisContext
  ): Promise<PageAnalysis> {
    const prompt = getPageAnalysisPrompt({
      currentUrl: context.currentUrl,
      pageNumber: context.pageNumber,
      maxPages: context.maxPages,
      opportunitiesFound: context.opportunitiesFound,
      previousAction: context.previousAction,
      goal: context.goal,
      htmlContent: html.substring(0, 5000), // Truncate HTML
    });

    const messages = [
      {
        role: 'system' as const,
        content: [
          {
            type: 'text' as const,
            text: SYSTEM_PROMPT,
          },
        ],
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: prompt,
          },
          {
            type: 'image_url' as const,
            image_url: {
              url: `data:image/jpeg;base64,${screenshot}`,
            },
          },
        ],
      },
    ];

    const response = await this.client.callVisionAPI(messages, {
      type: 'json_object',
    });

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(response.content);
    } catch (error) {
      // Try to extract JSON from response if it's wrapped in markdown
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse LLM response: ${response.content}`);
      }
    }

    // Validate with Zod
    return PageAnalysisSchema.parse(parsed);
  }

  /**
   * Extract data from current page
   */
  async extractData(
    screenshot: string,
    html: string,
    currentUrl: string
  ): Promise<ExtractedData> {
    const prompt = getDataExtractionPrompt({
      currentUrl,
      htmlContent: html.substring(0, 5000), // Truncate HTML
    });

    const messages = [
      {
        role: 'system' as const,
        content: [
          {
            type: 'text' as const,
            text: SYSTEM_PROMPT,
          },
        ],
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: prompt,
          },
          {
            type: 'image_url' as const,
            image_url: {
              url: `data:image/jpeg;base64,${screenshot}`,
            },
          },
        ],
      },
    ];

    const response = await this.client.callVisionAPI(messages, {
      type: 'json_object',
    });

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(response.content);
    } catch (error) {
      // Try to extract JSON from response if it's wrapped in markdown
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse LLM response: ${response.content}`);
      }
    }

    // Validate with Zod
    return ExtractedDataSchema.parse(parsed);
  }

  /**
   * Find specific element (simplified - could be enhanced with LLM)
   */
  async findElement(
    screenshot: string,
    description: string
  ): Promise<ElementLocation> {
    // This is a simplified implementation
    // In production, you might use the LLM to identify element coordinates
    const prompt = `Find the element described as: "${description}"

Return the element location in JSON format:
{
  "selector": "CSS selector if available, or null",
  "description": "Detailed description of the element",
  "coordinates": { "x": number, "y": number } or null
}`;

    const messages = [
      {
        role: 'system' as const,
        content: [
          {
            type: 'text' as const,
            text: SYSTEM_PROMPT,
          },
        ],
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: prompt,
          },
          {
            type: 'image_url' as const,
            image_url: {
              url: `data:image/jpeg;base64,${screenshot}`,
            },
          },
        ],
      },
    ];

    const response = await this.client.callVisionAPI(messages, {
      type: 'json_object',
    });

    let parsed: any;
    try {
      parsed = JSON.parse(response.content);
    } catch (error) {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse LLM response: ${response.content}`);
      }
    }

    return {
      selector: parsed.selector || undefined,
      description: parsed.description || description,
      coordinates: parsed.coordinates || undefined,
    };
  }
}

