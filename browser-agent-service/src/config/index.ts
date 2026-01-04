import dotenv from 'dotenv';

dotenv.config();

/**
 * Application configuration
 */
export interface Config {
  server: {
    port: number;
    host: string;
    apiKey: string;
  };
  browser: {
    headless: boolean;
    timeout: number;
    maxConcurrentBrowsers: number;
    userAgent?: string;
    viewport: {
      width: number;
      height: number;
    };
  };
  llm: {
    provider: "openai";
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  scraping: {
    maxPagesPerPortal: number;
    maxActionsPerPage: number;
    delayBetweenActions: number;
    screenshotQuality: number;
    maxScreenshotWidth: number;
  };
  convex: {
    url: string;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    saveScreenshots: boolean;
    screenshotDir: string;
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  return {
    server: {
      port: parseInt(process.env.PORT || '3001', 10),
      host: process.env.HOST || '0.0.0.0',
      apiKey: process.env.API_KEY || '',
    },
    browser: {
      headless: process.env.BROWSER_HEADLESS !== 'false',
      timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
      maxConcurrentBrowsers: parseInt(process.env.MAX_CONCURRENT_BROWSERS || '3', 10),
      userAgent: process.env.BROWSER_USER_AGENT,
      viewport: {
        width: parseInt(process.env.BROWSER_VIEWPORT_WIDTH || '1920', 10),
        height: parseInt(process.env.BROWSER_VIEWPORT_HEIGHT || '1080', 10),
      },
    },
    llm: {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
    },
    scraping: {
      maxPagesPerPortal: parseInt(process.env.MAX_PAGES_PER_PORTAL || '20', 10),
      maxActionsPerPage: parseInt(process.env.MAX_ACTIONS_PER_PAGE || '10', 10),
      delayBetweenActions: parseInt(process.env.DELAY_BETWEEN_ACTIONS || '1000', 10),
      screenshotQuality: parseInt(process.env.SCREENSHOT_QUALITY || '80', 10),
      maxScreenshotWidth: parseInt(process.env.MAX_SCREENSHOT_WIDTH || '1280', 10),
    },
    convex: {
      url: process.env.CONVEX_URL || '',
    },
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as "debug" | "info" | "warn" | "error",
      saveScreenshots: process.env.SAVE_SCREENSHOTS === 'true',
      screenshotDir: process.env.SCREENSHOT_DIR || './screenshots',
    },
  };
}

export const config = loadConfig();

