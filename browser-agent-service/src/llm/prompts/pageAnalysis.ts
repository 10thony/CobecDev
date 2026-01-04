/**
 * Page analysis prompt template
 */
export function getPageAnalysisPrompt(context: {
  currentUrl: string;
  pageNumber: number;
  maxPages: number;
  opportunitiesFound: number;
  previousAction?: string;
  goal: string;
  htmlContent: string;
}): string {
  return `Analyze this procurement portal page and determine the next action.

## Current State
- URL: ${context.currentUrl}
- Page Number: ${context.pageNumber} of max ${context.maxPages}
- Opportunities Found So Far: ${context.opportunitiesFound}
- Previous Action: ${context.previousAction || 'None'}
- Goal: ${context.goal}

## Page Content
Screenshot: [attached image]
HTML (truncated): ${context.htmlContent}

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
}

