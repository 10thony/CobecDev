import { Router, Request, Response } from 'express';
import { jobStore } from '../../utils/jobStore';

const router = Router();

/**
 * GET /status/:jobId - Get job status
 */
router.get('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobStore.get(jobId);

  if (!job) {
    res.status(404).json({
      success: false,
      error: 'Job not found',
    });
    return;
  }

  const agentStatus = job.agent.getStatus();

  res.json({
    jobId: job.jobId,
    status: job.status,
    progress: {
      currentPage: agentStatus.pagesScraped,
      totalPages: undefined, // Would be set if known
      opportunitiesFound: agentStatus.opportunitiesFound,
      currentAction: agentStatus.state,
    },
    result: job.result ? {
      opportunities: job.result.opportunities,
      interactions: job.result.interactions,
      duration: job.result.duration,
    } : undefined,
    error: job.error ? {
      message: job.error,
      type: 'scraping_error',
      recoverable: false,
    } : undefined,
  });
});

export default router;

