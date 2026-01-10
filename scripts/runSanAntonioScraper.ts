/**
 * San Antonio Scraper Runner
 * 
 * This script can be run by the AI assistant to scrape San Antonio procurement data
 * using MCP browser tools directly.
 * 
 * Usage: The AI assistant can run this script when the user clicks "Start Scraping"
 * in the BrowserScraperPanel component.
 */

import { scrapeSanAntonioTable } from '../src/services/sanAntonioScraper';
import { createMCPBrowserAdapter } from '../src/services/mcpBrowserAdapter';

/**
 * Run the San Antonio scraper using MCP browser tools
 * This function is called by the AI assistant when the user triggers scraping
 */
export async function runSanAntonioScraper(
  url: string = 'https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx',
  maxPages: number = 10,
  state: string = 'Texas',
  capital: string = 'San Antonio'
) {
  console.log('Starting San Antonio scraper...');
  console.log(`URL: ${url}`);
  console.log(`Max Pages: ${maxPages}`);
  
  // Create browser adapter
  // Note: In the AI assistant context, MCP tools are available directly
  const browser = createMCPBrowserAdapter();
  
  // Run the scraper
  const result = await scrapeSanAntonioTable(
    browser,
    url,
    maxPages,
    state,
    capital
  );
  
  console.log('Scraping completed!');
  console.log(`Success: ${result.success}`);
  console.log(`Opportunities found: ${result.opportunities.length}`);
  console.log(`Pages scraped: ${result.pagesScraped}`);
  console.log(`Duration: ${result.duration}ms`);
  
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }
  
  return result;
}





