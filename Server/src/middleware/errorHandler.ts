/**
 * Global Error Handler
 * 
 * This catches all errors from routes and formats them into consistent JSON responses.
 * It's the last middleware in the chain, so any error that wasn't handled reaches here.
 */

import { Request, Response, NextFunction } from 'express';

// Custom error type that includes HTTP status code
export interface AppError extends Error { 
  statusCode?: number  // HTTP status code (404, 403, 500, etc.)
}

/**
 * Format and send error response
 */
export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  // Get status code from error, default to 500 (Internal Server Error)
  const status = err.statusCode ?? 500;
  
  // Log server errors (500) for debugging, but not client errors (4xx)
  if (status === 500) {
    console.error('[Error]', err);
  }
  
  // Send formatted error response
  res.status(status).json({ 
    error: err.name ?? 'Error',
    message: status === 500 
      ? 'Internal server error'  // Hide details for security
      : err.message              // Show message for client errors
  });
}

/**
 * Helper to create errors with status codes
 * 
 * Usage:
 *   throw createError('Document not found', 404);
 *   throw createError('Forbidden', 403);
 */
export function createError(message: string, statusCode: number): AppError {
  const e: AppError = new Error(message);
  e.statusCode = statusCode;
  return e;
}
