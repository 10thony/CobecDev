# Autonomous Procurement Scraper - System Card

## Overview

The Autonomous Procurement Scraper is an AI-native browser automation system designed to extract procurement opportunities from government portals that vary wildly in implementation. Unlike traditional scrapers that rely on brittle CSS selectors, this system uses Vision-Language Models (VLMs) to understand and navigate portals like a human would, making it resilient to different UI implementations, legacy technologies (ASP.NET Postbacks, nested iframes, Shadow DOM), and varying navigation patterns.

**Core Problem:** Government procurement portals are notoriously inconsistent. Each portal may use different:
- Navigation patterns (pagination, infinite scroll, AJAX loading)
- Technologies (ASP.NET, React, Vue, vanilla JavaScript)
- UI structures (tables, cards, lists, modals)
- Authentication mechanisms
- CAPTCHA/anti-bot measures

**Solution:** An autonomous agent that uses AI to "see" and "understand" the page, then make intelligent decisions about what to click, where to navigate, and what data to extract.

---

## Part 1: The Architecture

### 1.1 Three-Layer Architecture

The system is built on three distinct layers that work together:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 1: Convex (The Brain)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • State Management (portals, opportunities, jobs)       │   │
│  │  • Workflow Orchestration (cron jobs, batch processing)  │   │
│  │  • Data Persistence (scraped data, metadata, logs)       │   │
│  │  • API Gateway (actions, mutations, queries)             │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                │ (Actions, Webhooks)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Layer 2: Browser Agent (The Muscle)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • Headless Browser (Playwright/Puppeteer)               │   │
│  │  • Page Navigation & Interaction                         │   │
│  │  • Screenshot Capture                                    │   │
│  │  • DOM Manipulation                                      │   │
│  │  • JavaScript Execution                                  │   │
│  │  • Network Request Interception                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ API Calls
                                │ (Vision + Text)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Layer 3: LLM (The Decision Maker)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • Vision-Language Model (GPT-4-mini)    │   │
│  │  • Page Understanding (screenshot analysis)              │   │
│  │  • Action Planning (what to click, where to navigate)    │   │
│  │  • Data Extraction (identify relevant fields)            │   │
│  │  • Error Recovery (handle unexpected UI states)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Convex Layer: The Brain

**Purpose:** Centralized state management, workflow orchestration, and data persistence.

#### Responsibilities:

1. **Portal Management**
   - Track which portals need scraping
   - Monitor scraping status (pending, processing, completed, failed)
   - Store portal-specific configuration (authentication, selectors, navigation hints)
   - Track last successful scrape timestamp

2. **Workflow Orchestration**
   - Schedule scraping jobs via Convex Crons
   - Queue URLs for processing
   - Manage batch jobs with cancellation support
   - Handle retries and error recovery

3. **Data Persistence**
   - Store scraped opportunities with full metadata
   - Track scraping history and data quality metrics
   - Log all agent interactions for debugging
   - Maintain audit trail of changes

4. **API Gateway**
   - Expose actions for triggering scrapes
   - Provide queries for retrieving scraped data
   - Handle mutations for updating state
   - Support real-time subscriptions for progress tracking

#### Key Convex Components:

```typescript
// Schema Structure
portals: {
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
  lastScraped: number;
  configuration: {
    requiresAuth: boolean;
    authMethod?: "none" | "form" | "oauth";
    navigationPattern?: "pagination" | "infinite-scroll" | "ajax";
    knownSelectors?: Record<string, string>; // Optional hints
  };
}

scrapingBatchJobs: {
  status: "pending" | "in_progress" | "completed" | "cancelled";
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  startedAt: number;
  completedAt?: number;
}

scrapedProcurementData: {
  portalId: Id<"portals">;
  status: "in_progress" | "completed" | "failed";
  scrapedData: any; // Flexible JSON
  dataQuality: "high" | "medium" | "low";
  agentInteractions: Array<{
    action: string;
    timestamp: number;
    screenshot?: string;
    result: "success" | "failure";
  }>;
}

procurementOpportunities: {
  scrapedDataId: Id<"scrapedProcurementData">;
  title: string;
  referenceNumber?: string;
  closingDate?: string;
  // ... other fields
}
```

#### Convex Actions:

- `scrapePortal`: Trigger scraping for a single portal URL
- `scrapeAllApprovedLinks`: Batch scrape all approved procurement links
- `processBatchJob`: Internal action to process queued URLs
- `cancelBatchJob`: Cancel an in-progress batch job

#### Convex Mutations:

- `createScrapingRecord`: Initialize a new scraping session
- `updateScrapingRecord`: Update progress and results
- `saveOpportunities`: Store extracted opportunities
- `updatePortalStatus`: Update portal scraping status

#### Convex Queries:

- `getScrapingStatus`: Get current status of a scraping job
- `listOpportunities`: Query scraped opportunities with filters
- `getBatchJobProgress`: Get progress of batch scraping jobs

### 1.3 Browser Agent Layer: The Muscle

**Purpose:** Execute browser automation tasks that Convex cannot do natively (due to security and execution environment constraints).

#### Why Separate from Convex?

1. **Security Restrictions:** Convex runs in a sandboxed environment and cannot:
   - Run headless browsers (Puppeteer/Playwright)
   - Execute arbitrary JavaScript in browser contexts
   - Handle cross-origin iframe interactions
   - Bypass CORS restrictions

