# Procurement Scraping System

## Overview

The Procurement Scraping System is a robust, multi-strategy web scraping solution designed to extract procurement data from government websites. It handles common challenges like:

- **Cloudflare Protection** - Automatic detection and fallback to proxy services
- **JavaScript-Rendered Sites** - Detection and fallback to browser services
- **Rate Limiting** - Intelligent retry and fallback mechanisms
- **Bot Detection** - Stealth mode and residential proxy support

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCRAPING STRATEGY SELECTOR                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ HTTP Fetch   │───▶│ ScrapingBee  │───▶│ Browserless  │          │
│  │ (Default)    │    │ (Fallback 1) │    │ (Fallback 2) │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                   UNIFIED RESULT                            │    │
│  │  - Extracted HTML & Text                                    │    │
│  │  - Detection Metadata (Cloudflare, JS, Auth, etc.)         │    │
│  │  - Scraping Method Used                                     │    │
│  │  - Success/Failure Status                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AI AGENT (GPT-4o-mini)                        │
├─────────────────────────────────────────────────────────────────────┤
│  - Analyzes extracted content                                        │
│  - Identifies procurement opportunities                              │
│  - Extracts structured data (RFPs, RFQs, Bids, etc.)               │
│  - Returns type-safe JSON                                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Scraping Methods

### 1. HTTP Fetch (Default)
- **Speed**: Fast (100-500ms)
- **Cost**: Free
- **Limitations**: 
  - Cannot bypass Cloudflare
  - Cannot execute JavaScript
  - Blocked by many sites

### 2. ScrapingBee (Fallback 1)
- **Speed**: Medium (2-10s)
- **Cost**: ~$0.001-0.01 per request
- **Capabilities**:
  - Cloudflare bypass
  - JavaScript rendering
  - Residential IP rotation
  - Country targeting

### 3. Browserless (Fallback 2)
- **Speed**: Slow (5-30s)
- **Cost**: ~$0.01-0.05 per request
- **Capabilities**:
  - Full Chrome browser
  - Complex page interactions
  - Screenshot capture
  - Stealth mode

## Configuration

### Environment Variables

Add these to your `.env` or Convex environment:

```bash
# Required for AI Agent
OPENAI_API_KEY=sk-your_openai_key_here

# Optional - ScrapingBee (for Cloudflare bypass)
SCRAPINGBEE_API_KEY=your_scrapingbee_key_here

# Optional - Browserless (for complex sites)
BROWSERLESS_API_KEY=your_browserless_key_here
```

### Setting Environment Variables in Convex

1. Go to your Convex dashboard
2. Navigate to Settings > Environment Variables
3. Add the required keys

Or use the CLI:
```bash
npx convex env set SCRAPINGBEE_API_KEY your_key_here
npx convex env set BROWSERLESS_API_KEY your_key_here
```

## Type Definitions

### Core Types

```typescript
// Scraping methods available
type ScrapingMethod = 
  | "http_fetch"      // Direct HTTP fetch
  | "proxy_service"   // ScrapingBee
  | "browser_service" // Browserless
  | "frontend_browser"; // MCP browser tools

// Data quality levels
type DataQuality = "high" | "medium" | "low" | "failed";

// Page type detection
type PageType = 
  | "procurement_list"
  | "procurement_detail"
  | "login_page"
  | "error_page"
  | "empty_page"
  | "cloudflare_challenge"
  | "captcha_page"
  | "unknown";
```

### Fetch Result

```typescript
interface FetchResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  html: string;
  text: string;
  method: ScrapingMethod;
  duration: number;
  success: boolean;
  error?: string;
  metadata: {
    blocked: boolean;
    requiresJavaScript: boolean;
    requiresAuth: boolean;
    cloudflareDetected: boolean;
    captchaDetected: boolean;
    pageType: PageType;
    rawHtmlLength: number;
    extractedTextLength: number;
    warnings: string[];
  };
}
```

### Scraped Procurement Data

```typescript
interface ScrapedProcurementData {
  sourceUrl: string;
  scrapedAt: string;
  data: {
    rfps: ProcurementOpportunity[];
    rfqs: ProcurementOpportunity[];
    bidOpportunities: ProcurementOpportunity[];
    procurementCalendar: Array<{
      title: string;
      date: string;
      description?: string;
    }>;
    contactInfo: {
      officeName: string;
      email: string;
      phone: string;
      address: string;
    };
    registrationInfo: {
      registrationRequired?: boolean;
      registrationLink?: string;
      instructions?: string;
    };
    otherInfo?: string;
  };
  metadata: {
    dataQuality: DataQuality;
    dataCompleteness: number;
    scrapingMethod: ScrapingMethod;
    methodsAttempted: ScrapingMethod[];
    fetchDuration: number;
    processingDuration: number;
    totalDuration: number;
    notes: string;
    warnings: string[];
    failed: boolean;
    failureReason?: string;
  };
}
```

