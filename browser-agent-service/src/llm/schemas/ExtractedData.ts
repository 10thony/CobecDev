import { z } from 'zod';

/**
 * Zod schema for extracted data
 */
export const ExtractedDataSchema = z.object({
  opportunities: z.array(
    z.object({
      title: z.string(),
      referenceNumber: z.string().nullable().optional(),
      opportunityType: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      postedDate: z.string().nullable().optional(),
      closingDate: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      department: z.string().nullable().optional(),
      estimatedValue: z.string().nullable().optional(),
      contactName: z.string().nullable().optional(),
      contactEmail: z.string().nullable().optional(),
      contactPhone: z.string().nullable().optional(),
      detailUrl: z.string().nullable().optional(),
      documents: z.array(
        z.object({
          name: z.string(),
          url: z.string(),
          type: z.string().nullable().optional(),
        })
      ).nullable().optional(),
      rawText: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  extractionNotes: z.string().nullable().optional(),
  hasMoreOpportunities: z.boolean(),
  needsScrolling: z.boolean(),
});

export type ExtractedData = z.infer<typeof ExtractedDataSchema>;

