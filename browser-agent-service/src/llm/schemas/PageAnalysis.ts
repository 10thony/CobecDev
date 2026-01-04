import { z } from 'zod';
import { ActionPlanSchema } from './ActionPlan';

/**
 * Zod schema for page analysis
 */
export const PageAnalysisSchema = z.object({
  pageType: z.enum(["list", "detail", "login", "error", "captcha", "unknown"]),
  hasOpportunities: z.boolean(),
  opportunityCount: z.number().nullable().optional(),
  hasPagination: z.boolean(),
  paginationType: z.enum(["numbered", "next_prev", "load_more", "infinite_scroll"]).nullable().optional(),
  currentPageNumber: z.number().nullable().optional(),
  totalPages: z.number().nullable().optional(),
  recommendedAction: ActionPlanSchema,
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable().optional(),
});

export type PageAnalysis = z.infer<typeof PageAnalysisSchema>;

