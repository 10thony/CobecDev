# Leads Auto-Port Implementation Plan

## Overview
This document outlines the implementation strategy for adapting the automated flow process in the AI Chat bot to support auto-porting responses to the Leads Management page when using a LEADS system prompt type, while maintaining existing functionality for procurement link auto-porting to the scraper/verifier element.

## Current System Architecture

### Existing Auto-Port Flow (Procurement Links)
The current system supports automatic export of procurement link responses from the AI Chat bot to the Procurement Link Verifier component:

1. **User sends message** → `ProcurementChat` component
2. **System prompt selected** → User can select from available system prompts via `SystemPromptSelect`
3. **Message processed** → `simpleChat.sendMessage` action processes the request
4. **Response parsed** → `parseAgentResponse` extracts structured JSON data
5. **Response displayed** → Response shown in chat with "To Verifier" export button
6. **Export triggered** → `handleExportToVerifier` calls `procurementUrls.importFromChatResponse`
7. **Data imported** → Links are imported into `procurementUrls` table with status "pending"
8. **Navigation** → Optional callback `onExportToVerifier` can navigate to verifier tab

### System Prompt Type System
- **Table**: `chatSystemPromptTypes` - Defines prompt categories
  - Default types: `"basic"`, `"leads"`, `"procurementHubs"`
- **Table**: `chatSystemPrompts` - Stores actual prompt configurations
  - Each prompt has a `type` field referencing `chatSystemPromptTypes`
  - Prompts can be marked as `isPrimarySystemPrompt`
- **Component**: `SystemPromptSelect` - Allows users to select which prompt to use
- **State**: `selectedSystemPromptId` in `ProcurementChat` tracks current selection

### Current Response Format (Procurement Links)
```json
{
  "search_metadata": {
    "target_regions": ["Texas"],
    "count_found": 3,
    "timestamp": "ISO-8601 timestamp"
  },
  "procurement_links": [
    {
      "state": "Texas",
      "capital": "Houston",
      "official_website": "https://www.houstontx.gov",
      "procurement_link": "https://www.houstontx.gov/purchasing",
      "entity_type": "City",
      "link_type": "Direct Portal",
      "confidence_score": 1.0
    }
  ]
}
```

## Required Functionality

### Core Requirement
For any chat conversation using a system prompt with type `"leads"` (as defined in `chatSystemPromptTypes`), the response should be automatically exportable to the **Leads Management page** instead of the Procurement Link Verifier.

### Key Behaviors
1. **Prompt Type Detection**: System must check the `type` field of the selected system prompt
2. **Conditional Routing**: 
   - If prompt type is `"leads"` → Route to Leads Management
   - Otherwise → Route to Procurement Link Verifier (existing behavior)
3. **Response Format Adaptation**: The LEADS prompt should generate responses in a format compatible with the `leads` table schema
4. **Backward Compatibility**: All existing functionality for non-LEADS prompts must remain unchanged

## Implementation Strategy

### Phase 1: Response Format Definition

#### 1.1 Define Leads Response Schema
The LEADS system prompt should generate responses in this format:

```json
{
  "search_metadata": {
    "target_regions": ["Texas"],
    "count_found": 5,
    "timestamp": "ISO-8601 timestamp",
    "source_type": "leads"
  },
  "leads": [
    {
      "opportunityType": "RFP",
      "opportunityTitle": "IT Infrastructure Upgrade",
      "contractID": "RFP-2024-001",
      "issuingBody": {
        "name": "City of Houston",
        "level": "City"
      },
      "location": {
        "city": "Houston",
        "county": "Harris",
        "region": "Texas"
      },
      "status": "Open",
      "estimatedValueUSD": 500000,
      "keyDates": {
        "publishedDate": "2024-01-15",
        "bidDeadline": "2024-03-01",
        "projectedStartDate": "2024-04-01"
      },
      "source": {
        "documentName": "RFP-2024-001",
        "url": "https://www.houstontx.gov/procurement/rfp-2024-001"
      },
      "contacts": [
        {
          "name": "John Doe",
          "title": "Procurement Officer",
          "email": "john.doe@houstontx.gov",
          "phone": "713-555-1234"
        }
      ],
      "summary": "The City of Houston is seeking proposals for IT infrastructure upgrades...",
      "verificationStatus": "Pending",
      "category": "Technology",
      "subcategory": "IT Infrastructure"
    }
  ]
}
```

#### 1.2 Update Response Parser
**File**: `convex/lib/parseAgentResponse.ts`

**Detailed Implementation**:

1. **Add Type Detection Functions**:
```typescript
/**
 * Check if the parsed object has the expected leads structure
 */
function isLeadsResponse(parsed: any): boolean {
  return (
    parsed.leads &&
    Array.isArray(parsed.leads) &&
    parsed.leads.length > 0 &&
    (parsed.search_metadata?.source_type === "leads" || 
     parsed.leads.some((lead: any) => lead.opportunityTitle && lead.issuingBody))
  );
}

/**
 * Check if the parsed object has the expected procurement links structure
 */
function isProcurementLinksResponse(parsed: any): boolean {
  return (
    parsed.procurement_links &&
    Array.isArray(parsed.procurement_links) &&
    parsed.procurement_links.length > 0
  );
}
```

