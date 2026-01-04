# Procurement Scraper - Frontend Browser Automation Plan

## Overview

This document provides a detailed implementation plan for **Option A: Frontend-Controlled Browser Tab** - a browser-based scraping system that uses MCP Playwright tools to interact with procurement websites in real-time.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How It Works](#how-it-works)
3. [Database Schema Changes](#database-schema-changes)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [AI Page Analysis System](#ai-page-analysis-system)
7. [Scraping Workflow](#scraping-workflow)
8. [Error Handling & Recovery](#error-handling--recovery)
9. [UI/UX Design](#uiux-design)
10. [Testing Strategy](#testing-strategy)
11. [Implementation Checklist](#implementation-checklist)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐         ┌────────────────────────────────────┐   │
│  │   React Application  │         │     NEW TAB (Procurement Site)     │   │
│  │                      │         │                                    │   │
│  │  ┌────────────────┐  │         │  ┌──────────────────────────────┐  │   │
│  │  │ Scraper Panel  │  │  MCP    │  │                              │  │   │
│  │  │                │◄─┼─Browser─┼─►│   Government Procurement     │  │   │
│  │  │ - Progress     │  │  Tools  │  │   Website (any JS-rendered   │  │   │
│  │  │ - Status       │  │         │  │   content works)             │  │   │
│  │  │ - Results      │  │         │  │                              │  │   │
│  │  └────────────────┘  │         │  └──────────────────────────────┘  │   │
│  │         │            │         │               ▲                    │   │
│  │         │            │         │               │                    │   │
│  │         ▼            │         │     Playwright/MCP Controls:       │   │
│  │  ┌────────────────┐  │         │     - navigate                     │   │
│  │  │ useBrowserScraper│         │     - snapshot (accessibility)     │   │
│  │  │     Hook       │  │         │     - click                        │   │
│  │  └────────────────┘  │         │     - type                         │   │
│  │         │            │         │     - wait                         │   │
│  │         │            │         │     - navigate_back                │   │
│  └─────────┼────────────┘         └────────────────────────────────────┘   │
│            │                                                                 │
└────────────┼─────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONVEX BACKEND                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│  │ Mutations       │    │ Queries         │    │ Tables                  │ │
│  │                 │    │                 │    │                         │ │
│  │ - saveOpportunity│   │ - getOpportunities│  │ - procurementOpportunities│
│  │ - updateScraping│    │ - getByState    │    │ - scraperInteractionLog │ │
│  │ - logInteraction│    │ - getStats      │    │ - scrapedProcurementData│ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OPENAI API                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GPT-4o-mini for:                                                           │
│  - Analyzing page snapshots to find opportunity elements                    │
│  - Extracting structured data from opportunity detail pages                 │
│  - Determining next actions (click, scroll, paginate)                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Step-by-Step Flow

```
1. USER ACTION
   └─> User clicks "Scrape" button on an approved procurement link

2. INITIALIZATION
   └─> Create scraping record in database (status: "in_progress")
   └─> Initialize progress tracking

3. NAVIGATION
   └─> MCP: browser_navigate(procurementUrl)
   └─> MCP: browser_wait_for({ time: 3 }) // Wait for page load

4. PAGE ANALYSIS
   └─> MCP: browser_snapshot() // Get accessibility tree
   └─> AI: Analyze snapshot to identify:
       ├── Page type (list/detail/login/error)
       ├── Opportunity elements (rows, cards, links)
       ├── Pagination controls
       └── Blockers (modals, cookie banners)

5. HANDLE BLOCKERS (if any)
   └─> MCP: browser_click(closeBannerRef, "Close cookie banner")
   └─> MCP: browser_snapshot() // Re-analyze

6. SCRAPE OPPORTUNITIES (loop)
   ├─> For each opportunity found:
   │   ├─> MCP: browser_click(opportunityRef, "Open opportunity details")
   │   ├─> MCP: browser_wait_for({ time: 2 })
   │   ├─> MCP: browser_snapshot()
   │   ├─> AI: Extract structured data from detail page
   │   ├─> CONVEX: Save opportunity to database
   │   ├─> MCP: browser_navigate_back()
   │   └─> MCP: browser_wait_for({ time: 1 })
   │
   └─> If pagination exists:
       ├─> MCP: browser_click(nextPageRef, "Go to next page")
       └─> Repeat from step 4

7. COMPLETION
   └─> Update scraping record (status: "completed")
   └─> Display results summary
```

---

## Database Schema Changes

### File: `convex/schema.ts`

Add these new tables to your existing schema:

```typescript
// ============================================================================
// PROCUREMENT OPPORTUNITIES - Individual scraped procurement items
// ============================================================================
procurementOpportunities: defineTable({
  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE TRACKING
  // ─────────────────────────────────────────────────────────────────────────
  scrapedDataId: v.id("scrapedProcurementData"), // Parent scraping session
  sourceUrl: v.string(), // URL of the list page where this was found
  detailUrl: v.optional(v.string()), // URL of the opportunity detail page (if navigated)
  
  // ─────────────────────────────────────────────────────────────────────────
  // LOCATION DATA
  // ─────────────────────────────────────────────────────────────────────────
  state: v.string(),
  capital: v.string(),
  
  // ─────────────────────────────────────────────────────────────────────────
  // CORE OPPORTUNITY DATA
  // ─────────────────────────────────────────────────────────────────────────
  title: v.string(), // Required - opportunity title
  referenceNumber: v.optional(v.string()), // RFP-2024-001, ITB-123, etc.
  opportunityType: v.optional(v.string()), // RFP, RFQ, ITB, IFB, RFI, etc.
  status: v.optional(v.string()), // Open, Closed, Awarded, Pending, etc.
  
  // ─────────────────────────────────────────────────────────────────────────
  // DATES
  // ─────────────────────────────────────────────────────────────────────────
  postedDate: v.optional(v.string()), // When the opportunity was posted
  closingDate: v.optional(v.string()), // Deadline for submissions
  openingDate: v.optional(v.string()), // When bids will be opened
  awardDate: v.optional(v.string()), // When contract was/will be awarded
  lastModifiedDate: v.optional(v.string()), // Last update to the listing
  
  // ─────────────────────────────────────────────────────────────────────────
  // DESCRIPTION & CLASSIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  description: v.optional(v.string()), // Full description text
  shortDescription: v.optional(v.string()), // Summary/teaser text
  category: v.optional(v.string()), // Category/classification
  subcategory: v.optional(v.string()),
  department: v.optional(v.string()), // Issuing department/agency
  division: v.optional(v.string()),
  
  // ─────────────────────────────────────────────────────────────────────────
  // FINANCIAL
  // ─────────────────────────────────────────────────────────────────────────
  estimatedValue: v.optional(v.string()), // Dollar amount or range
  budgetCode: v.optional(v.string()),
  fundingSource: v.optional(v.string()),
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONTACT INFORMATION
  // ─────────────────────────────────────────────────────────────────────────
  contactName: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  contactAddress: v.optional(v.string()),
  buyerName: v.optional(v.string()), // Procurement officer name
  
  // ─────────────────────────────────────────────────────────────────────────
  // REQUIREMENTS
  // ─────────────────────────────────────────────────────────────────────────
  requirements: v.optional(v.string()), // Eligibility/qualification requirements
  certifications: v.optional(v.array(v.string())), // Required certifications
  setAside: v.optional(v.string()), // Small business set-aside info
  
  // ─────────────────────────────────────────────────────────────────────────
  // DOCUMENTS & ATTACHMENTS
  // ─────────────────────────────────────────────────────────────────────────
  documents: v.optional(v.array(v.object({
    name: v.string(),
    url: v.string(),
    type: v.optional(v.string()), // PDF, DOC, XLS, etc.
    size: v.optional(v.string()),
  }))),
  
  // ─────────────────────────────────────────────────────────────────────────
  // SUBMISSION INFO
  // ─────────────────────────────────────────────────────────────────────────
  submissionMethod: v.optional(v.string()), // Online, Email, Mail, etc.
  submissionInstructions: v.optional(v.string()),
  
  // ─────────────────────────────────────────────────────────────────────────
  // SCRAPING METADATA
  // ─────────────────────────────────────────────────────────────────────────
  scrapedAt: v.number(), // Timestamp when scraped
  rawScrapedText: v.optional(v.string()), // Raw text for debugging
  confidence: v.optional(v.number()), // AI confidence score 0-1
  
  // ─────────────────────────────────────────────────────────────────────────
  // DEDUPLICATION
  // ─────────────────────────────────────────────────────────────────────────
  hash: v.optional(v.string()), // Hash of key fields for dedup
})
  .index("by_scraped_data", ["scrapedDataId"])
  .index("by_source_url", ["sourceUrl"])
  .index("by_state", ["state"])
  .index("by_state_capital", ["state", "capital"])
  .index("by_closing_date", ["closingDate"])
  .index("by_type", ["opportunityType"])
  .index("by_status", ["status"])
  .index("by_scraped_at", ["scrapedAt"])
  .index("by_hash", ["hash"]),

// ============================================================================
// SCRAPER INTERACTION LOG - Debug trail of scraper actions
// ============================================================================
scraperInteractionLog: defineTable({
  scrapedDataId: v.id("scrapedProcurementData"), // Parent scraping session
  
  // Action details
  action: v.string(), // "navigate", "click", "snapshot", "extract", "scroll", etc.
  selector: v.optional(v.string()), // Element reference (e.g., "D14", "B7")
  description: v.string(), // Human-readable description
  
  // Result
  success: v.boolean(),
  errorMessage: v.optional(v.string()),
  
  // Context
  pageUrl: v.optional(v.string()), // URL at time of action
  timestamp: v.number(),
  durationMs: v.optional(v.number()), // How long the action took
  
  // Debug data
  snapshotPreview: v.optional(v.string()), // First 500 chars of snapshot
  aiAnalysis: v.optional(v.string()), // AI reasoning for this action
})
  .index("by_scraped_data", ["scrapedDataId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_action", ["action"]),

// ============================================================================
// SCRAPING STRATEGIES - Site-specific scraping configurations
// ============================================================================
scrapingStrategies: defineTable({
  // URL pattern matching
  urlPattern: v.string(), // Regex pattern to match URLs
  siteName: v.string(), // Human-readable site name
  
  // Page structure hints
  listPageSelectors: v.optional(v.object({
    opportunityRow: v.optional(v.string()), // CSS-like hint for rows
    opportunityLink: v.optional(v.string()),
    nextPageButton: v.optional(v.string()),
    loadMoreButton: v.optional(v.string()),
  })),
  
  detailPageSelectors: v.optional(v.object({
    title: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    closingDate: v.optional(v.string()),
    description: v.optional(v.string()),
  })),
  
  // Special handling
  requiresLogin: v.boolean(),
  hasInfiniteScroll: v.boolean(),
  spaType: v.optional(v.string()), // "react", "angular", "vue", "none"
  
  // AI prompt customization
  customListPagePrompt: v.optional(v.string()),
  customDetailPagePrompt: v.optional(v.string()),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  successRate: v.optional(v.number()), // Tracked over time
  lastUsed: v.optional(v.number()),
})
  .index("by_url_pattern", ["urlPattern"])
  .index("by_site_name", ["siteName"]),
```

---

## Backend Implementation

### File: `convex/procurementScraperV2Mutations.ts`

```typescript
import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import crypto from "crypto";

// ============================================================================
// OPPORTUNITY MANAGEMENT
// ============================================================================

/**
 * Save a scraped procurement opportunity
 * Called from frontend after extracting data from a detail page
 */
export const saveOpportunity = mutation({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
    sourceUrl: v.string(),
    detailUrl: v.optional(v.string()),
    state: v.string(),
    capital: v.string(),
    title: v.string(),
    referenceNumber: v.optional(v.string()),
    opportunityType: v.optional(v.string()),
    status: v.optional(v.string()),
    postedDate: v.optional(v.string()),
    closingDate: v.optional(v.string()),
    openingDate: v.optional(v.string()),
    awardDate: v.optional(v.string()),
    lastModifiedDate: v.optional(v.string()),
    description: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    department: v.optional(v.string()),
    division: v.optional(v.string()),
    estimatedValue: v.optional(v.string()),
    budgetCode: v.optional(v.string()),
    fundingSource: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactAddress: v.optional(v.string()),
    buyerName: v.optional(v.string()),
    requirements: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    setAside: v.optional(v.string()),
    documents: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.optional(v.string()),
      size: v.optional(v.string()),
    }))),
    submissionMethod: v.optional(v.string()),
    submissionInstructions: v.optional(v.string()),
    rawScrapedText: v.optional(v.string()),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate hash for deduplication
    const hashInput = `${args.state}|${args.capital}|${args.title}|${args.referenceNumber || ''}`;
    const hash = crypto.createHash('md5').update(hashInput).digest('hex');
    
    // Check for existing opportunity with same hash
    const existing = await ctx.db
      .query("procurementOpportunities")
      .withIndex("by_hash", (q) => q.eq("hash", hash))
      .first();
    
    if (existing) {
      // Update existing record instead of creating duplicate
      await ctx.db.patch(existing._id, {
        ...args,
        scrapedAt: Date.now(),
        hash,
      });
      return { id: existing._id, isUpdate: true };
    }
    
    // Create new opportunity
    const id = await ctx.db.insert("procurementOpportunities", {
      ...args,
      scrapedAt: Date.now(),
      hash,
    });
    
    return { id, isUpdate: false };
  },
});

/**
 * Internal version for use in actions
 */
export const saveOpportunityInternal = internalMutation({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
    sourceUrl: v.string(),
    state: v.string(),
    capital: v.string(),
    title: v.string(),
    // ... same args as above, abbreviated for readability
    referenceNumber: v.optional(v.string()),
    opportunityType: v.optional(v.string()),
    status: v.optional(v.string()),
    closingDate: v.optional(v.string()),
    description: v.optional(v.string()),
    department: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const hashInput = `${args.state}|${args.capital}|${args.title}|${args.referenceNumber || ''}`;
    const hash = crypto.createHash('md5').update(hashInput).digest('hex');
    
    const existing = await ctx.db
      .query("procurementOpportunities")
      .withIndex("by_hash", (q) => q.eq("hash", hash))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        scrapedAt: Date.now(),
        hash,
      });
      return existing._id;
    }
    
    return await ctx.db.insert("procurementOpportunities", {
      ...args,
      scrapedAt: Date.now(),
      hash,
    });
  },
});

// ============================================================================
// INTERACTION LOGGING
// ============================================================================

/**
 * Log a scraper interaction for debugging
 */
export const logInteraction = mutation({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
    action: v.string(),
    selector: v.optional(v.string()),
    description: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    snapshotPreview: v.optional(v.string()),
    aiAnalysis: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scraperInteractionLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// SCRAPING SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new browser scraping session
 */
export const createBrowserScrapingSession = mutation({
  args: {
    url: v.string(),
    state: v.string(),
    capital: v.string(),
    procurementLinkId: v.optional(v.id("procurementUrls")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("scrapedProcurementData", {
      sourceUrl: args.url,
      procurementLinkId: args.procurementLinkId,
      state: args.state,
      capital: args.capital,
      scrapedAt: now,
      scrapedBy: "Browser Scraper",
      scrapingStatus: "in_progress",
      scrapedData: { 
        status: "in_progress", 
        method: "browser",
        startedAt: now,
      },
      aiModel: "gpt-4o-mini",
      updatedAt: now,
    });
  },
});

/**
 * Update browser scraping session status
 */
export const updateBrowserScrapingSession = mutation({
  args: {
    recordId: v.id("scrapedProcurementData"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    ),
    opportunityCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    scrapedData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { recordId, status, opportunityCount, errorMessage, scrapedData } = args;
    
    const updateData: any = {
      scrapingStatus: status,
      updatedAt: Date.now(),
    };
    
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }
    
    if (scrapedData !== undefined) {
      updateData.scrapedData = scrapedData;
    }
    
    if (status === "completed" && opportunityCount !== undefined) {
      updateData.scrapedData = {
        ...updateData.scrapedData,
        totalOpportunities: opportunityCount,
        completedAt: Date.now(),
      };
      updateData.dataQuality = opportunityCount > 0 ? "high" : "low";
      updateData.dataCompleteness = opportunityCount > 0 ? 1 : 0;
    }
    
    await ctx.db.patch(recordId, updateData);
  },
});
```

### File: `convex/procurementScraperV2Queries.ts`

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// OPPORTUNITY QUERIES
// ============================================================================

/**
 * Get all scraped opportunities with optional filters
 */
export const getOpportunities = query({
  args: {
    state: v.optional(v.string()),
    status: v.optional(v.string()),
    opportunityType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let opportunities;
    
    if (args.state) {
      opportunities = await ctx.db
        .query("procurementOpportunities")
        .withIndex("by_state", (q) => q.eq("state", args.state!))
        .order("desc")
        .collect();
    } else {
      opportunities = await ctx.db
        .query("procurementOpportunities")
        .withIndex("by_scraped_at")
        .order("desc")
        .collect();
    }
    
    // Apply additional filters
    if (args.status) {
      opportunities = opportunities.filter((o) => o.status === args.status);
    }
    if (args.opportunityType) {
      opportunities = opportunities.filter((o) => o.opportunityType === args.opportunityType);
    }
    
    // Apply limit
    if (args.limit) {
      opportunities = opportunities.slice(0, args.limit);
    }
    
    return opportunities;
  },
});

/**
 * Get opportunities for a specific scraping session
 */
export const getOpportunitiesByScrapingSession = query({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("procurementOpportunities")
      .withIndex("by_scraped_data", (q) => q.eq("scrapedDataId", args.scrapedDataId))
      .order("desc")
      .collect();
  },
});

/**
 * Get opportunities closing soon
 */
export const getUpcomingDeadlines = query({
  args: {
    days: v.optional(v.number()), // Default 7 days
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const daysAhead = args.days || 7;
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    let opportunities;
    
    if (args.state) {
      opportunities = await ctx.db
        .query("procurementOpportunities")
        .withIndex("by_state", (q) => q.eq("state", args.state!))
        .collect();
    } else {
      opportunities = await ctx.db
        .query("procurementOpportunities")
        .collect();
    }
    
    // Filter to upcoming deadlines
    return opportunities.filter((o) => {
      if (!o.closingDate) return false;
      try {
        const closeDate = new Date(o.closingDate);
        return closeDate >= now && closeDate <= futureDate;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      const dateA = new Date(a.closingDate || '9999-12-31');
      const dateB = new Date(b.closingDate || '9999-12-31');
      return dateA.getTime() - dateB.getTime();
    });
  },
});

/**
 * Get opportunity statistics
 */
export const getOpportunityStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("procurementOpportunities").collect();
    
    // Group by state
    const byState: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    
    for (const opp of all) {
      byState[opp.state] = (byState[opp.state] || 0) + 1;
      if (opp.opportunityType) {
        byType[opp.opportunityType] = (byType[opp.opportunityType] || 0) + 1;
      }
      if (opp.status) {
        byStatus[opp.status] = (byStatus[opp.status] || 0) + 1;
      }
    }
    
    return {
      total: all.length,
      byState,
      byType,
      byStatus,
      withClosingDate: all.filter((o) => o.closingDate).length,
      withDescription: all.filter((o) => o.description).length,
      withDocuments: all.filter((o) => o.documents && o.documents.length > 0).length,
    };
  },
});

// ============================================================================
// INTERACTION LOG QUERIES
// ============================================================================

/**
 * Get interaction log for a scraping session
 */
export const getInteractionLog = query({
  args: {
    scrapedDataId: v.id("scrapedProcurementData"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scraperInteractionLog")
      .withIndex("by_scraped_data", (q) => q.eq("scrapedDataId", args.scrapedDataId))
      .order("asc")
      .collect();
  },
});
```

---

## Frontend Implementation

### File: `src/services/mcpBrowserAdapter.ts`

This adapter provides a clean interface to MCP browser tools:

```typescript
/**
 * MCP Browser Adapter
 * 
 * Provides a typed interface to the MCP Playwright browser tools.
 * In the actual implementation, these will call the MCP tools via
 * the Cursor IDE's extension capabilities.
 */

export interface MCPBrowserAdapter {
  /**
   * Navigate to a URL
   */
  navigate(url: string): Promise<void>;
  
  /**
   * Get accessibility snapshot of the current page
   * This is better than screenshots for understanding page structure
   */
  snapshot(): Promise<string>;
  
  /**
   * Click on an element
   * @param ref - Element reference from snapshot (e.g., "D14", "B7")
   * @param element - Human-readable description
   */
  click(ref: string, element: string): Promise<void>;
  
  /**
   * Type text into an element
   */
  type(ref: string, element: string, text: string, submit?: boolean): Promise<void>;
  
  /**
   * Hover over an element
   */
  hover(ref: string, element: string): Promise<void>;
  
  /**
   * Wait for a condition
   */
  waitFor(options: { time?: number; text?: string; textGone?: string }): Promise<void>;
  
  /**
   * Navigate back
   */
  navigateBack(): Promise<void>;
  
  /**
   * Press a key
   */
  pressKey(key: string): Promise<void>;
  
  /**
   * Take a screenshot (for debugging)
   */
  takeScreenshot(filename?: string): Promise<string>;
  
  /**
   * Get console messages (for debugging)
   */
  getConsoleMessages(): Promise<string[]>;
  
  /**
   * Resize browser window
   */
  resize(width: number, height: number): Promise<void>;
}

/**
 * Create an MCP browser adapter
 * 
 * In production, this would connect to the actual MCP tools.
 * For development/testing, you can swap in a mock implementation.
 */
export function createMCPBrowserAdapter(): MCPBrowserAdapter {
  // The actual implementation will be provided by the MCP tool integration
  // This is the interface that our scraper hooks will use
  
  return {
    navigate: async (url: string) => {
      // Will call: mcp_cursor-ide-browser_browser_navigate({ url })
      console.log(`[MCP] Navigating to: ${url}`);
    },
    
    snapshot: async () => {
      // Will call: mcp_cursor-ide-browser_browser_snapshot()
      console.log(`[MCP] Taking snapshot`);
      return '';
    },
    
    click: async (ref: string, element: string) => {
      // Will call: mcp_cursor-ide-browser_browser_click({ ref, element })
      console.log(`[MCP] Clicking: ${element} (${ref})`);
    },
    
    type: async (ref: string, element: string, text: string, submit?: boolean) => {
      // Will call: mcp_cursor-ide-browser_browser_type({ ref, element, text, submit })
      console.log(`[MCP] Typing into: ${element} (${ref})`);
    },
    
    hover: async (ref: string, element: string) => {
      // Will call: mcp_cursor-ide-browser_browser_hover({ ref, element })
      console.log(`[MCP] Hovering: ${element} (${ref})`);
    },
    
    waitFor: async (options) => {
      // Will call: mcp_cursor-ide-browser_browser_wait_for(options)
      console.log(`[MCP] Waiting:`, options);
      if (options.time) {
        await new Promise((r) => setTimeout(r, options.time! * 1000));
      }
    },
    
    navigateBack: async () => {
      // Will call: mcp_cursor-ide-browser_browser_navigate_back()
      console.log(`[MCP] Navigating back`);
    },
    
    pressKey: async (key: string) => {
      // Will call: mcp_cursor-ide-browser_browser_press_key({ key })
      console.log(`[MCP] Pressing key: ${key}`);
    },
    
    takeScreenshot: async (filename?: string) => {
      // Will call: mcp_cursor-ide-browser_browser_take_screenshot({ filename })
      console.log(`[MCP] Taking screenshot: ${filename}`);
      return filename || 'screenshot.png';
    },
    
    getConsoleMessages: async () => {
      // Will call: mcp_cursor-ide-browser_browser_console_messages()
      console.log(`[MCP] Getting console messages`);
      return [];
    },
    
    resize: async (width: number, height: number) => {
      // Will call: mcp_cursor-ide-browser_browser_resize({ width, height })
      console.log(`[MCP] Resizing to: ${width}x${height}`);
    },
  };
}
```

### File: `src/services/pageAnalyzer.ts`

```typescript
/**
 * AI-powered page analyzer
 * Uses GPT-4o-mini to understand procurement page structure
 */

import OpenAI from 'openai';

// Initialize OpenAI client for browser use
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not set');
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
};

// ============================================================================
// TYPES
// ============================================================================

export interface IdentifiedOpportunity {
  ref: string; // Element reference for clicking (e.g., "D14")
  title: string;
  partialData?: {
    referenceNumber?: string;
    closingDate?: string;
    status?: string;
    department?: string;
    type?: string;
  };
}

export interface PaginationInfo {
  hasNextPage: boolean;
  nextPageRef?: string;
  currentPage?: number;
  totalPages?: number;
  loadMoreRef?: string; // For "Load More" buttons
}

export interface BlockerInfo {
  type: 'cookie-banner' | 'modal' | 'login-required' | 'captcha' | 'other';
  ref?: string; // Element to click to dismiss
  description: string;
}

export interface PageAnalysisResult {
  // Page classification
  pageType: 'list' | 'detail' | 'login' | 'error' | 'empty' | 'unknown';
  
  // Opportunities found (for list pages)
  opportunities: IdentifiedOpportunity[];
  
  // Pagination
  pagination?: PaginationInfo;
  
  // Blockers that need to be handled
  blockers: BlockerInfo[];
  
  // Suggested next actions
  suggestedActions: string[];
  
  // AI reasoning (for debugging)
  reasoning: string;
}

export interface ExtractedOpportunityData {
  title: string;
  referenceNumber?: string;
  opportunityType?: string;
  status?: string;
  postedDate?: string;
  closingDate?: string;
  openingDate?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  department?: string;
  estimatedValue?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  requirements?: string;
  submissionMethod?: string;
  submissionInstructions?: string;
  documents?: { name: string; url: string; type?: string }[];
  confidence: number;
}

// ============================================================================
// PROMPTS
// ============================================================================

const LIST_PAGE_ANALYSIS_PROMPT = `You are an expert at analyzing government procurement website pages.

Your task is to analyze an accessibility snapshot of a procurement page and identify clickable procurement opportunities.

ACCESSIBILITY SNAPSHOT FORMAT:
- The snapshot shows a tree of elements with references like "D14", "B7", etc.
- Each element shows its type (button, link, text, etc.) and content
- Use these references to identify clickable elements

IDENTIFY:
1. PAGE TYPE: Is this a:
   - "list": Shows multiple procurement opportunities (most common)
   - "detail": Shows a single opportunity's details
   - "login": Requires authentication
   - "error": Error page (404, 500, etc.)
   - "empty": No opportunities found
   - "unknown": Cannot determine

2. OPPORTUNITIES (for list pages):
   Look for patterns like:
   - Table rows with bid/RFP/RFQ information
   - Cards or tiles with opportunity titles
   - Links that lead to opportunity details
   - Elements with procurement-related keywords (Bid, RFP, RFQ, ITB, Solicitation, Contract)
   
   For each opportunity, provide:
   - ref: The EXACT element reference to click (e.g., "D14") - this MUST be a clickable element
   - title: The opportunity title
   - partialData: Any visible data (reference number, closing date, status)

3. PAGINATION:
   Look for:
   - "Next" buttons or links
   - Page number navigation
   - "Load More" buttons
   - Infinite scroll indicators

4. BLOCKERS:
   Look for:
   - Cookie consent banners
   - Modal dialogs
   - Login prompts
   - CAPTCHAs

IMPORTANT RULES:
- Only include opportunities where you can identify a clickable element
- The "ref" MUST be an exact reference from the snapshot (not made up)
- If unsure about page type, use "unknown"
- Be conservative - don't include elements you're not confident about

Return your analysis as JSON with this structure:
{
  "pageType": "list" | "detail" | "login" | "error" | "empty" | "unknown",
  "opportunities": [
    {
      "ref": "D14",
      "title": "RFP for IT Services",
      "partialData": {
        "referenceNumber": "RFP-2024-001",
        "closingDate": "2024-02-15",
        "status": "Open"
      }
    }
  ],
  "pagination": {
    "hasNextPage": true,
    "nextPageRef": "B42",
    "currentPage": 1,
    "totalPages": 5
  },
  "blockers": [
    {
      "type": "cookie-banner",
      "ref": "A5",
      "description": "Accept cookies button"
    }
  ],
  "suggestedActions": [
    "Click on first opportunity to view details",
    "Handle cookie banner first"
  ],
  "reasoning": "This appears to be a list page with 10 procurement opportunities..."
}`;

const DETAIL_PAGE_EXTRACTION_PROMPT = `You are an expert at extracting structured data from government procurement opportunity pages.

Your task is to extract all available information about this procurement opportunity from the page snapshot.

EXTRACT THE FOLLOWING FIELDS (use null for unavailable data):

REQUIRED:
- title: The opportunity title (string)
- confidence: How confident you are in the extraction (0.0 to 1.0)

OPTIONAL:
- referenceNumber: Official reference number (RFP-2024-001, ITB-123, etc.)
- opportunityType: Type of procurement (RFP, RFQ, ITB, IFB, RFI, Bid, Contract, etc.)
- status: Current status (Open, Closed, Awarded, Pending, Cancelled, etc.)
- postedDate: When posted (use YYYY-MM-DD format if possible)
- closingDate: Submission deadline (use YYYY-MM-DD format if possible)
- openingDate: When bids will be opened
- description: Full description text
- shortDescription: Summary if available
- category: Category or classification
- department: Issuing department or agency
- estimatedValue: Dollar amount or range
- contactName: Contact person name
- contactEmail: Contact email
- contactPhone: Contact phone number
- requirements: Eligibility or qualification requirements
- submissionMethod: How to submit (Online, Email, Mail, etc.)
- submissionInstructions: Detailed submission instructions
- documents: Array of {name, url, type} for attachments

DATE FORMAT:
- Try to convert dates to YYYY-MM-DD format
- If date format is unclear, include as-is

DOCUMENTS:
- Look for PDF, DOC, XLS links
- Include download links for bid documents, addenda, specifications

Return your extraction as JSON with this structure:
{
  "title": "RFP for IT Services",
  "referenceNumber": "RFP-2024-001",
  "opportunityType": "RFP",
  "status": "Open",
  "postedDate": "2024-01-15",
  "closingDate": "2024-02-15",
  "description": "The City is seeking proposals for...",
  "department": "Department of Information Technology",
  "estimatedValue": "$500,000 - $1,000,000",
  "contactEmail": "procurement@city.gov",
  "documents": [
    {"name": "RFP Document", "url": "https://...", "type": "PDF"}
  ],
  "confidence": 0.85
}`;

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze a page snapshot to identify opportunities and page structure
 */
export async function analyzeListPage(
  snapshot: string,
  context: { url: string; state: string; capital: string }
): Promise<PageAnalysisResult> {
  const openai = getOpenAIClient();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: LIST_PAGE_ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: `Analyze this procurement page for ${context.capital}, ${context.state}:

URL: ${context.url}

Page Accessibility Snapshot:
${snapshot.substring(0, 30000)} ${snapshot.length > 30000 ? '\n\n[Truncated - snapshot too long]' : ''}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1, // Low temperature for consistent extraction
    max_tokens: 4000,
  });

  const content = response.choices[0].message.content || '{}';
  
  try {
    const result = JSON.parse(content);
    return {
      pageType: result.pageType || 'unknown',
      opportunities: result.opportunities || [],
      pagination: result.pagination,
      blockers: result.blockers || [],
      suggestedActions: result.suggestedActions || [],
      reasoning: result.reasoning || '',
    };
  } catch (error) {
    console.error('Failed to parse page analysis:', error);
    return {
      pageType: 'unknown',
      opportunities: [],
      blockers: [],
      suggestedActions: ['Failed to analyze page - try refreshing'],
      reasoning: `Parse error: ${error}`,
    };
  }
}

/**
 * Extract detailed opportunity data from a detail page
 */
export async function extractOpportunityDetails(
  snapshot: string,
  context: { url: string; expectedTitle: string }
): Promise<ExtractedOpportunityData> {
  const openai = getOpenAIClient();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: DETAIL_PAGE_EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: `Extract procurement opportunity data from this page:

URL: ${context.url}
Expected Title: ${context.expectedTitle}

Page Accessibility Snapshot:
${snapshot.substring(0, 30000)} ${snapshot.length > 30000 ? '\n\n[Truncated - snapshot too long]' : ''}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 4000,
  });

  const content = response.choices[0].message.content || '{}';
  
  try {
    const result = JSON.parse(content);
    return {
      title: result.title || context.expectedTitle,
      referenceNumber: result.referenceNumber,
      opportunityType: result.opportunityType,
      status: result.status,
      postedDate: result.postedDate,
      closingDate: result.closingDate,
      openingDate: result.openingDate,
      description: result.description,
      shortDescription: result.shortDescription,
      category: result.category,
      department: result.department,
      estimatedValue: result.estimatedValue,
      contactName: result.contactName,
      contactEmail: result.contactEmail,
      contactPhone: result.contactPhone,
      requirements: result.requirements,
      submissionMethod: result.submissionMethod,
      submissionInstructions: result.submissionInstructions,
      documents: result.documents,
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('Failed to extract opportunity details:', error);
    return {
      title: context.expectedTitle,
      confidence: 0,
    };
  }
}
```

### File: `src/hooks/useBrowserScraper.ts`

```typescript
import { useState, useCallback, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { 
  analyzeListPage, 
  extractOpportunityDetails,
  PageAnalysisResult,
  IdentifiedOpportunity,
} from '../services/pageAnalyzer';
import { MCPBrowserAdapter } from '../services/mcpBrowserAdapter';

// ============================================================================
// TYPES
// ============================================================================

export interface ScrapingProgress {
  status: 'idle' | 'initializing' | 'navigating' | 'analyzing' | 'scraping' | 'paginating' | 'completed' | 'error' | 'cancelled';
  currentStep: string;
  opportunitiesFound: number;
  opportunitiesScraped: number;
  pagesProcessed: number;
  errors: string[];
  warnings: string[];
  startTime?: number;
  endTime?: number;
}

export interface ScrapingResult {
  success: boolean;
  scrapedDataId: Id<"scrapedProcurementData">;
  opportunityCount: number;
  errors: string[];
  duration: number;
}

interface UseScraperOptions {
  maxOpportunities?: number; // Limit opportunities per session (default: 50)
  maxPages?: number; // Limit pages to scrape (default: 10)
  pageLoadWait?: number; // Seconds to wait for page load (default: 3)
  detailPageWait?: number; // Seconds to wait for detail page (default: 2)
  retryOnError?: boolean; // Retry failed opportunity scrapes (default: true)
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBrowserScraper(options: UseScraperOptions = {}) {
  const {
    maxOpportunities = 50,
    maxPages = 10,
    pageLoadWait = 3,
    detailPageWait = 2,
    retryOnError = true,
  } = options;
  
  // State
  const [progress, setProgress] = useState<ScrapingProgress>({
    status: 'idle',
    currentStep: '',
    opportunitiesFound: 0,
    opportunitiesScraped: 0,
    pagesProcessed: 0,
    errors: [],
    warnings: [],
  });
  
  // Cancellation flag
  const cancelledRef = useRef(false);
  
  // Convex mutations
  const createSession = useMutation(api.procurementScraperV2Mutations.createBrowserScrapingSession);
  const updateSession = useMutation(api.procurementScraperV2Mutations.updateBrowserScrapingSession);
  const saveOpportunity = useMutation(api.procurementScraperV2Mutations.saveOpportunity);
  const logInteraction = useMutation(api.procurementScraperV2Mutations.logInteraction);

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Log an interaction
  // ──────────────────────────────────────────────────────────────────────────
  const log = useCallback(async (
    scrapedDataId: Id<"scrapedProcurementData">,
    action: string,
    description: string,
    success: boolean,
    extra?: { selector?: string; errorMessage?: string; pageUrl?: string; aiAnalysis?: string }
  ) => {
    try {
      await logInteraction({
        scrapedDataId,
        action,
        description,
        success,
        ...extra,
      });
    } catch (e) {
      console.error('Failed to log interaction:', e);
    }
  }, [logInteraction]);

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Update progress
  // ──────────────────────────────────────────────────────────────────────────
  const updateProgress = useCallback((updates: Partial<ScrapingProgress>) => {
    setProgress((prev) => ({ ...prev, ...updates }));
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Handle blockers (cookie banners, modals)
  // ──────────────────────────────────────────────────────────────────────────
  const handleBlockers = useCallback(async (
    browser: MCPBrowserAdapter,
    analysis: PageAnalysisResult,
    scrapedDataId: Id<"scrapedProcurementData">
  ): Promise<boolean> => {
    for (const blocker of analysis.blockers) {
      if (blocker.type === 'login-required') {
        updateProgress({
          status: 'error',
          errors: ['This site requires login. Cannot proceed.'],
        });
        return false;
      }
      
      if (blocker.type === 'captcha') {
        updateProgress({
          warnings: [...progress.warnings, 'CAPTCHA detected. May need manual intervention.'],
        });
        continue;
      }
      
      if (blocker.ref) {
        try {
          await browser.click(blocker.ref, blocker.description);
          await log(scrapedDataId, 'click', `Dismissed blocker: ${blocker.description}`, true, {
            selector: blocker.ref,
          });
          await browser.waitFor({ time: 1 });
        } catch (e) {
          await log(scrapedDataId, 'click', `Failed to dismiss blocker: ${blocker.description}`, false, {
            selector: blocker.ref,
            errorMessage: String(e),
          });
        }
      }
    }
    return true;
  }, [log, updateProgress, progress.warnings]);

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Scrape a single opportunity
  // ──────────────────────────────────────────────────────────────────────────
  const scrapeOpportunity = useCallback(async (
    browser: MCPBrowserAdapter,
    opportunity: IdentifiedOpportunity,
    context: { url: string; state: string; capital: string; scrapedDataId: Id<"scrapedProcurementData"> }
  ): Promise<boolean> => {
    const { url, state, capital, scrapedDataId } = context;
    
    try {
      updateProgress({ currentStep: `Scraping: ${opportunity.title}` });
      
      // Click on the opportunity
      await browser.click(opportunity.ref, `Open opportunity: ${opportunity.title}`);
      await log(scrapedDataId, 'click', `Clicked opportunity: ${opportunity.title}`, true, {
        selector: opportunity.ref,
        pageUrl: url,
      });
      
      // Wait for detail page to load
      await browser.waitFor({ time: detailPageWait });
      
      // Get detail page snapshot
      const detailSnapshot = await browser.snapshot();
      await log(scrapedDataId, 'snapshot', 'Captured detail page snapshot', true, {
        snapshotPreview: detailSnapshot.substring(0, 500),
      });
      
      // Extract opportunity data
      const opportunityData = await extractOpportunityDetails(detailSnapshot, {
        url,
        expectedTitle: opportunity.title,
      });
      await log(scrapedDataId, 'extract', `Extracted data for: ${opportunity.title}`, true, {
        aiAnalysis: `Confidence: ${opportunityData.confidence}`,
      });
      
      // Save to database
      await saveOpportunity({
        scrapedDataId,
        sourceUrl: url,
        state,
        capital,
        ...opportunityData,
      });
      
      // Navigate back to list
      await browser.navigateBack();
      await browser.waitFor({ time: 1 });
      
      return true;
      
    } catch (error) {
      await log(scrapedDataId, 'error', `Failed to scrape: ${opportunity.title}`, false, {
        errorMessage: String(error),
      });
      
      // Try to recover by navigating back
      try {
        await browser.navigateBack();
        await browser.waitFor({ time: 1 });
      } catch {
        // If back doesn't work, we'll need to re-navigate in the main loop
      }
      
      return false;
    }
  }, [browser, detailPageWait, log, saveOpportunity, updateProgress]);

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN: Scrape URL
  // ──────────────────────────────────────────────────────────────────────────
  const scrapeUrl = useCallback(async (
    browser: MCPBrowserAdapter,
    url: string,
    state: string,
    capital: string,
    procurementLinkId?: Id<"procurementUrls">
  ): Promise<ScrapingResult> => {
    const startTime = Date.now();
    cancelledRef.current = false;
    
    // Initialize
    updateProgress({
      status: 'initializing',
      currentStep: 'Creating scraping session...',
      opportunitiesFound: 0,
      opportunitiesScraped: 0,
      pagesProcessed: 0,
      errors: [],
      warnings: [],
      startTime,
    });
    
    // Create session in database
    const scrapedDataId = await createSession({
      url,
      state,
      capital,
      procurementLinkId,
    });
    
    let totalScraped = 0;
    const errors: string[] = [];
    
    try {
      // ────────────────────────────────────────────────────────────────────
      // STEP 1: Navigate to procurement URL
      // ────────────────────────────────────────────────────────────────────
      updateProgress({ status: 'navigating', currentStep: 'Navigating to procurement page...' });
      
      await browser.navigate(url);
      await log(scrapedDataId, 'navigate', `Navigated to: ${url}`, true, { pageUrl: url });
      
      await browser.waitFor({ time: pageLoadWait });
      
      if (cancelledRef.current) throw new Error('Cancelled by user');
      
      // ────────────────────────────────────────────────────────────────────
      // STEP 2: Analyze page and handle blockers
      // ────────────────────────────────────────────────────────────────────
      updateProgress({ status: 'analyzing', currentStep: 'Analyzing page structure...' });
      
      let snapshot = await browser.snapshot();
      await log(scrapedDataId, 'snapshot', 'Captured initial page snapshot', true, {
        pageUrl: url,
        snapshotPreview: snapshot.substring(0, 500),
      });
      
      let analysis = await analyzeListPage(snapshot, { url, state, capital });
      await log(scrapedDataId, 'analyze', `Page type: ${analysis.pageType}, Found ${analysis.opportunities.length} opportunities`, true, {
        aiAnalysis: analysis.reasoning,
      });
      
      // Handle any blockers
      if (analysis.blockers.length > 0) {
        const canContinue = await handleBlockers(browser, analysis, scrapedDataId);
        if (!canContinue) {
          throw new Error('Cannot proceed due to blockers');
        }
        
        // Re-analyze after handling blockers
        snapshot = await browser.snapshot();
        analysis = await analyzeListPage(snapshot, { url, state, capital });
      }
      
      // Check page type
      if (analysis.pageType === 'login') {
        throw new Error('Page requires login');
      }
      if (analysis.pageType === 'error') {
        throw new Error('Page shows an error');
      }
      if (analysis.pageType === 'empty' || analysis.opportunities.length === 0) {
        updateProgress({
          status: 'completed',
          currentStep: 'No opportunities found on this page',
          endTime: Date.now(),
        });
        await updateSession({
          recordId: scrapedDataId,
          status: 'completed',
          opportunityCount: 0,
        });
        return {
          success: true,
          scrapedDataId,
          opportunityCount: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }
      
      // ────────────────────────────────────────────────────────────────────
      // STEP 3: Scrape opportunities (with pagination)
      // ────────────────────────────────────────────────────────────────────
      let pagesProcessed = 0;
      let allOpportunities = [...analysis.opportunities];
      
      updateProgress({
        status: 'scraping',
        opportunitiesFound: allOpportunities.length,
        currentStep: `Found ${allOpportunities.length} opportunities on page 1`,
      });
      
      // Process current page
      while (pagesProcessed < maxPages && totalScraped < maxOpportunities) {
        if (cancelledRef.current) throw new Error('Cancelled by user');
        
        pagesProcessed++;
        updateProgress({ pagesProcessed });
        
        // Scrape each opportunity on current page
        for (let i = 0; i < analysis.opportunities.length && totalScraped < maxOpportunities; i++) {
          if (cancelledRef.current) throw new Error('Cancelled by user');
          
          const opportunity = analysis.opportunities[i];
          const success = await scrapeOpportunity(browser, opportunity, {
            url,
            state,
            capital,
            scrapedDataId,
          });
          
          if (success) {
            totalScraped++;
            updateProgress({ opportunitiesScraped: totalScraped });
          } else if (retryOnError) {
            // Retry once
            const retrySuccess = await scrapeOpportunity(browser, opportunity, {
              url,
              state,
              capital,
              scrapedDataId,
            });
            if (retrySuccess) {
              totalScraped++;
              updateProgress({ opportunitiesScraped: totalScraped });
            } else {
              errors.push(`Failed to scrape: ${opportunity.title}`);
              updateProgress({ errors: [...errors] });
            }
          } else {
            errors.push(`Failed to scrape: ${opportunity.title}`);
            updateProgress({ errors: [...errors] });
          }
          
          // Re-snapshot after returning to list (page may have changed)
          snapshot = await browser.snapshot();
          analysis = await analyzeListPage(snapshot, { url, state, capital });
        }
        
        // Check for next page
        if (analysis.pagination?.hasNextPage && analysis.pagination.nextPageRef) {
          updateProgress({
            status: 'paginating',
            currentStep: `Loading page ${pagesProcessed + 1}...`,
          });
          
          await browser.click(analysis.pagination.nextPageRef, 'Go to next page');
          await log(scrapedDataId, 'click', `Navigated to page ${pagesProcessed + 1}`, true, {
            selector: analysis.pagination.nextPageRef,
          });
          
          await browser.waitFor({ time: pageLoadWait });
          
          // Analyze new page
          snapshot = await browser.snapshot();
          analysis = await analyzeListPage(snapshot, { url, state, capital });
          
          updateProgress({
            status: 'scraping',
            opportunitiesFound: progress.opportunitiesFound + analysis.opportunities.length,
            currentStep: `Found ${analysis.opportunities.length} more opportunities on page ${pagesProcessed + 1}`,
          });
        } else {
          // No more pages
          break;
        }
      }
      
      // ────────────────────────────────────────────────────────────────────
      // STEP 4: Complete
      // ────────────────────────────────────────────────────────────────────
      const endTime = Date.now();
      
      updateProgress({
        status: 'completed',
        currentStep: `Successfully scraped ${totalScraped} opportunities`,
        endTime,
      });
      
      await updateSession({
        recordId: scrapedDataId,
        status: 'completed',
        opportunityCount: totalScraped,
        scrapedData: {
          totalOpportunities: totalScraped,
          pagesProcessed,
          errors,
          duration: endTime - startTime,
        },
      });
      
      return {
        success: true,
        scrapedDataId,
        opportunityCount: totalScraped,
        errors,
        duration: endTime - startTime,
      };
      
    } catch (error) {
      const errorMessage = String(error);
      const endTime = Date.now();
      
      errors.push(errorMessage);
      
      updateProgress({
        status: 'error',
        currentStep: `Error: ${errorMessage}`,
        errors,
        endTime,
      });
      
      await updateSession({
        recordId: scrapedDataId,
        status: 'failed',
        errorMessage,
        opportunityCount: totalScraped,
      });
      
      return {
        success: false,
        scrapedDataId,
        opportunityCount: totalScraped,
        errors,
        duration: endTime - startTime,
      };
    }
  }, [
    createSession,
    updateSession,
    saveOpportunity,
    log,
    handleBlockers,
    scrapeOpportunity,
    updateProgress,
    maxOpportunities,
    maxPages,
    pageLoadWait,
    retryOnError,
  ]);

  // ──────────────────────────────────────────────────────────────────────────
  // CANCEL
  // ──────────────────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    updateProgress({
      status: 'cancelled',
      currentStep: 'Cancelling...',
    });
  }, [updateProgress]);

  // ──────────────────────────────────────────────────────────────────────────
  // RESET
  // ──────────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    cancelledRef.current = false;
    setProgress({
      status: 'idle',
      currentStep: '',
      opportunitiesFound: 0,
      opportunitiesScraped: 0,
      pagesProcessed: 0,
      errors: [],
      warnings: [],
    });
  }, []);

  return {
    progress,
    scrapeUrl,
    cancel,
    reset,
    isActive: ['initializing', 'navigating', 'analyzing', 'scraping', 'paginating'].includes(progress.status),
  };
}
```

---

## UI/UX Design

### File: `src/components/BrowserScraperPanel.tsx`

```tsx
import React, { useState } from 'react';
import { useBrowserScraper, ScrapingProgress } from '../hooks/useBrowserScraper';
import { createMCPBrowserAdapter } from '../services/mcpBrowserAdapter';
import { 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BrowserScraperPanelProps {
  url: string;
  state: string;
  capital: string;
  procurementLinkId?: string;
  onComplete?: (result: any) => void;
}

export function BrowserScraperPanel({
  url,
  state,
  capital,
  procurementLinkId,
  onComplete,
}: BrowserScraperPanelProps) {
  const { progress, scrapeUrl, cancel, reset, isActive } = useBrowserScraper({
    maxOpportunities: 50,
    maxPages: 10,
  });
  
  const [showDetails, setShowDetails] = useState(false);

  const handleStart = async () => {
    const browser = createMCPBrowserAdapter();
    const result = await scrapeUrl(browser, url, state, capital, procurementLinkId as any);
    if (onComplete) {
      onComplete(result);
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'idle':
        return <FileText className="w-5 h-5 text-gray-400" />;
      default:
        return <RefreshCw className="w-5 h-5 text-tron-cyan animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-green-400';
      case 'error':
      case 'cancelled':
        return 'text-red-400';
      case 'idle':
        return 'text-gray-400';
      default:
        return 'text-tron-cyan';
    }
  };

  const getDuration = () => {
    if (!progress.startTime) return null;
    const end = progress.endTime || Date.now();
    const seconds = Math.floor((end - progress.startTime) / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="border border-tron-cyan/30 rounded-lg bg-tron-bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-tron-cyan/20">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium text-tron-text">Browser Scraper</h3>
            <p className="text-sm text-gray-400 truncate max-w-md">{url}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {progress.status === 'idle' && (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-4 py-2 bg-tron-cyan text-black rounded-lg hover:bg-tron-cyan/80 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Scraping
            </button>
          )}
          
          {isActive && (
            <button
              onClick={cancel}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}
          
          {(progress.status === 'completed' || progress.status === 'error' || progress.status === 'cancelled') && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {progress.status !== 'idle' && (
        <div className="p-4 space-y-4">
          {/* Current Step */}
          <div className="flex items-center justify-between">
            <span className={`text-sm ${getStatusColor()}`}>
              {progress.currentStep || 'Initializing...'}
            </span>
            {getDuration() && (
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {getDuration()}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {progress.opportunitiesFound > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progress</span>
                <span>{progress.opportunitiesScraped} / {progress.opportunitiesFound}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-tron-cyan h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.opportunitiesScraped / progress.opportunitiesFound) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-tron-bg/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-tron-cyan">
                {progress.opportunitiesFound}
              </div>
              <div className="text-xs text-gray-400">Found</div>
            </div>
            <div className="bg-tron-bg/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">
                {progress.opportunitiesScraped}
              </div>
              <div className="text-xs text-gray-400">Scraped</div>
            </div>
            <div className="bg-tron-bg/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-400">
                {progress.pagesProcessed}
              </div>
              <div className="text-xs text-gray-400">Pages</div>
            </div>
          </div>

          {/* Errors/Warnings */}
          {(progress.errors.length > 0 || progress.warnings.length > 0) && (
            <div className="space-y-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
              >
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {progress.errors.length} errors, {progress.warnings.length} warnings
              </button>
              
              {showDetails && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {progress.errors.map((error, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                      <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                  {progress.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Testing Strategy

### Test Cases

1. **Basic Navigation Test**
   - Navigate to a simple HTML-based procurement site
   - Verify snapshot capture works
   - Verify page type detection

2. **JavaScript-Rendered Site Test**
   - Navigate to a React/Angular procurement site
   - Verify content loads after wait
   - Verify opportunities are detected

3. **Pagination Test**
   - Navigate to site with pagination
   - Scrape page 1
   - Navigate to page 2
   - Verify all opportunities captured

4. **Detail Page Extraction Test**
   - Click on opportunity
   - Extract detailed data
   - Navigate back
   - Verify data saved correctly

5. **Error Recovery Test**
   - Simulate click failure
   - Verify retry logic
   - Verify graceful degradation

6. **Cookie Banner Test**
   - Navigate to site with cookie banner
   - Verify banner detected as blocker
   - Verify banner dismissed
   - Verify scraping continues

---

## Implementation Checklist

### Phase 1: Foundation (Day 1-2)

- [ ] Add new tables to `convex/schema.ts`:
  - [ ] `procurementOpportunities`
  - [ ] `scraperInteractionLog`
  - [ ] `scrapingStrategies`
- [ ] Run `bunx convex dev` to deploy schema
- [ ] Create `convex/procurementScraperV2Mutations.ts`
- [ ] Create `convex/procurementScraperV2Queries.ts`
- [ ] Test mutations via Convex dashboard

### Phase 2: Services (Day 3-4)

- [ ] Create `src/services/mcpBrowserAdapter.ts`
- [ ] Create `src/services/pageAnalyzer.ts`
- [ ] Test page analysis with sample snapshots
- [ ] Refine AI prompts based on test results

### Phase 3: Hook & Integration (Day 5-6)

- [ ] Create `src/hooks/useBrowserScraper.ts`
- [ ] Integrate with MCP browser tools
- [ ] Test full scraping flow
- [ ] Add error handling and recovery

### Phase 4: UI & Polish (Day 7)

- [ ] Create `src/components/BrowserScraperPanel.tsx`
- [ ] Integrate into HR Dashboard
- [ ] Add to scraped data grid
- [ ] End-to-end testing

---

## Environment Variables

Add to your `.env.local` or Convex environment:

```bash
# Frontend (Vite)
VITE_OPENAI_API_KEY=sk-...

# Already set (Convex)
OPENAI_API_KEY=sk-...
```

---

## Next Steps After Implementation

1. **Monitor & Iterate**: Track success rates by site, refine AI prompts
2. **Site-Specific Strategies**: Add custom scraping configs for common sites
3. **Scheduled Scraping**: Consider Phase 2 (Browserbase) for background jobs
4. **Notification System**: Alert users when new opportunities are found
5. **Export Features**: CSV/Excel export of scraped opportunities






