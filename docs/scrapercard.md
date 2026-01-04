# In-House Autonomous Procurement Scraper - Implementation System Card

## Executive Summary

This system card defines the implementation plan for building an in-house autonomous procurement scraper. The solution consists of a **standalone Node.js browser agent service** that runs alongside the existing React/Convex application. It uses **Playwright** for browser automation and **OpenAI's GPT-4o-mini** (vision-capable) for intelligent page understanding and navigation decisions.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT MACHINE                                 │
│                                                                             │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │     React Application       │    │     Browser Agent Service           │ │
│  │     (Next.js / Vite)        │    │     (Node.js + Playwright)          │ │
│  │                             │    │                                     │ │
│  │  • UI for portal management │    │  • Express/Fastify HTTP Server      │ │
│  │  • Dashboard for results    │    │  • Playwright browser instances     │ │
│  │  • Manual scrape triggers   │    │  • LLM integration (OpenAI)         │ │
│  │                             │    │  • Screenshot capture               │ │
│  │  Port: 3000                 │    │  • Action execution engine          │ │
│  └──────────────┬──────────────┘    │                                     │ │
│                 │                    │  Port: 3001                         │ │
│                 │                    └──────────────┬──────────────────────┘ │
│                 │                                   │                        │
│                 │    HTTP (localhost:3001)          │                        │
│                 └───────────────────────────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
                    ┌─────────────────────────────────────┐
                    │           Convex Cloud              │
                    │                                     │
                    │  • State management                 │
                    │  • Data persistence                 │
                    │  • Cron job scheduling              │
                    │  • Real-time subscriptions          │
                    └─────────────────────────────────────┘
                                      │
                                      │ API
                                      ▼
                    ┌─────────────────────────────────────┐
                    │           OpenAI API                │
                    │                                     │
                    │  • GPT-4o-mini (vision)             │
                    │  • Page analysis                    │
                    │  • Action planning                  │
                    │  • Data extraction                  │
                    └─────────────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **React App** | UI, user interactions, displaying results, triggering scrapes via Convex |
| **Convex** | State management, job orchestration, data storage, cron scheduling |
| **Browser Agent Service** | Browser automation, LLM calls, screenshot capture, action execution |
| **OpenAI API** | Vision-based page understanding, action planning, data extraction |

### 1.3 Data Flow

```
1. User/Cron triggers scrape
         │
         ▼
2. Convex Action creates scraping record, calls Browser Agent Service
         │
         ▼
3. Browser Agent launches Playwright, navigates to URL
         │
         ▼
4. Agent captures screenshot + DOM, sends to OpenAI for analysis
         │
         ▼
5. OpenAI returns action plan (extract data, click next, etc.)
         │
         ▼
6. Agent executes action, loops back to step 4 until complete
         │
         ▼
7. Agent sends results back to Convex via mutation
         │
         ▼
8. Convex stores opportunities, updates portal status
```

---

## 2. Browser Agent Service Specification

### 2.1 Directory Structure

```
browser-agent-service/
├── src/
│   ├── index.ts                    # Entry point, Express server setup
│   ├── config/
│   │   ├── index.ts                # Configuration loader
│   │   └── constants.ts            # Static constants
│   ├── server/
│   │   ├── routes/
│   │   │   ├── index.ts            # Route aggregator
│   │   │   ├── scrape.ts           # POST /scrape endpoint
│   │   │   ├── health.ts           # GET /health endpoint
│   │   │   └── status.ts           # GET /status/:jobId endpoint
│   │   ├── middleware/
│   │   │   ├── auth.ts             # API key authentication
│   │   │   ├── errorHandler.ts     # Global error handling
│   │   │   └── requestLogger.ts    # Request logging
│   │   └── validation/
│   │       └── schemas.ts          # Zod request/response schemas
│   ├── browser/
│   │   ├── BrowserManager.ts       # Browser instance lifecycle
│   │   ├── PageController.ts       # Page navigation and interaction
│   │   ├── ScreenshotCapture.ts    # Screenshot utilities
│   │   └── DOMExtractor.ts         # DOM content extraction
│   ├── agent/
│   │   ├── ScraperAgent.ts         # Main agent orchestrator
│   │   ├── ActionExecutor.ts       # Executes LLM-planned actions
│   │   ├── StateManager.ts         # Tracks agent state (visited pages, etc.)
│   │   └── ErrorRecovery.ts        # Handles errors and retries
│   ├── llm/
│   │   ├── OpenAIClient.ts         # OpenAI API wrapper
│   │   ├── prompts/
│   │   │   ├── systemPrompt.ts     # Base system prompt
│   │   │   ├── pageAnalysis.ts     # Page analysis prompt template
│   │   │   ├── dataExtraction.ts   # Data extraction prompt template
│   │   │   └── actionPlanning.ts   # Action planning prompt template
│   │   ├── schemas/
│   │   │   ├── ActionPlan.ts       # Zod schema for action plans
│   │   │   ├── ExtractedData.ts    # Zod schema for extracted data
│   │   │   └── PageAnalysis.ts     # Zod schema for page analysis
│   │   └── VisionAnalyzer.ts       # Vision-based page analysis
│   ├── convex/
│   │   ├── client.ts               # Convex client setup
│   │   └── mutations.ts            # Wrappers for Convex mutations
│   ├── utils/
│   │   ├── logger.ts               # Winston/Pino logger
│   │   ├── imageUtils.ts           # Image compression, encoding
│   │   └── retryUtils.ts           # Retry with backoff utilities
│   └── types/
│       ├── index.ts                # Type exports
│       ├── scraping.ts             # Scraping-related types
│       ├── agent.ts                # Agent-related types
│       └── api.ts                  # API request/response types
├── tests/
│   ├── unit/
│   │   ├── browser/
│   │   ├── agent/
│   │   └── llm/
│   └── integration/
│       └── scraping.test.ts
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

### 2.2 Core Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "playwright": "^1.40.0",
    "openai": "^4.20.0",
    "zod": "^3.22.4",
    "convex": "^1.7.0",
    "winston": "^3.11.0",
    "sharp": "^0.33.0",
    "uuid": "^9.0.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "tsx": "^4.6.0",
    "vitest": "^1.0.0"
  }
}
```

### 2.3 Configuration Schema

```typescript
// src/config/index.ts
interface Config {
  server: {
    port: number;                    // Default: 3001
    host: string;                    // Default: "0.0.0.0"
    apiKey: string;                  // Required: shared secret with Convex
  };
  browser: {
    headless: boolean;               // Default: true
    timeout: number;                 // Default: 30000 (30s)
    maxConcurrentBrowsers: number;   // Default: 3
    userAgent?: string;              // Optional: custom user agent
    viewport: {
      width: number;                 // Default: 1920
      height: number;                // Default: 1080
    };
  };
  llm: {
    provider: "openai";              // Currently only OpenAI
    apiKey: string;                  // Required: OpenAI API key
    model: string;                   // Default: "gpt-4o-mini"
    maxTokens: number;               // Default: 4096
    temperature: number;             // Default: 0.1
  };
  scraping: {
    maxPagesPerPortal: number;       // Default: 20
    maxActionsPerPage: number;       // Default: 10
    delayBetweenActions: number;     // Default: 1000 (1s)
    screenshotQuality: number;       // Default: 80 (JPEG quality)
    maxScreenshotWidth: number;      // Default: 1280 (resize for LLM)
  };
  convex: {
    url: string;                     // Required: Convex deployment URL
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    saveScreenshots: boolean;        // Save screenshots to disk for debugging
    screenshotDir: string;           // Default: "./screenshots"
  };
}
```

---

## 3. API Contract

### 3.1 Endpoints

#### `POST /scrape`

