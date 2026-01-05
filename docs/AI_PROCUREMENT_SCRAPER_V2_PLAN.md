# AI Procurement Scraper V2 - Interactive Browser Scraping Plan

## Problem Statement

The current procurement scraper uses simple HTTP `fetch()` to retrieve webpage content, which:
1. **Cannot execute JavaScript** - Many procurement sites are SPAs or use dynamic rendering
2. **Cannot interact with UI elements** - Cannot click rows, view buttons, or expand details
3. **Returns blank/incomplete data** - Because actual content requires user interaction

### What We Need

The AI Agent needs to:
1. Navigate to an approved procurement link
2. **Identify and interact with procurement opportunity entries** (click rows, view buttons, etc.)
3. **Scrape detailed data** from each opportunity (title, deadline, description, documents, etc.)
4. Handle pagination and load-more functionality
5. Return structured JSON data for each opportunity

---

## Architecture Options

### Option A: Frontend-Controlled Browser Tab (Recommended for MVP)

**How it works:**
- Frontend opens the procurement URL in a **new browser tab**
- Uses **Playwright MCP** or similar browser automation tools
- AI Agent runs in the frontend context, controlling the tab
- Once scraping is complete, the tab is closed and data is saved to Convex

**Pros:**
- Works within existing infrastructure
- No additional servers needed
- Real browser environment (handles all JS)
- Can be implemented incrementally

**Cons:**
- Requires user's browser to be open
- Can't run in background/scheduled mode

---

### Option B: External Browser Service (Browserbase/Browserless)

**How it works:**
- Use a cloud browser service like **Browserbase**, **Browserless.io**, or **Apify**
- Convex action connects to remote browser via WebSocket/API
- Full Playwright/Puppeteer API available
- Runs entirely server-side

**Pros:**
- True background processing
- Scheduled scraping possible
- No user browser required
- Scales independently

**Cons:**
- Additional cost per session
- Requires external service setup
- API key management

---

### Option C: Self-Hosted Scraping Microservice

**How it works:**
- Separate Node.js service running Puppeteer/Playwright
- Deployed on Railway, Render, Fly.io, etc.
- Convex calls via HTTP API
- Returns scraped data as JSON

**Pros:**
- Full control over infrastructure
- One-time setup cost
- Predictable pricing

**Cons:**
- Additional infrastructure to maintain
- Need to handle scaling
- Cold starts

---

## Recommended Implementation: Hybrid Approach

**Phase 1 (MVP):** Frontend-controlled browser tab using MCP Browser tools
**Phase 2:** Add Browserbase/external service for background/scheduled scraping

---

## Phase 1: Frontend Browser Scraper Implementation

### 1.1 New Convex Schema Additions

**File**: `convex/schema.ts`

```typescript
// Add to existing schema - Procurement Opportunities (individual scraped items)
procurementOpportunities: defineTable({
  // Source tracking
  scrapedDataId: v.id("scrapedProcurementData"), // Parent scraping session
  sourceUrl: v.string(), // URL where this opportunity was found
  detailUrl: v.optional(v.string()), // URL of the opportunity detail page
  
  // Core opportunity data
  title: v.string(),
  referenceNumber: v.optional(v.string()), // RFP/RFQ/Bid number
  opportunityType: v.optional(v.string()), // RFP, RFQ, ITB, IFB, etc.
  status: v.optional(v.string()), // Open, Closed, Awarded, etc.
  
  // Dates
  postedDate: v.optional(v.string()),
  closingDate: v.optional(v.string()),
  lastModified: v.optional(v.string()),
  
  // Description and details
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  department: v.optional(v.string()),
  estimatedValue: v.optional(v.string()),
  
  // Contact info
  contactName: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  
  // Documents
  documents: v.optional(v.array(v.object({
    name: v.string(),
    url: v.string(),
    type: v.optional(v.string()),
  }))),
  
  // Raw data (for debugging)
  rawScrapedText: v.optional(v.string()),
  
  // Metadata
  scrapedAt: v.number(),
  state: v.string(),
  capital: v.string(),
})
  .index("by_scraped_data", ["scrapedDataId"])
  .index("by_source_url", ["sourceUrl"])
  .index("by_state", ["state"])
  .index("by_closing_date", ["closingDate"])
  .index("by_type", ["opportunityType"]),

// Scraper interaction log - tracks what actions the scraper took
scraperInteractionLog: defineTable({
  scrapedDataId: v.id("scrapedProcurementData"),
  action: v.string(), // "navigate", "click", "scroll", "extract", etc.
  selector: v.optional(v.string()), // CSS selector or element reference
  description: v.string(),
  success: v.boolean(),
  timestamp: v.number(),
  screenshotUrl: v.optional(v.string()), // For debugging
})
  .index("by_scraped_data", ["scrapedDataId"])
  .index("by_timestamp", ["timestamp"]),
```

