/**
 * Static constants
 */

export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_MAX_PAGES = 20;
export const DEFAULT_MAX_ACTIONS = 10;
export const DEFAULT_DELAY_MS = 1000; // 1 second

export const SCREENSHOT_FORMAT = 'jpeg' as const;
export const DEFAULT_SCREENSHOT_QUALITY = 80;
export const DEFAULT_MAX_SCREENSHOT_WIDTH = 1280;

export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
} as const;

