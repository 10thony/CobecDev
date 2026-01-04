/**
 * San Antonio Bidding & Contract Opportunities Scraper
 * 
 * Specialized scraper for https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx
 * Extracts data directly from the table without clicking into detail pages.
 */

import { MCPBrowserAdapter } from './mcpBrowserAdapter';
import { Id } from '../../convex/_generated/dataModel';

// ============================================================================
// TYPES
// ============================================================================

export interface SanAntonioOpportunity {
  bidNumber: string;
  description: string;
  detailUrl?: string;
  type: string;
  department: string;
  releaseDate: string;
  blackoutStartDate: string;
  solicitationDeadline: string;
}

export interface SanAntonioScrapeResult {
  success: boolean;
  opportunities: SanAntonioOpportunity[];
  pagesScraped: number;
  errors: string[];
  duration: number;
}

// ============================================================================
// TABLE EXTRACTION
// ============================================================================

/**
 * Extract table data from the current page using browser evaluation
 * Uses MCP browser tools to get snapshot and parse table data
 */
async function extractTableData(browser: MCPBrowserAdapter): Promise<SanAntonioOpportunity[]> {
  // Get page snapshot using MCP tools
  const snapshot = await browser.snapshot();
  
  // Parse the snapshot to extract table data
  // The snapshot contains accessibility tree, we need to find the table
  const opportunities: SanAntonioOpportunity[] = [];
  
  // Look for table structure in snapshot
  // The table has columns: Description, Type, Department, Release Date, Blackout Start, Deadline
  const tablePattern = /Description.*?Type.*?Department.*?Release.*?Black.*?Solicitation/gs;
  
  if (!tablePattern.test(snapshot)) {
    // Try alternative patterns
    const altPattern = /Bid.*?Contract.*?Opportunit/i;
    if (!altPattern.test(snapshot)) {
      throw new Error('Could not find table structure in page snapshot');
    }
  }
  
  // Parse table from snapshot
  return parseTableFromSnapshot(snapshot);
}

/**
 * Parse table data from accessibility snapshot
 * Extracts data from the YAML-like snapshot format
 */
function parseTableFromSnapshot(snapshot: string): SanAntonioOpportunity[] {
  const opportunities: SanAntonioOpportunity[] = [];
  
  // The snapshot is in YAML format with role: row entries
  // Each row has a name attribute with all the data, and children with individual cells
  
  // Look for table rows - they have role: row and contain cell data
  const rowPattern = /role:\s*row[\s\S]*?name:\s*([^\n]+)[\s\S]*?ref:\s*([^\n]+)/g;
  const rows: Array<{ name: string; ref: string; content: string }> = [];
  
  let match;
  while ((match = rowPattern.exec(snapshot)) !== null) {
    const rowName = match[1].trim();
    const rowRef = match[2].trim();
    
    // Skip header rows
    if (rowName.includes('Description') && rowName.includes('Type') && rowName.includes('Department')) {
      continue;
    }
    
    // Extract the full row content for parsing
    const rowStart = match.index;
    const rowEnd = snapshot.indexOf('role: row', rowStart + match[0].length);
    const rowContent = rowEnd > 0 ? snapshot.substring(rowStart, rowEnd) : snapshot.substring(rowStart);
    
    rows.push({ name: rowName, ref: rowRef, content: rowContent });
  }
  
  // Parse each row
  for (const row of rows) {
    try {
      // The row name contains all data: "6100019305 Description Type Department ReleaseDate BlackoutDate Deadline"
      // But we need to parse the cells individually
      
      // Extract cells from the row content
      const cellPattern = /role:\s*cell[\s\S]*?name:\s*([^\n]+)/g;
      const cells: string[] = [];
      
      let cellMatch;
      while ((cellMatch = cellPattern.exec(row.content)) !== null) {
        cells.push(cellMatch[1].trim());
      }
      
      if (cells.length < 6) {
        // Try parsing from row name as fallback
        const parts = row.name.split(/\s{2,}|\t/); // Split on multiple spaces or tabs
        if (parts.length >= 6) {
          cells.push(...parts);
        } else {
          continue; // Skip rows that don't have enough data
        }
      }
      
      // Cell order: Description, Type, Department, Release Date, Blackout Start, Deadline
      const description = cells[0] || '';
      const type = cells[1] || '';
      const department = cells[2] || '';
      const releaseDate = cells[3] || '';
      const blackoutStartDate = cells[4] || '';
      const solicitationDeadline = cells[5] || '';
      
      // Extract bid number from description (usually starts with digits)
      const bidNumberMatch = description.match(/^(\d+)/);
      const bidNumber = bidNumberMatch ? bidNumberMatch[1] : '';
      
      // Extract detail URL if there's a link in the row
      let detailUrl: string | undefined;
      const linkMatch = row.content.match(/role:\s*link[\s\S]*?ref:\s*([^\n]+)/);
      if (linkMatch) {
        // URL would be constructed from the link ref, but we don't have the href in snapshot
        // We'll leave it undefined for now
      }
      
      if (description && bidNumber) {
        opportunities.push({
          bidNumber,
          description: description.replace(/^\d+\s*/, '').trim() || description,
          detailUrl,
          type: type || 'Unknown',
          department: department || 'Unknown',
          releaseDate: releaseDate || '',
          blackoutStartDate: blackoutStartDate || '',
          solicitationDeadline: solicitationDeadline || '',
        });
      }
    } catch (error) {
      console.error('Error parsing row:', error, row);
      continue;
    }
  }
  
  return opportunities;
}