2. **Resource Constraints:** Browser automation requires:
   - Significant memory (browser instances)
   - Long-running processes (navigation, waiting)
   - Network access to external websites
   - Screenshot capture and image processing

3. **Execution Model:** Convex functions are:
   - Stateless and short-lived
   - Designed for quick database operations
   - Not suitable for multi-minute browser sessions

#### Browser Agent Responsibilities:

1. **Browser Lifecycle Management**
   - Launch and manage headless browser instances
   - Handle browser crashes and recovery
   - Manage browser context (cookies, localStorage, sessionStorage)
   - Clean up resources after scraping

2. **Page Navigation**
   - Navigate to URLs
   - Wait for page load (handling dynamic content)
   - Handle redirects and authentication flows
   - Manage multiple tabs/windows if needed

3. **Interaction Execution**
   - Click buttons, links, and form elements
   - Fill out forms (login, search, filters)
   - Scroll pages (for infinite scroll or lazy loading)
   - Handle modals, popups, and overlays
   - Execute JavaScript in page context

4. **Data Capture**
   - Capture screenshots for VLM analysis
   - Extract DOM content (HTML, text)
   - Intercept network requests (for API data)
   - Capture console logs and errors

5. **State Management**
   - Track navigation history (for "back" button logic)
   - Remember clicked elements (avoid duplicates)
   - Handle pagination state
   - Manage session state across page navigations

#### Browser Agent Implementation Options:

**Option A: Standalone Node.js Service**
- Run as a separate microservice
- Deploy on a server (AWS EC2, Google Cloud Run, Railway)
- Communicate with Convex via HTTP webhooks or Convex Actions
- Full control over browser instances and resources

**Option B: Serverless Function (AWS Lambda, Vercel Functions)**
- Deploy as serverless function
- Use services like Browserless.io for browser instances
- Pay-per-use model
- Limited execution time (may need chunking for long scrapes)

**Option C: Managed Browser Service**
- Use services like Browserless.io, ScrapingBee, or Apify
- They handle browser infrastructure
- You provide instructions via API
- Higher cost but less maintenance

**Option D: Convex Action with External API**
- Keep Convex Action as orchestrator
- Call external browser automation API (Firecrawl, AgentQL)
- They handle the browser + LLM integration
- Simplest integration but least control

### 1.4 LLM Layer: The Decision Maker

**Purpose:** Make intelligent decisions about navigation and data extraction using vision and language understanding.

#### Why LLM Instead of Selectors?

Traditional scraping relies on CSS selectors like:
```javascript
document.querySelector('.btn-primary') // Breaks when class changes
document.querySelector('#next-page')   // Breaks when ID changes
```

**Problems:**
- Selectors are brittle and break with UI changes
- Different portals use different structures
- Legacy portals may not have semantic HTML
- Dynamic content may not be in DOM initially

**LLM Solution:**
- Uses Vision-Language Models to "see" the page
- Understands intent ("find the next button") rather than structure
- Adapts to different UI patterns automatically
- Can handle visual elements (icons, images) that aren't in HTML

#### LLM Responsibilities:

1. **Page Understanding**
   - Analyze screenshots to understand page layout
   - Identify key UI elements (buttons, links, tables, forms)
   - Understand page context (list page, detail page, login page)
   - Detect page state (loading, error, success)

2. **Action Planning**
   - Decide what action to take next:
     - "Click the 'Next' button"
     - "Extract data from the table"
     - "Navigate back to the list"
     - "Wait for page to load"
   - Generate step-by-step plans for complex workflows
   - Handle conditional logic (if X, then Y)

3. **Data Extraction**
   - Identify relevant data fields:
     - "This is the opportunity title"
     - "This is the closing date"
     - "This is the contact email"
   - Extract structured data from unstructured pages
   - Handle multiple formats (dates, currencies, phone numbers)

4. **Error Recovery**
   - Detect when something went wrong:
     - "The page didn't load"
     - "The button I tried to click doesn't exist"
     - "I'm stuck in a loop"
   - Suggest recovery actions:
     - "Try scrolling down first"
     - "Wait 2 seconds and retry"
     - "Navigate back and try a different approach"

#### LLM Integration Patterns:

**Pattern 1: Vision-Language Model (Recommended)**
- Use GPT-5-mini
- Send screenshot + text prompt
- LLM returns structured action plan
- Browser agent executes actions
- Repeat until goal achieved

**Pattern 2: Tool-Using Agent**
- LLM has access to browser tools:
  - `click(element_description)`
  - `navigate(url)`
  - `extract_data(field_name)`
  - `take_screenshot()`
- LLM decides which tool to call
- Tools execute and return results
- LLM uses results to plan next step

**Pattern 3: Hybrid Approach**
- Use VLM for initial page understanding
- Use structured extraction for known patterns
- Fall back to VLM for unexpected UI

#### LLM Prompt Engineering:

