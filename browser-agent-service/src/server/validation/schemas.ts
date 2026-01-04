import { z } from 'zod';

/**
 * Zod schemas for request validation
 */
export const ScrapeRequestSchema = z.object({
  jobId: z.string().uuid(),
  url: z.string().url(),
  portalId: z.string(),
  configuration: z.object({
    requiresAuth: z.boolean(),
    authCredentials: z.object({
      username: z.string().optional(),
      password: z.string().optional(),
    }).optional(),
    navigationHints: z.object({
      opportunityListSelector: z.string().optional(),
      nextButtonSelector: z.string().optional(),
      detailLinkSelector: z.string().optional(),
    }).optional(),
    maxPages: z.number().optional(),
    customInstructions: z.string().optional(),
  }),
  callbackUrl: z.string().url().optional(),
});

export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>;

