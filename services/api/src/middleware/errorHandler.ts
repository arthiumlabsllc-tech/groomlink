import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { errorResponse } from '../utils/response';
import logger from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    errorResponse(res, 'VALIDATION_ERROR', 'Validation failed', 400, details);
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        errorResponse(res, 'DUPLICATE_ENTRY', 'Record already exists', 409);
        return;
      case 'P2025':
        errorResponse(res, 'NOT_FOUND', 'Record not found', 404);
        return;
      case 'P2003':
        errorResponse(res, 'FOREIGN_KEY_CONSTRAINT', 'Related record not found', 400);
        return;
      default:
        errorResponse(res, 'DATABASE_ERROR', 'Database error occurred', 500);
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    errorResponse(res, 'VALIDATION_ERROR', 'Invalid data provided', 400);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    errorResponse(res, 'INVALID_TOKEN', 'Invalid token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse(res, 'TOKEN_EXPIRED', 'Token has expired', 401);
    return;
  }

  // Default error
  errorResponse(
    res,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    500
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  errorResponse(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404);
}