**System Prompt Example:**
```
You are an autonomous web scraping agent for government procurement portals.

Your goal is to:
1. Navigate to a procurement portal
2. Find all active procurement opportunities
3. Extract key information (title, date, description, contact)
4. Navigate through pagination if needed
5. Return structured JSON data

You have access to:
- Screenshot of the current page
- DOM content (HTML)
- Browser tools (click, navigate, scroll, extract)

When you see a page:
1. Analyze the screenshot to understand the layout
2. Identify the list of opportunities (may be in a table, cards, or list)
3. For each opportunity, extract the data
4. If there's a "Next" or pagination control, plan to click it
5. If you're on a detail page, extract all fields and navigate back

Handle edge cases:
- Pages that require JavaScript to load content
- Forms that need to be filled (search, filters)
- Modals or popups that block interaction
- Authentication requirements
- CAPTCHA challenges (report these, don't try to solve)
```

**User Prompt Example:**
```
I'm currently on: https://procurement.example.gov/opportunities

Current page screenshot: [base64_image]
Current page HTML: [html_content]

Please:
1. Identify all procurement opportunities on this page
2. Extract: title, reference number, closing date, description
3. If there are more pages, tell me what to click to go to the next page
4. Return data in this format:
{
  "opportunities": [...],
  "nextAction": "click_button" | "extract_complete" | "navigate_back",
  "nextActionDescription": "Click the 'Next' button in the pagination"
}
```

---

## Part 2: The Tech Stack Recommendation

### 2.1 Why AI-Native Browser Automation?

Traditional scraping tools (BeautifulSoup, Scrapy, Selenium) rely on:
- **CSS Selectors:** Break when HTML structure changes
- **XPath:** Even more brittle than CSS
- **Fixed Navigation Patterns:** Assumes consistent UI
- **Manual Coding:** Requires writing custom code per portal

**AI-Native Tools** solve this by:
- **Natural Language Instructions:** "Find the next page button" instead of `.btn-pagination`
- **Visual Understanding:** Understands pages from screenshots, not just HTML
- **Adaptive Behavior:** Handles different UI patterns automatically
- **Self-Correcting:** Can recover from errors and try alternative approaches

### 2.2 Recommended Tools

#### Option 1: Browser-Use (Python/Node.js) ⭐ **Recommended**

**What it is:** A library that lets LLMs control browsers using natural language.

**Key Features:**
- Integrates with OpenAI, Anthropic, or local LLMs
- Provides browser tools (click, type, scroll, screenshot)
- LLM decides which tool to use based on page content
- Handles complex navigation flows automatically

**Architecture:**
```
Browser-Use Agent
├── Browser (Playwright/Puppeteer)
├── LLM (GPT-5-mini)
├── Tool System (click, type, navigate, extract)
└── State Management (navigation history, extracted data)
```

**Integration with Convex:**
```typescript
// convex/scrapeActions.ts
export const scrapePortal = action({
  args: { url: v.string(), portalId: v.id("portals") },
  handler: async (ctx, args) => {
    // Call your Browser-Use service (running separately)
    const response = await fetch("https://your-browser-agent-service.com/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: args.url,
        instructions: "Find all procurement opportunities, extract title/date/description, navigate through all pages"
      })
    });

    const data = await response.json();

    // Save to Convex
    await ctx.runMutation(internal.portals.saveResults, {
      portalId: args.portalId,
      opportunities: data.opportunities
    });
  }
});
```

**Browser-Use Service (Node.js):**
```typescript
// browser-agent-service/index.ts
import { Browser, Page } from "playwright";
import { createBrowserUseAgent } from "browser-use";

async function scrapePortal(url: string, instructions: string) {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const agent = createBrowserUseAgent({
    llm: openai("gpt-5-mini"), // or anthropic("claude-3-5-sonnet")
    browser: page
  });

  await page.goto(url);
  
  const result = await agent.run(instructions);
  // Result contains extracted data and navigation history
  
  await browser.close();
  return result;
}
```

**Pros:**
- Full control over browser and LLM
- Can customize behavior per portal
- Open source and extensible
- Works with any LLM provider

**Cons:**
- Requires running a separate service
- Need to manage browser infrastructure
- More setup and maintenance

#### Option 2: AgentQL ⭐ **Good for Quick Start**

**What it is:** An API service that provides AI-powered browser automation.

**Key Features:**
- Managed service (no infrastructure to manage)
- Natural language queries: "Find the next page button"
- Returns element selectors or executes actions
- Handles complex pages automatically

**Integration:**
```typescript
// convex/scrapeActions.ts
export const scrapePortal = action({
  args: { url: v.string(), portalId: v.id("portals") },
  handler: async (ctx, args) => {
    // AgentQL API call
    const response = await fetch("https://api.agentql.com/v1/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.AGENTQL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: args.url,
        query: "Find all procurement opportunities and extract their details",
        actions: ["extract", "navigate"]
      })
    });

    const data = await response.json();
    // AgentQL returns structured data
    await ctx.runMutation(internal.portals.saveResults, {
      portalId: args.portalId,
      opportunities: data.opportunities
    });
  }
});
```

**Pros:**
- No infrastructure to manage
- Simple API integration
- Handles browser automation internally
- Good for prototyping

**Cons:**
- Less control over browser behavior
- API costs per request
- May not handle all edge cases
- Vendor lock-in

#### Option 3: Firecrawl ⭐ **Best for Content Extraction**

**What it is:** An AI-powered web scraping API that handles JavaScript rendering and extraction.

