# Procurement Link Chat System - Implementation Plan

## Overview

This document outlines the implementation plan for an AI-powered chat interface that enables users to request government procurement links for specific geographic regions. The system uses OpenAI to generate structured JSON data, which is then fed into the **Procurement Link Verifier** component for human review before being made available in the **Government Link Hub**.

---

## System Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 19 (Vite) | SPA with modern hooks (`useActionState`, transitions) |
| Backend | Convex (Node.js) | Real-time database, mutations, and actions |
| AI Model | OpenAI GPT-4o-mini | Structured JSON output for procurement link generation |
| UI Framework | Tron UI Components | Consistent dark theme with neon accents |
| Map Visualization | react19-simple-maps | Interactive US map for Government Link Hub |

### Existing Components

The following components are already implemented and will integrate with the new chat system:

1. **`ProcurementLinkVerifier`** (`src/components/ProcurementLinkVerifier.tsx`)
   - Accepts JSON file uploads with procurement links
   - Provides approval/denial workflow for each link
   - Displays stats (total, pending, approved, denied)
   - Allows inline editing of URLs before approval
   - Manual entry form for user-verified links

2. **`USAMap`** (`src/components/USAMap.tsx`)
   - Interactive map displaying approved procurement links
   - Pin markers on states with available procurement URLs
   - Admin mode for managing government links

3. **`GovernmentLinkHubPage`** (`src/pages/GovernmentLinkHubPage.tsx`)
   - Main page combining the map and link panels
   - Role-based access (admin vs. public)

4. **Tron UI Component Library**
   - `TronPanel` - Container with neon glow effects
   - `TronButton` - Buttons with sweep hover effects
   - `TronStatCard` - Statistics display cards

---

## System Prompt: Procurement Link Architect

### Role

You are a specialized Procurement Data Intelligence Agent. Your primary function is to assist users in identifying official government procurement, bidding, and RFP (Request for Proposal) portals for specific geographic regions (States, Cities, Counties, or Municipalities).

### Operational Context

- **Environment:** React 19 (Vite) frontend with a Convex (Node.js) backend.
- **Model:** OpenAI GPT-4o-mini (optimized for speed and structured outputs).
- **Output Destination:** JSON data that will be rendered in the Procurement Link Verifier component.

### Objective

Translate natural language geographic requests into a structured JSON array of verified or highly probable procurement URLs.

### Strict JSON Output Schema

You must respond *exclusively* with a JSON object. Do not include conversational filler, markdown explanations outside the JSON block, or "here is the data" preambles.

```json
{
  "search_metadata": {
    "target_regions": ["string"],
    "count_found": 0,
    "timestamp": "ISO-8601 timestamp"
  },
  "procurement_links": [
    {
      "state": "Full state name (e.g., Texas)",
      "capital": "Capital city name (e.g., Austin)",
      "official_website": "https://example.gov",
      "procurement_link": "https://example.gov/procurement",
      "entity_type": "City | County | State | Municipality",
      "link_type": "Direct Portal | Vendor Registration | RFP Listing",
      "confidence_score": 0.0
    }
  ]
}
```

### Data Field Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `state` | string | ✅ | Full state name (must match US state names exactly) |
| `capital` | string | ✅ | Capital city or relevant city name |
| `official_website` | string | ✅ | Primary government website URL |
| `procurement_link` | string | ✅ | Direct link to procurement/bidding page |
| `entity_type` | string | ✅ | Type of government entity |
| `link_type` | string | ✅ | Category of procurement link |
| `confidence_score` | number | ✅ | 0.0-1.0 indicating URL accuracy confidence |

### Instruction Guidelines

1. **Source Veracity:** Prioritize `.gov` or `.org` domains. If a direct procurement link is unknown, provide the main finance or administrative URL for that entity.

2. **Entity Resolution:** If a user says "Bay Area," resolve this to the major constituent cities (San Francisco, Oakland, San Jose) and counties (Alameda, Santa Clara, etc.).

3. **Data Integrity:** Ensure URLs are well-formed. Do not hallucinate URLs; if a specific link cannot be determined with >0.7 confidence, omit it or flag it clearly.

4. **Approval Workflow Reminder:** Include a note in `search_metadata` that links are "Pending Review" and require verification via the `ProcurementLinkVerifier` component.

