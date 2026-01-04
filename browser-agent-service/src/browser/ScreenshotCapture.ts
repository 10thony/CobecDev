import { Page } from 'playwright';
import sharp from 'sharp';
import { config } from '../config';
import { promises as fs } from 'fs';
import path from 'path';

export interface ScreenshotResult {
  buffer: Buffer;
  base64: string;
  width: number;
  height: number;
  timestamp: number;
}

/**
 * Captures and processes screenshots for LLM analysis
 */
export class ScreenshotCapture {
  private screenshotDir: string;

  constructor() {
    this.screenshotDir = config.logging.screenshotDir;
    // Ensure directory exists if saving screenshots
    if (config.logging.saveScreenshots) {
      fs.mkdir(this.screenshotDir, { recursive: true }).catch(() => {
        // Ignore errors (directory might already exist)
      });
    }
  }

  /**
   * Capture current viewport
   */
  async captureViewport(page: Page): Promise<ScreenshotResult> {
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: config.scraping.screenshotQuality,
    });

    return this.processScreenshot(buffer);
  }

  /**
   * Capture full page (scrolling)
   */
  async captureFullPage(page: Page): Promise<ScreenshotResult> {
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: config.scraping.screenshotQuality,
      fullPage: true,
    });

    return this.processScreenshot(buffer);
  }

  /**
   * Capture specific element
   */
  async captureElement(page: Page, selector: string): Promise<ScreenshotResult> {
    const buffer = await page.locator(selector).screenshot({
      type: 'jpeg',
      quality: config.scraping.screenshotQuality,
    });

    return this.processScreenshot(buffer);
  }

  /**
   * Process screenshot for LLM (resize, compress)
   */
  async prepareForLLM(screenshot: Buffer): Promise<string> {
    // Resize if needed
    let processed = sharp(screenshot);
    const metadata = await processed.metadata();

    if (metadata.width && metadata.width > config.scraping.maxScreenshotWidth) {
      processed = processed.resize(config.scraping.maxScreenshotWidth, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    // Convert to base64
    const resizedBuffer = await processed
      .jpeg({ quality: config.scraping.screenshotQuality })
      .toBuffer();

    return resizedBuffer.toString('base64');
  }

  /**
   * Save to disk (for debugging)
   */
  async saveToDisk(screenshot: Buffer, filename: string): Promise<string> {
    if (!config.logging.saveScreenshots) {
      return '';
    }

    const filepath = path.join(this.screenshotDir, filename);
    await fs.writeFile(filepath, screenshot);
    return filepath;
  }

  /**
   * Process screenshot buffer
   */
  private async processScreenshot(buffer: Buffer): Promise<ScreenshotResult> {
    const metadata = await sharp(buffer).metadata();
    const base64 = await this.prepareForLLM(buffer);

    return {
      buffer,
      base64,
      width: metadata.width || 0,
      height: metadata.height || 0,
      timestamp: Date.now(),
    };
  }
}

