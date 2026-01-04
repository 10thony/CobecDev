import express from 'express';
import { BrowserManager } from './browser/BrowserManager';
import { config } from './config';
import { logger } from './utils/logger';
import { authMiddleware } from './server/middleware/auth';
import { errorHandler } from './server/middleware/errorHandler';
import { requestLogger } from './server/middleware/requestLogger';
import routes from './server/routes';

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api', authMiddleware, routes);
app.use('/health', routes); // Health endpoint doesn't require auth

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

// Create browser manager instance
const browserManager = new BrowserManager();

app.listen(PORT, HOST, () => {
  logger.info(`Browser agent service started on ${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await browserManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await browserManager.shutdown();
  process.exit(0);
});

