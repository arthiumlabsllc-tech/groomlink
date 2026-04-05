import { Response } from 'express';
import { ApiResponse } from '../types';

export function successResponse<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: ApiResponse<T>['meta']
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  res.status(statusCode).json(response);
}

export function errorResponse(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: unknown
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error!.details = details;
  }

  res.status(statusCode).json(response);
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): void {
  const totalPages = Math.ceil(total / limit);

  successResponse(res, data, 200, {
    page,
    limit,
    total,
    totalPages,
  });
}