### 1.2 Frontend Browser Scraper Service

**File**: `src/services/browserScraper.ts`

```typescript
/**
 * Browser-based procurement scraper service
 * Uses Playwright MCP tools to interact with procurement pages
 */

export interface ScrapedOpportunity {
  title: string;
  referenceNumber?: string;
  opportunityType?: string;
  status?: string;
  postedDate?: string;
  closingDate?: string;
  description?: string;
  category?: string;
  department?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  detailUrl?: string;
  documents?: { name: string; url: string; type?: string }[];
  rawScrapedText?: string;
}

export interface ScrapingSession {
  url: string;
  state: string;
  capital: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  opportunities: ScrapedOpportunity[];
  interactions: InteractionLog[];
  error?: string;
}

export interface InteractionLog {
  action: string;
  selector?: string;
  description: string;
  success: boolean;
  timestamp: number;
}

/**
 * Scraping strategy interface - different sites may need different strategies
 */
export interface ScrapingStrategy {
  // Identify if this strategy works for the given URL
  matches: (url: string) => boolean;
  
  // Extract list of opportunities from the main page
  extractOpportunityList: (snapshot: string) => Promise<{
    opportunities: { ref: string; title: string }[];
    hasMore: boolean;
    nextPageRef?: string;
  }>;
  
  // Extract detailed data from an opportunity
  extractOpportunityDetail: (snapshot: string) => Promise<ScrapedOpportunity>;
}

/**
 * Default scraping strategy for generic procurement tables
 */
export const defaultStrategy: ScrapingStrategy = {
  matches: () => true, // Fallback for any URL
  
  extractOpportunityList: async (snapshot: string) => {
    // AI-based extraction - analyze the page snapshot to find opportunity rows
    // This will be called with the accessibility snapshot from MCP
    
    // Look for common patterns:
    // - Table rows with links
    // - Card/grid items with "View", "Details", "Read More" buttons
    // - List items with procurement numbers
    
    const opportunities: { ref: string; title: string }[] = [];
    
    // Parse snapshot and find clickable opportunity elements
    // The snapshot will be from browser_snapshot MCP tool
    
    return {
      opportunities,
      hasMore: false,
    };
  },
  
  extractOpportunityDetail: async (snapshot: string) => {
    // AI-based extraction of detail page content
    return {
      title: '',
    };
  },
};
```

### 1.3 AI-Powered Page Analysis

**File**: `src/services/pageAnalyzer.ts`

