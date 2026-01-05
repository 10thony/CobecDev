# San Antonio Bidding & Contract Opportunities Scraper

This scraper is specifically designed to extract data from the San Antonio procurement table at:
https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx

## Overview

The San Antonio site displays procurement opportunities in a table format with the following columns:
- **Description** (with link to detail page)
- **Type** (Request for Proposals, Invitation for Bids, etc.)
- **Department**
- **Release / Restriction on Communication Start Date**
- **Political Contribution Black Out Start Date**
- **Solicitation Deadline**

Unlike the general browser scraper that clicks into each opportunity, this scraper extracts data directly from the table, making it faster and more efficient.

## Usage

### Option 1: TypeScript/React Hook (Integrated)

Use the `useSanAntonioScraper` hook in your React components:

```typescript
import { useSanAntonioScraper } from '../hooks/useSanAntonioScraper';
import { createMCPBrowserAdapter } from '../services/mcpBrowserAdapter';

function MyComponent() {
  const { progress, scrape, cancel, reset } = useSanAntonioScraper({
    maxPages: 10,
  });
  
  const handleScrape = async () => {
    const browser = createMCPBrowserAdapter();
    const result = await scrape(
      browser,
      'https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx',
      'Texas',
      'San Antonio'
    );
    console.log('Scraped opportunities:', result.opportunities);
  };
  
  return (
    <div>
      <button onClick={handleScrape}>Scrape San Antonio</button>
      <div>Status: {progress.status}</div>
      <div>Found: {progress.opportunitiesFound}</div>
    </div>
  );
}
```

### Option 2: Standalone Python Script

Run the Python script directly:

```bash
# Install dependencies
pip install selenium beautifulsoup4 requests

# Run with default settings (Selenium method)
python scripts/san_antonio_scraper.py

# Run with custom options
python scripts/san_antonio_scraper.py \
  --url "https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx" \
  --max-pages 10 \
  --output san_antonio_results.json \
  --method selenium
```

**Options:**
- `--url`: URL to scrape (default: San Antonio site)
- `--max-pages`: Maximum number of pages to scrape (default: 10)
- `--output`: Output JSON file path (default: `san_antonio_opportunities.json`)
- `--method`: Scraping method - `selenium` or `requests` (default: `selenium`)

**Methods:**
- **selenium**: Uses Selenium WebDriver (handles JavaScript-rendered content, more reliable)
- **requests**: Uses requests + BeautifulSoup (faster, but may not work if site requires JS)

### Option 3: Direct Function Call

Use the scraper function directly:

```typescript
import { scrapeSanAntonioTable } from '../services/sanAntonioScraper';
import { createMCPBrowserAdapter } from '../services/mcpBrowserAdapter';

const browser = createMCPBrowserAdapter();
const result = await scrapeSanAntonioTable(
  browser,
  'https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx',
  10, // maxPages
  'Texas',
  'San Antonio'
);

console.log(result.opportunities);
```

## Output Format

The scraper returns an array of opportunities with the following structure:

```typescript
interface SanAntonioOpportunity {
  bidNumber: string;              // e.g., "6100019305"
  description: string;            // Full description text
  detailUrl?: string;              // URL to detail page (if available)
  type: string;                   // e.g., "Request for Proposals"
  department: string;              // e.g., "Neighborhood and Housing Services"
  releaseDate: string;             // e.g., "10/29/2025"
  blackoutStartDate: string;      // e.g., "11/13/2025" or "N/A"
  solicitationDeadline: string;    // e.g., "01/05/2026"
}
```

## Integration with BrowserScraperPanel

The `BrowserScraperPanel` component can automatically detect San Antonio URLs and use the table scraper:

```typescript
// The panel will automatically use the San Antonio scraper if the URL matches
<BrowserScraperPanel
  url="https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx"
  state="Texas"
  capital="San Antonio"
  onComplete={(result) => {
    console.log('Scraping complete:', result);
  }}
/>
```

## How It Works

1. **Navigation**: Navigates to the San Antonio procurement page
2. **Table Extraction**: Finds the main table (GridView) and extracts all rows
3. **Data Parsing**: Parses each row to extract:
   - Bid number (from description)
   - Description text
   - Type, Department, Dates
   - Detail page URL (if link exists)
4. **Pagination**: Automatically navigates to next pages if available
5. **Data Storage**: Saves opportunities to the database via Convex mutations

## Limitations

- The scraper extracts data from the table only. For full details, you may need to visit individual detail pages.
- Pagination detection relies on ASP.NET GridView patterns - may need updates if site structure changes.
- The snapshot-based parsing (TypeScript version) is less reliable than direct DOM access - consider using the Python script for production.

## Troubleshooting

### Table Not Found
- Ensure the page has loaded completely (wait time may need adjustment)
- Check if the site structure has changed
- Try using the Selenium method (Python script) for better reliability

### Pagination Not Working
- The site uses ASP.NET postbacks - ensure JavaScript is enabled
- Check browser console for errors
- Try manually navigating to page 2 to verify pagination works

### Missing Data
- Some fields may be empty ("N/A") - this is expected
- Check if the table structure matches expected format
- Verify column order hasn't changed

## Future Improvements

- [ ] Add support for clicking into detail pages to get full descriptions
- [ ] Improve pagination detection for edge cases
- [ ] Add retry logic for failed extractions
- [ ] Support filtering by department or type
- [ ] Add date range filtering



