import { Router } from 'express';
import scrapeRouter from './scrape';
import statusRouter from './status';
import healthRouter from './health';
import cancelRouter from './cancel';

const router = Router();

router.use('/scrape', scrapeRouter);
router.use('/status', statusRouter);
router.use('/health', healthRouter);
router.use('/cancel', cancelRouter);

export default router;

