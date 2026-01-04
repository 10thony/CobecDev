import { Router, Request, Response } from 'express';
import { jobStore } from '../../utils/jobStore';

const router = Router();

/**
 * POST /cancel/:jobId - Cancel a scraping job
 */
router.post('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobStore.get(jobId);

  if (!job) {
    res.status(404).json({
      success: false,
      error: 'Job not found',
    });
    return;
  }

  if (job.status === 'completed' || job.status === 'failed') {
    res.status(400).json({
      success: false,
      error: 'Cannot cancel a completed or failed job',
    });
    return;
  }

  // Cancel the agent
  job.agent.cancel();
  jobStore.updateStatus(jobId, 'failed');
  jobStore.setError(jobId, 'Cancelled by user');

  res.json({
    success: true,
    jobId,
    message: 'Job cancelled successfully',
  });
});

export default router;