**Key Features:**
- Handles JavaScript-heavy sites
- AI-powered data extraction
- Can follow links and pagination
- Returns clean, structured data

**Integration:**
```typescript
// convex/scrapeActions.ts
export const scrapePortal = action({
  args: { url: v.string(), portalId: v.id("portals") },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: args.url,
        pageOptions: {
          onlyMainContent: true,
          includeHtml: false
        },
        extract: {
          schema: {
            type: "object",
            properties: {
              opportunities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    closingDate: { type: "string" },
                    description: { type: "string" }
                  }
                }
              }
            }
          }
        }
      })
    });

    const data = await response.json();
    await ctx.runMutation(internal.portals.saveResults, {
      portalId: args.portalId,
      opportunities: data.data.extract.opportunities
    });
  }
});
```

**Pros:**
- Excellent at content extraction
- Handles JavaScript rendering
- Simple API
- Good documentation

**Cons:**
- Less control over navigation
- May struggle with complex authentication
- Primarily focused on extraction, not complex navigation

#### Option 4: Custom Playwright + LLM Integration

**What it is:** Build your own browser automation with Playwright and integrate an LLM for decision-making.

**Architecture:**
```typescript
// browser-agent/agent.ts
import { Page } from "playwright";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

class ProcurementScraperAgent {
  constructor(private page: Page) {}

  async analyzePage(): Promise<ActionPlan> {
    // Take screenshot
    const screenshot = await this.page.screenshot({ encoding: "base64" });
    const html = await this.page.content();

    // Ask LLM what to do
    const { text } = await generateText({
      model: openai("gpt-5-mini"),
      prompt: `
        You are analyzing a procurement portal page.
        Screenshot: [base64 image]
        HTML: ${html.substring(0, 5000)}
        
        What should I do next?
        1. Extract opportunities from this page
        2. Click pagination to go to next page
        3. Navigate to a detail page
        4. Handle an error or unexpected state
        
        Return JSON: { action: "...", description: "...", selectors: [...] }
      `
    });

    return JSON.parse(text);
  }

  async executeAction(plan: ActionPlan) {
    switch (plan.action) {
      case "extract":
        return await this.extractOpportunities();
      case "click":
        await this.page.click(plan.selectors[0]);
        await this.page.waitForLoadState("networkidle");
        return await this.analyzePage(); // Recursive
      case "navigate":
        await this.page.goto(plan.url);
        return await this.analyzePage();
    }
  }
}
```

**Pros:**
- Full control over everything
- Can customize for specific portals
- No vendor dependencies
- Can optimize for your use case

**Cons:**
- Most development effort
- Need to handle all edge cases
- LLM integration complexity
- Infrastructure management

### 2.3 Comparison Matrix

| Tool | Setup Complexity | Control Level | Cost | Best For |
|------|-----------------|---------------|------|----------|
| **Browser-Use** | Medium | High | Low (self-hosted) | Full control, custom logic |
| **AgentQL** | Low | Medium | Medium (API) | Quick start, managed service |
| **Firecrawl** | Low | Low | Medium (API) | Content extraction focus |
| **Custom Playwright** | High | Very High | Low (self-hosted) | Maximum customization |

### 2.4 Recommendation: Hybrid Approach

**For MVP/Prototype:**
- Start with **Firecrawl** or **AgentQL** for quick validation
- Test on 5-10 different portals
- Identify common patterns and pain points

**For Production:**
- Migrate to **Browser-Use** or **Custom Playwright** for:
  - Better control over navigation
  - Portal-specific optimizations
  - Cost optimization (self-hosted)
  - Handling complex authentication flows

**For Specific Portals:**
- Use **Firecrawl** for simple, content-focused portals
- Use **Browser-Use** for complex navigation flows
- Use **Custom Playwright** for portals with unique requirements

---

## Part 3: Implementation Plan (with Convex)

### 3.1 Phase 1: Schema Design

#### 3.1.1 Portal Configuration Table

Store portal-specific settings and metadata:

```typescript
// convex/schema.ts
portals: defineTable({
  // Basic Info
  url: v.string(),
  name: v.string(), // "State of California Procurement Portal"
  state: v.string(),
  capital: v.string(),
  
  // Status Tracking
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("paused")
  ),
  lastScraped: v.optional(v.number()),
  lastSuccessfulScrape: v.optional(v.number()),
  consecutiveFailures: v.number(), // Track failure streaks
  
  // Configuration
  configuration: v.object({
    // Authentication
    requiresAuth: v.boolean(),
    authMethod: v.optional(v.union(
      v.literal("none"),
      v.literal("form"),
      v.literal("oauth"),
      v.literal("api_key")
    )),
    authCredentials: v.optional(v.object({
      username: v.optional(v.string()),
      password: v.optional(v.string()),
      apiKey: v.optional(v.string()),
    })),
    
    // Navigation Hints (optional, for optimization)
    navigationPattern: v.optional(v.union(
      v.literal("pagination"),
      v.literal("infinite-scroll"),
      v.literal("ajax-load"),
      v.literal("single-page")
    )),
    knownSelectors: v.optional(v.object({
      opportunityList: v.optional(v.string()), // CSS selector hint
      nextButton: v.optional(v.string()),
      detailLink: v.optional(v.string()),
    })),
    
    // Scraping Strategy
    scrapingMethod: v.union(
      v.literal("ai-agent"),      // Full AI agent (Browser-Use)
      v.literal("ai-extraction"), // AI extraction only (Firecrawl)
      v.literal("hybrid")         // Mix of both
    ),
    maxPages: v.optional(v.number()), // Limit pagination depth
    rateLimit: v.optional(v.number()), // Delay between requests (ms)
    
    // Error Handling
    retryOnFailure: v.boolean(),
    maxRetries: v.number(),
    retryDelay: v.number(), // ms
  }),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_status", ["status"])
  .index("by_state", ["state"])
  .index("by_last_scraped", ["lastScraped"])
```