```typescript
/**
 * AI-powered page analyzer that understands procurement page structure
 * Uses GPT-4o-mini to analyze page snapshots and determine actions
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // For frontend use
});

export interface PageAnalysis {
  pageType: 'list' | 'detail' | 'login' | 'error' | 'unknown';
  opportunities: {
    ref: string; // Element reference for clicking
    title: string;
    partialData?: Partial<ScrapedOpportunity>;
  }[];
  pagination?: {
    hasNextPage: boolean;
    nextPageRef?: string;
    currentPage?: number;
    totalPages?: number;
  };
  requiresLogin: boolean;
  requiresInteraction?: {
    type: 'accept-cookies' | 'close-modal' | 'load-more' | 'other';
    ref: string;
    description: string;
  };
  suggestedActions: string[];
}

export async function analyzePageSnapshot(
  snapshot: string,
  context: { url: string; state: string; capital: string }
): Promise<PageAnalysis> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert at analyzing government procurement website pages.
Your task is to analyze the accessibility snapshot of a procurement page and identify:

1. PAGE TYPE: Is this a list page (showing multiple opportunities), a detail page (single opportunity), a login page, or an error page?

2. OPPORTUNITIES: If this is a list page, identify each procurement opportunity visible. For each, provide:
   - ref: The element reference (from the snapshot) that would navigate to the detail view
   - title: The opportunity title
   - Any visible data (dates, reference numbers, status)

3. PAGINATION: Is there pagination? Where is the "Next" button?

4. BLOCKERS: Are there any modals, cookie banners, or login requirements blocking content?

5. SUGGESTED ACTIONS: What should the scraper do next?

IMPORTANT: The "ref" values must be EXACT element references from the snapshot (e.g., "D14", "B7").

Return your analysis as JSON.`,
      },
      {
        role: 'user',
        content: `Analyze this procurement page for ${context.capital}, ${context.state}:

URL: ${context.url}

Page Snapshot:
${snapshot}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

export async function extractOpportunityDetail(
  snapshot: string,
  context: { url: string; title: string }
): Promise<ScrapedOpportunity> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert at extracting structured data from government procurement pages.
Extract all available information about this procurement opportunity.

Return a JSON object with these fields (use null for unavailable data):
- title: string
- referenceNumber: string (RFP/RFQ/Bid number)
- opportunityType: string (RFP, RFQ, ITB, IFB, etc.)
- status: string (Open, Closed, Awarded, etc.)
- postedDate: string (YYYY-MM-DD format if possible)
- closingDate: string (YYYY-MM-DD format if possible)  
- description: string (full description)
- category: string (category/classification)
- department: string (issuing department/agency)
- estimatedValue: string
- contactName: string
- contactEmail: string
- contactPhone: string
- documents: array of {name, url, type}

Be thorough but only include data that is actually present on the page.`,
      },
      {
        role: 'user',
        content: `Extract procurement opportunity data from this page:

Expected Title: ${context.title}
URL: ${context.url}

Page Snapshot:
${snapshot}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
```

### 1.4 React Hook for Browser Scraping

**File**: `src/hooks/useBrowserScraper.ts`

```typescript
import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { analyzePageSnapshot, extractOpportunityDetail } from '../services/pageAnalyzer';

interface ScrapingProgress {
  status: 'idle' | 'navigating' | 'analyzing' | 'scraping' | 'completed' | 'error';
  currentStep: string;
  opportunitiesFound: number;
  opportunitiesScraped: number;
  errors: string[];
}

/**
 * Hook for browser-based procurement scraping
 * Uses MCP browser tools to interact with procurement pages
 */
export function useBrowserScraper() {
  const [progress, setProgress] = useState<ScrapingProgress>({
    status: 'idle',
    currentStep: '',
    opportunitiesFound: 0,
    opportunitiesScraped: 0,
    errors: [],
  });

  // Convex mutations to save data
  const saveOpportunity = useMutation(api.procurementScraperMutations.saveOpportunity);
  const logInteraction = useMutation(api.procurementScraperMutations.logInteraction);
  const updateScrapingRecord = useMutation(api.procurementScraperMutations.updateScrapingRecordPublic);

  /**
   * Main scraping function
   * This will be called when user clicks "Scrape" on a procurement link
   */
  const scrapeUrl = useCallback(async (
    url: string,
    state: string,
    capital: string,
    scrapedDataId: string,
    mcpBrowser: {
      navigate: (url: string) => Promise<void>;
      snapshot: () => Promise<string>;
      click: (ref: string, element: string) => Promise<void>;
      waitFor: (options: { time?: number; text?: string }) => Promise<void>;
      navigateBack: () => Promise<void>;
    }
  ) => {
    try {
      setProgress({
        status: 'navigating',
        currentStep: 'Opening procurement page...',
        opportunitiesFound: 0,
        opportunitiesScraped: 0,
        errors: [],
      });

      // Step 1: Navigate to the procurement URL
      await mcpBrowser.navigate(url);
      await mcpBrowser.waitFor({ time: 3 }); // Wait for page to load

      // Step 2: Get page snapshot and analyze
      setProgress(p => ({ ...p, status: 'analyzing', currentStep: 'Analyzing page structure...' }));
      let snapshot = await mcpBrowser.snapshot();
      let analysis = await analyzePageSnapshot(snapshot, { url, state, capital });

      // Handle blockers (cookie banners, modals)
      if (analysis.requiresInteraction) {
        await mcpBrowser.click(
          analysis.requiresInteraction.ref,
          analysis.requiresInteraction.description
        );
        await mcpBrowser.waitFor({ time: 1 });
        snapshot = await mcpBrowser.snapshot();
        analysis = await analyzePageSnapshot(snapshot, { url, state, capital });
      }

      // Check if login required
      if (analysis.requiresLogin) {
        setProgress(p => ({
          ...p,
          status: 'error',
          errors: [...p.errors, 'This site requires login/registration'],
        }));
        return;
      }

      // Step 3: Process opportunities
      setProgress(p => ({
        ...p,
        status: 'scraping',
        opportunitiesFound: analysis.opportunities.length,
        currentStep: `Found ${analysis.opportunities.length} opportunities`,
      }));

      const scrapedOpportunities: any[] = [];

      for (let i = 0; i < analysis.opportunities.length; i++) {
        const opp = analysis.opportunities[i];
        
        setProgress(p => ({
          ...p,
          currentStep: `Scraping opportunity ${i + 1}/${analysis.opportunities.length}: ${opp.title}`,
        }));

        try {
          // Click on the opportunity to open detail view
          await mcpBrowser.click(opp.ref, `Open opportunity: ${opp.title}`);
          await mcpBrowser.waitFor({ time: 2 });

          // Get detail page snapshot
          const detailSnapshot = await mcpBrowser.snapshot();
          
          // Extract opportunity data
          const opportunityData = await extractOpportunityDetail(detailSnapshot, {
            url: url,
            title: opp.title,
          });

          // Save to database
          await saveOpportunity({
            scrapedDataId,
            sourceUrl: url,
            state,
            capital,
            ...opportunityData,
            scrapedAt: Date.now(),
          });

          scrapedOpportunities.push(opportunityData);

          setProgress(p => ({
            ...p,
            opportunitiesScraped: p.opportunitiesScraped + 1,
          }));

          // Navigate back to list
          await mcpBrowser.navigateBack();
          await mcpBrowser.waitFor({ time: 2 });

          // Re-analyze page in case structure changed
          snapshot = await mcpBrowser.snapshot();
          analysis = await analyzePageSnapshot(snapshot, { url, state, capital });

        } catch (error) {
          setProgress(p => ({
            ...p,
            errors: [...p.errors, `Failed to scrape "${opp.title}": ${error}`],
          }));
          
          // Try to recover by navigating back
          try {
            await mcpBrowser.navigateBack();
            await mcpBrowser.waitFor({ time: 2 });
          } catch {
            // If back doesn't work, re-navigate to original URL
            await mcpBrowser.navigate(url);
            await mcpBrowser.waitFor({ time: 3 });
          }
        }
      }

      // Handle pagination if available
      while (analysis.pagination?.hasNextPage && analysis.pagination.nextPageRef) {
        setProgress(p => ({
          ...p,
          currentStep: `Loading next page...`,
        }));

        await mcpBrowser.click(
          analysis.pagination.nextPageRef,
          'Go to next page'
        );
        await mcpBrowser.waitFor({ time: 2 });

        snapshot = await mcpBrowser.snapshot();
        analysis = await analyzePageSnapshot(snapshot, { url, state, capital });

        setProgress(p => ({
          ...p,
          opportunitiesFound: p.opportunitiesFound + analysis.opportunities.length,
        }));

        // Process new opportunities (same loop as above)
        // ... (abbreviated for plan)
      }

      // Update scraping record with final count
      await updateScrapingRecord({
        recordId: scrapedDataId,
        status: 'completed',
        scrapedData: {
          totalOpportunities: scrapedOpportunities.length,
          opportunities: scrapedOpportunities,
        },
      });

      setProgress(p => ({
        ...p,
        status: 'completed',
        currentStep: `Successfully scraped ${scrapedOpportunities.length} opportunities`,
      }));

    } catch (error) {
      setProgress(p => ({
        ...p,
        status: 'error',
        errors: [...p.errors, String(error)],
      }));

      await updateScrapingRecord({
        recordId: scrapedDataId,
        status: 'failed',
        errorMessage: String(error),
      });
    }
  }, [saveOpportunity, logInteraction, updateScrapingRecord]);

  return {
    progress,
    scrapeUrl,
    resetProgress: () => setProgress({
      status: 'idle',
      currentStep: '',
      opportunitiesFound: 0,
      opportunitiesScraped: 0,
      errors: [],
    }),
  };
}
```

### 1.5 Scraper UI Component

**File**: `src/components/ProcurementScraperPanel.tsx`

```tsx
import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useBrowserScraper } from '../hooks/useBrowserScraper';

interface ProcurementScraperPanelProps {
  url: string;
  state: string;
  capital: string;
  scrapedDataId: string;
}

export function ProcurementScraperPanel({
  url,
  state,
  capital,
  scrapedDataId,
}: ProcurementScraperPanelProps) {
  const { progress, scrapeUrl, resetProgress } = useBrowserScraper();
  const [isOpen, setIsOpen] = useState(false);

  // This would integrate with the MCP browser tools
  // The actual implementation depends on how MCP is exposed
  const handleStartScraping = async () => {
    // Open new tab and get MCP browser interface
    // For now, this is a placeholder showing the intended flow
    
    const mcpBrowser = {
      navigate: async (url: string) => {
        // Call mcp_cursor-ide-browser_browser_navigate
      },
      snapshot: async () => {
        // Call mcp_cursor-ide-browser_browser_snapshot
        return '';
      },
      click: async (ref: string, element: string) => {
        // Call mcp_cursor-ide-browser_browser_click
      },
      waitFor: async (options: { time?: number }) => {
        // Call mcp_cursor-ide-browser_browser_wait_for
      },
      navigateBack: async () => {
        // Call mcp_cursor-ide-browser_browser_navigate_back
      },
    };

    await scrapeUrl(url, state, capital, scrapedDataId, mcpBrowser);
  };

  return (
    <div className="border border-tron-cyan/30 rounded-lg p-4 bg-tron-bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-tron-text">
          Browser Scraper
        </h3>
        <button
          onClick={handleStartScraping}
          disabled={progress.status !== 'idle'}
          className="px-4 py-2 bg-tron-cyan text-black rounded hover:bg-tron-cyan/80 disabled:opacity-50"
        >
          {progress.status === 'idle' ? 'Start Scraping' : 'Scraping...'}
        </button>
      </div>

      {/* Progress display */}
      <div className="space-y-2">
        <div className="text-sm text-tron-gray">
          Status: <span className="text-tron-cyan">{progress.status}</span>
        </div>
        <div className="text-sm text-tron-text">{progress.currentStep}</div>
        
        {progress.status !== 'idle' && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              Found: <span className="text-tron-cyan">{progress.opportunitiesFound}</span>
            </div>
            <div>
              Scraped: <span className="text-green-400">{progress.opportunitiesScraped}</span>
            </div>
          </div>
        )}

        {progress.errors.length > 0 && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
            <div className="text-sm text-red-400 font-medium">Errors:</div>
            {progress.errors.map((err, i) => (
              <div key={i} className="text-xs text-red-300">{err}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 2: Background Browser Service (Browserbase)

### 2.1 Browserbase Integration

**File**: `convex/browserbaseClient.ts`

```typescript
"use node";

/**
 * Browserbase client for server-side browser automation
 * https://www.browserbase.com/
 */

import { Browserbase } from "@browserbasehq/sdk";
import { chromium } from "playwright-core";

const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

export async function createBrowserSession(): Promise<{
  sessionId: string;
  connectUrl: string;
}> {
  const session = await browserbase.createSession({
    projectId: process.env.BROWSERBASE_PROJECT_ID,
  });
  
  return {
    sessionId: session.id,
    connectUrl: session.connectUrl,
  };
}

export async function connectToBrowser(connectUrl: string) {
  return await chromium.connectOverCDP(connectUrl);
}

export async function scrapeProcurementWithBrowser(
  url: string,
  state: string,
  capital: string
): Promise<{
  opportunities: any[];
  success: boolean;
  error?: string;
}> {
  let browser;
  
  try {
    const session = await createBrowserSession();
    browser = await connectToBrowser(session.connectUrl);
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    // Navigate to procurement page
    await page.goto(url, { waitUntil: 'networkidle' });

    // AI-powered scraping logic here
    // Similar to frontend approach but running server-side

    const opportunities: any[] = [];
    
    // ... scraping implementation ...

    return {
      opportunities,
      success: true,
    };

  } catch (error) {
    return {
      opportunities: [],
      success: false,
      error: String(error),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
```

### 2.2 Convex Action with Browserbase

**File**: `convex/procurementScraperV2Actions.ts`

```typescript
"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { scrapeProcurementWithBrowser } from "./browserbaseClient";

/**
 * Scrape a procurement URL using Browserbase (cloud browser)
 */
export const scrapeWithBrowser = action({
  args: {
    url: v.string(),
    state: v.string(),
    capital: v.string(),
    scrapedDataId: v.id("scrapedProcurementData"),
  },
  handler: async (ctx, args) => {
    // Update status to in_progress
    await ctx.runMutation(
      internal.procurementScraperMutations.updateScrapingRecord,
      {
        recordId: args.scrapedDataId,
        status: "in_progress",
      }
    );

    try {
      // Use Browserbase for real browser automation
      const result = await scrapeProcurementWithBrowser(
        args.url,
        args.state,
        args.capital
      );

      if (result.success) {
        // Save opportunities
        for (const opp of result.opportunities) {
          await ctx.runMutation(
            internal.procurementScraperMutations.saveOpportunityInternal,
            {
              scrapedDataId: args.scrapedDataId,
              ...opp,
            }
          );
        }

        // Update status to completed
        await ctx.runMutation(
          internal.procurementScraperMutations.updateScrapingRecord,
          {
            recordId: args.scrapedDataId,
            status: "completed",
            scrapedData: {
              totalOpportunities: result.opportunities.length,
            },
          }
        );

        return {
          success: true,
          opportunityCount: result.opportunities.length,
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      await ctx.runMutation(
        internal.procurementScraperMutations.updateScrapingRecord,
        {
          recordId: args.scrapedDataId,
          status: "failed",
          errorMessage: String(error),
        }
      );

      return {
        success: false,
        error: String(error),
      };
    }
  },
});
```

---

## Implementation Roadmap

### Week 1: Frontend Browser Scraper (MVP)

1. **Day 1-2: Schema & Mutations**
   - Add `procurementOpportunities` table to schema
   - Add `scraperInteractionLog` table
   - Create mutations for saving opportunities

2. **Day 3-4: Page Analyzer Service**
   - Implement `pageAnalyzer.ts` with GPT-4o-mini integration
   - Test with sample procurement page snapshots
   - Refine prompts for accurate element identification

3. **Day 5-6: Browser Scraper Hook**
   - Implement `useBrowserScraper.ts` hook
   - Integrate with MCP browser tools
   - Handle error cases and recovery

4. **Day 7: UI Integration**
   - Add scraper panel to HR Dashboard
   - Show real-time progress
   - Display scraped opportunities

### Week 2: Enhancement & Background Service

1. **Day 1-2: Testing & Refinement**
   - Test with 10+ different procurement sites
   - Refine AI prompts based on real results
   - Handle edge cases (pagination, modals, etc.)

2. **Day 3-4: Browserbase Integration**
   - Set up Browserbase account
   - Implement `browserbaseClient.ts`
   - Create background scraping action

3. **Day 5-6: Scheduled Scraping**
   - Add scheduled function for daily scraping
   - Implement rate limiting and retry logic
   - Add notification system for new opportunities

4. **Day 7: Polish & Documentation**
   - UI polish
   - Error handling improvements
   - Documentation

---

## Key Design Decisions

### 1. Why MCP Browser Tools for MVP?

- Already available in the development environment
- No additional infrastructure needed
- Real browser = no JS rendering issues
- Good for testing and iteration

### 2. Why AI-Powered Page Analysis?

- Procurement sites are highly variable
- No universal CSS selectors work everywhere
- AI can understand semantic structure
- Adapts to site changes automatically

### 3. Why Store Individual Opportunities?

- Enables searching across all opportunities
- Better data structure for analytics
- Supports filtering by date, type, state
- Easier to track changes over time

### 4. Why Browserbase for Phase 2?

- Cloud-hosted browser = no server management
- Scales automatically
- Supports scheduled/background scraping
- Reliable infrastructure

---

## Environment Variables Required

```bash
# For frontend AI analysis
VITE_OPENAI_API_KEY=sk-...

# For Browserbase (Phase 2)
BROWSERBASE_API_KEY=bb_...
BROWSERBASE_PROJECT_ID=proj_...
```

---

## Success Metrics

1. **Scrape Success Rate**: >80% of approved links successfully scraped
2. **Data Quality**: >70% of opportunities have complete core fields
3. **Processing Time**: <30 seconds per opportunity
4. **Error Recovery**: Automatic recovery from 90%+ of transient errors

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Sites block scraping | Use residential proxies (Browserbase) |
| Dynamic content not loading | Wait for networkidle, add explicit waits |
| AI misidentifies elements | Add fallback strategies, human review |
| Rate limiting | Implement delays, respect robots.txt |
| Cost overruns | Set budget limits, optimize API calls |

---

## Next Steps

1. Review this plan and approve approach
2. Set up environment variables
3. Begin Phase 1 implementation
4. Test with 3-5 procurement sites before full rollout