Initiates a scraping job for a single portal.

**Request:**
```typescript
interface ScrapeRequest {
  jobId: string;                     // Unique job ID (generated by Convex)
  url: string;                       // Portal URL to scrape
  portalId: string;                  // Convex portal document ID
  configuration: {
    requiresAuth: boolean;
    authCredentials?: {
      username?: string;
      password?: string;
    };
    navigationHints?: {
      opportunityListSelector?: string;
      nextButtonSelector?: string;
      detailLinkSelector?: string;
    };
    maxPages?: number;
    customInstructions?: string;     // Additional LLM instructions
  };
  callbackUrl?: string;              // Optional: webhook for real-time updates
}
```

**Response:**
```typescript
interface ScrapeResponse {
  success: boolean;
  jobId: string;
  status: "queued" | "started" | "completed" | "failed";
  message?: string;
}
```

#### `GET /status/:jobId`

Get the current status of a scraping job.

**Response:**
```typescript
interface StatusResponse {
  jobId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: {
    currentPage: number;
    totalPages?: number;
    opportunitiesFound: number;
    currentAction?: string;
  };
  result?: {
    opportunities: Opportunity[];
    interactions: Interaction[];
    duration: number;
  };
  error?: {
    message: string;
    type: string;
    recoverable: boolean;
  };
}
```

#### `GET /health`

Health check endpoint.

**Response:**
```typescript
interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  activeBrowsers: number;
  activeJobs: number;
  lastJobAt?: number;
}
```

#### `POST /cancel/:jobId`

Cancel an in-progress scraping job.

**Response:**
```typescript
interface CancelResponse {
  success: boolean;
  jobId: string;
  message: string;
}
```

### 3.2 Data Schemas

#### Opportunity Schema

```typescript
interface Opportunity {
  // Identification
  externalId?: string;               // Portal's ID for this opportunity
  referenceNumber?: string;
  
  // Core Information
  title: string;
  description?: string;
  opportunityType?: string;          // RFP, RFQ, ITB, IFB, etc.
  status?: string;                   // Open, Closed, Awarded
  
  // Dates
  postedDate?: string;               // ISO 8601 format preferred
  closingDate?: string;
  lastModified?: string;
  
  // Classification
  category?: string;
  department?: string;
  agency?: string;
  
  // Value
  estimatedValue?: string;
  valueMin?: number;
  valueMax?: number;
  currency?: string;
  
  // Contact
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // Links & Documents
  detailUrl?: string;
  documents?: Array<{
    name: string;
    url: string;
    type?: string;
  }>;
  
  // Raw Data
  rawText?: string;                  // Full text as scraped
  sourceHtml?: string;               // HTML snippet
  
  // Metadata
  confidence: number;                // 0-1, LLM's confidence in extraction
  extractedAt: string;               // ISO 8601 timestamp
}
```

#### Interaction Schema

```typescript
interface Interaction {
  step: number;
  timestamp: string;                 // ISO 8601
  action: "navigate" | "click" | "scroll" | "extract" | "wait" | "fill" | "analyze";
  description: string;               // Human-readable description
  target?: {
    type: string;                    // "button", "link", "table", etc.
    selector?: string;               // CSS selector if available
    visualDescription: string;       // LLM's description
  };
  result: "success" | "failure" | "partial";
  error?: string;
  screenshot?: string;               // Base64 or filename
  duration: number;                  // Milliseconds
  llmTokensUsed?: number;
}
```

---

## 4. Component Specifications

### 4.1 BrowserManager

**Purpose:** Manage Playwright browser instance lifecycle.

**Responsibilities:**
- Launch and close browser instances
- Manage browser pool for concurrency
- Handle browser crashes and recovery
- Configure browser context (cookies, localStorage, viewport)

**Interface:**
```typescript
class BrowserManager {
  constructor(config: BrowserConfig);
  
  // Acquire a browser instance from the pool
  async acquire(): Promise<Browser>;
  
  // Release a browser instance back to the pool
  async release(browser: Browser): Promise<void>;
  
  // Create a new page with configured context
  async createPage(browser: Browser): Promise<Page>;
  
  // Close all browsers and cleanup
  async shutdown(): Promise<void>;
  
  // Get current pool status
  getStatus(): { active: number; available: number; total: number };
}
```

**Implementation Notes:**
- Use a semaphore pattern to limit concurrent browsers
- Implement health checks for browser instances
- Auto-restart crashed browsers
- Clear cookies/storage between scraping sessions

### 4.2 PageController

**Purpose:** Execute navigation and interaction commands on a page.

**Responsibilities:**
- Navigate to URLs with proper wait conditions
- Click elements (by selector or coordinates)
- Fill forms
- Scroll pages (for infinite scroll or lazy loading)
- Wait for content to load
- Handle popups and modals

**Interface:**
```typescript
class PageController {
  constructor(page: Page, config: PageConfig);
  
  // Navigation
  async navigate(url: string): Promise<NavigationResult>;
  async goBack(): Promise<void>;
  async reload(): Promise<void>;
  
  // Interactions
  async click(target: ClickTarget): Promise<ClickResult>;
  async fill(selector: string, value: string): Promise<void>;
  async scroll(direction: "up" | "down", amount?: number): Promise<void>;
  async scrollToElement(selector: string): Promise<void>;
  
  // Waiting
  async waitForNavigation(): Promise<void>;
  async waitForSelector(selector: string, timeout?: number): Promise<boolean>;
  async waitForNetworkIdle(timeout?: number): Promise<void>;
  async waitForContent(contentPattern: string | RegExp): Promise<boolean>;
  
  // Modals/Popups
  async dismissModal(): Promise<boolean>;
  async acceptCookieConsent(): Promise<boolean>;
  
  // State
  getCurrentUrl(): string;
  getNavigationHistory(): string[];
}
```

**Implementation Notes:**
- Always wait for `networkidle` after navigation by default
- Implement intelligent waiting (detect when content is fully loaded)
- Handle common popups (cookie consent, newsletters) automatically
- Track navigation history for "back" functionality

### 4.3 ScreenshotCapture

**Purpose:** Capture and process screenshots for LLM analysis.

**Responsibilities:**
- Capture full-page and viewport screenshots
- Compress images for efficient LLM transmission
- Annotate screenshots with element boundaries (optional)
- Save screenshots for debugging

**Interface:**
```typescript
class ScreenshotCapture {
  constructor(config: ScreenshotConfig);
  
  // Capture current viewport
  async captureViewport(page: Page): Promise<ScreenshotResult>;
  
  // Capture full page (scrolling)
  async captureFullPage(page: Page): Promise<ScreenshotResult>;
  
  // Capture specific element
  async captureElement(page: Page, selector: string): Promise<ScreenshotResult>;
  
  // Process for LLM (resize, compress)
  async prepareForLLM(screenshot: Buffer): Promise<string>; // Returns base64
  
  // Save to disk (for debugging)
  async saveToDisk(screenshot: Buffer, filename: string): Promise<string>;
}

interface ScreenshotResult {
  buffer: Buffer;
  base64: string;
  width: number;
  height: number;
  timestamp: number;
}
```

**Implementation Notes:**
- Resize to max 1280px width for LLM (reduces tokens/cost)
- Use JPEG at 80% quality for balance of size/quality
- Consider WebP for even smaller sizes if LLM supports it
- Store screenshots temporarily for debugging failed scrapes

### 4.4 DOMExtractor

**Purpose:** Extract relevant DOM content for LLM context.

**Responsibilities:**
- Extract full HTML or specific sections
- Clean HTML (remove scripts, styles, comments)
- Extract text content
- Identify and extract tables/lists