#### 3.1.2 Scraping Session Table

Track individual scraping sessions:

```typescript
scrapedProcurementData: defineTable({
  // References
  portalId: v.id("portals"),
  procurementLinkId: v.optional(v.id("procurementUrls")),
  
  // Source Info
  sourceUrl: v.string(),
  state: v.string(),
  capital: v.string(),
  
  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled")
  ),
  
  // Timing
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  duration: v.optional(v.number()), // ms
  
  // Results
  scrapedData: v.any(), // Flexible JSON structure
  opportunitiesFound: v.number(),
  opportunitiesExtracted: v.number(),
  
  // Quality Metrics
  dataQuality: v.optional(v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
  )),
  dataCompleteness: v.optional(v.number()), // 0-1
  
  // Agent Metadata
  agentType: v.optional(v.string()), // "browser-use", "firecrawl", etc.
  agentInteractions: v.optional(v.array(v.object({
    step: v.number(),
    action: v.string(), // "navigate", "click", "extract", "wait"
    description: v.string(),
    timestamp: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    screenshot: v.optional(v.string()), // Base64 or URL
  }))),
  
  // AI Metadata
  aiModel: v.optional(v.string()),
  aiPrompt: v.optional(v.string()),
  tokensUsed: v.optional(v.number()),
  
  // Errors
  errorMessage: v.optional(v.string()),
  errorType: v.optional(v.string()),
  errorStack: v.optional(v.string()),
  
  // Metadata
  scrapedBy: v.string(), // User ID or "system"
  updatedAt: v.number(),
})
  .index("by_portal", ["portalId"])
  .index("by_status", ["status"])
  .index("by_started_at", ["startedAt"])
```

#### 3.1.3 Opportunities Table

Store individual procurement opportunities:

```typescript
procurementOpportunities: defineTable({
  // Source Tracking
  scrapedDataId: v.id("scrapedProcurementData"),
  portalId: v.id("portals"),
  sourceUrl: v.string(),
  detailUrl: v.optional(v.string()),
  
  // Location
  state: v.string(),
  capital: v.string(),
  
  // Core Data
  title: v.string(),
  referenceNumber: v.optional(v.string()),
  opportunityType: v.optional(v.string()), // RFP, RFQ, ITB, etc.
  status: v.optional(v.string()), // Open, Closed, Awarded
  
  // Dates
  postedDate: v.optional(v.string()),
  closingDate: v.optional(v.string()),
  lastModified: v.optional(v.string()),
  
  // Description
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  department: v.optional(v.string()),
  estimatedValue: v.optional(v.string()),
  
  // Contact
  contactName: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  
  // Documents
  documents: v.optional(v.array(v.object({
    name: v.string(),
    url: v.string(),
    type: v.optional(v.string()), // PDF, DOC, etc.
  }))),
  
  // Raw Data
  rawScrapedText: v.optional(v.string()),
  rawData: v.optional(v.any()), // Full JSON from scraper
  
  // Metadata
  scrapedAt: v.number(),
  dataQuality: v.optional(v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
  )),
})
  .index("by_scraped_data", ["scrapedDataId"])
  .index("by_portal", ["portalId"])
  .index("by_state", ["state"])
  .index("by_closing_date", ["closingDate"])
  .index("by_type", ["opportunityType"])
```

#### 3.1.4 Batch Jobs Table

Track batch scraping operations:

```typescript
scrapingBatchJobs: defineTable({
  // Job Info
  jobType: v.union(
    v.literal("all_approved"),
    v.literal("selected_portals"),
    v.literal("single_portal")
  ),
  userId: v.string(),
  
  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("cancelled"),
    v.literal("failed")
  ),
  
  // Progress
  totalUrls: v.number(),
  completedUrls: v.number(),
  failedUrls: v.number(),
  urls: v.array(v.string()),
  
  // Results
  recordIds: v.array(v.id("scrapedProcurementData")),
  
  // Timing
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  estimatedCompletion: v.optional(v.number()),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_status", ["status"])
  .index("by_started_at", ["startedAt"])
```

### 3.2 Phase 2: Browser Agent Service

#### 3.2.1 Service Architecture

**Option A: Node.js Microservice (Recommended)**

```
browser-agent-service/
├── src/
│   ├── index.ts              # Express server
│   ├── agents/
│   │   ├── browserUseAgent.ts
│   │   ├── firecrawlAgent.ts
│   │   └── customAgent.ts
│   ├── browser/
│   │   ├── browserManager.ts  # Launch/manage browsers
│   │   └── pageHandler.ts     # Page interactions
│   ├── llm/
│   │   ├── openaiClient.ts
│   │   └── anthropicClient.ts
│   └── utils/
│       ├── screenshot.ts
│       └── dataExtraction.ts
├── package.json
└── Dockerfile
```