5. **Capital City Focus:** When generating state-level links, prioritize the state capital's procurement office as this is the primary use case for the Government Link Hub.

---

## JSON Data Format

The system expects JSON in the following format (matching the existing `usStateCapitalsProcurementLinks.json`):

### Direct Array Format

```json
[
  {
    "state": "Alabama",
    "capital": "Montgomery",
    "official_website": "https://www.montgomeryal.gov/",
    "procurement_link": "https://www.montgomeryal.gov/business/partner-with-the-city/procurement-purchasing"
  }
]
```

### Wrapped Object Format (also supported)

```json
{
  "us_state_capitals_procurement": [
    {
      "state": "Texas",
      "capital": "Austin",
      "official_website": "https://www.austintexas.gov/",
      "procurement_link": "https://www.austintexas.gov/department/purchasing"
    }
  ]
}
```

### Alternative Wrapper Key

```json
{
  "links": [...]
}
```

The `ProcurementLinkVerifier` automatically detects and handles all three formats.

---

## Convex Backend Integration

### Database Schema

The procurement URLs are stored in the `procurementUrls` table:

```typescript
// convex/schema.ts
procurementUrls: defineTable({
  state: v.string(),           // Full state name: "Alabama", "Alaska"
  capital: v.string(),         // Capital city name
  officialWebsite: v.string(), // Official city website URL
  procurementLink: v.string(), // Procurement/bidding page URL
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("denied")
  ),
  verifiedBy: v.optional(v.string()),   // Clerk user ID
  verifiedAt: v.optional(v.number()),   // Timestamp
  denialReason: v.optional(v.string()), // Optional denial reason
  importedAt: v.number(),               // Import timestamp
  sourceFile: v.optional(v.string()),   // Source identifier
})
  .index("by_state", ["state"])
  .index("by_status", ["status"])
  .index("by_state_status", ["state", "status"])
  .index("by_imported", ["importedAt"]),
```

### Existing Mutations & Queries

**Queries:**
- `procurementUrls.list` - Get all URLs with optional status filter
- `procurementUrls.getPending` - Get pending URLs for review
- `procurementUrls.getApproved` - Get approved URLs (used by USAMap)
- `procurementUrls.getApprovedByState` - Get approved URLs for a specific state
- `procurementUrls.getStats` - Get counts by status

**Mutations:**
- `procurementUrls.importFromJson` - Import links from JSON (sets status to "pending")
- `procurementUrls.approve` - Approve a single URL
- `procurementUrls.deny` - Deny a URL with optional reason
- `procurementUrls.resetToPending` - Reset to pending status
- `procurementUrls.remove` - Delete a URL
- `procurementUrls.clearAll` - Clear all URLs (requires confirmation)
- `procurementUrls.approveAll` - Bulk approve all pending
- `procurementUrls.update` - Update URL fields
- `procurementUrls.addManual` - Add manually verified link (auto-approved)

### New Action for OpenAI Integration

```typescript
// convex/procurementChat.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are a specialized Procurement Data Intelligence Agent...`;

export const fetchProcurementLinks = action({
  args: { 
    prompt: v.string(),
    targetRegions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: args.prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent outputs
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  },
});
```

---

## React Component Implementation

### ProcurementChat Component

```tsx
// src/components/ProcurementChat.tsx
import { useState, useTransition } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { MessageSquare, Send, Loader2, Download, CheckCircle } from 'lucide-react';

interface ProcurementLink {
  state: string;
  capital: string;
  official_website: string;
  procurement_link: string;
  entity_type?: string;
  link_type?: string;
  confidence_score?: number;
}

interface ChatResponse {
  search_metadata: {
    target_regions: string[];
    count_found: number;
  };
  procurement_links: ProcurementLink[];
}

