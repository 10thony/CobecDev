# Python Scraper Service Integration - System Card

## Executive Summary

This system card defines the architecture for integrating the standalone Python procurement scraper (`scripts/scraper3.py`) as a service within the web application. The Python script serves as the **scraping engine**, while the React UI provides the **interactive casing** for monitoring and control. The integration maintains full interactivity, including the visual element selection feature, while enabling the scraper to run as a background service accessible via HTTP API.

**Key Principle**: Python = Engine, UI = Casing

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Application                          │
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────────────────┐  │
│  │  React UI        │         │  Python Scraper Service      │  │
│  │  (Casing)       │◄────────┤  (Engine)                    │  │
│  │                 │  HTTP   │                               │  │
│  │  • Browser      │  API    │  • Playwright (chromium)      │  │
│  │    Scraper      │         │  • Element Selection         │  │
│  │    Panel        │         │  • Data Parsing              │  │
│  │  • Progress     │         │  • Convex Integration        │  │
│  │    Tracking     │         │                               │  │
│  │  • Controls     │         │  Port: 8000                  │  │
│  └──────────────────┘         └──────────────────────────────┘  │
│           │                              │                        │
│           │                              │                        │
│           ▼                              ▼                        │
│  ┌──────────────────┐         ┌──────────────────────────────┐  │
│  │  Convex Backend  │         │  chromium Browser Instance    │  │
│  │  (Database)      │         │  (Visible/Headless)          │  │
│  └──────────────────┘         └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

#### **Python Scraper Service (Engine)**
- **Role**: Core scraping logic and browser automation
- **Technology**: Python 3.9+, Playwright, FastAPI/Flask
- **Responsibilities**:
  - Launch and manage chromium browser instances
  - Navigate to procurement URLs
  - Inject element selection JavaScript
  - Capture HTML from selected elements
  - Parse HTML to structured data (pandas + AI fallback)
  - Save data to Convex database
  - Handle CAPTCHAs and verification (with user interaction)
  - Provide real-time progress updates via WebSocket/SSE

#### **React UI (Casing)**
- **Role**: User interface and control layer
- **Technology**: React, TypeScript, Vite
- **Responsibilities**:
  - Display scraping progress and status
  - Provide start/stop/cancel controls
  - Show browser viewport (optional: embedded or popup)
  - Display parsed data preview
  - Handle user interactions (verification prompts, element selection)
  - Communicate with Python service via HTTP API

#### **Convex Backend**
- **Role**: Data persistence and state management
- **Responsibilities**:
  - Store procurement URLs and approval status
  - Store scraped procurement data
  - Track scraping sessions and progress
  - Provide queries for UI data display

---

## 2. Communication Protocol

### 2.1 HTTP API Endpoints

The Python service exposes a REST API for control and monitoring:

#### **Base URL**: `http://localhost:8000/api/v1`

#### **Endpoints**:

```typescript
// Health check
GET /health
Response: { status: "ok", version: "1.0.0" }

// Start scraping session
POST /scrape/start
Body: {
  url: string;
  state: string;
  capital: string;
  procurementUrlId?: string;
  options?: {
    waitStrategy?: "networkidle" | "domcontentloaded";
    headless?: boolean;
    timeout?: number;
  };
}
Response: {
  sessionId: string;
  status: "initializing";
  message: string;
}

// Get session status
GET /scrape/status/:sessionId
Response: {
  sessionId: string;
  status: "idle" | "navigating" | "waiting_selection" | "parsing" | "saving" | "completed" | "error" | "cancelled";
  currentStep: string;
  progress: {
    stage: string;
    message: string;
  };
  error?: string;
}

// Cancel session
POST /scrape/cancel/:sessionId
Response: { success: boolean; message: string; }

// Get browser viewport (screenshot)
GET /scrape/viewport/:sessionId
Response: {
  image: string; // base64 encoded PNG
  url: string;
  timestamp: number;
}

// Element selection callback (from browser JavaScript)
POST /scrape/select/:sessionId
Body: {
  html: string;
  selector?: string;
}
Response: { success: boolean; message: string; }

// Manual HTML input (fallback)
POST /scrape/html/:sessionId
Body: {
  html: string;
}
Response: { success: boolean; message: string; }
```