**Express Server:**
```typescript
// browser-agent-service/src/index.ts
import express from "express";
import { BrowserUseAgent } from "./agents/browserUseAgent";
import { ConvexClient } from "convex/browser";

const app = express();
app.use(express.json());

const convex = new ConvexClient(process.env.CONVEX_URL!);

// Scrape endpoint
app.post("/scrape", async (req, res) => {
  const { url, portalId, instructions } = req.body;
  
  try {
    const agent = new BrowserUseAgent({
      llm: "gpt-5-mini",
      headless: true
    });
    
    const result = await agent.scrape(url, instructions);
    
    // Send results back to Convex
    await convex.mutation(internal.portals.saveResults, {
      portalId,
      opportunities: result.opportunities,
      interactions: result.interactions
    });
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(3000, () => {
  console.log("Browser agent service running on port 3000");
});
```

**Browser-Use Agent Implementation:**
```typescript
// browser-agent-service/src/agents/browserUseAgent.ts
import { chromium, Browser, Page } from "playwright";
import { createBrowserUseAgent } from "browser-use";
import { openai } from "@ai-sdk/openai";

export class BrowserUseAgent {
  private browser: Browser | null = null;

  async scrape(url: string, instructions: string) {
    // Launch browser
    this.browser = await chromium.launch({ 
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    
    const page = await this.browser.newPage();
    
    // Create agent
    const agent = createBrowserUseAgent({
      llm: openai("gpt-5-mini"),
      browser: page,
      systemPrompt: `
        You are scraping a government procurement portal.
        Your goal: ${instructions}
        
        Steps:
        1. Navigate to the URL
        2. Find all procurement opportunities
        3. Extract: title, reference number, closing date, description, contact info
        4. If pagination exists, navigate through all pages
        5. Return structured JSON with all opportunities
        
        Handle edge cases:
        - Pages that load slowly (wait for content)
        - JavaScript-rendered content (wait for it to appear)
        - Forms or filters (fill them if needed)
        - Authentication (report if required)
      `
    });
    
    // Navigate and scrape
    await page.goto(url, { waitUntil: "networkidle" });
    
    const interactions = [];
    let opportunities = [];
    let hasMorePages = true;
    let pageNumber = 1;
    
    while (hasMorePages && pageNumber <= 10) { // Limit to 10 pages
      // Take screenshot for LLM
      const screenshot = await page.screenshot({ encoding: "base64" });
      
      // Ask agent what to do
      const action = await agent.run(`
        Current page: ${pageNumber}
        Screenshot: [attached]
        
        Please:
        1. Extract all opportunities from this page
        2. Determine if there's a next page
        3. If yes, tell me how to navigate to it
      `);
      
      interactions.push({
        step: pageNumber,
        action: action.type,
        description: action.description,
        timestamp: Date.now(),
        success: action.success
      });
      
      if (action.opportunities) {
        opportunities.push(...action.opportunities);
      }
      
      if (action.nextPage) {
        // Execute navigation
        if (action.nextPage.type === "click") {
          await page.click(action.nextPage.selector);
          await page.waitForLoadState("networkidle");
          pageNumber++;
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    }
    
    await this.browser.close();
    
    return {
      opportunities,
      interactions,
      totalPages: pageNumber
    };
  }
}
```

#### 3.2.2 Deployment Options

**Option 1: Docker Container (Recommended)**
```dockerfile
# browser-agent-service/Dockerfile
FROM node:18-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
  chromium \
  chromium-sandbox \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "src/index.js"]
```

Deploy to:
- AWS ECS/Fargate
- Google Cloud Run
- Railway
- Render

**Option 2: Serverless Function**
Use services that support long-running functions:
- AWS Lambda (with container images, 15 min limit)
- Google Cloud Functions (Gen 2, 60 min limit)
- Vercel Pro (serverless functions)

**Option 3: Managed Browser Service**
- Browserless.io
- ScrapingBee
- Apify

### 3.3 Phase 3: Convex Integration

#### 3.3.1 Actions for Triggering Scrapes