**Interface:**
```typescript
class DOMExtractor {
  constructor(page: Page);
  
  // Get cleaned HTML
  async getCleanedHTML(maxLength?: number): Promise<string>;
  
  // Get text content only
  async getTextContent(): Promise<string>;
  
  // Extract tables as structured data
  async extractTables(): Promise<TableData[]>;
  
  // Get specific element's content
  async getElementContent(selector: string): Promise<string>;
  
  // Get page metadata
  async getMetadata(): Promise<PageMetadata>;
  
  // Find elements matching description
  async findElements(description: string): Promise<ElementInfo[]>;
}

interface PageMetadata {
  title: string;
  url: string;
  description?: string;
  hasNextButton: boolean;
  hasPagination: boolean;
  formCount: number;
  tableCount: number;
  linkCount: number;
}
```

**Implementation Notes:**
- Truncate HTML to ~5000 chars for LLM context (balance detail vs. cost)
- Remove inline styles, scripts, SVGs, and comments
- Preserve semantic structure (headings, lists, tables)
- Extract accessibility attributes (aria-label, alt text)

### 4.5 ScraperAgent

**Purpose:** Main orchestrator that coordinates the scraping process.

**Responsibilities:**
- Initialize browser and page
- Run the perception-action loop
- Coordinate between LLM and browser
- Track state and progress
- Handle errors and retries
- Report results back to Convex

**Interface:**
```typescript
class ScraperAgent {
  constructor(
    browserManager: BrowserManager,
    llmClient: OpenAIClient,
    config: AgentConfig
  );
  
  // Main entry point
  async scrape(job: ScrapeJob): Promise<ScrapeResult>;
  
  // Cancel a running job
  cancel(): void;
  
  // Get current status
  getStatus(): AgentStatus;
}

interface ScrapeJob {
  jobId: string;
  url: string;
  portalId: string;
  configuration: PortalConfiguration;
}

interface ScrapeResult {
  success: boolean;
  opportunities: Opportunity[];
  interactions: Interaction[];
  pagesScraped: number;
  duration: number;
  tokensUsed: number;
  errors: AgentError[];
}
```

**Implementation Notes:**
- Implement as a state machine with clear states
- Maximum 20 pages per portal (configurable)
- Maximum 10 actions per page (prevent infinite loops)
- Track visited URLs to avoid duplicates
- Send progress updates via callback if provided

### 4.6 VisionAnalyzer

**Purpose:** Use OpenAI's vision capabilities to understand pages.

**Responsibilities:**
- Analyze screenshots to understand page layout
- Identify UI elements (buttons, links, tables)
- Determine page type (list, detail, login, error)
- Plan next actions based on visual understanding

**Interface:**
```typescript
class VisionAnalyzer {
  constructor(openaiClient: OpenAIClient);
  
  // Analyze page and get action plan
  async analyzePage(
    screenshot: string,     // Base64
    html: string,           // Cleaned HTML
    context: AnalysisContext
  ): Promise<PageAnalysis>;
  
  // Extract data from current page
  async extractData(
    screenshot: string,
    html: string,
    schema: ExtractionSchema
  ): Promise<ExtractedData>;
  
  // Find specific element
  async findElement(
    screenshot: string,
    description: string
  ): Promise<ElementLocation>;
}

interface PageAnalysis {
  pageType: "list" | "detail" | "login" | "error" | "captcha" | "unknown";
  hasOpportunities: boolean;
  opportunityCount?: number;
  hasPagination: boolean;
  paginationType?: "numbered" | "next_prev" | "load_more" | "infinite_scroll";
  recommendedAction: ActionPlan;
  confidence: number;
}

interface ActionPlan {
  action: "extract" | "click" | "scroll" | "navigate" | "fill" | "wait" | "done" | "error";
  target?: {
    selector?: string;
    description: string;
    coordinates?: { x: number; y: number };
  };
  value?: string;           // For fill actions
  reason: string;
  expectedOutcome: string;
}
```

**Implementation Notes:**
- Use structured outputs (JSON mode) for reliable parsing
- Include conversation history for context
- Limit image size to reduce token usage
- Cache repeated analyses if possible

### 4.7 ActionExecutor

**Purpose:** Execute action plans from the LLM.

**Responsibilities:**
- Translate LLM action plans into browser commands
- Execute actions safely with timeouts
- Verify action success
- Handle action failures gracefully

**Interface:**
```typescript
class ActionExecutor {
  constructor(pageController: PageController);
  
  // Execute a single action
  async execute(action: ActionPlan): Promise<ActionResult>;
  
  // Execute with verification
  async executeAndVerify(
    action: ActionPlan,
    verification: VerificationCriteria
  ): Promise<ActionResult>;
}

interface ActionResult {
  success: boolean;
  action: ActionPlan;
  duration: number;
  error?: string;
  stateChange?: {
    urlChanged: boolean;
    newUrl?: string;
    contentChanged: boolean;
  };
}
```

**Implementation Notes:**
- Always verify actions succeeded (URL changed, content appeared, etc.)
- Implement action-specific timeouts
- Retry failed actions once with slight variation
- Log all actions for debugging

### 4.8 ErrorRecovery

**Purpose:** Handle errors and attempt recovery.

**Responsibilities:**
- Classify error types
- Determine if errors are recoverable
- Implement recovery strategies
- Know when to give up

**Interface:**
```typescript
class ErrorRecovery {
  constructor(
    pageController: PageController,
    visionAnalyzer: VisionAnalyzer
  );
  
  // Analyze error and get recovery plan
  async analyzeError(
    error: Error,
    context: ErrorContext
  ): Promise<RecoveryPlan>;
  
  // Execute recovery
  async recover(plan: RecoveryPlan): Promise<RecoveryResult>;
}

interface RecoveryPlan {
  recoverable: boolean;
  strategy: "retry" | "navigate_back" | "refresh" | "skip" | "abort";
  actions: ActionPlan[];
  reason: string;
}

type ErrorType =
  | "navigation_timeout"
  | "element_not_found"
  | "page_crash"
  | "captcha_detected"
  | "auth_required"
  | "rate_limited"
  | "content_not_loaded"
  | "unexpected_state";
```

