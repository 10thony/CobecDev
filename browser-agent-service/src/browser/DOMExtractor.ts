import { Page } from 'playwright';

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface PageMetadata {
  title: string;
  url: string;
  description?: string;
  hasNextButton: boolean;
  hasPagination: boolean;
  formCount: number;
  tableCount: number;
  linkCount: number;
}

export interface ElementInfo {
  selector: string;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
}

/**
 * Extracts relevant DOM content for LLM context
 */
export class DOMExtractor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get cleaned HTML (removes scripts, styles, comments)
   */
  async getCleanedHTML(maxLength: number = 5000): Promise<string> {
    const html = await this.page.evaluate((maxLen) => {
      // Clone the document to avoid modifying the original
      const clone = document.cloneNode(true) as Document;
      
      // Remove scripts, styles, comments
      const elementsToRemove = clone.querySelectorAll('script, style, noscript, svg, iframe');
      elementsToRemove.forEach(el => el.remove());

      // Remove comments
      const walker = document.createTreeWalker(
        clone,
        NodeFilter.SHOW_COMMENT,
        null
      );
      const comments: Comment[] = [];
      let node;
      while (node = walker.nextNode()) {
        comments.push(node as Comment);
      }
      comments.forEach(comment => comment.remove());

      // Get HTML
      let html = clone.documentElement.outerHTML;

      // Remove inline styles
      html = html.replace(/style\s*=\s*["'][^"']*["']/gi, '');

      // Truncate if needed
      if (html.length > maxLen) {
        html = html.substring(0, maxLen) + '... [truncated]';
      }

      return html;
    }, maxLength);

    return html;
  }

  /**
   * Get text content only
   */
  async getTextContent(): Promise<string> {
    return await this.page.evaluate(() => {
      return document.body.innerText || '';
    });
  }

  /**
   * Extract tables as structured data
   */
  async extractTables(): Promise<TableData[]> {
    return await this.page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const result: TableData[] = [];

      tables.forEach(table => {
        const headers: string[] = [];
        const rows: string[][] = [];

        // Extract headers
        const headerRow = table.querySelector('thead tr, tr:first-child');
        if (headerRow) {
          headerRow.querySelectorAll('th, td').forEach(cell => {
            headers.push(cell.textContent?.trim() || '');
          });
        }

        // Extract rows
        const dataRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        dataRows.forEach(row => {
          const rowData: string[] = [];
          row.querySelectorAll('td, th').forEach(cell => {
            rowData.push(cell.textContent?.trim() || '');
          });
          if (rowData.length > 0) {
            rows.push(rowData);
          }
        });

        if (headers.length > 0 || rows.length > 0) {
          result.push({ headers, rows });
        }
      });

      return result;
    });
  }

  /**
   * Get specific element's content
   */
  async getElementContent(selector: string): Promise<string> {
    try {
      return await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return element?.textContent?.trim() || '';
      }, selector);
    } catch {
      return '';
    }
  }

  /**
   * Get page metadata
   */
  async getMetadata(): Promise<PageMetadata> {
    return await this.page.evaluate(() => {
      const title = document.title || '';
      const url = window.location.href;
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined;

      // Check for pagination
      const hasNextButton = !!(
        document.querySelector('a[aria-label*="next" i]') ||
        document.querySelector('a:has-text("Next")') ||
        document.querySelector('button:has-text("Next")') ||
        document.querySelector('[class*="next"]')
      );

      const hasPagination = !!(
        document.querySelector('.pagination') ||
        document.querySelector('[class*="pagination"]') ||
        document.querySelector('[aria-label*="pagination" i]')
      );

      const formCount = document.querySelectorAll('form').length;
      const tableCount = document.querySelectorAll('table').length;
      const linkCount = document.querySelectorAll('a').length;

      return {
        title,
        url,
        description,
        hasNextButton,
        hasPagination,
        formCount,
        tableCount,
        linkCount,
      };
    });
  }

  /**
   * Find elements matching description
   */
  async findElements(description: string): Promise<ElementInfo[]> {
    // This is a simplified version - in production, you might use LLM to find elements
    // For now, we'll search for common patterns
    return await this.page.evaluate((desc) => {
      const results: ElementInfo[] = [];
      const lowerDesc = desc.toLowerCase();

      // Search buttons
      if (lowerDesc.includes('button')) {
        document.querySelectorAll('button, a[role="button"]').forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes(lowerDesc.replace('button', '').trim())) {
            results.push({
              selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
              tagName: el.tagName.toLowerCase(),
              text: el.textContent?.trim() || '',
              attributes: Array.from(el.attributes).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {} as Record<string, string>),
            });
          }
        });
      }

      // Search links
      if (lowerDesc.includes('link')) {
        document.querySelectorAll('a').forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes(lowerDesc.replace('link', '').trim())) {
            results.push({
              selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : 'a',
              tagName: 'a',
              text: el.textContent?.trim() || '',
              attributes: Array.from(el.attributes).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {} as Record<string, string>),
            });
          }
        });
      }

      return results;
    }, description);
  }
}