```typescript
// convex/procurementScraperActions.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Scrape a single portal using the browser agent service
 */
export const scrapePortal = action({
  args: {
    portalId: v.id("portals"),
    url: v.optional(v.string()), // Override portal URL if needed
  },
  handler: async (ctx, args) => {
    // Get portal configuration
    const portal = await ctx.runQuery(internal.portals.getPortal, {
      portalId: args.portalId
    });
    
    if (!portal) {
      throw new Error("Portal not found");
    }
    
    const targetUrl = args.url || portal.url;
    
    // Create scraping record
    const recordId = await ctx.runMutation(
      internal.procurementScraperMutations.createScrapingRecord,
      {
        portalId: args.portalId,
        sourceUrl: targetUrl,
        state: portal.state,
        capital: portal.capital,
      }
    );
    
    // Update portal status
    await ctx.runMutation(internal.portals.updatePortalStatus, {
      portalId: args.portalId,
      status: "processing",
    });
    
    try {
      // Call browser agent service
      const agentServiceUrl = process.env.BROWSER_AGENT_SERVICE_URL!;
      const response = await fetch(`${agentServiceUrl}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          portalId: args.portalId,
          instructions: `
            Scrape all procurement opportunities from this portal.
            Extract: title, reference number, closing date, description, contact info, documents.
            Navigate through all pages if pagination exists.
          `,
          configuration: portal.configuration,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Agent service error: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Scraping failed");
      }
      
      // Save opportunities
      await ctx.runMutation(
        internal.procurementScraperMutations.saveOpportunities,
        {
          recordId,
          opportunities: result.result.opportunities,
          interactions: result.result.interactions,
        }
      );
      
      // Update scraping record
      await ctx.runMutation(
        internal.procurementScraperMutations.updateScrapingRecord,
        {
          recordId,
          status: "completed",
          opportunitiesFound: result.result.opportunities.length,
          opportunitiesExtracted: result.result.opportunities.length,
          agentInteractions: result.result.interactions,
        }
      );
      
      // Update portal
      await ctx.runMutation(internal.portals.updatePortalStatus, {
        portalId: args.portalId,
        status: "completed",
        lastScraped: Date.now(),
        lastSuccessfulScrape: Date.now(),
        consecutiveFailures: 0,
      });
      
      return {
        success: true,
        recordId,
        opportunitiesFound: result.result.opportunities.length,
      };
    } catch (error) {
      // Update record with error
      await ctx.runMutation(
        internal.procurementScraperMutations.updateScrapingRecord,
        {
          recordId,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        }
      );
      
      // Update portal
      await ctx.runMutation(internal.portals.updatePortalStatus, {
        portalId: args.portalId,
        status: "failed",
        consecutiveFailures: portal.consecutiveFailures + 1,
      });
      
      throw error;
    }
  },
});
```

#### 3.3.2 Scheduled Scraping with Convex Crons

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Scrape all portals daily at 2 AM
crons.daily(
  "scrapeAllPortals",
  {
    hourUTC: 2,
    minuteUTC: 0,
  },
  internal.procurementScraperActions.scrapeAllPortalsScheduled
);

// Scrape failed portals every 6 hours
crons.interval(
  "retryFailedPortals",
  { hours: 6 },
  internal.procurementScraperActions.retryFailedPortals
);
```

```typescript
// convex/procurementScraperActions.ts
export const scrapeAllPortalsScheduled = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all portals that should be scraped
    const portals = await ctx.runQuery(internal.portals.getPortalsToScrape, {
      status: "pending",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < portals.length; i += batchSize) {
      const batch = portals.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(portal =>
          ctx.runAction(api.procurementScraperActions.scrapePortal, {
            portalId: portal._id,
          })
        )
      );
      
      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  },
});
```

### 3.4 Phase 4: Handling Inconsistent UI

#### 3.4.1 Vision-Language Model Approach

**The Problem:**
- Different portals use different HTML structures
- CSS classes/IDs are not consistent
- Some portals use images/icons instead of text
- Legacy portals may have non-semantic HTML

**The Solution:**
Use Vision-Language Models (VLMs) that can "see" the page and understand it visually, not just through HTML.

**Implementation:**
```typescript
// browser-agent-service/src/llm/visionAnalyzer.ts
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const ActionPlanSchema = z.object({
  action: z.enum(["extract", "click", "navigate", "wait", "fill_form"]),
  description: z.string(),
  target: z.object({
    type: z.enum(["button", "link", "form", "table", "list"]),
    description: z.string(), // Natural language description
    location: z.string(), // "top right", "bottom center", etc.
  }).optional(),
  data: z.any().optional(),
});

export async function analyzePageWithVision(
  screenshot: Buffer,
  html: string,
  currentGoal: string
) {
  const { object } = await generateObject({
    model: openai("gpt-5-mini"), // Vision-capable model
    schema: ActionPlanSchema,
    prompt: `
      You are analyzing a government procurement portal page.
      
      Current Goal: ${currentGoal}
      
      Screenshot: [base64 image attached]
      HTML Content: ${html.substring(0, 5000)}...
      
      Please analyze the screenshot and determine:
      1. What type of page is this? (list page, detail page, login page, etc.)
      2. What actions should be taken next?
      3. Where are the key elements located? (describe visually, not by CSS selector)
      
      For procurement opportunities:
      - Look for tables, lists, or cards containing opportunity information
      - Identify pagination controls (next button, page numbers)
      - Find detail links or buttons
      
      Return an action plan with:
      - action: What to do next
      - description: Human-readable description
      - target: Visual description of what to interact with
      - data: Any extracted data from this page
    `,
    images: [screenshot.toString("base64")],
  });
  
  return object;
}
```

#### 3.4.2 Adaptive Navigation Patterns

