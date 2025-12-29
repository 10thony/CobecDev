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

