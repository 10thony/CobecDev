import { z } from 'zod';

/**
 * Zod schema for action plans
 */
export const ActionPlanSchema = z.object({
  action: z.enum(["extract", "click", "scroll", "navigate", "fill", "wait", "done", "error"]),
  target: z.object({
    selector: z.string().nullable().optional(),
    description: z.string(),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
    }).nullable().optional(),
  }).nullable().optional(),
  value: z.string().nullable().optional(),
  reason: z.string(),
  expectedOutcome: z.string(),
});

export type ActionPlan = z.infer<typeof ActionPlanSchema>;

