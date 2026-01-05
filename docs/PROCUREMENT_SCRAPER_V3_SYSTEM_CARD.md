# Procurement Scraper V3 - Technical System Card

## Executive Summary

The Procurement Scraper V3 is a complete architectural revamp of the procurement data extraction system. It introduces a pseudo-web browser environment with temporary, isolated browser tabs, an AI-powered agent workflow using GPT-4o-mini, and a generic element-selection interface that enables scraping from any procurement website without site-specific code.

**Key Innovation**: Instead of hardcoding scrapers for specific sites, users visually select the parent element containing procurement opportunities, and the AI agent intelligently extracts structured data from the selected DOM subtree.

---

## System Architecture

### 1. Core Components

#### 1.1 Pseudo-Web Browser Engine
- **Purpose**: Provides isolated, temporary browser tabs for procurement scraping
- **Technology**: Browser Extension API + MCP Browser Tools
- **Lifecycle**: 
  - Tab created on-demand when scraping starts
  - Tab destroyed after scraping completes or is cancelled
  - No persistent browser state between scraping sessions
- **Isolation**: Each procurement URL gets its own isolated tab context
- **Access Control**: Only tabs required for active scraping sessions are accessible

#### 1.2 Convex AI Agent Workflow
- **Model**: GPT-4o-mini (via Convex Agent framework)
- **Role**: Intelligent data extraction and parsing
- **Responsibilities**:
  - Analyze selected DOM element structure
  - Identify procurement opportunity patterns
  - Extract structured data (title, date, description, link, etc.)
  - Handle pagination logic
  - Validate extracted data quality
- **Integration**: Uses `@convex-dev/agent` framework with custom tools

#### 1.3 Element Selection GUI (DevTools-Inspired)
- **Purpose**: Visual element picker for selecting parent container
- **Technology**: Browser Extension Content Script + Overlay UI
- **Features**:
  - Hover highlighting of DOM elements
  - Click to select parent element
  - Visual indicator showing selected element
  - Element path display (CSS selector, XPath)
  - Preview of element's children count
- **Positioning**: Overlays between Cobecium app and procurement tab

#### 1.4 Cookie/Data Storage Bridge
- **Purpose**: Temporary storage for scraping configuration and extracted data
- **Storage Location**: Browser Extension Local Storage + Convex Database
- **Data Stored**:
  - Selected element selector
  - Scraping session metadata
  - Extracted procurement opportunities (temporary, before DB save)
  - Site-specific scraping rules (if any)
- **Lifecycle**: Cleared after successful data persistence to Convex

---

## 2. System Flow

### 2.1 Initialization Phase

```
User Action: "Scrape Approved Site"
    ↓
1. Fetch approved procurement URLs from Convex
    ↓
2. For each approved URL:
    a. Create isolated browser tab
    b. Navigate to procurement URL
    c. Inject element selection overlay
    ↓
3. Display element selection GUI
```

### 2.2 Element Selection Phase

```
User Action: Hover/Click on DOM element
    ↓
1. Element Selection Overlay:
    - Highlights hovered element
    - Shows element info (tag, class, id, children count)
    ↓
2. User clicks to select parent container
    ↓
3. System captures:
    - CSS selector (primary)
    - XPath (fallback)
    - Element snapshot (for AI analysis)
    - DOM structure preview
    ↓
4. Store selection in Cookie/Storage Bridge
    ↓
5. Trigger AI Agent workflow
```

### 2.3 AI Agent Processing Phase

```
AI Agent Workflow Triggered
    ↓
1. Agent receives:
    - Selected element selector
    - Page snapshot/HTML
    - Site metadata (state, city, URL)
    ↓
2. Agent analyzes DOM structure:
    - Identifies repeating patterns (opportunity items)
    - Extracts field mappings (title, date, description, etc.)
    - Determines pagination mechanism
    ↓
3. Agent extracts data:
    - Iterates through opportunity items
    - Extracts structured fields
    - Validates data completeness
    ↓
4. Agent handles pagination:
    - Detects "Next" button/link
    - Navigates to next page
    - Repeats extraction
    - Stops at max pages or no more data
    ↓
5. Agent returns structured data:
    - Array of procurement opportunities
    - Metadata (source URL, extraction timestamp, quality score)
```

### 2.4 Data Persistence Phase

```
AI Agent returns extracted data
    ↓
1. Validate extracted data quality
    ↓
2. Transform to Convex schema format
    ↓
3. Save to Convex database:
    - scrapedProcurementData table
    - Link to procurementUrls record
    ↓
4. Clear temporary storage
    ↓
5. Close browser tab
    ↓
6. Update UI with results
```