2. **Add Leads Normalization Function**:
```typescript
/**
 * Normalize leads to ensure they have all required fields and validate data
 */
function normalizeLeads(leads: Array<Record<string, unknown>>): Lead[] {
  return leads
    .map((lead) => {
      const normalized: Lead = {
        opportunityType: String(lead.opportunityType || 'Unknown'),
        opportunityTitle: String(lead.opportunityTitle || 'Untitled'),
        contractID: lead.contractID ? String(lead.contractID) : undefined,
        issuingBody: {
          name: String(lead.issuingBody?.name || 'Unknown Organization'),
          level: String(lead.issuingBody?.level || 'Unknown'),
        },
        location: {
          city: lead.location?.city ? String(lead.location.city) : undefined,
          county: lead.location?.county ? String(lead.location.county) : undefined,
          region: String(lead.location?.region || 'Unknown'),
        },
        status: String(lead.status || 'Unknown'),
        estimatedValueUSD: typeof lead.estimatedValueUSD === 'number' 
          ? lead.estimatedValueUSD 
          : undefined,
        keyDates: {
          publishedDate: lead.keyDates?.publishedDate ? String(lead.keyDates.publishedDate) : undefined,
          bidDeadline: lead.keyDates?.bidDeadline ? String(lead.keyDates.bidDeadline) : undefined,
          projectedStartDate: lead.keyDates?.projectedStartDate ? String(lead.keyDates.projectedStartDate) : undefined,
        },
        source: {
          documentName: String(lead.source?.documentName || 'Unknown Document'),
          url: String(lead.source?.url || ''),
        },
        contacts: Array.isArray(lead.contacts) 
          ? lead.contacts.map((contact: any) => ({
              name: contact.name ? String(contact.name) : undefined,
              title: String(contact.title || 'Unknown'),
              email: contact.email ? String(contact.email) : undefined,
              phone: contact.phone ? String(contact.phone) : undefined,
              url: contact.url ? String(contact.url) : undefined,
            }))
          : [],
        summary: String(lead.summary || 'No summary available'),
        verificationStatus: lead.verificationStatus ? String(lead.verificationStatus) : undefined,
        category: lead.category ? String(lead.category) : undefined,
        subcategory: lead.subcategory ? String(lead.subcategory) : undefined,
      };
      
      // Validate URL format
      if (normalized.source.url && !isValidUrl(normalized.source.url)) {
        console.warn(`Invalid URL for lead: ${normalized.opportunityTitle}`, normalized.source.url);
      }
      
      // Validate date formats (YYYY-MM-DD)
      const dateFields = ['publishedDate', 'bidDeadline', 'projectedStartDate'] as const;
      dateFields.forEach(field => {
        if (normalized.keyDates[field] && !isValidDate(normalized.keyDates[field]!)) {
          console.warn(`Invalid date format for ${field}: ${normalized.keyDates[field]}`);
          normalized.keyDates[field] = undefined;
        }
      });
      
      return normalized;
    })
    .filter((lead) => {
      // Filter out leads with missing critical fields
      return lead.opportunityTitle !== 'Untitled' && lead.source.url !== '';
    });
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
```

3. **Update Main Parser Function**:
```typescript
export function parseAgentResponse(rawText: string): ParsedResponse {
  // ... existing code ...
  
  // After extracting JSON, check for both response types
  if (isLeadsResponse(parsed)) {
    responseData = {
      search_metadata: {
        target_regions: parsed.search_metadata?.target_regions || [],
        count_found: parsed.search_metadata?.count_found || parsed.leads?.length || 0,
        timestamp: parsed.search_metadata?.timestamp || new Date().toISOString(),
        source_type: "leads",
      },
      leads: normalizeLeads(parsed.leads || []),
    };
    textContent = rawText.replace(match[0], '').trim();
    textContent = textContent.replace(/\n{3,}/g, '\n\n');
    break;
  } else if (isProcurementLinksResponse(parsed)) {
    // Existing procurement links handling
    // ...
  }
  
  // Response type detection priority:
  // 1. Check source_type in metadata (most reliable)
  // 2. Check for leads array presence
  // 3. Check for procurement_links array presence
  // 4. Default to procurement links if ambiguous
}
```

4. **Update ParsedResponse Interface**:
```typescript
export interface ParsedResponse {
  textContent: string;
  responseData?: {
    search_metadata: {
      target_regions: string[];
      count_found: number;
      timestamp: string;
      source_type?: "leads" | "procurement_links";
    };
    procurement_links?: ProcurementLink[];
    leads?: Lead[]; // NEW
  };
  hasStructuredData: boolean;
}
```

### Phase 2: Backend Implementation

#### 2.1 Create Leads Import Mutation
**File**: `convex/leads.ts` (add new mutation)

**Complete Implementation**:

```typescript
/**
 * Helper function to normalize URLs for comparison
 */
function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/$/, '');
}

/**
 * Helper function to normalize titles for comparison
 */
function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/**
 * Helper function to generate searchable text from lead data
 */
function generateSearchableText(lead: {
  opportunityTitle: string;
  summary: string;
  issuingBody: { name: string; level: string };
  location: { city?: string; county?: string; region: string };
  category?: string;
  subcategory?: string;
}): string {
  const parts = [
    lead.opportunityTitle,
    lead.summary,
    lead.issuingBody.name,
    lead.issuingBody.level,
    lead.location.region,
    lead.location.city,
    lead.location.county,
    lead.category,
    lead.subcategory,
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
}

/**
 * Import leads from AI chat response.
 * This is used to export leads from the chat component to the Leads Management page.
 * Leads are imported with appropriate defaults and metadata.
 */
export const importFromChatResponse = mutation({
  args: {
    leads: v.array(v.object({
      opportunityType: v.string(),
      opportunityTitle: v.string(),
      contractID: v.optional(v.string()),
      issuingBody: v.object({
        name: v.string(),
        level: v.string(),
      }),
      location: v.object({
        city: v.optional(v.string()),
        county: v.optional(v.string()),
        region: v.string(),
      }),
      status: v.string(),
      estimatedValueUSD: v.optional(v.number()),
      keyDates: v.object({
        publishedDate: v.optional(v.string()),
        bidDeadline: v.optional(v.string()),
        projectedStartDate: v.optional(v.string()),
      }),
      source: v.object({
        documentName: v.string(),
        url: v.string(),
      }),
      contacts: v.array(v.object({
        name: v.optional(v.string()),
        title: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        url: v.optional(v.string()),
      })),
      summary: v.string(),
      verificationStatus: v.optional(v.string()),
      category: v.optional(v.string()),
      subcategory: v.optional(v.string()),
    })),
    sessionId: v.optional(v.id("procurementChatSessions")),
  },
  returns: v.object({
    imported: v.number(),
    skipped: v.number(),
    duplicates: v.array(v.string()),
    failed: v.optional(v.number()),
    errors: v.optional(v.array(v.string())),
  }),
  handler: async (ctx, args) => {
    const importedAt = Date.now();
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const duplicates: string[] = [];
    const errors: string[] = [];

    for (const lead of args.leads) {
      try {
        // Normalize URLs for comparison
        const normalizedUrl = normalizeUrl(lead.source.url);
        const normalizedTitle = normalizeTitle(lead.opportunityTitle);
        
        // Duplicate Detection Strategy (Priority Order):
        // 1. If contractID exists and matches → duplicate
        // 2. If opportunityTitle + source.url (normalized) match → duplicate
        // 3. Otherwise → new lead
        
        let isDuplicate = false;
        let duplicateReason = '';
        
        // Check by contractID first (most reliable)
        if (lead.contractID) {
          const existingByContractId = await ctx.db
            .query("leads")
            .filter(q => q.eq(q.field("contractID"), lead.contractID))
            .first();
          
          if (existingByContractId) {
            isDuplicate = true;
            duplicateReason = `contractID: ${lead.contractID}`;
          }
        }
        
        // If not duplicate by contractID, check by title + URL
        if (!isDuplicate) {
          // Get all leads to check title + URL match
          // Note: This could be optimized with indexes if performance becomes an issue
          const allLeads = await ctx.db.query("leads").collect();
          const existingByTitleUrl = allLeads.find(l => {
            const existingUrl = normalizeUrl(l.source.url);
            const existingTitle = normalizeTitle(l.opportunityTitle);
            return existingTitle === normalizedTitle && existingUrl === normalizedUrl;
          });
          
          if (existingByTitleUrl) {
            isDuplicate = true;
            duplicateReason = `title + URL: ${lead.opportunityTitle}`;
          }
        }

        if (isDuplicate) {
          skipped++;
          duplicates.push(`${lead.opportunityTitle} (${duplicateReason})`);
          continue;
        }

        // Generate searchable text
        const searchableText = generateSearchableText(lead);

        // Insert new lead with all required schema fields
        await ctx.db.insert("leads", {
          ...lead,
          isActive: true, // Default to active
          lastChecked: importedAt,
          searchableText: searchableText,
          createdAt: importedAt,
          updatedAt: importedAt,
          metadata: {
            importedAt: importedAt,
            dataType: "chat_export",
            sourceFile: args.sessionId ? `chat-export-${args.sessionId}` : "chat-export",
          },
        });
        
        imported++;
      } catch (error) {
        // Continue importing remaining leads even if one fails
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import "${lead.opportunityTitle}": ${errorMsg}`);
        // Limit error array size to prevent excessive data
        if (errors.length > 10) errors.shift();
      }
    }

    return {
      imported,
      skipped,
      duplicates,
      failed: failed > 0 ? failed : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
```

**Note**: For better performance with large datasets, consider adding indexes to the schema:
```typescript
// In convex/schema.ts - leads table definition
leads: defineTable({...})
  .index("by_contract_id", ["contractID"]) // For contractID-based duplicate detection
  .index("by_source_url", ["source.url"]) // For URL-based duplicate detection (if Convex supports nested field indexing)
```

#### 2.2 Query to Get Prompt Type
**File**: `convex/chatSystemPrompts.ts` (add new query)

```typescript
export const getPromptType = query({
  args: { promptId: v.id("chatSystemPrompts") },
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) return null;
    
    const promptType = await ctx.db.get(prompt.type);
    return promptType?.name || null; // Returns "basic", "leads", "procurementHubs", etc.
  },
});
```

### Phase 3: Frontend Implementation

#### 3.1 Update ProcurementChat Component
**File**: `src/components/ProcurementChat.tsx`

**Changes Required**:

1. **Add Leads Import Mutation**:
```typescript
const importToLeads = useMutation(api.leads.importFromChatResponse);
```

2. **Add Prompt Type Query**:
```typescript
const getPromptType = useQuery(
  api.chatSystemPrompts.getPromptType,
  selectedSystemPromptId ? { promptId: selectedSystemPromptId } : "skip"
);
```

3. **Add Navigation Hook**:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
```

4. **Update Export Handler with Response Type Detection**:
```typescript
const handleExportToVerifier = async (messageId: string, response: ChatResponse) => {
  // Get prompt type name
  const promptTypeName = getPromptType || 
    (selectedSystemPromptId && systemPrompts?.find(p => p._id === selectedSystemPromptId) 
      ? (() => {
          const prompt = systemPrompts.find(p => p._id === selectedSystemPromptId);
          if (!prompt) return null;
          const type = promptTypes?.find(t => t._id === prompt.type);
          return type?.name || null;
        })()
      : null);
  
  // Detect response type using priority order
  const responseType = detectResponseType(response, promptTypeName);
  
  if (responseType === "leads") {
    // Route to Leads Management
    await handleExportToLeads(messageId, response);
  } else {
    // Route to Verifier (existing behavior)
    await handleExportToVerifierOriginal(messageId, response);
  }
};
```

5. **Add New Export Handler for Leads with Complete Error Handling**:
```typescript
const handleExportToLeads = async (messageId: string, response: ChatResponse) => {
  // Validate response has leads data
  if (!isLeadsResponse(response)) {
    setError("No leads data found in response");
    return;
  }
  
  const leads = response.leads;
  if (leads.length === 0) {
    setError("Response contains empty leads array. Cannot export.");
    return;
  }
  
  // Validate leads data before import
  const validation = validateLeadsData(leads);
  if (!validation.valid) {
    setError(`Validation failed: ${validation.errors.join(', ')}`);
    return;
  }
  
  setExportingMessageId(messageId);
  setExportResult(null);
  setError(null);
  
  try {
    const result = await importToLeads({
      leads: leads,
      sessionId: currentSessionId || undefined,
    });
    
    // Handle different result scenarios
    if (result.imported === 0 && result.skipped === leads.length) {
      setError("All leads were duplicates. No new leads imported.");
    } else if (result.imported < leads.length) {
      // Partial success
      setExportResult({
        messageId,
        result: { 
          imported: result.imported, 
          skipped: result.skipped,
          failed: result.failed || 0,
        },
      });
      if (result.failed && result.failed > 0) {
        setError(`Imported ${result.imported} leads. ${result.skipped} were duplicates. ${result.failed} failed.`);
      }
    } else {
      // Full success
      setExportResult({
        messageId,
        result: { 
          imported: result.imported, 
          skipped: result.skipped,
        },
      });
    }
    
    // Navigate to leads management page
    // Priority: 1. Callback prop, 2. React Router navigation
    if (onExportToLeads) {
      onExportToLeads(); // Callback for parent components (e.g., tab switching)
    } else {
      navigate('/leads-management'); // Direct navigation using React Router
    }
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      setExportResult(null);
    }, 5000);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    setError(`Failed to export leads: ${errorMessage}`);
    // Log to error tracking service
    console.error('Leads import error:', err);
  } finally {
    setExportingMessageId(null);
  }
};

// Validation function for leads data
function validateLeadsData(leads: Lead[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  leads.forEach((lead, index) => {
    if (!lead.opportunityTitle || lead.opportunityTitle.trim() === '') {
      errors.push(`Lead ${index + 1}: missing opportunityTitle`);
    }
    if (!lead.issuingBody?.name || lead.issuingBody.name.trim() === '') {
      errors.push(`Lead ${index + 1}: missing issuingBody.name`);
    }
    if (!lead.issuingBody?.level || lead.issuingBody.level.trim() === '') {
      errors.push(`Lead ${index + 1}: missing issuingBody.level`);
    }
    if (!lead.location?.region || lead.location.region.trim() === '') {
      errors.push(`Lead ${index + 1}: missing location.region`);
    }
    if (!lead.status || lead.status.trim() === '') {
      errors.push(`Lead ${index + 1}: missing status`);
    }
    if (!lead.source?.documentName || lead.source.documentName.trim() === '') {
      errors.push(`Lead ${index + 1}: missing source.documentName`);
    }
    if (!lead.source?.url || lead.source.url.trim() === '') {
      errors.push(`Lead ${index + 1}: missing source.url`);
    } else {
      // Validate URL format
      try {
        new URL(lead.source.url);
      } catch {
        errors.push(`Lead ${index + 1}: invalid source.url format`);
      }
    }
    if (!lead.summary || lead.summary.trim() === '') {
      errors.push(`Lead ${index + 1}: missing summary`);
    }
    if (!Array.isArray(lead.contacts)) {
      errors.push(`Lead ${index + 1}: contacts must be an array`);
    } else {
      lead.contacts.forEach((contact, contactIndex) => {
        if (!contact.title || contact.title.trim() === '') {
          errors.push(`Lead ${index + 1}, Contact ${contactIndex + 1}: missing title`);
        }
      });
    }
  });
  
  return { valid: errors.length === 0, errors };
}
```

