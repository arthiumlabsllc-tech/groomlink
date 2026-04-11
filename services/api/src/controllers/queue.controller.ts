import { Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import * as queueService from '../services/queue.service';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

const joinQueueSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  workerId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export async function joinQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const validatedData = joinQueueSchema.parse(req.body);

    const entry = await queueService.joinQueue({
      salonId: validatedData.salonId,
      customerId: req.user.id,
      serviceId: validatedData.serviceId,
      workerId: validatedData.workerId,
      notes: validatedData.notes,
    });

    successResponse(res, entry, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'JOIN_FAILED', (error as Error).message, 400);
  }
}

export async function leaveQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;

    const entry = await queueService.leaveQueue(id, req.user.id);
    successResponse(res, entry);
  } catch (error) {
    errorResponse(res, 'LEAVE_FAILED', (error as Error).message, 400);
  }
}

export async function getQueueStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { salonId } = req.params;

    const status = await queueService.getQueueStatus(salonId);
    successResponse(res, status);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getMyPosition(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;

    const entry = await queueService.getMyPosition(salonId, req.user.id);

    if (!entry) {
      errorResponse(res, 'NOT_FOUND', 'You are not in this salon\'s queue', 404);
      return;
    }

    successResponse(res, entry);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function callNext(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params; // This is salonId

    const entry = await queueService.callNext(id, req.user.id);
    successResponse(res, entry);
  } catch (error) {
    errorResponse(res, 'CALL_FAILED', (error as Error).message, 400);
  }
}

export async function startService(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params; // This is queueId

    const entry = await queueService.startService(id, req.user.id);
    successResponse(res, entry);
  } catch (error) {
    errorResponse(res, 'START_FAILED', (error as Error).message, 400);
  }
}

export async function completeService(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params; // This is queueId

    const entry = await queueService.completeService(id, req.user.id);
    successResponse(res, entry);
  } catch (error) {
    errorResponse(res, 'COMPLETE_FAILED', (error as Error).message, 400);
  }
}

export async function skipCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params; // This is queueId

    const entry = await queueService.skipCustomer(id, req.user.id);
    successResponse(res, entry);
  } catch (error) {
    errorResponse(res, 'SKIP_FAILED', (error as Error).message, 400);
  }
}
