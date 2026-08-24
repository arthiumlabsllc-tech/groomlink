/**
 * ai-accountant.controller.ts
 *
 * Admin endpoints for the AI Accountant: conversational Q&A over live
 * financial data, on-demand financial reports, and anomaly alerts.
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import logger from '../config/logger';
import * as accountant from '../services/ai-accountant.service';
import { runAnomalyScan } from '../services/accounting-anomaly.service';
import prisma from '../config/database';

// ---------------------------------------------------------------------------
// Simple in-memory per-user rate limit for the chat endpoint
// (LLM calls are expensive; keep it modest and predictable)
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX_REQUESTS = 20;
const chatUsage = new Map<string, number[]>();

function isChatRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (chatUsage.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX_REQUESTS) {
    chatUsage.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  chatUsage.set(userId, timestamps);
  return false;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

const reportSchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'ytd', 'all']).default('30d'),
  type: z.enum(['pl', 'full']).default('full'),
});

const updateAlertSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * POST /admin/ai-accountant/chat
 * Conversational Q&A with the AI Accountant over live financial data.
 */
export async function chat(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id || 'anonymous';

  if (isChatRateLimited(userId)) {
    errorResponse(res, 'RATE_LIMITED', 'Too many AI Accountant requests. Please try again in a few minutes.', 429);
    return;
  }

  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'VALIDATION_FAILED', parsed.error.errors[0]?.message || 'Invalid request', 400);
    return;
  }

  try {
    const result = await accountant.chatWithAccountant(parsed.data.message, parsed.data.history);
    successResponse(res, result);
  } catch (error) {
    if (error instanceof accountant.AiNotConfiguredError) {
      errorResponse(res, 'AI_NOT_CONFIGURED', error.message, 503);
      return;
    }
    logger.error('AI Accountant chat failed', { userId, error: (error as Error).message });
    errorResponse(res, 'CHAT_FAILED', 'The AI Accountant could not process that request. Please try again.', 500);
  }
}

/**
 * POST /admin/ai-accountant/report
 * Generate an accountant-grade financial report (markdown) for a period.
 */
export async function generateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = reportSchema.safeParse(req.body || {});
  if (!parsed.success) {
    errorResponse(res, 'VALIDATION_FAILED', parsed.error.errors[0]?.message || 'Invalid request', 400);
    return;
  }

  try {
    const result = await accountant.generateFinancialReport(parsed.data.period, parsed.data.type);
    successResponse(res, result);
  } catch (error) {
    if (error instanceof accountant.AiNotConfiguredError) {
      errorResponse(res, 'AI_NOT_CONFIGURED', error.message, 503);
      return;
    }
    logger.error('AI Accountant report generation failed', { error: (error as Error).message });
    errorResponse(res, 'REPORT_FAILED', 'Report generation failed. Please try again.', 500);
  }
}

/**
 * GET /admin/ai-accountant/status
 * Whether the AI Accountant (OpenAI) is configured — lets the UI show a
 * setup banner instead of failing on first use.
 */
export async function getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  successResponse(res, {
    configured: accountant.isOpenAiConfigured(),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });
}

/**
 * GET /admin/ai-accountant/alerts?status=OPEN
 * List anomaly alerts, newest first.
 */
export async function listAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status } : {};

    const alerts = await prisma.aiAccountantAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    successResponse(res, alerts);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * PATCH /admin/ai-accountant/alerts/:id
 * Resolve or dismiss an alert.
 */
export async function updateAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = updateAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'VALIDATION_FAILED', 'status must be RESOLVED or DISMISSED', 400);
    return;
  }

  try {
    const alert = await prisma.aiAccountantAlert.update({
      where: { id: req.params.id },
      data: {
        status: parsed.data.status,
        resolvedAt: new Date(),
        resolvedBy: req.user?.id || null,
      },
    });
    successResponse(res, alert);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      errorResponse(res, 'NOT_FOUND', 'Alert not found', 404);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

/**
 * POST /admin/ai-accountant/alerts/scan
 * Manually trigger an anomaly scan.
 */
export async function triggerScan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await runAnomalyScan();
    successResponse(res, result);
  } catch (error) {
    logger.error('Manual anomaly scan failed', { error: (error as Error).message });
    errorResponse(res, 'SCAN_FAILED', 'Anomaly scan failed. Check API logs for details.', 500);
  }
}