## Usage Examples

### Scraping a Single URL

```typescript
import { api } from "./convex/_generated/api";
import { useAction } from "convex/react";

function ScraperButton() {
  const scrapeUrl = useAction(api.procurementScraperActions.scrapeProcurementUrl);
  
  const handleScrape = async () => {
    const result = await scrapeUrl({
      url: "https://procurement.example.gov/opportunities",
      state: "California",
      capital: "Sacramento",
    });
    
    if (result.success) {
      console.log(`Scraped! Quality: ${result.dataQuality}`);
    } else {
      console.error(`Failed: ${result.error}`);
    }
  };
  
  return <button onClick={handleScrape}>Scrape</button>;
}
```

### Batch Scraping

```typescript
const scrapeMultiple = useAction(api.procurementScraperActions.scrapeMultipleProcurementUrls);

const results = await scrapeMultiple({
  urls: [
    { url: "https://example1.gov/bids", state: "CA", capital: "Sacramento" },
    { url: "https://example2.gov/rfps", state: "TX", capital: "Austin" },
  ],
});

console.log(`Success: ${results.successful}/${results.total}`);
```

## Detection Patterns

The system automatically detects various page states:

### Cloudflare Detection
- "Just a moment..."
- "Checking your browser"
- "DDoS protection by Cloudflare"
- `cf-browser-verification`

### JavaScript Required Detection
- `<div id="root"></div>` (React)
- `<div id="app"></div>` (Vue)
- `__NEXT_DATA__` (Next.js)
- Minimal text extraction (< 500 chars from > 5000 bytes HTML)

### Authentication Required
- HTTP 401/403 status codes
- "login", "sign in", "access denied" keywords

## Troubleshooting

### Common Issues

#### 1. All Methods Return 403 Forbidden
**Cause**: Site has aggressive bot protection
**Solution**: 
- Use ScrapingBee with premium proxies
- Consider frontend browser scraping

#### 2. Empty Text Extraction
**Cause**: Site requires JavaScript rendering
**Solution**:
- Enable ScrapingBee (`renderJs: true`)
- Fall back to Browserless

#### 3. CAPTCHA Detected
**Cause**: Site requires human verification
**Solution**:
- Use ScrapingBee with CAPTCHA solving
- Consider frontend browser with manual intervention

### Logging

All scraping operations log to the Convex console:

```
[Scraping Strategy] Starting with method order: http_fetch -> proxy_service -> browser_service
[HTTP Fetch] Starting fetch for: https://example.gov/bids
[HTTP Fetch] Completed in 342ms. Status: 403, HTML: 2345, Text: 12
[Scraping Strategy] http_fetch failed, trying next method. Reason: HTTP 403 Forbidden; Cloudflare protection detected
[ScrapingBee] Starting fetch for: https://example.gov/bids
[ScrapingBee] Completed in 3421ms. Cost: 1, HTML: 45678, Text: 12345
[Scraping Strategy] Success with proxy_service
```

## Files Reference

| File | Purpose |
|------|---------|
| `convex/procurementScraperTypes.ts` | Type definitions for the scraping system |
| `convex/procurementScrapingServices.ts` | Scraping service implementations |
| `convex/procurementScraperAgent.ts` | AI agent with enhanced fetch tool |
| `convex/procurementScraperActions.ts` | Public actions for scraping |
| `convex/procurementScraperConstants.ts` | Constants and enums |
| `convex/procurementScraperSystemPrompts.ts` | AI system prompts |

## API Reference

### Actions

#### `scrapeProcurementUrl`
Scrape a single procurement URL.

```typescript
{
  url: string;
  state: string;
  capital: string;
  procurementLinkId?: Id<"procurementUrls">;
}
```

#### `scrapeMultipleProcurementUrls`
Scrape multiple URLs in sequence.

#### `scrapeAllApprovedLinks`
Scrape all approved procurement links (batch job).

### Queries

#### `getScrapedData`
Get scraped data by ID.

#### `listScrapedData`
List all scraped data with pagination.

## Best Practices

1. **Start with HTTP Fetch** - It's fast and free
2. **Enable Fallback** - Let the system automatically try alternatives
3. **Monitor Costs** - ScrapingBee and Browserless have usage costs
4. **Check Data Quality** - Use the `dataQuality` field to filter results
5. **Handle Failures Gracefully** - The `failed` field indicates complete failures
6. **Review Warnings** - The `warnings` array contains useful debugging info

## Cost Optimization

To minimize costs:

1. Cache successful results
2. Use HTTP fetch for known simple sites
3. Set up a site classification system
4. Batch similar sites together
5. Schedule scraping during off-peak hours






