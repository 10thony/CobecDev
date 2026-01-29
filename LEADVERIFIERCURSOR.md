# Lead Link Verifier Workflow - Implementation Plan

## Problem Statement

Many leads in the database have generic or incorrect source URLs that don't point to the specific procurement opportunity. These URLs may be:

- Generic procurement portal homepages (e.g., `https://city.gov/procurement`)
- Incorrect or broken links
- Links to wrong opportunities
- Missing specific opportunity detail pages

## Solution Architecture

### Overview

A Convex workflow that runs locally and processes leads in batches to:

1. Process all leads (or user-specified subset) without pre-filtering
2. Use AI agents to research and discover correct URLs for each lead
3. Agent intelligently skips leads that already have good URLs
4. Update leads with verified, specific opportunity links

### Key Components

#### 1. Local Workflow Script (`scripts/verify-lead-links.ts`)

A Node.js script that:

- Connects to Convex using the local deployment URL
- Queries leads in intelligent batches
- Triggers the Convex workflow for each batch
- Monitors progress and handles errors

#### 2. Convex Workflow (`convex/leadLinkVerifierWorkflow.ts`)

A Convex workflow that:

- Processes a batch of leads (no pre-filtering)
- For each lead, agent checks if URL is already good
- If URL needs improvement, uses AI agent to research/discover correct URL
- If URL is already good, agent skips (user can manually skip if needed)
- Updates lead with verified URL when found

#### 3. Lead Link Verification Agent (`convex/leadLinkVerifierAgent.ts`)

An AI agent that:

- First checks if the current source URL is already good (specific, accessible, matches lead)
- If URL is good: Returns "skip" status (no update needed)
- If URL needs improvement: Analyzes lead metadata (title, contract ID, issuing body, etc.)
- Researches online to find the specific opportunity URL
- Traverses source URLs to find correct links
- Validates discovered URLs

## Implementation Details

### Step 1: Batch Processing Strategy (No Pre-Filtering)

**Approach:**

- Process ALL leads (or user-specified subset) without pre-filtering
- Let the AI agent determine if a URL needs verification
- Better to have false positives (process leads with good URLs) than false negatives (miss leads that need fixing)
- Users can manually skip leads that already have good URLs if needed

**Query Strategy:**

```typescript
// Get leads in batches - no filtering, process all
const getLeadsBatch = async (ctx, batchSize: number, lastId?: Id<"leads">) => {
  let query = ctx.db.query("leads").withIndex("by_creation").order("desc");
  
  if (lastId) {
    const lastLead = await ctx.db.get(lastId);
    if (lastLead) {
      query = query.filter((q) => q.lt(q.field("createdAt"), lastLead.createdAt));
    }
  }
  
  return await query.take(batchSize);
};
```

**Rationale:**

- Avoids buggy filtering logic that might miss leads needing verification
- Agent can intelligently skip leads with already-good URLs
- More thorough coverage of all leads
- User can review and skip manually if agent incorrectly processes a good URL

### Step 2: Agent URL Quality Check

**Intelligent Batching:**

- Start with small batches (10-20 leads) for experimentation
- Adjust batch size based on:
  - Success rate
  - API rate limits
  - Processing time
  - Error rates

**Batch Selection:**

- Process leads in creation order (newest first, or oldest first - configurable)
- No prioritization based on URL quality (agent will determine)
- Optional: Allow user to specify filters (region, status, etc.) but don't filter by URL quality

**Agent URL Quality Check Logic:**

Before researching, agent should:

1. Check if current URL is accessible (HTTP 200)
2. Check if URL contains opportunity-specific identifiers (contract ID, RFP number)
3. Check if URL content matches lead metadata (title, contract ID)
4. If all checks pass: Return "skip" status (URL is already good)
5. If any check fails: Proceed with research

**Skip Criteria (all must be true):**

- URL is accessible
- URL contains contract ID or opportunity identifier
- URL content matches lead title/contract ID
- URL is from official domain (.gov, .org, etc.)

### Step 3: AI Agent Research Strategy

**Dual Approach:**

#### A. Online Research

- Use AI agent with web search capabilities
- Search for: `[Contract ID] [Issuing Body] procurement`
- Search for: `[Opportunity Title] [City/State] RFP`
- Look for official government procurement portals
- Check SAM.gov for federal opportunities

#### B. Source URL Traversal

- Navigate to the lead's current source URL
- Use browser agent to:
  - Parse the page structure
  - Find links to specific opportunities
  - Search for the contract ID or opportunity title
  - Navigate through pagination if needed
  - Extract the correct detail page URL

**Agent Tools:**

- `fetchWebpageContent` - Fetch and parse HTML
- `browserAgent` - Navigate and interact with pages (if browser-agent-service available)
- `webSearch` - Search for opportunities online
- `analyzeUrlPattern` - Validate URL structure

### Step 4: URL Validation

**Validation Criteria:**

- URL is specific (contains contract ID, RFP number, or opportunity identifier)
- URL is accessible (HTTP 200 response)
- URL content matches lead metadata (title, contract ID, etc.)
- URL is from official government domain (.gov, .org, etc.)

**Confidence Scoring:**

- High (0.8-1.0): URL contains contract ID and matches lead title
- Medium (0.5-0.8): URL is specific but needs manual verification
- Low (0.0-0.5): Could not find specific URL, keep generic or mark for review

### Step 5: Lead Update Strategy

**Update Logic:**