---

## 3. Technical Implementation Details

### 3.1 Browser Extension Architecture

#### 3.1.1 Manifest Configuration
```json
{
  "manifest_version": 3,
  "name": "CobecDev Procurement Scraper",
  "permissions": [
    "tabs",
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["elementSelector.js"],
      "css": ["elementSelector.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

#### 3.1.2 Element Selector Content Script
```typescript
// elementSelector.ts
class ElementSelector {
  private selectedElement: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  
  init() {
    // Inject overlay UI
    this.createOverlay();
    
    // Enable hover highlighting
    document.addEventListener('mouseover', this.handleHover);
    document.addEventListener('click', this.handleClick);
  }
  
  handleHover(e: MouseEvent) {
    const target = e.target as HTMLElement;
    this.highlightElement(target);
  }
  
  handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target as HTMLElement;
    this.selectElement(target);
    
    // Send selection to background script
    chrome.runtime.sendMessage({
      type: 'ELEMENT_SELECTED',
      selector: this.generateSelector(target),
      xpath: this.generateXPath(target),
      snapshot: this.captureSnapshot(target)
    });
  }
  
  generateSelector(element: HTMLElement): string {
    // Generate unique CSS selector
    // Prefer: id > class > tag hierarchy
  }
  
  captureSnapshot(element: HTMLElement): ElementSnapshot {
    return {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      childrenCount: element.children.length,
      innerHTML: element.innerHTML.substring(0, 1000), // Truncated
      attributes: this.getAttributes(element)
    };
  }
}
```

#### 3.1.3 Background Service Worker
```typescript
// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ELEMENT_SELECTED') {
    // Store selection in extension storage
    chrome.storage.local.set({
      [`selection_${sender.tab?.id}`]: {
        selector: message.selector,
        xpath: message.xpath,
        snapshot: message.snapshot,
        timestamp: Date.now(),
        url: sender.tab?.url
      }
    });
    
    // Notify Convex backend
    notifyConvexSelection(sender.tab?.id, message);
  }
});
```

### 3.2 Convex AI Agent Implementation

#### 3.2.1 Agent Definition
```typescript
// convex/agent/procurementScraper.ts
import { Agent, createTool } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v3";

// Tool: Get selected element data
const getSelectedElement = createTool({
  description: "Get the selected DOM element data for scraping",
  args: z.object({
    tabId: z.number(),
    procurementUrlId: z.id("procurementUrls"),
  }),
  handler: async (ctx, args) => {
    // Retrieve element selection from extension storage
    // This would be stored via a Convex action that receives data from extension
    const selection = await ctx.runQuery(
      api.procurementScraperQueries.getElementSelection,
      { tabId: args.tabId, procurementUrlId: args.procurementUrlId }
    );
    return selection;
  },
});

