import { Page } from 'playwright';
import { config } from '../config';

export interface NavigationResult {
  success: boolean;
  url: string;
  finalUrl: string;
  error?: string;
}

export interface ClickTarget {
  selector?: string;
  coordinates?: { x: number; y: number };
  description?: string;
}

export interface ClickResult {
  success: boolean;
  urlChanged: boolean;
  newUrl?: string;
  error?: string;
}

/**
 * Executes navigation and interaction commands on a page
 */
export class PageController {
  private page: Page;
  private navigationHistory: string[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to URL with proper wait conditions
   */
  async navigate(url: string): Promise<NavigationResult> {
    try {
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.browser.timeout,
      });

      const finalUrl = this.page.url();
      this.navigationHistory.push(finalUrl);

      return {
        success: response?.ok() ?? true,
        url,
        finalUrl,
      };
    } catch (error) {
      return {
        success: false,
        url,
        finalUrl: this.page.url(),
        error: error instanceof Error ? error.message : 'Unknown navigation error',
      };
    }
  }

  /**
   * Go back in navigation history
   */
  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'networkidle' });
    this.navigationHistory.pop();
  }

  /**
   * Reload current page
   */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  /**
   * Click an element
   */
  async click(target: ClickTarget): Promise<ClickResult> {
    const currentUrl = this.page.url();

    try {
      if (target.coordinates) {
        // Click by coordinates
        await this.page.mouse.click(target.coordinates.x, target.coordinates.y);
      } else if (target.selector) {
        // Click by selector
        await this.page.click(target.selector, { timeout: config.browser.timeout });
      } else {
        throw new Error('No selector or coordinates provided for click');
      }

      // Wait a bit for navigation to start
      await this.page.waitForTimeout(500);

      const newUrl = this.page.url();
      const urlChanged = newUrl !== currentUrl;

      if (urlChanged) {
        this.navigationHistory.push(newUrl);
      }

      return {
        success: true,
        urlChanged,
        newUrl: urlChanged ? newUrl : undefined,
      };
    } catch (error) {
      return {
        success: false,
        urlChanged: false,
        error: error instanceof Error ? error.message : 'Unknown click error',
      };
    }
  }

  /**
   * Fill a form field
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value, { timeout: config.browser.timeout });
  }

  /**
   * Scroll page
   */
  async scroll(direction: "up" | "down", amount?: number): Promise<void> {
    const scrollAmount = amount || 500;
    if (direction === 'down') {
      await this.page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);
    } else {
      await this.page.evaluate((amount) => {
        window.scrollBy(0, -amount);
      }, scrollAmount);
    }
    await this.page.waitForTimeout(300); // Wait for lazy-loaded content
  }

  /**
   * Scroll to specific element
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, selector);
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for selector
   */
  async waitForSelector(selector: string, timeout?: number): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: timeout || config.browser.timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: timeout || config.browser.timeout });
  }

  /**
   * Wait for content matching pattern
   */
  async waitForContent(contentPattern: string | RegExp): Promise<boolean> {
    try {
      await this.page.waitForFunction(
        (pattern) => {
          const text = document.body.innerText;
          if (typeof pattern === 'string') {
            return text.includes(pattern);
          } else {
            return pattern.test(text);
          }
        },
        contentPattern,
        { timeout: config.browser.timeout }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dismiss modal/popup
   */
  async dismissModal(): Promise<boolean> {
    try {
      // Try common modal close selectors
      const closeSelectors = [
        'button[aria-label="Close"]',
        'button.close',
        '.modal-close',
        '[data-dismiss="modal"]',
        'button:has-text("Close")',
        'button:has-text("×")',
      ];

      for (const selector of closeSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(500);
            return true;
          }
        } catch {
          // Continue to next selector
        }
      }

      // Try pressing Escape
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Accept cookie consent
   */
  async acceptCookieConsent(): Promise<boolean> {
    try {
      const cookieSelectors = [
        'button:has-text("Accept")',
        'button:has-text("Accept All")',
        'button:has-text("I Accept")',
        'button:has-text("Agree")',
        '[id*="cookie"] button',
        '[class*="cookie"] button',
        '[data-testid*="cookie"] button',
      ];

      for (const selector of cookieSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            await element.click();
            await this.page.waitForTimeout(500);
            return true;
          }
        } catch {
          // Continue to next selector
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Get navigation history
   */
  getNavigationHistory(): string[] {
    return [...this.navigationHistory];
  }
}