export function ProcurementChat() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const fetchLinks = useAction(api.procurementChat.fetchProcurementLinks);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setError(null);
    
    startTransition(async () => {
      try {
        const result = await fetchLinks({ prompt: prompt.trim() });
        setResponse(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch links');
      }
    });
  };

  const handleExportToVerifier = () => {
    if (!response?.procurement_links) return;
    
    // Create downloadable JSON file
    const jsonData = {
      us_state_capitals_procurement: response.procurement_links.map(link => ({
        state: link.state,
        capital: link.capital,
        official_website: link.official_website,
        procurement_link: link.procurement_link,
      }))
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-links-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TronPanel 
      title="Procurement Link Assistant" 
      icon={<MessageSquare className="w-5 h-5" />}
      glowColor="cyan"
    >
      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-tron-gray mb-2">
            Describe the regions you need procurement links for:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Get me procurement links for all Texas cities with population over 500k' or 'Find RFP portals for the Pacific Northwest states'"
            className="w-full px-4 py-3 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg 
                       text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 
                       focus:ring-tron-cyan focus:border-tron-cyan resize-none"
            rows={3}
            disabled={isPending}
          />
        </div>
        
        <TronButton
          type="submit"
          variant="primary"
          color="cyan"
          disabled={isPending || !prompt.trim()}
          icon={isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        >
          {isPending ? 'Searching...' : 'Find Procurement Links'}
        </TronButton>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-neon-error/20 border border-neon-error rounded-lg">
          <p className="text-neon-error">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {response && (
        <div className="mt-6 space-y-4">
          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-tron-gray">
            <span>Found {response.search_metadata.count_found} links for: {response.search_metadata.target_regions.join(', ')}</span>
            <TronButton
              onClick={handleExportToVerifier}
              variant="outline"
              color="cyan"
              size="sm"
              icon={<Download className="w-4 h-4" />}
            >
              Export for Verification
            </TronButton>
          </div>

          {/* Links Preview */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {response.procurement_links.map((link, idx) => (
              <div key={idx} className="p-3 bg-tron-bg-card rounded border border-tron-cyan/10">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-tron-white">{link.state} - {link.capital}</h4>
                    <a 
                      href={link.procurement_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-tron-cyan hover:underline"
                    >
                      {link.procurement_link}
                    </a>
                  </div>
                  {link.confidence_score && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      link.confidence_score >= 0.8 ? 'bg-neon-success/20 text-neon-success' :
                      link.confidence_score >= 0.5 ? 'bg-neon-warning/20 text-neon-warning' :
                      'bg-neon-error/20 text-neon-error'
                    }`}>
                      {Math.round(link.confidence_score * 100)}% confident
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </TronPanel>
  );
}
```

---

## Integration Flow

### Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROCUREMENT LINK PIPELINE                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌───────────────────┐     ┌───────────────────────┐
│ ProcurementChat  │────▶│ OpenAI GPT-4o-mini │────▶│ Structured JSON       │
│ Component        │     │ (Convex Action)    │     │ Response              │
└──────────────────┘     └───────────────────┘     └───────────┬───────────┘
                                                                │
                                                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        User Reviews Generated Links                           │
│    • Preview links in chat interface                                          │
│    • Check confidence scores                                                  │
│    • Export as JSON file                                                      │
└──────────────────────────────────────────────────────────────┬───────────────┘
                                                                │
                                                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ProcurementLinkVerifier Component                          │
│                                                                               │
│  ┌─────────────┐   ┌─────────────────────┐   ┌──────────────────────────┐   │
│  │ JSON Import │──▶│ Pending Links Queue  │──▶│ Admin Review Interface   │   │
│  │ (Drag/Drop) │   │ (procurementUrls DB) │   │ • Approve/Deny buttons   │   │
│  └─────────────┘   └─────────────────────┘   │ • Edit URL inline        │   │
│                                               │ • Bulk approve all       │   │
│                                               └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────┬───────────────┘
                                                                │
                           ┌────────────────────────────────────┼────────────────┐
                           │                                    │                │
                           ▼                                    ▼                ▼
                  ┌─────────────────┐              ┌─────────────────┐  ┌─────────────────┐
                  │ Approved Links   │              │ Denied Links     │  │ Pending Links   │
                  │ (Available)      │              │ (Archived)       │  │ (Needs Review)  │
                  └────────┬────────┘              └─────────────────┘  └─────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Government Link Hub / USAMap                           │
│                                                                               │
│  • Interactive US map with state selection                                    │
│  • Pin markers on states with approved procurement links                      │
│  • LinkPanel displays links for selected state                                │
│  • Public access (no login required for viewing)                              │
│  • Admin mode for CRUD operations on govLinks table                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Tron UI Design System

### Color Palette

| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--tron-cyan` | `#00d4ff` | Primary accent, links, active states |
| `--tron-orange` | `#ff6600` | Warnings, denied status, destructive actions |
| `--tron-blue` | `#0066ff` | Secondary accent |
| `--tron-bg-deep` | `#0a0f1a` | Deepest background |
| `--tron-bg-card` | `#111827` | Card backgrounds |
| `--tron-bg-elevated` | `#1f2937` | Elevated surfaces |
| `--tron-white` | `#f3f4f6` | Primary text |
| `--tron-gray` | `#9ca3af` | Secondary text |
| `--neon-success` | `#10b981` | Success states, approved |
| `--neon-error` | `#ef4444` | Error states, denied |
| `--neon-warning` | `#f59e0b` | Warning states, pending |

### Component Guidelines

**TronPanel:**
- Used for all major content sections
- `glowColor` prop: `'cyan'` | `'blue'` | `'orange'`
- `variant` prop: `'default'` | `'elevated'` | `'inset'`
- Include `title` and `icon` props for header sections

**TronButton:**
- `variant`: `'primary'` | `'secondary'` | `'outline'` | `'ghost'`
- `color`: `'cyan'` | `'orange'` | `'blue'`
- `size`: `'sm'` | `'md'` | `'lg'`
- Include `icon` prop for visual clarity

**TronStatCard:**
- Used for displaying metrics/counts
- Properties: `title`, `value`, `icon`, `color`

---

## Implementation Checklist

### Phase 1: Backend (Convex)

- [ ] Create `convex/procurementChat.ts` with OpenAI action
- [ ] Add `OPENAI_API_KEY` to Convex environment variables
- [ ] Add Zod schema for response validation
- [ ] Implement rate limiting for API calls
- [ ] Add error handling and retry logic

### Phase 2: Chat Component

- [ ] Create `ProcurementChat.tsx` component
- [ ] Implement React 19 `useTransition` for pending states
- [ ] Add streaming support (optional)
- [ ] Design chat message history UI
- [ ] Add export-to-JSON functionality

### Phase 3: Integration

- [ ] Connect chat output to `ProcurementLinkVerifier`
- [ ] Option A: Direct JSON download → manual upload to verifier
- [ ] Option B: Direct mutation to create pending links
- [ ] Add navigation between chat and verifier

### Phase 4: Enhanced Features

- [ ] Add conversation history storage
- [ ] Implement suggested prompts/templates
- [ ] Add bulk region selection (checkboxes for states)
- [ ] Link confidence score visualization
- [ ] Real-time URL validation (HEAD requests)

---

## Security Considerations

1. **API Key Protection:** OpenAI API key must only be accessible in Convex actions (server-side)
2. **Rate Limiting:** Implement per-user rate limiting to prevent abuse
3. **Input Sanitization:** Validate and sanitize user prompts before sending to OpenAI
4. **URL Validation:** Verify URLs before storing in database
5. **Authentication:** Require admin role for import/approval operations

---

## Documentation References

- **Convex Actions:** [https://docs.convex.dev/functions/actions](https://docs.convex.dev/functions/actions)
- **React 19 Transitions:** [https://react.dev/blog/2024/04/25/react-19](https://react.dev/blog/2024/04/25/react-19)
- **OpenAI Structured Outputs:** [https://platform.openai.com/docs/guides/structured-outputs](https://platform.openai.com/docs/guides/structured-outputs)
- **OpenAI JSON Mode:** [https://platform.openai.com/docs/guides/text-generation/json-mode](https://platform.openai.com/docs/guides/text-generation/json-mode)

---

## Example Prompts

Users can ask the system queries like:

1. "Get procurement links for all state capitals in the Southwest (Arizona, New Mexico, Nevada, Utah)"
2. "Find RFP portals for major Texas cities: Houston, Dallas, Austin, San Antonio, Fort Worth"
3. "Show me procurement websites for the New England states"
4. "Get bidding opportunities pages for California, Oregon, and Washington state capitals"
5. "Find vendor registration portals for the top 10 most populous state capitals"

---

## Future Enhancements

1. **Scheduled Link Verification:** Automated checks to verify URLs are still active
2. **Link Change Detection:** Monitor for URL changes and flag for re-verification
3. **Category Tagging:** AI-powered categorization of link types (IT, Construction, Services, etc.)
4. **Historical Data:** Track URL changes over time
5. **Export Options:** CSV, Excel, API endpoint for external integrations
6. **Notification System:** Alert admins when new links need review
