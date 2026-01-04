/**
 * Data extraction prompt template
 */
export function getDataExtractionPrompt(context: {
  currentUrl: string;
  htmlContent: string;
}): string {
  return `Extract procurement opportunity data from this page.

## Page Content
Screenshot: [attached image]
HTML (truncated): ${context.htmlContent}
URL: ${context.currentUrl}

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
}

