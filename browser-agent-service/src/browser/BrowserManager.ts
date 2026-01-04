import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from '../config';

/**
 * Manages Playwright browser instance lifecycle
 */
export class BrowserManager {
  private browsers: Set<Browser> = new Set();
  private availableBrowsers: Browser[] = [];
  private maxBrowsers: number;

  constructor(maxBrowsers: number = config.browser.maxConcurrentBrowsers) {
    this.maxBrowsers = maxBrowsers;
  }

  /**
   * Acquire a browser instance from the pool
   */
  async acquire(): Promise<Browser> {
    // If we have an available browser, reuse it
    if (this.availableBrowsers.length > 0) {
      const browser = this.availableBrowsers.pop()!;
      // Check if browser is still connected
      if (browser.isConnected()) {
        return browser;
      } else {
        // Remove disconnected browser
        this.browsers.delete(browser);
      }
    }

    // If we're at max capacity, wait for one to become available
    if (this.browsers.size >= this.maxBrowsers) {
      // In a production system, you'd want to implement a proper queue here
      throw new Error('Maximum browser capacity reached. Please wait for a browser to become available.');
    }

    // Launch new browser
    const browser = await chromium.launch({
      headless: config.browser.headless,
      timeout: config.browser.timeout,
    });

    this.browsers.add(browser);

    // Handle browser crashes
    browser.on('disconnected', () => {
      this.browsers.delete(browser);
      const index = this.availableBrowsers.indexOf(browser);
      if (index > -1) {
        this.availableBrowsers.splice(index, 1);
      }
    });

    return browser;
  }

  /**
   * Release a browser instance back to the pool
   */
  async release(browser: Browser): Promise<void> {
    if (!this.browsers.has(browser)) {
      return; // Browser not managed by this instance
    }

    // Check if browser is still connected
    if (!browser.isConnected()) {
      this.browsers.delete(browser);
      return;
    }

    // Close all pages except one (keep browser alive for reuse)
    const contexts = browser.contexts();
    for (const context of contexts) {
      const pages = context.pages();
      // Keep one page open, close the rest
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    }

    // Add to available pool if not already there
    if (!this.availableBrowsers.includes(browser)) {
      this.availableBrowsers.push(browser);
    }
  }

  /**
   * Create a new page with configured context
   */
  async createPage(browser: Browser): Promise<Page> {
    const context = await browser.newContext({
      viewport: {
        width: config.browser.viewport.width,
        height: config.browser.viewport.height,
      },
      userAgent: config.browser.userAgent,
    });

    const page = await context.newPage();
    return page;
  }

  /**
   * Close all browsers and cleanup
   */
  async shutdown(): Promise<void> {
    const closePromises = Array.from(this.browsers).map(browser => browser.close());
    await Promise.all(closePromises);
    this.browsers.clear();
    this.availableBrowsers = [];
  }

  /**
   * Get current pool status
   */
  getStatus(): { active: number; available: number; total: number } {
    return {
      active: this.browsers.size - this.availableBrowsers.length,
      available: this.availableBrowsers.length,
      total: this.browsers.size,
    };
  }
}

