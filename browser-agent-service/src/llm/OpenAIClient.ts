import OpenAI from 'openai';
import { config } from '../config';

/**
 * OpenAI API wrapper
 */
export class OpenAIClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.llm.apiKey,
    });
  }

  /**
   * Call OpenAI API with vision support
   */
  async callVisionAPI(
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: { url: string };
      }>;
    }>,
    responseFormat?: { type: 'json_object' }
  ) {
    const response = await this.client.chat.completions.create({
      model: config.llm.model,
      messages: messages as any,
      max_tokens: config.llm.maxTokens,
      temperature: config.llm.temperature,
      response_format: responseFormat,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage,
      finishReason: response.choices[0]?.finish_reason,
    };
  }

  /**
   * Get token usage from response
   */
  getTokenUsage(response: any): number {
    return response.usage?.total_tokens || 0;
  }
}