/**
 * Find and click the next page button
 */
async function goToNextPage(browser: MCPBrowserAdapter): Promise<boolean> {
  const snapshot = await browser.snapshot();
  
  // Look for pagination controls in the snapshot
  // The site uses ASP.NET GridView pagination
  // Look for "Next" link or page number links
  
  // Parse snapshot to find pagination links
  const lines = snapshot.split('\n');
  let nextPageRef: string | null = null;
  
  // Look for "Next" or page number links
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for "Next" link
    if (/Next/i.test(line) || /">\s*>\s*</.test(line)) {
      // Find the ref (usually appears before the link text)
      for (let j = Math.max(0, i - 10); j < i; j++) {
        const refMatch = lines[j].match(/([A-Z]\d+)/);
        if (refMatch) {
          nextPageRef = refMatch[1];
          break;
        }
      }
      if (nextPageRef) break;
    }
    
    // Look for page number links (2, 3, 4, etc.)
    const pageNumMatch = line.match(/"link"\s+"(\d+)"/);
    if (pageNumMatch) {
      const pageNum = parseInt(pageNumMatch[1]);
      if (pageNum > 1) {
        // Find the ref
        for (let j = Math.max(0, i - 10); j < i; j++) {
          const refMatch = lines[j].match(/([A-Z]\d+)/);
          if (refMatch) {
            nextPageRef = refMatch[1];
            break;
          }
        }
        if (nextPageRef) break;
      }
    }
  }
  
  if (nextPageRef) {
    try {
      await browser.click(nextPageRef, 'Go to next page');
      await browser.waitFor({ time: 2 });
      return true;
    } catch (e) {
      console.error('Failed to click next page:', e);
      return false;
    }
  }
  
  return false;
}

// ============================================================================
// MAIN SCRAPER FUNCTION
// ============================================================================

/**
 * Scrape San Antonio bidding and contract opportunities
 * 
 * @param browser - MCP browser adapter instance
 * @param url - URL to scrape (defaults to San Antonio site)
 * @param maxPages - Maximum number of pages to scrape
 * @param state - State name (for logging)
 * @param capital - Capital city (for logging)
 * @param scrapedDataId - Optional scraped data ID for logging
 */