**Implementation Notes:**
- Detect CAPTCHAs and report (don't attempt to solve)
- Detect authentication requirements and report
- Implement exponential backoff for rate limiting
- Maximum 3 recovery attempts before aborting

---

## 5. LLM Prompts

### 5.1 System Prompt

```typescript
const SYSTEM_PROMPT = `You are an expert web scraping agent specialized in government procurement portals. Your task is to navigate these portals, find procurement opportunities, and extract structured data.

## Your Capabilities
- You can see screenshots of web pages
- You can read HTML content
- You can plan actions: click, scroll, navigate, fill forms, extract data
- You can identify patterns in UI layouts

## Your Goals
1. Find all procurement opportunities on the portal
2. Extract key information: title, reference number, dates, description, contact info
3. Navigate through pagination to find all opportunities
4. Return structured, accurate data

## Action Types You Can Request
- "click": Click an element (provide selector or visual description)
- "scroll": Scroll the page (direction: up/down, amount in pixels)
- "navigate": Go to a URL directly
- "fill": Fill a form field (provide selector and value)
- "wait": Wait for content to load
- "extract": Extract data from current page
- "done": Scraping complete
- "error": Unrecoverable error encountered

## Guidelines
- Be precise with element descriptions
- Prefer CSS selectors when visible in HTML
- If unsure, describe element visually (e.g., "blue button labeled 'Next' at bottom right")
- Extract only visible/loaded content
- Don't guess data - if not visible, mark as null
- Report CAPTCHAs or login requirements immediately
- Maximum 20 pages per portal
- Maximum 10 actions per page

## Output Format
Always respond with valid JSON matching the requested schema.`;
```

### 5.2 Page Analysis Prompt

```typescript
const PAGE_ANALYSIS_PROMPT = `Analyze this procurement portal page and determine the next action.

## Current State
- URL: {{currentUrl}}
- Page Number: {{pageNumber}} of max {{maxPages}}
- Opportunities Found So Far: {{opportunitiesFound}}
- Previous Action: {{previousAction}}
- Goal: {{goal}}

## Page Content
Screenshot: [attached image]
HTML (truncated): {{htmlContent}}

## Questions to Answer
1. What type of page is this? (list of opportunities, opportunity detail, login page, error page, CAPTCHA)
2. Are there procurement opportunities visible?
3. If yes, how many can you see?
4. Is there pagination? What type?
5. What should be the next action?

## Required Response Schema
{
  "pageType": "list" | "detail" | "login" | "error" | "captcha" | "unknown",
  "hasOpportunities": boolean,
  "opportunityCount": number | null,
  "hasPagination": boolean,
  "paginationType": "numbered" | "next_prev" | "load_more" | "infinite_scroll" | null,
  "currentPageNumber": number | null,
  "totalPages": number | null,
  "recommendedAction": {
    "action": "extract" | "click" | "scroll" | "navigate" | "fill" | "wait" | "done" | "error",
    "target": {
      "selector": string | null,
      "description": string,
      "coordinates": { "x": number, "y": number } | null
    } | null,
    "value": string | null,
    "reason": string,
    "expectedOutcome": string
  },
  "confidence": number (0-1),
  "notes": string | null
}`;
```

### 5.3 Data Extraction Prompt

```typescript
const DATA_EXTRACTION_PROMPT = `Extract procurement opportunity data from this page.

## Page Content
Screenshot: [attached image]
HTML (truncated): {{htmlContent}}
URL: {{currentUrl}}

## Instructions
- Extract ALL visible procurement opportunities
- Be precise - only extract what you can clearly see
- Use null for fields that aren't visible
- Parse dates into ISO 8601 format if possible
- Include document links if visible

## Required Response Schema
{
  "opportunities": [
    {
      "title": string,
      "referenceNumber": string | null,
      "opportunityType": string | null,
      "status": string | null,
      "postedDate": string | null,
      "closingDate": string | null,
      "description": string | null,
      "category": string | null,
      "department": string | null,
      "estimatedValue": string | null,
      "contactName": string | null,
      "contactEmail": string | null,
      "contactPhone": string | null,
      "detailUrl": string | null,
      "documents": [
        {
          "name": string,
          "url": string,
          "type": string | null
        }
      ] | null,
      "rawText": string,
      "confidence": number (0-1)
    }
  ],
  "extractionNotes": string | null,
  "hasMoreOpportunities": boolean,
  "needsScrolling": boolean
}`;
```

---

## 6. State Machine

### 6.1 Agent States

```
┌─────────────┐
│    IDLE     │
└──────┬──────┘
       │ start()
       ▼
┌─────────────┐
│ NAVIGATING  │◄─────────────────────────────────┐
└──────┬──────┘                                  │
       │ page loaded                              │
       ▼                                          │
┌─────────────┐                                  │
│  ANALYZING  │                                  │
└──────┬──────┘                                  │
       │ analysis complete                        │
       ▼                                          │
┌─────────────────────────────────────────────┐  │
│              ACTION DECISION                │  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │  │
│  │ EXTRACT │  │  CLICK  │  │ SCROLL  │     │  │
│  └────┬────┘  └────┬────┘  └────┬────┘     │  │
│       │            │            │           │  │
│       ▼            ▼            ▼           │  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │  │
│  │EXTRACTED│  │ CLICKED │  │SCROLLED │     │  │
│  └────┬────┘  └────┬────┘  └────┬────┘     │  │
└───────┼────────────┼────────────┼───────────┘  │
        │            │            │              │
        │            └────────────┴──────────────┘
        │ has more pages?
        │
        ├─────── yes ───► NAVIGATING
        │
        ▼ no
┌─────────────┐
│  COMPLETED  │
└─────────────┘

Error at any state:
       │
       ▼
┌─────────────┐
│  RECOVERING │
└──────┬──────┘
       │
       ├─── recoverable ───► Previous State
       │
       ▼ not recoverable
┌─────────────┐
│   FAILED    │
└─────────────┘
```

### 6.2 State Transitions

| Current State | Event | Next State | Action |
|--------------|-------|------------|--------|
| IDLE | start() | NAVIGATING | Navigate to initial URL |
| NAVIGATING | page_loaded | ANALYZING | Capture screenshot, send to LLM |
| NAVIGATING | timeout | RECOVERING | Attempt recovery |
| ANALYZING | extract_action | EXTRACTING | Extract data from page |
| ANALYZING | click_action | CLICKING | Click target element |
| ANALYZING | scroll_action | SCROLLING | Scroll page |
| ANALYZING | done_action | COMPLETED | Finalize and report |
| ANALYZING | error_action | FAILED | Report error |
| EXTRACTING | success | ANALYZING | Re-analyze for more actions |
| CLICKING | page_changed | NAVIGATING | Wait for new page |
| CLICKING | page_same | ANALYZING | Re-analyze same page |
| SCROLLING | content_loaded | ANALYZING | Re-analyze with new content |
| RECOVERING | recovered | Previous | Resume from before error |
| RECOVERING | unrecoverable | FAILED | Report failure |
| COMPLETED | - | IDLE | Reset for next job |
| FAILED | - | IDLE | Reset for next job |

---

## 7. Convex Integration

### 7.1 Convex Schema Additions

```typescript
// convex/schema.ts - Additions/modifications

// Scraping Jobs (for browser agent tracking)
scrapingJobs: defineTable({
  // Identification
  portalId: v.id("portals"),
  batchJobId: v.optional(v.id("scrapingBatchJobs")),
  
  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("queued"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled")
  ),
  
  // Browser Agent Info
  agentJobId: v.string(),          // UUID sent to browser agent
  agentStatus: v.optional(v.string()),
  
  // Progress
  currentPage: v.optional(v.number()),
  totalPages: v.optional(v.number()),
  opportunitiesFound: v.optional(v.number()),
  currentAction: v.optional(v.string()),
  
  // Timing
  queuedAt: v.number(),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  duration: v.optional(v.number()),
  
  // Results
  resultRecordId: v.optional(v.id("scrapedProcurementData")),
  
  // Errors
  errorMessage: v.optional(v.string()),
  errorType: v.optional(v.string()),
  retryCount: v.number(),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_portal", ["portalId"])
  .index("by_status", ["status"])
  .index("by_agent_job_id", ["agentJobId"])
  .index("by_batch_job", ["batchJobId"]),
```

### 7.2 Convex Actions

```typescript
// convex/scraping/actions.ts

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Trigger scraping for a single portal
 */
export const scrapePortal = action({
  args: {
    portalId: v.id("portals"),
    priority: v.optional(v.union(v.literal("high"), v.literal("normal"), v.literal("low"))),
  },
  handler: async (ctx, args) => {
    // 1. Get portal details
    const portal = await ctx.runQuery(internal.portals.getById, {
      portalId: args.portalId,
    });
    
    if (!portal) {
      throw new Error("Portal not found");
    }
    
    // 2. Create scraping job record
    const jobId = crypto.randomUUID();
    const scrapingJobId = await ctx.runMutation(
      internal.scraping.mutations.createScrapingJob,
      {
        portalId: args.portalId,
        agentJobId: jobId,
      }
    );
    
    // 3. Call browser agent service
    const browserAgentUrl = process.env.BROWSER_AGENT_URL;
    const browserAgentApiKey = process.env.BROWSER_AGENT_API_KEY;
    
    if (!browserAgentUrl) {
      throw new Error("BROWSER_AGENT_URL not configured");
    }
    
    try {
      const response = await fetch(`${browserAgentUrl}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${browserAgentApiKey}`,
        },
        body: JSON.stringify({
          jobId,
          url: portal.url,
          portalId: args.portalId,
          configuration: {
            requiresAuth: portal.configuration?.requiresAuth ?? false,
            authCredentials: portal.configuration?.authCredentials,
            navigationHints: portal.configuration?.knownSelectors,
            maxPages: portal.configuration?.maxPages ?? 20,
          },
          callbackUrl: `${process.env.CONVEX_SITE_URL}/api/scraping/callback`,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Browser agent error: ${error}`);
      }
      
      const result = await response.json();
      
      // 4. Update job status
      await ctx.runMutation(internal.scraping.mutations.updateScrapingJob, {
        scrapingJobId,
        status: "queued",
        agentStatus: result.status,
      });
      
      return {
        success: true,
        scrapingJobId,
        agentJobId: jobId,
      };
    } catch (error) {
      // Update job as failed
      await ctx.runMutation(internal.scraping.mutations.updateScrapingJob, {
        scrapingJobId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      
      throw error;
    }
  },
});