**Pattern Detection:**
```typescript
// browser-agent-service/src/navigation/patternDetector.ts
export async function detectNavigationPattern(page: Page): Promise<NavigationPattern> {
  const screenshot = await page.screenshot({ encoding: "base64" });
  const html = await page.content();
  
  // Ask LLM to identify the navigation pattern
  const pattern = await analyzePageWithVision(
    Buffer.from(screenshot, "base64"),
    html,
    "Identify the navigation pattern on this page. Is it pagination, infinite scroll, AJAX loading, or single page?"
  );
  
  return {
    type: pattern.data?.patternType || "unknown",
    selectors: pattern.data?.selectors || [],
    strategy: getStrategyForPattern(pattern.data?.patternType),
  };
}

function getStrategyForPattern(pattern: string): NavigationStrategy {
  switch (pattern) {
    case "pagination":
      return {
        type: "click-based",
        action: "Click next page button",
        waitFor: "networkidle",
      };
    case "infinite-scroll":
      return {
        type: "scroll-based",
        action: "Scroll to bottom to load more",
        waitFor: "content-loaded",
      };
    case "ajax-load":
      return {
        type: "wait-based",
        action: "Wait for content to load via AJAX",
        waitFor: "specific-selector",
      };
    default:
      return {
        type: "ai-guided",
        action: "Let AI decide based on page content",
      };
  }
}
```

#### 3.4.3 Error Recovery

**Handling Unexpected States:**
```typescript
// browser-agent-service/src/errorRecovery.ts
export async function handleError(
  error: Error,
  page: Page,
  context: ScrapingContext
): Promise<RecoveryAction> {
  const screenshot = await page.screenshot({ encoding: "base64" });
  
  // Ask LLM how to recover
  const recovery = await analyzePageWithVision(
    Buffer.from(screenshot, "base64"),
    await page.content(),
    `
      An error occurred: ${error.message}
      Current URL: ${page.url()}
      Previous actions: ${JSON.stringify(context.recentActions)}
      
      Please analyze the current page state and suggest a recovery action:
      1. Retry the last action
      2. Navigate back
      3. Try an alternative approach
      4. Report the error and stop
    `
  );
  
  return {
    action: recovery.action,
    description: recovery.description,
    retry: recovery.action !== "stop",
  };
}
```

### 3.5 Phase 5: Monitoring and Optimization

#### 3.5.1 Logging and Analytics

```typescript
// convex/procurementScraperMutations.ts
export const logAgentInteraction = internalMutation({
  args: {
    recordId: v.id("scrapedProcurementData"),
    interaction: v.object({
      step: v.number(),
      action: v.string(),
      description: v.string(),
      success: v.boolean(),
      error: v.optional(v.string()),
      screenshot: v.optional(v.string()),
      duration: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) return;
    
    const interactions = record.agentInteractions || [];
    interactions.push({
      ...args.interaction,
      timestamp: Date.now(),
    });
    
    await ctx.db.patch(args.recordId, {
      agentInteractions: interactions,
    });
  },
});
```

#### 3.5.2 Performance Metrics

Track:
- Average time per portal
- Success rate per portal
- Data quality scores
- Token usage (cost tracking)
- Error patterns

#### 3.5.3 Portal-Specific Optimizations

After scraping a portal multiple times, identify patterns and optimize:

```typescript
// Learn from successful scrapes
export const optimizePortalConfiguration = internalMutation({
  args: {
    portalId: v.id("portals"),
  },
  handler: async (ctx, args) => {
    // Get successful scraping records
    const records = await ctx.db
      .query("scrapedProcurementData")
      .withIndex("by_portal", (q) => q.eq("portalId", args.portalId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .take(10);
    
    // Analyze interactions to find patterns
    const commonSelectors = extractCommonSelectors(records);
    const navigationPattern = detectNavigationPattern(records);
    
    // Update portal configuration with learned patterns
    await ctx.db.patch(args.portalId, {
      configuration: {
        ...portal.configuration,
        knownSelectors: commonSelectors,
        navigationPattern: navigationPattern,
      },
    });
  },
});
```

---

## Summary

### Key Takeaways

1. **Three-Layer Architecture:**
   - **Convex (Brain):** State management, orchestration, data persistence
   - **Browser Agent (Muscle):** Browser automation, page interaction
   - **LLM (Decision Maker):** Visual understanding, action planning

2. **AI-Native Tools:**
   - Use Vision-Language Models instead of CSS selectors
   - Tools like Browser-Use, AgentQL, or Firecrawl
   - Natural language instructions instead of brittle selectors

3. **Implementation Strategy:**
   - Start with managed services (Firecrawl/AgentQL) for MVP
   - Migrate to self-hosted (Browser-Use) for production
   - Use Convex for orchestration and data storage
   - Implement scheduled scraping with Convex Crons

4. **Handling Inconsistency:**
   - Vision-Language Models understand pages visually
   - Adaptive navigation patterns
   - Error recovery and retry logic
   - Portal-specific optimizations over time

### Next Steps

1. **Choose a tool:** Start with Firecrawl or AgentQL for quick validation
2. **Set up browser agent service:** Deploy as Docker container or serverless function
3. **Implement Convex integration:** Actions, mutations, and scheduled jobs
4. **Test on 5-10 portals:** Validate approach and identify patterns
5. **Optimize:** Learn from successful scrapes and improve configuration

### Resources

- [Browser-Use Documentation](https://browser-use.com/)
- [AgentQL API Docs](https://agentql.com/docs)
- [Firecrawl API Docs](https://docs.firecrawl.dev/)
- [Convex Actions Documentation](https://docs.convex.dev/functions/actions)
- [Convex Crons Documentation](https://docs.convex.dev/scheduling/crons)