export async function scrapeSanAntonioTable(
  browser: MCPBrowserAdapter,
  url: string = 'https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx',
  maxPages: number = 10,
  state: string = 'Texas',
  capital: string = 'San Antonio',
  scrapedDataId?: Id<"scrapedProcurementData">
): Promise<SanAntonioScrapeResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const allOpportunities: SanAntonioOpportunity[] = [];
  let pagesScraped = 0;
  
  try {
    // Navigate to the page
    console.log(`[San Antonio Scraper] Navigating to: ${url}`);
    await browser.navigate(url);
    await browser.waitFor({ time: 3 });
    
    // Extract data from each page
    while (pagesScraped < maxPages) {
      pagesScraped++;
      
      try {
        console.log(`[San Antonio Scraper] Extracting data from page ${pagesScraped}...`);
        const opportunities = await extractTableData(browser);
        allOpportunities.push(...opportunities);
        
        console.log(`[San Antonio Scraper] Page ${pagesScraped}: Found ${opportunities.length} opportunities`);
        
        // Try to go to next page
        const hasNextPage = await goToNextPage(browser);
        if (!hasNextPage) {
          console.log('[San Antonio Scraper] No more pages found');
          break;
        }
        
        // Wait for next page to load
        await browser.waitFor({ time: 2 });
        
      } catch (error) {
        const errorMsg = `Error scraping page ${pagesScraped}: ${String(error)}`;
        errors.push(errorMsg);
        console.error(`[San Antonio Scraper] ${errorMsg}`);
        
        // Try to continue to next page anyway
        try {
          const hasNextPage = await goToNextPage(browser);
          if (!hasNextPage) break;
          await browser.waitFor({ time: 2 });
        } catch (e) {
          console.error('[San Antonio Scraper] Failed to navigate to next page:', e);
          break;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[San Antonio Scraper] Completed: ${allOpportunities.length} opportunities from ${pagesScraped} pages in ${duration}ms`);
    
    return {
      success: true,
      opportunities: allOpportunities,
      pagesScraped,
      errors,
      duration,
    };
    
  } catch (error) {
    const errorMsg = String(error);
    console.error(`[San Antonio Scraper] Fatal error: ${errorMsg}`);
    return {
      success: false,
      opportunities: allOpportunities,
      pagesScraped,
      errors: [...errors, errorMsg],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Alternative: Use browser console evaluation if available
 * This would be more reliable than parsing snapshots
 */
export const SAN_ANTONIO_EXTRACTION_SCRIPT = `
(function() {
  const opportunities = [];
  
  // Find the main table
  const table = document.querySelector('table[id*="gvBidContractOpps"]') || 
                document.querySelector('table.GridView') ||
                document.querySelector('table');
  
  if (!table) {
    return JSON.stringify({ error: 'Table not found', opportunities: [] });
  }
  
  // Get all data rows
  const rows = Array.from(table.querySelectorAll('tr')).filter(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return false;
    
    // Skip header row
    if (cells[0].tagName === 'TH' || row.querySelector('th')) return false;
    
    // Skip pagination rows
    if (row.textContent.includes('Page') || 
        row.querySelector('a[href*="Page$"]') ||
        row.querySelector('a[href*="__doPostBack"]')) {
      // Check if it's actually a data row with pagination link
      if (cells.length < 6) return false;
    }
    
    return true;
  });
  
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 6) return;
    
    try {
      // Column 0: Description (with link)
      const descriptionCell = cells[0];
      const descriptionLink = descriptionCell.querySelector('a');
      let description = descriptionCell.textContent.trim();
      let detailUrl = null;
      
      if (descriptionLink) {
        const href = descriptionLink.getAttribute('href');
        if (href) {
          detailUrl = href.startsWith('http') 
            ? href 
            : new URL(href, window.location.href).href;
        }
      }
      
      // Extract bid number from description (usually starts with digits)
      const bidNumberMatch = description.match(/^(\\d+)/);
      const bidNumber = bidNumberMatch ? bidNumberMatch[1] : \`OPP-\${index + 1}\`;
      
      // Column 1: Type
      const type = (cells[1]?.textContent || '').trim();
      
      // Column 2: Department
      const department = (cells[2]?.textContent || '').trim();
      
      // Column 3: Release / Restriction on Communication Start Date
      const releaseDate = (cells[3]?.textContent || '').trim();
      
      // Column 4: Political Contribution Black Out Start Date
      const blackoutStartDate = (cells[4]?.textContent || '').trim();
      
      // Column 5: Solicitation Deadline
      const solicitationDeadline = (cells[5]?.textContent || '').trim();
      
      if (description && description.length > 0) {
        opportunities.push({
          bidNumber,
          description,
          detailUrl,
          type,
          department,
          releaseDate,
          blackoutStartDate,
          solicitationDeadline
        });
      }
    } catch (e) {
      console.error('Error parsing row:', e, row);
    }
  });
  
  return JSON.stringify({ 
    opportunities, 
    totalRows: rows.length,
    tableFound: !!table 
  });
})();
`;