### 2.2 Real-Time Updates

For real-time progress updates, the service supports **Server-Sent Events (SSE)**:

```typescript
// Subscribe to session updates
GET /scrape/stream/:sessionId
Content-Type: text/event-stream

Events:
- progress: { stage, message, percentage? }
- status: { status, currentStep }
- error: { message, details }
- complete: { sessionId, recordCount, duration }
```

### 2.3 WebSocket Alternative (Optional)

For bidirectional communication (e.g., user interaction callbacks), WebSocket can be used:

```typescript
// WebSocket connection
WS /scrape/ws/:sessionId

Messages:
Client → Server:
  { type: "user_action", action: "continue" | "skip" | "retry" }
  { type: "html_input", html: string }

Server → Client:
  { type: "progress", data: {...} }
  { type: "user_prompt", prompt: "Complete CAPTCHA and press continue" }
  { type: "element_selection_active", message: "Click on the table to capture" }
```

---

## 3. Browser Integration

### 3.1 chromium Browser Instance

The Python service launches chromium browser instances with the following configuration:

```python
# Browser launch options
browser = await playwright.chromium.launch_persistent_context(
    user_data_dir="./chromium_user_data",
    headless=False,  # Visible for user interaction
    viewport={"width": 1920, "height": 1080},
    locale="en-US",
    timezone_id="America/New_York",
    args=[
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        # ... other stealth args
    ],
)
```

### 3.2 Browser Visibility Options

**Option A: Popup Window (Recommended)**
- Python service opens chromium in a separate window
- User can interact directly with the browser
- UI shows progress and controls, but browser is separate

**Option B: Embedded Viewport (Advanced)**
- Python service streams browser viewport via screenshots
- UI displays browser view in an iframe-like component
- User interactions proxied through API
- More complex but provides unified UI experience

**Option C: Headless with Remote Debugging**
- Browser runs headless but exposes Chrome DevTools Protocol
- UI connects to browser via CDP for interaction
- Most complex but most flexible

**Recommendation**: Start with Option A (popup window) for simplicity, upgrade to Option B if needed.

### 3.3 Element Selection Flow

The interactive element selection feature works as follows:

1. **Python service navigates to URL** and waits for page load
2. **JavaScript injection**: Service injects element selector script (from `scraper3.py`)
3. **Visual feedback**: Browser shows hover highlighting and banner
4. **User clicks element**: JavaScript captures the element's HTML
5. **Callback to service**: JavaScript sends HTML to Python service via HTTP POST
6. **Parsing**: Python service parses HTML using pandas + AI fallback
7. **Save to Convex**: Parsed data saved to database

**JavaScript Injection** (from `scraper3.py`):
```javascript
// Injected into page
window.__playwrightSelectorActive = true;
// ... element highlighting and click handler ...
sendToPython(tableObj.outerHTML); // Calls exposed Python function
```

**Python Callback**:
```python
async def on_element_selected(html_content: str):
    # Parse HTML
    records = parse_html_to_records(html_content)
    # Save to Convex
    save_procurement_data_to_convex(link_obj, records)
```

---

## 4. Service Lifecycle Management

### 4.1 Service Startup

The Python scraper service starts automatically with `bun run dev`:

```json
// package.json
{
  "scripts": {
    "dev": "node scripts/dev-with-convex.js",
    "dev:scraper": "python scripts/scraper_service.py",
    "dev:all": "concurrently \"bun run dev\" \"bun run dev:scraper\""
  }
}
```

**Service Startup Sequence**:
1. Check Python 3.9+ is installed
2. Check required packages (playwright, fastapi, etc.)
3. Install Playwright browsers if needed (`playwright install chromium`)
4. Start FastAPI/Flask server on port 8000
5. Verify health endpoint responds
6. Ready to accept scraping requests

