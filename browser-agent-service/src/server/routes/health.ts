import { Router, Request, Response } from 'express';
import { BrowserManager } from '../../browser/BrowserManager';
import { jobStore } from '../../utils/jobStore';

const router = Router();
const startTime = Date.now();
const browserManager = new BrowserManager();

/**
 * GET /health - Health check endpoint
 */
router.get('/', (req: Request, res: Response) => {
  const status = browserManager.getStatus();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Determine health status
  let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (status.total >= status.active * 0.9) {
    healthStatus = 'degraded';
  }
  if (status.total === 0 || status.active === status.total) {
    healthStatus = 'unhealthy';
  }

  const activeJobs = jobStore.getAll().filter(j => j.status === 'in_progress').length;

  res.json({
    status: healthStatus,
    uptime,
    activeBrowsers: status.active,
    activeJobs,
    lastJobAt: undefined, // Would track in production
  });
});

export default router;

