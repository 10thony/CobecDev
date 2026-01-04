import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { BrowserManager } from '../../browser/BrowserManager';
import { VisionAnalyzer } from '../../llm/VisionAnalyzer';
import { ScraperAgent } from '../../agent/ScraperAgent';
import { ScrapeRequestSchema } from '../validation/schemas';
import { logger } from '../../utils/logger';
import { jobStore } from '../../utils/jobStore';

const router = Router();

/**
 * POST /scrape - Initiate scraping job
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated = ScrapeRequestSchema.parse(req.body);

    // Create agent
    const agent = new ScraperAgent(browserManager, visionAnalyzer);

    // Store job
    jobStore.set(validated.jobId, {
      jobId: validated.jobId,
      status: 'queued',
      agent,
      createdAt: Date.now(),
    });

    // Start scraping asynchronously
    (async () => {
      try {
        jobStore.updateStatus(validated.jobId, 'in_progress');
        const result = await agent.scrape({
          jobId: validated.jobId,
          url: validated.url,
          portalId: validated.portalId,
          configuration: validated.configuration,
        });

        jobStore.setResult(validated.jobId, result);
        jobStore.updateStatus(validated.jobId, result.success ? 'completed' : 'failed');

        // Send callback if provided
        if (validated.callbackUrl) {
          try {
            await fetch(validated.callbackUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CONVEX_CALLBACK_TOKEN || ''}`,
              },
              body: JSON.stringify({
                jobId: validated.jobId,
                success: result.success,
                opportunities: result.opportunities,
                interactions: result.interactions,
                pagesScraped: result.pagesScraped,
                duration: result.duration,
                tokensUsed: result.tokensUsed,
                error: result.errors.length > 0 ? {
                  message: result.errors[0].message,
                  type: result.errors[0].type,
                } : undefined,
              }),
            });
          } catch (callbackError) {
            logger.error('Callback failed', { error: callbackError, jobId: validated.jobId });
          }
        }
      } catch (error) {
        logger.error('Scraping job failed', { error, jobId: validated.jobId });
        jobStore.updateStatus(validated.jobId, 'failed');
        jobStore.setError(validated.jobId, error instanceof Error ? error.message : 'Unknown error');
      }
    })();

    res.json({
      success: true,
      jobId: validated.jobId,
      status: 'queued',
      message: 'Scraping job queued',
    });
  } catch (error) {
    logger.error('Invalid scrape request', { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

export default router;