### 4.2 Session Management

Each scraping session is isolated:
- **Session ID**: UUID generated per request
- **Browser Instance**: One chromium instance per session
- **State**: Stored in-memory (can be persisted to Redis/DB if needed)
- **Cleanup**: Browser closed and session removed on completion/error/cancel

### 4.3 Error Handling

- **Network errors**: Retry with exponential backoff
- **CAPTCHA/Verification**: Pause and wait for user action
- **Parsing failures**: Fallback to AI agent, then manual input
- **Service crashes**: Restart service, notify UI of failure

---

## 5. UI Integration Points

### 5.1 BrowserScraperPanel Component Updates

The existing `BrowserScraperPanel.tsx` component needs to:

1. **Replace MCP Browser Adapter** with Python service client
2. **Add service connection status** indicator
3. **Handle browser popup** (open/close notifications)
4. **Stream progress updates** via SSE
5. **Display element selection prompts** when active

### 5.2 New Service Client Hook

Create `usePythonScraperService.ts`:

```typescript
interface PythonScraperService {
  // Connection
  isConnected: boolean;
  connect(): Promise<void>;
  
  // Scraping
  startScraping(params: ScrapingParams): Promise<string>; // returns sessionId
  cancelScraping(sessionId: string): Promise<void>;
  getStatus(sessionId: string): Promise<ScrapingStatus>;
  
  // Real-time updates
  subscribe(sessionId: string, callback: (update: ProgressUpdate) => void): () => void;
  
  // Browser interaction
  getViewport(sessionId: string): Promise<string>; // base64 image
  sendUserAction(sessionId: string, action: UserAction): Promise<void>;
}
```

### 5.3 Progress Display

The UI displays:
- **Current stage**: Navigating, Waiting for selection, Parsing, Saving
- **Progress percentage**: Based on stages
- **Browser status**: Connected, Selecting element, Ready
- **Errors/Warnings**: Displayed in expandable section
- **Data preview**: Show first few rows of parsed data

---

## 6. Implementation Phases

### Phase 1: Core Service (Week 1)
- [ ] Create Python HTTP service wrapper (`scraper_service.py`)
- [ ] Implement health check endpoint
- [ ] Implement start/cancel/status endpoints
- [ ] Test standalone service startup

### Phase 2: Browser Integration (Week 1-2)
- [ ] Integrate chromium browser launch
- [ ] Port element selection JavaScript injection
- [ ] Implement HTML capture callback
- [ ] Test element selection flow

### Phase 3: UI Integration (Week 2)
- [ ] Create TypeScript service client
- [ ] Update BrowserScraperPanel to use Python service
- [ ] Implement SSE progress streaming
- [ ] Add service connection status

### Phase 4: Dev Integration (Week 2)
- [ ] Update `dev-with-convex.js` to start Python service
- [ ] Add service health checks
- [ ] Handle service failures gracefully
- [ ] Test full dev workflow

### Phase 5: Polish & Testing (Week 3)
- [ ] Error handling and retry logic
- [ ] Browser popup management
- [ ] User interaction prompts
- [ ] End-to-end testing

---

## 7. Technical Specifications

### 7.1 Python Service Requirements

**Dependencies**:
```txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
playwright>=1.40.0
playwright-stealth>=1.0.6
pandas>=2.0.0
convex>=0.3.0
python-dotenv>=1.0.0
aiofiles>=23.2.0  # For file operations
sse-starlette>=1.6.5  # For SSE support
```

**Service Structure**:
```
scripts/
  scraper_service.py          # FastAPI service wrapper
  scraper3.py                  # Original scraper (refactored)
  scraper_core.py              # Core scraping logic (extracted)
  requirements.txt             # Python dependencies
```

### 7.2 TypeScript Client Requirements

**Dependencies**:
```json
{
  "event-source-polyfill": "^2.0.5"  // For SSE in older browsers
}
```

**Service Client Structure**:
```
src/
  services/
    pythonScraperService.ts    # HTTP client + SSE handler
  hooks/
    usePythonScraperService.ts # React hook wrapper
```