/**
 * Process scraping results from browser agent callback
 */
export const processScrapingResults = internalAction({
  args: {
    agentJobId: v.string(),
    success: v.boolean(),
    opportunities: v.optional(v.array(v.any())),
    interactions: v.optional(v.array(v.any())),
    pagesScraped: v.optional(v.number()),
    duration: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    error: v.optional(v.object({
      message: v.string(),
      type: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // 1. Find the scraping job
    const job = await ctx.runQuery(internal.scraping.queries.getByAgentJobId, {
      agentJobId: args.agentJobId,
    });
    
    if (!job) {
      console.error(`Scraping job not found for agentJobId: ${args.agentJobId}`);
      return;
    }
    
    if (!args.success) {
      // Handle failure
      await ctx.runMutation(internal.scraping.mutations.updateScrapingJob, {
        scrapingJobId: job._id,
        status: "failed",
        errorMessage: args.error?.message,
        errorType: args.error?.type,
        completedAt: Date.now(),
        duration: args.duration,
      });
      
      // Update portal status
      await ctx.runMutation(internal.portals.updateStatus, {
        portalId: job.portalId,
        status: "failed",
        consecutiveFailures: (job.portal?.consecutiveFailures ?? 0) + 1,
      });
      
      return;
    }
    
    // 2. Create scraped data record
    const scrapedDataId = await ctx.runMutation(
      internal.scraping.mutations.createScrapedData,
      {
        portalId: job.portalId,
        sourceUrl: job.portal?.url ?? "",
        state: job.portal?.state ?? "",
        capital: job.portal?.capital ?? "",
        opportunities: args.opportunities ?? [],
        interactions: args.interactions ?? [],
        pagesScraped: args.pagesScraped ?? 0,
        duration: args.duration ?? 0,
        tokensUsed: args.tokensUsed ?? 0,
      }
    );
    
    // 3. Save individual opportunities
    if (args.opportunities && args.opportunities.length > 0) {
      await ctx.runMutation(
        internal.scraping.mutations.saveOpportunities,
        {
          scrapedDataId,
          portalId: job.portalId,
          opportunities: args.opportunities,
          state: job.portal?.state ?? "",
          capital: job.portal?.capital ?? "",
        }
      );
    }
    
    // 4. Update scraping job
    await ctx.runMutation(internal.scraping.mutations.updateScrapingJob, {
      scrapingJobId: job._id,
      status: "completed",
      completedAt: Date.now(),
      duration: args.duration,
      opportunitiesFound: args.opportunities?.length ?? 0,
      resultRecordId: scrapedDataId,
    });
    
    // 5. Update portal status
    await ctx.runMutation(internal.portals.updateStatus, {
      portalId: job.portalId,
      status: "completed",
      lastScraped: Date.now(),
      lastSuccessfulScrape: Date.now(),
      consecutiveFailures: 0,
    });
  },
});
```

### 7.3 Convex HTTP Endpoint (Callback)

```typescript
// convex/http.ts

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Callback endpoint for browser agent to report results
 */
http.route({
  path: "/api/scraping/callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify authorization
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.BROWSER_AGENT_CALLBACK_TOKEN;
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Parse body
    const body = await request.json();
    
    // Validate required fields
    if (!body.jobId) {
      return new Response("Missing jobId", { status: 400 });
    }
    
    // Process results
    await ctx.runAction(internal.scraping.actions.processScrapingResults, {
      agentJobId: body.jobId,
      success: body.success,
      opportunities: body.opportunities,
      interactions: body.interactions,
      pagesScraped: body.pagesScraped,
      duration: body.duration,
      tokensUsed: body.tokensUsed,
      error: body.error,
    });
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Progress update endpoint (for real-time updates during scraping)
 */
http.route({
  path: "/api/scraping/progress",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.BROWSER_AGENT_CALLBACK_TOKEN;
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    const body = await request.json();
    
    if (!body.jobId) {
      return new Response("Missing jobId", { status: 400 });
    }
    
    // Update progress
    await ctx.runMutation(internal.scraping.mutations.updateProgress, {
      agentJobId: body.jobId,
      currentPage: body.currentPage,
      totalPages: body.totalPages,
      opportunitiesFound: body.opportunitiesFound,
      currentAction: body.currentAction,
    });
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

### 7.4 Convex Crons

```typescript
// convex/crons.ts

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily full scrape at 2 AM UTC
crons.daily(
  "dailyFullScrape",
  { hourUTC: 2, minuteUTC: 0 },
  internal.scraping.scheduled.scrapeAllPendingPortals
);

// Retry failed portals every 6 hours
crons.interval(
  "retryFailedPortals",
  { hours: 6 },
  internal.scraping.scheduled.retryFailedPortals
);

// Cleanup old scraping records (older than 30 days)
crons.weekly(
  "cleanupOldRecords",
  { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 },
  internal.scraping.scheduled.cleanupOldRecords
);

// Health check for stuck jobs
crons.interval(
  "checkStuckJobs",
  { minutes: 15 },
  internal.scraping.scheduled.checkAndRecoverStuckJobs
);

export default crons;
```

---

## 8. Deployment

### 8.1 Docker Configuration

```dockerfile
# browser-agent-service/Dockerfile

FROM node:20-slim

# Install dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install Playwright browsers
RUN npx playwright install chromium

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN groupadd -r agent && useradd -r -g agent agent
RUN chown -R agent:agent /app
USER agent

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
CMD ["node", "dist/index.js"]
```

### 8.2 Docker Compose (Development)

```yaml
# docker-compose.yml

version: "3.8"

services:
  browser-agent:
    build:
      context: ./browser-agent-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - API_KEY=${BROWSER_AGENT_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CONVEX_URL=${CONVEX_URL}
      - CONVEX_CALLBACK_TOKEN=${CONVEX_CALLBACK_TOKEN}
      - LOG_LEVEL=debug
      - SAVE_SCREENSHOTS=true
    volumes:
      - ./browser-agent-service/screenshots:/app/screenshots
      - ./browser-agent-service/logs:/app/logs
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  # Optional: Redis for job queue (if needed for scaling)
  # redis:
  #   image: redis:7-alpine
  #   ports:
  #     - "6379:6379"
  #   volumes:
  #     - redis-data:/data

# volumes:
#   redis-data:
```

### 8.3 Production Deployment Options

#### Option A: Single VPS/VM (Recommended for Start)

Deploy both React app and browser agent on same machine:

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS/VM                               │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   React App         │    │   Browser Agent Service     │ │
│  │   (PM2/Docker)      │    │   (Docker)                  │ │
│  │   Port: 3000        │    │   Port: 3001                │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │   Nginx (Reverse Proxy)                                 │ │
│  │   - / → React App                                       │ │
│  │   - /agent/* → Browser Agent (optional external access) │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/procurement-app

upstream react_app {
    server 127.0.0.1:3000;
}

upstream browser_agent {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name yourdomain.com;

    # React app
    location / {
        proxy_pass http://react_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Browser agent (internal only - block external access)
    # If you need external access, add authentication
    location /agent/ {
        # Block external access
        allow 127.0.0.1;
        deny all;
        
        proxy_pass http://browser_agent/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 300s; # Long timeout for scraping
    }
}
```

#### Option B: Container Orchestration (Kubernetes/ECS)

For scaling to multiple browser agents:

```yaml
# kubernetes/browser-agent-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: browser-agent
spec:
  replicas: 2  # Scale as needed
  selector:
    matchLabels:
      app: browser-agent
  template:
    metadata:
      labels:
        app: browser-agent
    spec:
      containers:
      - name: browser-agent
        image: your-registry/browser-agent:latest
        ports:
        - containerPort: 3001
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: browser-agent-secrets
              key: openai-api-key
        # ... other env vars
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 8.4 Environment Variables

```bash
# browser-agent-service/.env.example

# Server
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
API_KEY=your-secure-api-key-here

# Browser
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000
MAX_CONCURRENT_BROWSERS=3

# LLM
OPENAI_API_KEY=sk-your-openai-key
LLM_MODEL=gpt-4o-mini
LLM_MAX_TOKENS=4096
LLM_TEMPERATURE=0.1

# Convex
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_CALLBACK_TOKEN=your-callback-token

# Scraping
MAX_PAGES_PER_PORTAL=20
MAX_ACTIONS_PER_PAGE=10
DELAY_BETWEEN_ACTIONS=1000
SCREENSHOT_QUALITY=80

# Logging
LOG_LEVEL=info
SAVE_SCREENSHOTS=false
SCREENSHOT_DIR=./screenshots
```

---

## 9. Error Handling & Recovery

### 9.1 Error Classification

| Error Type | Recoverable | Recovery Strategy |
|------------|-------------|-------------------|
| `navigation_timeout` | Yes | Retry with longer timeout, then skip |
| `element_not_found` | Yes | Re-analyze page, try alternative selector |
| `page_crash` | Yes | Restart browser, retry from last URL |
| `captcha_detected` | No | Report and skip portal |
| `auth_required` | Maybe | If credentials available, attempt login |
| `rate_limited` | Yes | Exponential backoff, retry after delay |
| `content_not_loaded` | Yes | Scroll, wait longer, retry |
| `unexpected_state` | Yes | Re-analyze, try "back" navigation |
| `llm_error` | Yes | Retry with different prompt |
| `network_error` | Yes | Retry with backoff |

### 9.2 Retry Configuration

```typescript
interface RetryConfig {
  maxRetries: number;           // Default: 3
  initialDelay: number;         // Default: 1000ms
  maxDelay: number;             // Default: 30000ms
  backoffMultiplier: number;    // Default: 2
  retryableErrors: string[];    // Error types to retry
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    "navigation_timeout",
    "element_not_found",
    "content_not_loaded",
    "network_error",
    "llm_error",
  ],
};
```

### 9.3 Circuit Breaker

Implement circuit breaker pattern for OpenAI API:

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening
  successThreshold: number;     // Successes needed to close
  timeout: number;              // Time before attempting half-open
}

// States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing) → CLOSED
```

---

## 10. Monitoring & Observability

### 10.1 Metrics to Track

| Metric | Type | Description |
|--------|------|-------------|
| `scrape_jobs_total` | Counter | Total scraping jobs started |
| `scrape_jobs_success` | Counter | Successfully completed jobs |
| `scrape_jobs_failed` | Counter | Failed jobs |
| `scrape_duration_seconds` | Histogram | Time to complete scraping |
| `opportunities_extracted` | Counter | Total opportunities found |
| `pages_scraped` | Counter | Total pages navigated |
| `llm_tokens_used` | Counter | OpenAI tokens consumed |
| `llm_latency_seconds` | Histogram | Time for LLM responses |
| `browser_instances_active` | Gauge | Currently running browsers |
| `errors_by_type` | Counter | Errors categorized by type |

### 10.2 Logging Structure

```typescript
interface LogEntry {
  timestamp: string;            // ISO 8601
  level: "debug" | "info" | "warn" | "error";
  service: "browser-agent";
  jobId?: string;
  portalId?: string;
  action?: string;
  message: string;
  duration?: number;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}
```

### 10.3 Health Check Response

```typescript
interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    browser: {
      status: "ok" | "error";
      activeBrowsers: number;
      maxBrowsers: number;
    };
    openai: {
      status: "ok" | "error";
      lastCallAt?: string;
      circuitBreaker: "closed" | "open" | "half_open";
    };
    convex: {
      status: "ok" | "error";
      lastCallAt?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
}
```

---

## 11. Security Considerations

### 11.1 API Authentication

- Browser agent service requires API key in `Authorization` header
- Convex uses separate callback token for webhook authentication
- All tokens should be 256-bit random strings minimum

### 11.2 Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| `BROWSER_AGENT_API_KEY` | Convex env vars | Convex actions |
| `OPENAI_API_KEY` | Browser agent env | Browser agent only |
| `CONVEX_CALLBACK_TOKEN` | Both systems | Webhook auth |
| Portal credentials | Convex DB (encrypted) | Passed per-job |

### 11.3 Network Security

- Browser agent should only be accessible from localhost or internal network
- If exposed externally, use VPN or IP allowlist
- HTTPS for all external communication
- Rate limiting on all endpoints

### 11.4 Browser Security

- Run in sandboxed Docker container
- Non-root user inside container
- Resource limits (memory, CPU)
- No persistent storage of sensitive data
- Clear browser context between jobs

---

## 12. Testing Strategy

### 12.1 Unit Tests

| Component | Test Focus |
|-----------|------------|
| `BrowserManager` | Pool management, lifecycle |
| `PageController` | Navigation, interactions |
| `DOMExtractor` | HTML cleaning, extraction |
| `VisionAnalyzer` | Prompt construction, response parsing |
| `ActionExecutor` | Action translation, verification |
| `ErrorRecovery` | Classification, recovery plans |

### 12.2 Integration Tests

- End-to-end scraping of test portal
- LLM integration with mocked responses
- Convex callback handling
- Error recovery flows

### 12.3 Test Portals

Create or use known test portals:
- Simple static HTML table
- JavaScript-rendered content
- Pagination (numbered, next/prev)
- Infinite scroll
- Form-based search
- Login-protected content

---

## 13. Implementation Phases

### Phase 1: Foundation (Week 1-2)

1. Set up browser-agent-service project structure
2. Implement `BrowserManager` and `PageController`
3. Implement `ScreenshotCapture` and `DOMExtractor`
4. Create Express server with `/health` endpoint
5. Write unit tests for browser components

**Deliverables:**
- Working browser automation without LLM
- Can navigate to URL and capture screenshots
- Basic error handling

### Phase 2: LLM Integration (Week 2-3)

1. Implement `OpenAIClient` with vision support
2. Create prompt templates
3. Implement `VisionAnalyzer`
4. Create Zod schemas for LLM responses
5. Implement structured output parsing

**Deliverables:**
- Can send screenshots to GPT-4o-mini
- Receives and parses action plans
- Basic extraction working

### Phase 3: Agent Logic (Week 3-4)

1. Implement `ScraperAgent` state machine
2. Implement `ActionExecutor`
3. Implement `StateManager` (visited URLs, history)
4. Add pagination handling
5. Implement `ErrorRecovery`

**Deliverables:**
- Full scraping loop working
- Handles pagination
- Basic error recovery

### Phase 4: Convex Integration (Week 4-5)

1. Add Convex schema updates
2. Implement Convex actions for triggering scrapes
3. Implement HTTP callbacks
4. Add progress updates
5. Implement cron jobs

**Deliverables:**
- UI can trigger scrapes
- Results saved to Convex
- Scheduled scraping working

### Phase 5: Polish & Production (Week 5-6)

1. Docker configuration
2. Deployment scripts
3. Monitoring and logging
4. Security hardening
5. Documentation
6. Integration testing on real portals

**Deliverables:**
- Production-ready deployment
- Monitoring dashboard
- Operations documentation

---

## 14. Cost Estimation

### 14.1 OpenAI API Costs

| Model | Input Cost | Output Cost |
|-------|-----------|-------------|
| GPT-4o-mini | $0.15 / 1M tokens | $0.60 / 1M tokens |

**Per Scraping Session (Estimated):**
- ~10 page analyses × 1000 tokens = 10,000 input tokens
- ~10 responses × 500 tokens = 5,000 output tokens
- ~5 extraction calls × 2000 tokens = 10,000 input tokens
- ~5 extraction responses × 1000 tokens = 5,000 output tokens

**Total per portal:** ~$0.01 - $0.03

**Monthly estimate (50 portals, daily):**
- 50 portals × 30 days × $0.02 = **$30/month**

### 14.2 Infrastructure Costs

| Resource | Specification | Cost |
|----------|--------------|------|
| VPS (DigitalOcean/Hetzner) | 4 vCPU, 8GB RAM | $40-60/month |
| Alternative: AWS EC2 | t3.large | $60-80/month |

### 14.3 Total Monthly Cost

| Item | Cost |
|------|------|
| OpenAI API | $30-50 |
| Infrastructure | $40-80 |
| **Total** | **$70-130/month** |

---

## 15. Future Enhancements (Continued)

### 15.1 Short Term (1-3 Months)

- [ ] Redis queue for job management (scaling)
- [ ] Parallel scraping (multiple portals simultaneously)
- [ ] Smart caching (skip unchanged pages)
- [ ] Portal-specific optimizations (learned selectors from successful scrapes)
- [ ] Screenshot archival (S3/Cloudflare R2 for debugging)
- [ ] Retry queue with dead-letter handling
- [ ] Admin dashboard for monitoring active jobs
- [ ] Manual intervention mode (pause job, provide hints, resume)
- [ ] Rate limiting per portal domain
- [ ] Proxy rotation support for anti-bot detection

### 15.2 Medium Term (3-6 Months)

- [ ] **Machine Learning Improvements**
  - Fine-tune model on procurement-specific data
  - Build classification model for opportunity types
  - Train selector prediction model from successful scrapes

- [ ] **Multi-Browser Support**
  - Firefox support for sites that block Chromium
  - Mobile viewport scraping for responsive-only sites
  - Browser fingerprint randomization

- [ ] **Advanced Navigation**
  - Form-filling automation (search filters, date ranges)
  - Multi-step authentication flows (MFA handling with user input)
  - Session persistence across scraping runs
  - Deep link discovery (find hidden procurement pages)

- [ ] **Data Quality**
  - Duplicate detection across portals
  - Data normalization pipeline (dates, currencies, categories)
  - Confidence scoring with human review queue
  - Change detection (track opportunity updates)

- [ ] **Scaling Infrastructure**
  - Kubernetes deployment with auto-scaling
  - Distributed job queue (Bull/BullMQ with Redis)
  - Geographic distribution (scrape from multiple regions)
  - Browser pool management across nodes

### 15.3 Long Term (6-12 Months)

- [ ] **Autonomous Learning System**
  - Self-improving prompts based on extraction accuracy
  - Automatic portal configuration discovery
  - Pattern library (reusable navigation patterns)
  - Anomaly detection (identify when portals change)

- [ ] **Document Processing**
  - PDF extraction from attached documents
  - OCR for scanned documents
  - Document summarization
  - Attachment indexing and search

- [ ] **Notification System**
  - Real-time alerts for new opportunities
  - Custom filters and subscriptions
  - Email/Slack/webhook integrations
  - Opportunity matching based on user profiles

- [ ] **API Platform**
  - Public API for third-party integrations
  - Webhook subscriptions for new data
  - Bulk export capabilities
  - Historical data access

- [ ] **Alternative LLM Providers**
  - Anthropic Claude support (for comparison/fallback)
  - Local LLM option (Llama, Mistral) for cost reduction
  - Model routing based on task complexity
  - A/B testing different models

---

## 16. Appendix

### 16.1 Sample Portal Configurations

#### Simple Pagination Portal

```typescript
const simplePortalConfig: PortalConfiguration = {
  requiresAuth: false,
  navigationPattern: "pagination",
  knownSelectors: {
    opportunityList: "table.opportunities tbody tr",
    nextButton: "a.pagination-next",
    detailLink: "a.opportunity-title",
  },
  maxPages: 10,
  rateLimit: 1000,
  customInstructions: "Opportunities are displayed in a table. Each row is one opportunity.",
};
```

#### JavaScript-Heavy Portal

```typescript
const jsPortalConfig: PortalConfiguration = {
  requiresAuth: false,
  navigationPattern: "ajax-load",
  knownSelectors: {
    opportunityList: "[data-testid='opportunity-card']",
    loadMoreButton: "button.load-more",
  },
  maxPages: 20,
  rateLimit: 2000,
  customInstructions: `
    This portal uses React and loads content dynamically.
    Wait for the loading spinner to disappear before extracting.
    Click "Load More" button to get additional opportunities.
  `,
};
```

#### Authenticated Portal

```typescript
const authPortalConfig: PortalConfiguration = {
  requiresAuth: true,
  authMethod: "form",
  authCredentials: {
    username: "scraper@example.com",
    password: "encrypted-password-here",
  },
  navigationPattern: "pagination",
  customInstructions: `
    Login page has username and password fields.
    After login, navigate to "Active Solicitations" in the main menu.
  `,
};
```

#### Infinite Scroll Portal

```typescript
const infiniteScrollConfig: PortalConfiguration = {
  requiresAuth: false,
  navigationPattern: "infinite-scroll",
  maxPages: 5, // Represents scroll iterations
  rateLimit: 1500,
  customInstructions: `
    This portal uses infinite scroll. Scroll to bottom to load more.
    Stop when no new content appears after scrolling.
    Maximum 100 opportunities per scrape.
  `,
};
```

### 16.2 Common LLM Response Examples

#### Page Analysis Response

```json
{
  "pageType": "list",
  "hasOpportunities": true,
  "opportunityCount": 15,
  "hasPagination": true,
  "paginationType": "numbered",
  "currentPageNumber": 1,
  "totalPages": 8,
  "recommendedAction": {
    "action": "extract",
    "target": null,
    "value": null,
    "reason": "This is a list page with 15 visible opportunities. Should extract data before navigating.",
    "expectedOutcome": "Extract all 15 opportunities from the table"
  },
  "confidence": 0.95,
  "notes": "Table has columns: Title, Reference #, Due Date, Department"
}
```

#### Data Extraction Response

```json
{
  "opportunities": [
    {
      "title": "IT Infrastructure Modernization Services",
      "referenceNumber": "RFP-2024-0892",
      "opportunityType": "RFP",
      "status": "Open",
      "postedDate": "2024-12-15",
      "closingDate": "2025-01-30",
      "description": "Seeking qualified vendors for comprehensive IT infrastructure modernization including cloud migration, network upgrades, and cybersecurity enhancements.",
      "category": "Information Technology",
      "department": "Department of Administration",
      "estimatedValue": "$2,000,000 - $5,000,000",
      "contactName": "John Smith",
      "contactEmail": "john.smith@state.gov",
      "contactPhone": null,
      "detailUrl": "/opportunities/RFP-2024-0892",
      "documents": [
        {
          "name": "RFP Document",
          "url": "/documents/RFP-2024-0892.pdf",
          "type": "PDF"
        }
      ],
      "rawText": "IT Infrastructure Modernization Services | RFP-2024-0892 | Open | Due: Jan 30, 2025",
      "confidence": 0.92
    }
  ],
  "extractionNotes": "Successfully extracted 1 opportunity. Contact phone not visible on list page.",
  "hasMoreOpportunities": true,
  "needsScrolling": false
}
```

#### Click Action Response

```json
{
  "pageType": "list",
  "hasOpportunities": true,
  "opportunityCount": 15,
  "hasPagination": true,
  "paginationType": "numbered",
  "currentPageNumber": 1,
  "totalPages": 8,
  "recommendedAction": {
    "action": "click",
    "target": {
      "selector": "a[aria-label='Go to page 2']",
      "description": "Page 2 link in the pagination bar at the bottom of the table",
      "coordinates": { "x": 650, "y": 890 }
    },
    "value": null,
    "reason": "All opportunities on page 1 have been extracted. Moving to page 2.",
    "expectedOutcome": "Navigate to page 2 showing opportunities 16-30"
  },
  "confidence": 0.88,
  "notes": null
}
```

#### Error Detection Response

```json
{
  "pageType": "error",
  "hasOpportunities": false,
  "opportunityCount": 0,
  "hasPagination": false,
  "paginationType": null,
  "currentPageNumber": null,
  "totalPages": null,
  "recommendedAction": {
    "action": "error",
    "target": null,
    "value": null,
    "reason": "Page displays '503 Service Unavailable' error. The server is temporarily down.",
    "expectedOutcome": "Cannot proceed - portal is unavailable"
  },
  "confidence": 0.99,
  "notes": "Recommend retrying in 30 minutes. This appears to be a temporary server issue."
}
```

### 16.3 Error Recovery Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                        ERROR DETECTED                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │ Classify Error Type   │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  NAVIGATION   │   │   ELEMENT     │   │   BLOCKING    │
│  (timeout,    │   │   (not found, │   │   (captcha,   │
│  network)     │   │   stale)      │   │   auth, rate  │
│               │   │               │   │   limit)      │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Retry with    │   │ Re-analyze    │   │ Is it         │
│ longer        │   │ page, find    │   │ recoverable?  │
│ timeout?      │   │ alternative   │   │               │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
   ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
   │Yes  │No │         │Found│Not│         │Yes  │No │
   │     │   │         │     │   │         │     │   │
   ▼     ▼   │         ▼     ▼   │         ▼     ▼
┌─────┐ ┌────┴──┐   ┌─────┐ ┌────┴──┐   ┌─────┐ ┌─────┐
│RETRY│ │Try    │   │RETRY│ │Navigate│   │WAIT │ │ABORT│
│     │ │refresh│   │with │ │back,   │   │and  │ │     │
│     │ │or back│   │new  │ │skip    │   │retry│ │     │
└─────┘ └───────┘   │sel. │ │page    │   └─────┘ └─────┘
                    └─────┘ └────────┘
```

### 16.4 Glossary

| Term | Definition |
|------|------------|
| **VLM** | Vision-Language Model - AI model that can process both images and text |
| **DOM** | Document Object Model - the tree structure representing HTML content |
| **Headless Browser** | Browser running without visible UI, controlled programmatically |
| **Playwright** | Microsoft's browser automation library |
| **Convex Action** | Server-side function in Convex that can call external APIs |
| **Convex Mutation** | Server-side function in Convex that modifies database |
| **Convex Query** | Server-side function in Convex that reads from database |
| **Convex Cron** | Scheduled task in Convex that runs periodically |
| **Circuit Breaker** | Pattern to prevent cascading failures by stopping calls to failing service |
| **Backoff** | Strategy of increasing delay between retries |
| **Selector** | CSS or XPath expression to locate HTML elements |
| **Pagination** | UI pattern for splitting content across multiple pages |
| **Infinite Scroll** | UI pattern where scrolling loads more content |
| **AJAX** | Asynchronous JavaScript - loading content without page refresh |

### 16.5 References

**Browser Automation:**
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)

**OpenAI Vision:**
- [OpenAI Vision Guide](https://platform.openai.com/docs/guides/vision)
- [GPT-4o Documentation](https://platform.openai.com/docs/models/gpt-4o)

**Convex:**
- [Convex Actions](https://docs.convex.dev/functions/actions)
- [Convex HTTP Endpoints](https://docs.convex.dev/functions/http-actions)
- [Convex Crons](https://docs.convex.dev/scheduling/crons)

**Related Projects:**
- [Browser-Use](https://github.com/browser-use/browser-use)
- [Puppeteer](https://pptr.dev/)
- [Firecrawl](https://docs.firecrawl.dev/)

---

## 17. Checklist for Implementation

### Pre-Development

- [ ] Confirm OpenAI API access and billing
- [ ] Set up development environment
- [ ] Create browser-agent-service repository
- [ ] Configure Convex project with new schema
- [ ] Set up Docker development environment
- [ ] Identify 5-10 test portals with varying complexity

### Phase 1 Checklist

- [ ] Project scaffolding complete
- [ ] TypeScript configuration
- [ ] ESLint/Prettier setup
- [ ] Express server running
- [ ] BrowserManager implemented
- [ ] PageController implemented
- [ ] ScreenshotCapture implemented
- [ ] DOMExtractor implemented
- [ ] Health endpoint working
- [ ] Unit tests for browser components
- [ ] Can navigate to URL and capture screenshot

### Phase 2 Checklist

- [ ] OpenAI client implemented
- [ ] System prompt defined
- [ ] Page analysis prompt working
- [ ] Data extraction prompt working
- [ ] Zod schemas for LLM responses
- [ ] VisionAnalyzer implemented
- [ ] Structured output parsing working
- [ ] Error handling for LLM failures
- [ ] Token usage tracking

### Phase 3 Checklist

- [ ] ScraperAgent state machine
- [ ] ActionExecutor implemented
- [ ] StateManager (visited URLs, history)
- [ ] Pagination handling (numbered, next/prev)
- [ ] Infinite scroll handling
- [ ] ErrorRecovery implemented
- [ ] Maximum page limits enforced
- [ ] Loop detection working
- [ ] End-to-end scraping on test portal

### Phase 4 Checklist

- [ ] Convex schema updates deployed
- [ ] scrapePortal action implemented
- [ ] HTTP callback endpoint working
- [ ] Progress updates implemented
- [ ] Results saving to database
- [ ] Opportunities table populated
- [ ] Cron jobs configured
- [ ] Batch job support
- [ ] UI integration working

### Phase 5 Checklist

- [ ] Dockerfile optimized
- [ ] Docker Compose for development
- [ ] Production deployment configured
- [ ] Environment variables documented
- [ ] Secrets management in place
- [ ] Logging configured
- [ ] Health checks working
- [ ] Monitoring dashboard
- [ ] Error alerting
- [ ] Documentation complete
- [ ] Tested on 10+ real portals
- [ ] Performance benchmarks recorded

---

*End of System Card*