// Tool: Extract data from element
const extractProcurementData = createTool({
  description: "Extract procurement opportunities from selected DOM element",
  args: z.object({
    selector: z.string(),
    html: z.string(),
    siteMetadata: z.object({
      state: z.string(),
      city: z.string(),
      url: z.string(),
    }),
  }),
  handler: async (ctx, args) => {
    // Use GPT-4o-mini to analyze HTML and extract structured data
    const prompt = `Analyze this HTML and extract procurement opportunities.

Selected Element Selector: ${args.selector}
Site: ${args.siteMetadata.state} - ${args.siteMetadata.city}
URL: ${args.siteMetadata.url}

HTML Content:
${args.html.substring(0, 50000)} // Truncate for token limits

Extract all procurement opportunities and return as JSON array with fields:
- title (string)
- description (string)
- dueDate (ISO date string or null)
- bidNumber (string or null)
- link (absolute URL or null)
- category (string or null)
- status (string: "open", "closed", "upcoming")

Identify the pattern of repeating elements and extract each opportunity.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return data.opportunities || [];
  },
});

// Tool: Handle pagination
const navigateToNextPage = createTool({
  description: "Navigate to next page of procurement opportunities",
  args: z.object({
    tabId: z.number(),
    currentPage: z.number(),
  }),
  handler: async (ctx, args) => {
    // Use MCP browser tools to find and click "Next" button
    // This would be called by the agent when it detects pagination
    return { success: true, pageNumber: args.currentPage + 1 };
  },
});

// Main Agent
export const procurementScraperAgent = new Agent(components.agent, {
  languageModel: openai.chat("gpt-5-mini"),
  name: "Procurement Scraper Agent",
  instructions: `You are a procurement data extraction agent. Your task is to:

1. Analyze the selected DOM element structure
2. Identify repeating patterns (individual procurement opportunities)
3. Extract structured data from each opportunity
4. Handle pagination if present
5. Return validated, structured data

Be thorough but efficient. Extract all available fields, but mark missing fields as null.
Validate dates and URLs before returning them.`,
  tools: {
    getSelectedElement,
    extractProcurementData,
    navigateToNextPage,
  },
});
```

#### 3.2.2 Scraping Action
```typescript
// convex/procurementScraperActions.ts
export const scrapeWithElementSelection = action({
  args: {
    procurementUrlId: v.id("procurementUrls"),
    tabId: v.number(), // Browser tab ID from extension
    elementSelector: v.string(),
    elementXPath: v.optional(v.string()),
    elementSnapshot: v.any(),
  },
  handler: async (ctx, args) => {
    // 1. Get procurement URL details
    const procurementUrl = await ctx.runQuery(
      api.procurementUrls.get,
      { id: args.procurementUrlId }
    );

    // 2. Get full page HTML (via MCP browser or extension message)
    const pageHtml = await getPageHtml(args.tabId);

    // 3. Run AI agent to extract data
    const result = await ctx.runAgent(
      api.agent.procurementScraper.procurementScraperAgent,
      {
        procurementUrlId: args.procurementUrlId,
        elementSelector: args.elementSelector,
        html: pageHtml,
        siteMetadata: {
          state: procurementUrl.state,
          city: procurementUrl.capital,
          url: procurementUrl.procurementLink,
        },
      }
    );

    // 4. Save extracted data
    const recordId = await ctx.runMutation(
      api.procurementScraperMutations.saveScrapedData,
      {
        procurementUrlId: args.procurementUrlId,
        sourceUrl: procurementUrl.procurementLink,
        state: procurementUrl.state,
        capital: procurementUrl.capital,
        scrapedData: result.opportunities,
        scrapingStatus: "completed",
        dataQuality: calculateQualityScore(result.opportunities),
      }
    );

    return { success: true, recordId, opportunitiesCount: result.opportunities.length };
  },
});
```

### 3.3 Frontend Integration

#### 3.3.1 Element Selection UI Component
```typescript
// src/components/ElementSelectorOverlay.tsx
export function ElementSelectorOverlay({ 
  procurementUrlId,
  onElementSelected 
}: ElementSelectorOverlayProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);

  const handleStartSelection = async () => {
    // Send message to extension to enable element selection mode
    const response = await chrome.runtime.sendMessage({
      type: 'ENABLE_ELEMENT_SELECTION',
      tabId: await getCurrentTabId(),
    });

    setIsSelecting(true);
  };

  const handleElementSelected = async (elementInfo: ElementInfo) => {
    setSelectedElement(elementInfo);
    
    // Trigger scraping with selected element
    const result = await scrapeWithElementSelection({
      procurementUrlId,
      tabId: elementInfo.tabId,
      elementSelector: elementInfo.selector,
      elementXPath: elementInfo.xpath,
      elementSnapshot: elementInfo.snapshot,
    });

    onElementSelected(result);
  };

  return (
    <div className="element-selector-overlay">
      <button onClick={handleStartSelection}>
        {isSelecting ? 'Selecting...' : 'Select Element'}
      </button>
      
      {selectedElement && (
        <div className="selected-element-info">
          <p>Selected: {selectedElement.selector}</p>
          <p>Children: {selectedElement.childrenCount}</p>
        </div>
      )}
    </div>
  );
}
```

#### 3.3.2 Scraping Session Manager
```typescript
// src/components/ProcurementScrapingSession.tsx
export function ProcurementScrapingSession({
  procurementUrlId,
}: ProcurementScrapingSessionProps) {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [browserTabId, setBrowserTabId] = useState<number | null>(null);

  const startScrapingSession = async () => {
    // 1. Get procurement URL
    const procurementUrl = await getProcurementUrl(procurementUrlId);

    // 2. Open browser tab (via extension API)
    const tab = await chrome.tabs.create({
      url: procurementUrl.procurementLink,
      active: true,
    });

    setBrowserTabId(tab.id || null);
    setSessionState('element_selection');

    // 3. Inject element selector
    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ['elementSelector.js'],
    });

    // 4. Inject CSS overlay
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id! },
      files: ['elementSelector.css'],
    });
  };

  const handleScrapingComplete = async (result: ScrapingResult) => {
    setSessionState('completed');
    
    // Close browser tab after delay
    if (browserTabId) {
      setTimeout(() => {
        chrome.tabs.remove(browserTabId);
      }, 3000);
    }
  };

  return (
    <div className="scraping-session">
      {sessionState === 'idle' && (
        <button onClick={startScrapingSession}>
          Start Scraping Session
        </button>
      )}
      
      {sessionState === 'element_selection' && browserTabId && (
        <ElementSelectorOverlay
          procurementUrlId={procurementUrlId}
          tabId={browserTabId}
          onElementSelected={handleScrapingComplete}
        />
      )}
      
      {sessionState === 'scraping' && (
        <ScrapingProgress />
      )}
      
      {sessionState === 'completed' && (
        <ScrapingResults />
      )}
    </div>
  );
}
```

---

## 4. Data Models

### 4.1 Element Selection Schema
```typescript
interface ElementSelection {
  _id: Id<"elementSelections">;
  procurementUrlId: Id<"procurementUrls">;
  tabId: number;
  selector: string; // CSS selector
  xpath?: string; // XPath (fallback)
  snapshot: {
    tagName: string;
    id?: string;
    className?: string;
    childrenCount: number;
    innerHTML: string; // Truncated
    attributes: Record<string, string>;
  };
  selectedAt: number;
  selectedBy: string; // User ID
}
```

### 4.2 Scraped Data Schema (Enhanced)
```typescript
interface ScrapedProcurementData {
  _id: Id<"scrapedProcurementData">;
  procurementUrlId: Id<"procurementUrls">;
  sourceUrl: string;
  state: string;
  capital: string;
  scrapedAt: number;
  scrapingStatus: "pending" | "in_progress" | "completed" | "failed";
  
  // Element selection metadata
  elementSelector?: string;
  elementXPath?: string;
  
  // Extracted opportunities
  opportunities: ProcurementOpportunity[];
  
  // Quality metrics
  dataQuality?: "high" | "medium" | "low";
  dataCompleteness?: number; // 0-1
  extractionMethod: "ai_agent" | "manual" | "legacy";
  
  errorMessage?: string;
}

interface ProcurementOpportunity {
  title: string;
  description?: string;
  dueDate?: string; // ISO date
  bidNumber?: string;
  link?: string; // Absolute URL
  category?: string;
  status?: "open" | "closed" | "upcoming";
  extractedAt: number;
  confidence?: number; // 0-1, AI confidence score
}
```

---

## 5. User Workflow

### 5.1 Step-by-Step User Experience

1. **User initiates scraping**:
   - Navigates to "Scraped Procurement Data" page
   - Clicks "Scrape Approved Site" for a specific procurement URL
   - System opens new browser tab with procurement website

2. **Element selection**:
   - Element selector overlay appears on the procurement page
   - User hovers over elements to see highlighting
   - User clicks on the parent container that holds all procurement opportunities
   - System captures element selector and shows preview

3. **AI processing**:
   - System sends selected element data to Convex AI Agent
   - Agent analyzes DOM structure and extracts opportunities
   - Progress indicator shows extraction status
   - Agent handles pagination automatically (if detected)

4. **Results display**:
   - Extracted opportunities appear in the data grid
   - User can review, edit, or delete individual opportunities
   - System saves data to Convex database
   - Browser tab closes automatically

### 5.2 Error Handling

- **Element selection timeout**: If user doesn't select element within 5 minutes, session cancels
- **AI extraction failure**: Falls back to manual extraction or shows error with retry option
- **Pagination detection failure**: Agent stops at first page, user can manually trigger next page
- **Browser tab crash**: System detects and allows user to restart session

---

## 6. Integration Points

### 6.1 Convex Backend
- **Queries**: `procurementScraperQueries.getElementSelection`
- **Mutations**: `procurementScraperMutations.saveScrapedData`
- **Actions**: `procurementScraperActions.scrapeWithElementSelection`
- **Agents**: `agent.procurementScraper.procurementScraperAgent`

### 6.2 Browser Extension
- **Content Scripts**: Element selector injection
- **Background Service Worker**: Message passing, storage management
- **Popup UI**: Quick actions, session status

### 6.3 Frontend React Components
- `ProcurementScrapingSession`: Main session manager
- `ElementSelectorOverlay`: Element selection UI
- `ScrapingProgress`: Real-time progress indicator
- `ScrapedProcurementDataGrid`: Results display (existing, enhanced)

---

## 7. Security & Privacy

### 7.1 Data Isolation
- Each scraping session uses isolated browser tab
- No cross-tab data leakage
- Temporary storage cleared after session

### 7.2 Access Control
- Only approved procurement URLs can be scraped
- User authentication required for scraping sessions
- Element selections tied to user ID

### 7.3 Rate Limiting
- Maximum concurrent scraping sessions per user: 3
- Maximum pages per scraping session: 50
- Cooldown period between sessions: 30 seconds

---

## 8. Performance Considerations

### 8.1 AI Agent Optimization
- HTML truncation to 50k characters for token efficiency
- Batch processing of opportunities (10 at a time)
- Caching of element selectors for same-site re-scraping

### 8.2 Browser Resource Management
- Automatic tab closure after 10 minutes of inactivity
- Memory cleanup after each scraping session
- Concurrent session limits to prevent resource exhaustion

### 8.3 Database Optimization
- Batch inserts for multiple opportunities
- Indexed queries on `procurementUrlId` and `scrapedAt`
- Archival strategy for old scraped data (>90 days)

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Element selector generation
- CSS selector uniqueness validation
- AI agent prompt construction
- Data transformation logic

### 9.2 Integration Tests
- End-to-end scraping workflow
- Browser extension message passing
- Convex action/mutation flows
- Error handling scenarios

### 9.3 Manual Testing
- Element selection on various site layouts
- Pagination handling on different sites
- Data extraction accuracy validation
- Performance under load

---

## 10. Migration Plan

### 10.1 Phase 1: Foundation (Week 1-2)
- Browser extension development
- Element selector implementation
- Basic Convex agent setup

### 10.2 Phase 2: Integration (Week 3-4)
- Frontend component development
- Convex actions/mutations
- Message passing between extension and app

### 10.3 Phase 3: AI Agent (Week 5-6)
- Agent tool development
- Prompt engineering
- Data extraction logic

### 10.4 Phase 4: Testing & Refinement (Week 7-8)
- End-to-end testing
- Performance optimization
- User feedback integration

### 10.5 Phase 5: Deployment (Week 9)
- Production deployment
- Documentation
- User training

---

## 11. Future Enhancements

### 11.1 Advanced Features
- **Multi-element selection**: Select multiple containers for complex layouts
- **Template learning**: Save element selectors as reusable templates
- **Auto-detection**: AI suggests best element without user selection
- **Incremental updates**: Only scrape new opportunities since last run

### 11.2 AI Improvements
- **Fine-tuned model**: Custom model trained on procurement data
- **Multi-model ensemble**: Combine GPT-4o-mini with specialized extractors
- **Confidence scoring**: Better quality metrics for extracted data

### 11.3 User Experience
- **Visual data preview**: Show extracted data before saving
- **Bulk editing**: Edit multiple opportunities at once
- **Export options**: CSV, JSON, API endpoints

---

## 12. Technical Dependencies

### 12.1 Frontend
- React 18+
- Chrome Extension API
- Convex React SDK
- Tailwind CSS (for UI styling)

### 12.2 Backend
- Convex (database, actions, agents)
- OpenAI API (GPT-4o-mini)
- @convex-dev/agent framework
- Zod (schema validation)

### 12.3 Browser Extension
- Manifest V3
- Chrome Tabs API
- Chrome Storage API
- Chrome Scripting API

---

## 13. Success Metrics

### 13.1 Technical Metrics
- **Extraction accuracy**: >90% of opportunities correctly extracted
- **Session success rate**: >95% of sessions complete successfully
- **Average extraction time**: <2 minutes per site
- **Token usage**: <50k tokens per scraping session

### 13.2 User Experience Metrics
- **Time to first selection**: <30 seconds
- **User satisfaction**: >4/5 rating
- **Error recovery rate**: >80% of errors recoverable without restart

---

## 14. Risk Mitigation

### 14.1 Technical Risks
- **AI extraction failures**: Fallback to manual extraction mode
- **Browser compatibility**: Test on Chrome, Edge, Brave
- **Rate limiting**: Implement exponential backoff for API calls

### 14.2 Business Risks
- **Data quality issues**: Implement validation and review workflow
- **Site structure changes**: Element selector versioning and alerts
- **Cost overruns**: Token usage monitoring and budgets

---

## Conclusion

The Procurement Scraper V3 represents a paradigm shift from site-specific scrapers to a generic, AI-powered extraction system. By combining visual element selection with intelligent AI agents, we create a flexible, maintainable solution that can adapt to any procurement website structure while providing excellent user experience and data quality.

**Key Advantages**:
1. **Generic**: Works on any procurement site without code changes
2. **User-friendly**: Visual selection is intuitive
3. **Intelligent**: AI handles complex extraction logic
4. **Maintainable**: No site-specific code to update
5. **Scalable**: Can handle hundreds of sites with same codebase