### 7.3 Environment Variables

```bash
# Python Service
PYTHON_SCRAPER_PORT=8000
PYTHON_SCRAPER_HOST=127.0.0.1
VITE_CONVEX_URL=http://127.0.0.1:3210  # Shared with frontend

# Browser Options
SCRAPER_BROWSER_HEADLESS=false
SCRAPER_BROWSER_TIMEOUT=60000
```

---

## 8. Security Considerations

### 8.1 API Authentication

- **Development**: No auth required (localhost only)
- **Production**: Add API key or JWT token authentication
- **Rate Limiting**: Limit concurrent sessions per user/IP

### 8.2 Browser Isolation

- Each session uses isolated browser context
- User data directory per session (cleaned up after)
- No persistent cookies/cache between sessions

### 8.3 Input Validation

- Validate URLs before navigation
- Sanitize HTML input from manual pasting
- Limit HTML size to prevent DoS

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Python service endpoints
- HTML parsing logic
- Convex integration

### 9.2 Integration Tests
- Full scraping flow (mock browser)
- UI service client
- SSE streaming

### 9.3 End-to-End Tests
- User starts scraping from UI
- Browser opens and navigates
- Element selection works
- Data saved to Convex
- UI updates reflect progress

---

## 10. Deployment Considerations

### 10.1 Development
- Service runs on `localhost:8000`
- Started automatically with `bun run dev`
- Hot reload not needed (restart on changes)

### 10.2 Production
- Service runs as separate process/container
- Health checks and auto-restart
- Logging and monitoring
- Resource limits (memory, CPU)

---

## 11. Migration Path

### 11.1 From Standalone Script
1. Extract core scraping logic from `scraper3.py` to `scraper_core.py`
2. Create service wrapper that calls core functions
3. Maintain backward compatibility (script can still run standalone)

### 11.2 From MCP Browser Adapter
1. Replace `useBrowserScraper` hook implementation
2. Update `BrowserScraperPanel` to use Python service
3. Remove MCP browser adapter dependency (optional)

---

## 12. Success Criteria

✅ Python service starts with `bun run dev`  
✅ UI can start/cancel scraping sessions  
✅ chromium browser opens and navigates correctly  
✅ Element selection works interactively  
✅ Progress updates stream to UI in real-time  
✅ Parsed data saves to Convex database  
✅ Error handling works gracefully  
✅ Service recovers from crashes  

---

## 13. Future Enhancements

- **Multiple concurrent sessions**: Support scraping multiple URLs simultaneously
- **Browser pool**: Reuse browser instances for performance
- **Advanced viewport streaming**: Real-time browser view in UI
- **Session persistence**: Resume interrupted scraping sessions
- **Scheduled scraping**: Background jobs for approved URLs
- **Browser extension**: Native browser extension for element selection

---

## Appendix A: API Request/Response Examples

### Start Scraping
```bash
curl -X POST http://localhost:8000/api/v1/scrape/start \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.gov/procurement",
    "state": "Texas",
    "capital": "Austin",
    "procurementUrlId": "abc123"
  }'
```

### Get Status
```bash
curl http://localhost:8000/api/v1/scrape/status/session-123
```

### Subscribe to Updates
```bash
curl http://localhost:8000/api/v1/scrape/stream/session-123
```

---

## Appendix B: Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| `SERVICE_UNAVAILABLE` | Python service not running | Start service |
| `BROWSER_LAUNCH_FAILED` | Could not launch chromium | Check Playwright installation |
| `NAVIGATION_TIMEOUT` | Page load timeout | Increase timeout or check URL |
| `ELEMENT_SELECTION_TIMEOUT` | User didn't select element | Retry or use manual input |
| `PARSING_FAILED` | HTML parsing failed | Falls back to AI agent |
| `CONVEX_ERROR` | Database save failed | Check Convex connection |

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Author**: AI Assistant  
**Status**: Draft - Ready for Implementation