6. **Add Button Text Helper Function**:
```typescript
// Helper function to determine export button text and handler
const getExportButtonConfig = (
  response: ChatResponse,
  promptTypeName: string | null
): { text: string; handler: () => void; isLeads: boolean } => {
  const responseType = detectResponseType(response, promptTypeName);
  const isLeads = responseType === "leads";
  
  return {
    text: isLeads ? 'To Leads Management' : 'To Verifier',
    handler: isLeads 
      ? () => handleExportToLeads(message.id, response)
      : () => handleExportToVerifier(message.id, response),
    isLeads,
  };
};
```

7. **Update UI Button with Loading States**:
```typescript
// In the message rendering section
{message.role === 'assistant' && message.response && !message.isError && (() => {
  const promptTypeName = getPromptType || 
    (selectedSystemPromptId && systemPrompts?.find(p => p._id === selectedSystemPromptId)
      ? (() => {
          const prompt = systemPrompts.find(p => p._id === selectedSystemPromptId);
          if (!prompt) return null;
          const type = promptTypes?.find(t => t._id === prompt.type);
          return type?.name || null;
        })()
      : null);
  
  const buttonConfig = getExportButtonConfig(message.response, promptTypeName);
  const isExporting = exportingMessageId === message.id;
  const hasData = isLeadsResponse(message.response) 
    ? message.response.leads.length > 0
    : isProcurementLinksResponse(message.response)
    ? message.response.procurement_links.length > 0
    : false;
  
  return (
    <div className="mt-4 space-y-3 pt-4 border-t border-tron-cyan/10">
      <div className="flex items-center justify-between text-xs text-tron-gray flex-wrap gap-2">
        <span>
          Found {message.response.search_metadata.count_found} {buttonConfig.isLeads ? 'leads' : 'links'} for: {message.response.search_metadata.target_regions.join(', ')}
        </span>
        <div className="flex gap-2">
          {!buttonConfig.isLeads && (
            <TronButton
              onClick={() => handleDownloadJson(message.response as ProcurementLinksResponse)}
              variant="outline"
              color="cyan"
              size="sm"
              icon={<Download className="w-3 h-3" />}
            >
              JSON
            </TronButton>
          )}
          <TronButton
            onClick={buttonConfig.handler}
            variant="primary"
            color="cyan"
            size="sm"
            disabled={isExporting || !hasData}
            icon={isExporting 
              ? <Loader2 className="w-3 h-3 animate-spin" /> 
              : <Upload className="w-3 h-3" />}
          >
            {isExporting ? 'Exporting...' : buttonConfig.text}
          </TronButton>
        </div>
      </div>
      
      {/* Export Success/Error Messages */}
      {exportResult && exportResult.messageId === message.id && (
        <div className="p-2 bg-neon-success/20 border border-neon-success/40 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-neon-success">
            <CheckCircle className="w-3 h-3" />
            <span>
              Exported to {buttonConfig.isLeads ? 'Leads Management' : 'Link Verifier'}: {exportResult.result.imported} imported
              {exportResult.result.skipped > 0 && `, ${exportResult.result.skipped} skipped (duplicates)`}
              {exportResult.result.failed && exportResult.result.failed > 0 && `, ${exportResult.result.failed} failed`}
            </span>
          </div>
        </div>
      )}
      
      {/* Leads or Links Preview */}
      {buttonConfig.isLeads && isLeadsResponse(message.response) ? (
        <LeadsPreview leads={message.response.leads} />
      ) : !buttonConfig.isLeads && isProcurementLinksResponse(message.response) ? (
        <ProcurementLinksPreview links={message.response.procurement_links} />
      ) : null}
    </div>
  );
})()}
```

#### 3.2 Update Response Type Definitions
**File**: `src/components/ProcurementChat.tsx`

**Proper TypeScript Types (No `any` types)**:

```typescript
// Base response metadata
interface SearchMetadata {
  target_regions: string[];
  count_found: number;
  timestamp?: string;
  source_type?: "leads" | "procurement_links";
}

// Leads-specific response (mutually exclusive with procurement links)
interface LeadsResponse {
  search_metadata: SearchMetadata & { source_type?: "leads" };
  leads: Lead[];
  procurement_links?: never; // Ensure mutual exclusivity
}

// Procurement links-specific response (mutually exclusive with leads)
interface ProcurementLinksResponse {
  search_metadata: SearchMetadata & { source_type?: "procurement_links" };
  procurement_links: ProcurementLink[];
  leads?: never; // Ensure mutual exclusivity
}

// Union type for all possible responses
type ChatResponse = LeadsResponse | ProcurementLinksResponse;

// Lead interface matching the schema
interface Lead {
  opportunityType: string;
  opportunityTitle: string;
  contractID?: string;
  issuingBody: {
    name: string;
    level: string;
  };
  location: {
    city?: string;
    county?: string;
    region: string;
  };
  status: string;
  estimatedValueUSD?: number;
  keyDates: {
    publishedDate?: string;
    bidDeadline?: string;
    projectedStartDate?: string;
  };
  source: {
    documentName: string;
    url: string;
  };
  contacts: Array<{
    name?: string;
    title: string;
    email?: string;
    phone?: string;
    url?: string;
  }>;
  summary: string;
  verificationStatus?: string;
  category?: string;
  subcategory?: string;
}

// Type guard functions
function isLeadsResponse(response: ChatResponse): response is LeadsResponse {
  return 'leads' in response && Array.isArray(response.leads) && response.leads.length > 0;
}

function isProcurementLinksResponse(response: ChatResponse): response is ProcurementLinksResponse {
  return 'procurement_links' in response && Array.isArray(response.procurement_links) && response.procurement_links.length > 0;
}

// Response type detection with priority order
function detectResponseType(
  response: ChatResponse,
  promptTypeName: string | null
): "leads" | "procurement_links" {
  // Priority 1: Check source_type in metadata (most reliable)
  if (response.search_metadata.source_type === "leads") return "leads";
  if (response.search_metadata.source_type === "procurement_links") return "procurement_links";
  
  // Priority 2: Check for leads array presence
  if (isLeadsResponse(response)) return "leads";
  
  // Priority 3: Check for procurement_links array presence
  if (isProcurementLinksResponse(response)) return "procurement_links";
  
  // Priority 4: Check prompt type as fallback
  if (promptTypeName === "leads") return "leads";
  
  // Priority 5: Default to procurement links if ambiguous
  return "procurement_links";
}
```

#### 3.3 Update Message Display with Leads Preview
**File**: `src/components/ProcurementChat.tsx`

**Leads Preview Component**:

```typescript
// Leads Preview Component (similar to procurement links preview)
function LeadsPreview({ leads }: { leads: Lead[] }) {
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {leads.map((lead, idx) => (
        <div key={idx} className="p-3 bg-tron-bg-deep rounded border border-tron-cyan/10 hover:border-tron-cyan/30 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-tron-white flex items-center gap-2 mb-1 text-sm">
                <Briefcase className="w-3 h-3 text-tron-cyan flex-shrink-0" />
                <span className="truncate">{lead.opportunityTitle}</span>
              </h4>
              <p className="text-xs text-tron-gray flex items-center gap-1 mb-2">
                <Building2 className="w-3 h-3" />
                {lead.issuingBody.name} • {lead.issuingBody.level}
                {lead.location.region && ` • ${lead.location.region}`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
              {lead.status && (
                <span className={`text-xs px-2 py-1 rounded ${
                  lead.status.toLowerCase().includes('open') 
                    ? 'bg-neon-success/20 text-neon-success border border-neon-success/30'
                    : lead.status.toLowerCase().includes('closed') || lead.status.toLowerCase().includes('awarded')
                    ? 'bg-tron-gray/20 text-tron-gray border border-tron-gray/30'
                    : 'bg-neon-warning/20 text-neon-warning border border-neon-warning/30'
                }`}>
                  {lead.status}
                </span>
              )}
              {lead.estimatedValueUSD && (
                <span className="text-xs text-tron-cyan flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  ${lead.estimatedValueUSD.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-xs text-tron-gray line-clamp-2">{lead.summary}</p>
            {lead.keyDates.bidDeadline && (
              <p className="text-xs text-tron-gray flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Deadline: {lead.keyDates.bidDeadline}
              </p>
            )}
            <a 
              href={lead.source.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-tron-cyan hover:text-tron-cyan-bright transition-colors group"
            >
              <span className="truncate group-hover:underline">{lead.source.url}</span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Note**: Import required icons at the top of the file:
```typescript
import { 
  Briefcase, 
  Building2, 
  Calendar, 
  DollarSign,
  // ... other existing imports
} from 'lucide-react';
```

### Phase 4: System Prompt Configuration

#### 4.1 Create LEADS System Prompt Template
**File**: `convex/chatSystemPrompts.ts` (add default LEADS prompt)

```typescript
export const DEFAULT_LEADS_SYSTEM_PROMPT = `You are a specialized Lead Generation Agent for government procurement opportunities. Your primary function is to identify, extract, and structure procurement leads (RFPs, RFQs, bid opportunities) from user queries.

Operational Context:
- Environment: React 19 (Vite) frontend with a Convex (Node.js) backend.
- Model: OpenAI GPT-5-mini (optimized for speed and structured outputs).
- Output Destination: JSON data that will be imported into the Leads Management system.

Objective:
Translate natural language requests about procurement opportunities into structured JSON arrays of lead data.

Strict JSON Output Schema:
You must respond EXCLUSIVELY with a JSON object. Do not include conversational filler, markdown explanations outside the JSON block, or "here is the data" preambles.

Required JSON Structure:
{
  "search_metadata": {
    "target_regions": ["string"],
    "count_found": 0,
    "timestamp": "ISO-8601 timestamp",
    "source_type": "leads"
  },
  "leads": [
    {
      "opportunityType": "RFP | RFQ | Bid | Contract",
      "opportunityTitle": "Full title of the opportunity",
      "contractID": "Optional contract/reference number",
      "issuingBody": {
        "name": "Organization name",
        "level": "City | County | State | Federal | Municipality"
      },
      "location": {
        "city": "City name (if applicable)",
        "county": "County name (if applicable)",
        "region": "State name"
      },
      "status": "Open | Closed | Pending | Awarded",
      "estimatedValueUSD": 0,
      "keyDates": {
        "publishedDate": "YYYY-MM-DD",
        "bidDeadline": "YYYY-MM-DD",
        "projectedStartDate": "YYYY-MM-DD"
      },
      "source": {
        "documentName": "Document or reference name",
        "url": "https://source-url.gov/opportunity"
      },
      "contacts": [
        {
          "name": "Contact person name",
          "title": "Job title",
          "email": "email@example.gov",
          "phone": "Phone number",
          "url": "Contact page URL"
        }
      ],
      "summary": "Detailed description of the opportunity",
      "verificationStatus": "Pending | Verified | Rejected",
      "category": "Category name",
      "subcategory": "Subcategory name"
    }
  ]
}

Data Field Requirements:
- All fields marked as required in the schema must be present
- Optional fields can be omitted or set to null
- Dates must be in YYYY-MM-DD format
- URLs must be valid and accessible
- Contact information should be extracted when available

Remember: Respond ONLY with valid JSON. No markdown code blocks, no explanations, just the JSON object.`;
```

#### 4.2 Initialize LEADS Prompt Type and Default Prompt
**File**: `convex/chatSystemPromptTypes.ts` and `convex/chatSystemPrompts.ts`

**Ensure LEADS Prompt Type Exists**:

```typescript
// In convex/chatSystemPromptTypes.ts
export const ensureLeadsPromptType = internalMutation({
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("chatSystemPromptTypes")
      .withIndex("by_name", (q) => q.eq("name", "leads"))
      .first();
    
    if (!existing) {
      const now = Date.now();
      return await ctx.db.insert("chatSystemPromptTypes", {
        name: "leads",
        displayName: "Leads",
        description: "System prompt for lead generation",
        isDefault: false,
        order: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    return existing._id;
  },
});
```

**Initialize Default LEADS Prompt**:

```typescript
// In convex/chatSystemPrompts.ts
import { internal } from "./_generated/api";

export const initializeDefaultLeadsPrompt = internalMutation({
  handler: async (ctx) => {
    // Get or create "leads" type
    const leadsTypeId = await ctx.runMutation(internal.chatSystemPromptTypes.ensureLeadsPromptType, {});
    
    // Check if default prompt already exists
    const existing = await ctx.db
      .query("chatSystemPrompts")
      .withIndex("by_type", (q) => q.eq("type", leadsTypeId))
      .first();
    
    if (!existing) {
      const now = Date.now();
      return await ctx.db.insert("chatSystemPrompts", {
        systemPromptText: DEFAULT_LEADS_SYSTEM_PROMPT,
        isPrimarySystemPrompt: false,
        title: "Default Leads Generation Prompt",
        description: "Default system prompt for generating procurement leads",
        type: leadsTypeId,
        createdAt: now,
        updatedAt: now,
      });
    }
    return existing._id;
  },
});
```

**Call During App Initialization**: This should be called once during app setup or via a migration script.

### Phase 5: Navigation Integration

#### 5.1 Add Navigation Callback Prop
**File**: `src/components/ProcurementChat.tsx`

```typescript
interface ProcurementChatProps {
  onExportToVerifier?: () => void;
  onExportToLeads?: () => void; // NEW: Callback for leads export navigation
}
```

#### 5.2 Navigation Implementation Strategy
**Priority Order**:
1. **Callback Prop** (`onExportToLeads`): Used when `ProcurementChat` is embedded in a parent component that manages navigation (e.g., tab switching)
2. **React Router Navigation**: Used as fallback when no callback is provided (standalone usage)

**Implementation** (already included in `handleExportToLeads`):
```typescript
// Navigate to leads management page
if (onExportToLeads) {
  onExportToLeads(); // Callback for parent components (e.g., tab switching)
} else {
  navigate('/leads-management'); // Direct navigation using React Router
}
```

#### 5.3 Update Parent Components
Any component that uses `ProcurementChat` and needs custom navigation should provide the `onExportToLeads` callback:

```typescript
import { useNavigate } from 'react-router-dom';

function ParentComponent() {
  const navigate = useNavigate();
  
  return (
    <ProcurementChat
      onExportToVerifier={() => navigate('/procurement-links')}
      onExportToLeads={() => navigate('/leads-management')}
    />
  );
}
```

**Note**: The route `/leads-management` is already defined in `App.tsx` (line 183) and points to the `LeadsManagementPage` component.

### Phase 6: Testing Strategy

#### 6.1 Test Data Examples

**Valid Leads Response Example**:
```json
{
  "search_metadata": {
    "target_regions": ["Texas", "California"],
    "count_found": 3,
    "timestamp": "2024-01-15T10:30:00Z",
    "source_type": "leads"
  },
  "leads": [
    {
      "opportunityType": "RFP",
      "opportunityTitle": "IT Infrastructure Upgrade Services",
      "contractID": "RFP-2024-001",
      "issuingBody": {
        "name": "City of Houston",
        "level": "City"
      },
      "location": {
        "city": "Houston",
        "county": "Harris",
        "region": "Texas"
      },
      "status": "Open",
      "estimatedValueUSD": 500000,
      "keyDates": {
        "publishedDate": "2024-01-15",
        "bidDeadline": "2024-03-01",
        "projectedStartDate": "2024-04-01"
      },
      "source": {
        "documentName": "RFP-2024-001",
        "url": "https://www.houstontx.gov/procurement/rfp-2024-001"
      },
      "contacts": [
        {
          "name": "John Doe",
          "title": "Procurement Officer",
          "email": "john.doe@houstontx.gov",
          "phone": "713-555-1234"
        }
      ],
      "summary": "The City of Houston is seeking proposals for comprehensive IT infrastructure upgrades including network hardware, software, and support services.",
      "verificationStatus": "Pending",
      "category": "Technology",
      "subcategory": "IT Infrastructure"
    }
  ]
}
```

**Edge Case Test Data**:

1. **Missing Optional Fields**:
```json
{
  "search_metadata": { "target_regions": ["Texas"], "count_found": 1, "source_type": "leads" },
  "leads": [{
    "opportunityType": "RFQ",
    "opportunityTitle": "Basic Service Request",
    "issuingBody": { "name": "Test Org", "level": "City" },
    "location": { "region": "Texas" },
    "status": "Open",
    "source": { "documentName": "Test", "url": "https://example.com" },
    "contacts": [{ "title": "Contact" }],
    "summary": "Test summary"
  }]
}
```

2. **Empty Leads Array**:
```json
{
  "search_metadata": { "target_regions": ["Texas"], "count_found": 0, "source_type": "leads" },
  "leads": []
}
```

3. **Mixed Response (Both Arrays)**:
```json
{
  "search_metadata": { "target_regions": ["Texas"], "count_found": 2, "source_type": "leads" },
  "leads": [{ /* lead data */ }],
  "procurement_links": [{ /* link data */ }]
}
```

4. **Invalid URL Format**:
```json
{
  "leads": [{
    "opportunityTitle": "Test",
    "issuingBody": { "name": "Test", "level": "City" },
    "location": { "region": "Texas" },
    "status": "Open",
    "source": { "documentName": "Test", "url": "not-a-valid-url" },
    "contacts": [{ "title": "Contact" }],
    "summary": "Test"
  }]
}
```

#### 6.2 Unit Tests

**Test `parseAgentResponse` with Leads Format**:
```typescript
describe('parseAgentResponse', () => {
  it('should parse leads response correctly', () => {
    const response = parseAgentResponse(validLeadsResponseJson);
    expect(response.hasStructuredData).toBe(true);
    expect(response.responseData?.leads).toBeDefined();
    expect(response.responseData?.source_type).toBe('leads');
  });
  
  it('should handle mixed response (prioritize leads)', () => {
    const response = parseAgentResponse(mixedResponseJson);
    expect(response.responseData?.leads).toBeDefined();
    expect(response.responseData?.source_type).toBe('leads');
  });
  
  it('should normalize leads data correctly', () => {
    // Test normalization of missing fields, URL validation, etc.
  });
});
```

**Test `leads.importFromChatResponse` Mutation**:
```typescript
describe('importFromChatResponse', () => {
  it('should import new leads successfully', async () => {
    const result = await importFromChatResponse({ leads: [validLead], sessionId });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
  });
  
  it('should detect duplicates by contractID', async () => {
    await importFromChatResponse({ leads: [leadWithContractId], sessionId });
    const result = await importFromChatResponse({ leads: [leadWithContractId], sessionId });
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
  });
  
  it('should detect duplicates by title + URL', async () => {
    // Test duplicate detection logic
  });
  
  it('should handle partial failures gracefully', async () => {
    // Test error handling when some leads fail to import
  });
});
```

**Test Duplicate Detection Logic**:
- Test contractID-based detection
- Test title + URL-based detection
- Test case sensitivity handling
- Test URL normalization (trailing slashes, etc.)

**Test Prompt Type Detection**:
- Test `getPromptType` query
- Test response type detection priority order
- Test fallback to prompt type when source_type is missing

#### 6.3 Integration Tests

**Test Full Flow: Chat → Response → Export to Leads**:
1. Select LEADS system prompt
2. Send message requesting leads
3. Verify response contains leads data
4. Click "To Leads Management" button
5. Verify leads appear in Leads Management page
6. Verify navigation occurred

**Test Full Flow: Chat → Response → Export to Verifier (Backward Compatibility)**:
1. Select non-LEADS system prompt
2. Send message requesting procurement links
3. Verify response contains procurement_links data
4. Click "To Verifier" button
5. Verify links appear in Procurement Link Verifier
6. Verify existing flow still works

**Test Prompt Type Switching**:
1. Start with procurement prompt, send message
2. Switch to LEADS prompt, send message
3. Verify each response routes to correct destination
4. Verify button text changes appropriately

**Test Error Handling**:
1. Test invalid response format
2. Test empty leads array
3. Test network failure during import
4. Test validation errors
5. Test duplicate detection

**Test Large Batch Imports**:
1. Import 100+ leads
2. Verify performance (should complete in < 10 seconds)
3. Verify progress indication
4. Verify all leads imported correctly

#### 6.4 User Acceptance Tests

1. **Basic Flow**:
   - Select LEADS system prompt
   - Send query: "Find RFPs for Texas cities"
   - Verify response contains leads data
   - Click "To Leads Management" button
   - Verify leads appear in Leads Management page
   - Verify import statistics displayed

2. **Backward Compatibility**:
   - Use default (procurement) system prompt
   - Send query about procurement links
   - Verify "To Verifier" button appears
   - Verify existing flow works unchanged

3. **Error Scenarios**:
   - Test with invalid response format
   - Test with empty leads array
   - Test with duplicate leads
   - Verify appropriate error messages shown

4. **UI/UX**:
   - Verify loading states during import
   - Verify success/error feedback
   - Verify navigation occurs after export
   - Verify leads preview displays correctly

## Implementation Checklist

### Backend
- [ ] Create `leads.importFromChatResponse` mutation
- [ ] Add `chatSystemPrompts.getPromptType` query
- [ ] Update `parseAgentResponse` to handle leads format
- [ ] Add duplicate detection for leads (contractID + source.url)
- [ ] Create default LEADS system prompt template

### Frontend
- [ ] Add `importToLeads` mutation hook
- [ ] Add prompt type query hook
- [ ] Create `handleExportToLeads` function
- [ ] Update `handleExportToVerifier` with conditional routing
- [ ] Update `ChatResponse` interface
- [ ] Update message rendering for leads display
- [ ] Add "To Leads Management" button
- [ ] Update button text based on response type
- [ ] Add navigation callback prop

### Testing
- [ ] Test leads import mutation
- [ ] Test prompt type detection
- [ ] Test conditional routing logic
- [ ] Test UI rendering for both response types
- [ ] Test navigation callbacks
- [ ] Test backward compatibility

### Documentation
- [ ] Update system prompt documentation
- [ ] Document LEADS response format
- [ ] Update user guide for new feature

## Error Handling

### Edge Cases and Solutions

1. **Mixed Response**: Response contains both `procurement_links` and `leads`
   - **Detection**: Check `source_type` in metadata first, then check array presence
   - **Solution**: Prioritize `leads` if `source_type === "leads"` or if leads array exists
   - **Fallback**: Use `procurement_links` if leads not present
   - **Implementation**: Use `detectResponseType()` function with priority order

2. **Missing Prompt Type**: Selected prompt doesn't have a type
   - **Detection**: `getPromptType` returns `null` or prompt type lookup fails
   - **Solution**: Default to procurement links behavior
   - **Error Message**: None (silent fallback)

3. **Invalid Response Format**: Response doesn't match expected schema
   - **Detection**: Validation function returns errors
   - **Solution**: Show error message: `"Validation failed: [list of errors]"`
   - **Action**: Disable export button, prevent import attempt

4. **Empty Leads Array**: Response has leads array but it's empty
   - **Detection**: `response.leads.length === 0`
   - **Solution**: Disable export button, show message: `"Response contains empty leads array. Cannot export."`
   - **UI**: Button shows disabled state with tooltip

5. **Duplicate Leads**: Lead already exists in database
   - **Detection**: Duplicate detection logic finds match
   - **Solution**: Skip import, increment skipped counter, add to duplicates array
   - **User Feedback**: Show in export result: `"X imported, Y skipped (duplicates)"`
   - **Details**: Duplicates array contains lead titles with reason (contractID or title+URL)

6. **Network Failure**: Import request fails
   - **Detection**: `catch` block in `handleExportToLeads`
   - **Solution**: Show error message: `"Failed to export leads: [error message]"`
   - **Recovery**: Allow user to retry export
   - **Logging**: Log error to console and error tracking service

7. **Partial Import Failure**: Some leads succeed, some fail
   - **Detection**: `result.failed > 0` in import response
   - **Solution**: Continue importing remaining leads, return detailed statistics
   - **User Feedback**: Show: `"Imported X leads. Y were duplicates. Z failed."`
   - **Error Details**: Include error messages in result.errors array (limited to 10)

8. **Missing Required Fields**: Lead data missing critical fields
   - **Detection**: Validation function checks required fields
   - **Solution**: Reject lead, add to validation errors
   - **Error Message**: `"Lead N: missing [field name]"`

9. **Invalid URL Format**: Source URL is malformed
   - **Detection**: URL validation in normalization function
   - **Solution**: Log warning, but allow import (URL may be corrected later)
   - **Note**: Invalid URLs are still stored but flagged for review

10. **Invalid Date Format**: Date fields not in YYYY-MM-DD format
    - **Detection**: Date validation in normalization function
    - **Solution**: Clear invalid date field, log warning
    - **Note**: Lead still imported with date field undefined

### Error Message Format

All error messages should:
- Be user-friendly and actionable
- Include specific details when helpful
- Not expose internal implementation details
- Be logged to console for debugging

### Error Recovery Strategies

1. **Validation Errors**: User can fix prompt and regenerate response
2. **Network Errors**: User can retry export (button remains enabled)
3. **Partial Failures**: User can review failed leads and manually import if needed
4. **Duplicate Detection**: User can review duplicates in export result message

## Performance Considerations

### Performance Benchmarks

**Target Performance Metrics**:
- **Import 10 leads**: < 2 seconds
- **Import 50 leads**: < 5 seconds
- **Import 100+ leads**: < 10 seconds (with progress indication)
- **Duplicate detection**: < 100ms per lead (with indexes)
- **UI response time**: < 50ms for button clicks and state updates

### Optimization Strategies

1. **Database Indexes for Duplicate Detection**:
   - Add index on `contractID` field: `.index("by_contract_id", ["contractID"])`
   - Consider index on `source.url` if Convex supports nested field indexing
   - **Impact**: Reduces duplicate check time from O(n) to O(log n)

2. **Batch Processing for Large Imports**:
   - **Current Implementation**: Process leads sequentially (one by one)
   - **Future Enhancement**: Process in batches of 50 leads
   - **Progress Reporting**: Show progress indicator for imports > 50 leads
   - **Cancellation**: Allow user to cancel long-running imports

3. **UI Responsiveness**:
   - **Loading States**: Show spinner during import (prevents double-clicks)
   - **Optimistic Updates**: Update UI immediately, sync with backend
   - **Virtual Scrolling**: For leads preview with > 20 items (future enhancement)
   - **Debouncing**: Debounce rapid button clicks

4. **Query Optimization**:
   - **Prompt Type Query**: Cache prompt type lookup results
   - **Duplicate Detection**: Use indexed queries instead of full table scans
   - **Batch Queries**: Group multiple duplicate checks when possible

5. **Memory Management**:
   - **Stream Processing**: Process leads one at a time to avoid memory issues
   - **Error Array Limiting**: Limit error array to 10 items to prevent excessive memory usage
   - **Cleanup**: Clear export results after timeout

6. **Network Optimization**:
   - **Request Batching**: Single mutation call for all leads (already implemented)
   - **Retry Logic**: Exponential backoff for failed requests (future enhancement)
   - **Timeout Handling**: Set appropriate timeout for large imports

### Performance Monitoring

**Metrics to Track**:
- Import duration (by lead count)
- Duplicate detection time
- UI render time for leads preview
- Error rates
- User retry rates

**Logging**:
- Log performance metrics for imports > 50 leads
- Log slow duplicate detection queries (> 200ms)
- Track error patterns for optimization opportunities

## Future Enhancements

1. **Auto-Import**: Automatically import leads without user clicking button (configurable)
2. **Preview Modal**: Show leads preview before importing
3. **Bulk Operations**: Allow selecting specific leads to import
4. **Validation**: Pre-validate leads data before import
5. **Mapping**: Allow field mapping for different response formats
6. **Analytics**: Track import success rates, common errors

## Security & Validation

### Input Sanitization

**URL Validation**:
```typescript
function validateAndNormalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Normalize: remove trailing slash, convert to lowercase
    return urlObj.toString().toLowerCase().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }
}
```

**Date Validation**:
```typescript
function validateDate(dateString: string): string | undefined {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return undefined;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return undefined;
  return dateString; // Return validated date
}
```

**Text Sanitization** (for XSS prevention):
- All text fields are rendered through React (automatically escapes HTML)
- No need for additional HTML sanitization in React components
- Backend validates data types through Convex validators

### Authorization

**Access Control**:
- **Authenticated Users**: Full access to import leads
- **Unauthenticated Users**: Read-only (can view responses but cannot import)
- **Admin Users**: Additional capabilities (bulk operations, etc.) - future enhancement

**Implementation**:
- Import mutation checks authentication via Convex auth system
- Frontend disables export button for unauthenticated users
- Error message: "Please sign in to export leads" for unauthenticated attempts

**Note**: Follows same authorization pattern as `procurementUrls.importFromChatResponse`

## Migration Notes

- **No database migration required**: Uses existing `leads` table
- **Schema compatibility**: All required fields already exist in schema
- **Backward compatible**: Existing procurement links flow remains unchanged
- **Existing system prompts**: Remain unchanged, new LEADS prompts can be created via UI
- **Existing chat sessions**: Continue to work as-is, no data migration needed
- **Initialization**: Run `initializeDefaultLeadsPrompt` once to create default LEADS prompt (optional)

## Success Criteria

1. ✅ LEADS system prompt responses can be exported to Leads Management
2. ✅ Procurement links responses continue to export to Verifier
3. ✅ UI clearly indicates which export option is available
4. ✅ Import statistics are displayed (imported, skipped, duplicates)
5. ✅ Navigation to appropriate page occurs after export
6. ✅ Error handling is robust and user-friendly
7. ✅ No regression in existing functionality
