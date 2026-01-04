import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';

/**
 * API key authentication middleware
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = authHeader?.replace('Bearer ', '') || req.headers['x-api-key'] as string;

  if (!apiKey || apiKey !== config.server.apiKey) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid or missing API key',
    });
    return;
  }

  next();
}

