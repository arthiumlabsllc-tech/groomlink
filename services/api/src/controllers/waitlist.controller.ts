import { Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import * as waitlistService from '../services/waitlist.service';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

const joinWaitlistSchema = z.object({
  salonId: z.string(),
  staffId: z.string().optional(),
  date: z.string(), // ISO date string
  timeSlot: z.string(), // HH:mm format
});

export async function joinWaitlist(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const validatedData = joinWaitlistSchema.parse(req.body);

    const entry = await waitlistService.joinWaitlist({
      customerId: req.user.id,
      salonId: validatedData.salonId,
      staffId: validatedData.staffId,
      date: new Date(validatedData.date),
      timeSlot: validatedData.timeSlot,
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

export async function leaveWaitlist(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;

    const entry = await waitlistService.leaveWaitlist(id, req.user.id);
    successResponse(res, entry);
  } catch (error) {
    errorResponse(res, 'LEAVE_FAILED', (error as Error).message, 400);
  }
}

export async function getMyWaitlist(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const entries = await waitlistService.getMyWaitlist(req.user.id);
    successResponse(res, entries);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}
