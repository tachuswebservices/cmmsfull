import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

export function notFoundHandler(req: Request, res: Response) {
  res.status(StatusCodes.NOT_FOUND).json({ message: 'Route not found' });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Validation error', errors: err.flatten() });
  }
  const status = (err as any)?.status || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = (err as any)?.message || getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR);
  // eslint-disable-next-line no-console
  console.error('Error:', err);
  return res.status(status).json({ message });
}

