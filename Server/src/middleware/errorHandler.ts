import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error { statusCode?: number }

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.statusCode ?? 500;
  if (status === 500) console.error('[ErrorHandler]', err);
  res.status(status).json({ error: err.name ?? 'Error', message: status === 500 ? 'Internal server error' : err.message });
}

export function createError(message: string, statusCode: number): AppError {
  const e: AppError = new Error(message);
  e.statusCode = statusCode;
  return e;
}