- If agent determines URL is already good: Skip update, log as "already verified"
- If high-confidence URL found: Update `source.url` immediately
- If medium-confidence: Update `source.url` and set `verificationStatus: "Needs Review"`
- If low-confidence: Set `verificationStatus: "Could Not Verify"` and add notes
- Always update `lastChecked` timestamp
- Log verification attempt in metadata (including "skipped" status)

## Technical Implementation

### File Structure

```
convex/
  leadLinkVerifierWorkflow.ts      # Main workflow definition
  leadLinkVerifierAgent.ts          # AI agent for URL discovery
  leadLinkVerifierActions.ts        # Actions for web research
  leadLinkVerifierQueries.ts        # Queries for batch selection

scripts/
  verify-lead-links.ts              # Local script to run workflow
```

### Workflow Definition

```typescript
// convex/leadLinkVerifierWorkflow.ts
export const verifyLeadLinks = workflow.define({
  args: {
    batchSize: v.number(),
    startFrom: v.optional(v.id("leads")),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    skipped: v.number(),  // Leads with already-good URLs
    failed: v.number(),
  }),
  handler: async (step, args) => {
    // 1. Get batch of leads (no pre-filtering)
    // 2. For each lead:
    //    a. Agent checks if URL is already good
    //    b. If good: skip (log as "already verified")
    //    c. If needs improvement: research and discover URL
    // 3. Update leads with verified URLs (only if changed)
    // 4. Return statistics (processed, updated, skipped, failed)
  },
});
```

### Agent Implementation

```typescript
// convex/leadLinkVerifierAgent.ts
export const discoverLeadUrl = action({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    // 1. Get lead data
    // 2. Check if current URL is already good (accessible, specific, matches lead)
    // 3. If good: return { status: "skip", reason: "URL already verified" }
    // 4. If needs improvement:
    //    a. Research online for specific URL
    //    b. Traverse source URL if available
    //    c. Validate discovered URL
    // 5. Return verification result (skip, updated, or failed)
  },
});
```

### Local Script

```typescript
// scripts/verify-lead-links.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

async function main() {
  const batchSize = parseInt(process.argv[2] || "10");
  
  // Start workflow
  const result = await client.action(
    api.leadLinkVerifierWorkflow.startVerification,
    { batchSize }
  );
  
  console.log(`Processed ${result.processed} leads`);
  console.log(`Updated ${result.updated} leads`);
  console.log(`Skipped ${result.skipped} leads (already good)`);
  console.log(`Failed ${result.failed} leads`);
}
```

## Error Handling & Rate Limiting

### Error Handling

- Retry failed verifications with exponential backoff
- Log errors to Convex logs for debugging
- Continue processing even if individual leads fail
- Track failure reasons for analysis

### Rate Limiting

- Respect API rate limits (OpenAI, web scraping services)
- Add delays between batch processing
- Use exponential backoff for rate limit errors
- Monitor and adjust batch sizes dynamically

## Monitoring & Progress Tracking

### Progress Tracking

- Store workflow state in `leadLinkVerificationJobs` table
- Track: processed count, updated count, skipped count, failed count
- Store last processed lead ID for resumption
- Log verification attempts and results

### Metrics to Track

- Success rate (URLs found vs. not found)
- Skip rate (leads with already-good URLs)
- Average processing time per lead
- URL quality improvement (before vs. after)
- Cost per lead (API usage)
- False positive rate (leads processed that didn't need it)

## Testing Strategy

### Unit Tests

- Test URL quality check logic (when to skip vs. when to research)
- Test URL validation logic
- Test batch selection queries (no filtering)

### Integration Tests

- Test workflow with small batch (5 leads)
- Verify URL updates are correct
- Test error handling and retries

### Manual Testing

- Run on small subset of leads first
- Verify agent correctly skips leads with good URLs
- Verify discovered URLs manually
- Check that no leads needing verification are missed (no false negatives)

## Deployment & Usage

### Running Locally

```bash
# Set Convex deployment URL
export CONVEX_URL="http://localhost:3210"  # or your dev deployment

# Run verification script
npm run verify-lead-links [batchSize]

# Example: Process 20 leads at a time
npm run verify-lead-links 20
```

### Package.json Script

```json
{
  "scripts": {
    "verify-lead-links": "tsx scripts/verify-lead-links.ts"
  }
}
```

## Future Enhancements

1. **Parallel Processing**: Process multiple leads simultaneously
2. **Machine Learning**: Learn from successful verifications to improve accuracy
3. **URL Quality Scoring**: Track URL quality scores for analytics (but don't use for filtering)
4. **Automated Re-verification**: Periodically re-check verified URLs
5. **Integration with Procurement Scraper**: Use existing scraper infrastructure

## Dependencies

- `@convex-dev/workflow` - Already installed
- `@convex-dev/agent` - Already installed
- `convex` - Already installed
- Browser agent service (optional, for URL traversal)

## Schema Changes

No schema changes required initially. Can add optional fields later:

- `sourceUrlVerifiedAt: number`
- `sourceUrlVerificationMethod: string`
- `sourceUrlConfidence: number`

## Key Design Decision: No Pre-Filtering

**Rationale:**

Rather than implementing potentially buggy filtering logic to identify "bad" URLs upfront, the system processes all leads and lets the AI agent determine if a URL needs verification. This approach:

- **Avoids false negatives**: Won't miss leads that need URL fixes due to filtering bugs
- **Allows intelligent skipping**: Agent can check URL quality and skip leads with already-good URLs
- **More thorough**: Ensures comprehensive coverage of all leads
- **User-friendly**: Users can manually skip if agent incorrectly processes a good URL

This is better than the alternative of missing leads that need verification due to imperfect filtering logic.
