import { Response, Request } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import * as paymentService from '../services/payment.service';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';
import logger from '../config/logger';
import * as escrowService from '../services/escrow.service';

// Define PaymentProvider enum locally since Prisma client may not export it correctly
enum PaymentProvider {
  MTN_MOMO = 'MTN_MOMO',
  VODAFONE_CASH = 'VODAFONE_CASH',
  AIRTELTIGO_MONEY = 'AIRTELTIGO_MONEY',
  CASH = 'CASH',
}

const initializePaymentSchema = z.object({
  bookingId: z.string().uuid(),
  provider: z.enum(['MTN_MOMO', 'VODAFONE_CASH', 'AIRTELTIGO_MONEY', 'CASH']),
  phoneNumber: z.string().regex(/^\+233[0-9]{9}$/, 'Invalid phone number format'),
});

export async function initializePayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const data = initializePaymentSchema.parse(req.body);
    const result = await paymentService.initializePayment(req.user.id, data);

    if (result.success) {
      successResponse(res, result);
    } else {
      errorResponse(res, 'PAYMENT_FAILED', result.message, 400);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'PAYMENT_ERROR', (error as Error).message, 500);
  }
}

export async function verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { paymentId, reference } = req.body;

    if (!paymentId || !reference) {
      errorResponse(res, 'MISSING_PARAMS', 'Payment ID and reference are required', 400);
      return;
    }

    const result = await paymentService.verifyAndCompletePayment(paymentId, reference);

    if (result.success) {
      successResponse(res, result);
    } else {
      errorResponse(res, 'VERIFICATION_FAILED', result.message, 400);
    }
  } catch (error) {
    errorResponse(res, 'VERIFICATION_ERROR', (error as Error).message, 500);
  }
}

export async function getPaymentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { payments, total } = await paymentService.getPaymentHistory(req.user.id, page, limit);
    paginatedResponse(res, payments, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getPaymentById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id, req.user.id);

    if (!payment) {
      errorResponse(res, 'NOT_FOUND', 'Payment not found', 404);
      return;
    }

    successResponse(res, payment);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Webhook endpoint (public, but should verify signature in production)
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { provider } = req.params;
    await paymentService.handlePaymentWebhook(provider, req.body);
    successResponse(res, { received: true });
  } catch (error) {
    // Still return 200 to prevent retries
    successResponse(res, { received: true });
  }
}

// Paystack webhook endpoint
// This requires the raw body for signature verification
export async function handlePaystackWebhook(req: Request, res: Response): Promise<void> {
  try {
    // Get the raw body - this requires express.raw() middleware
    const rawBody = req.body?.toString?.() || JSON.stringify(req.body);
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      logger.warn('Paystack webhook received without signature');
      // Still return 200 to prevent retries
      res.status(200).json({ received: true });
      return;
    }

    const result = await paymentService.handlePaystackWebhook(rawBody, signature);
    
    // Always return 200 to prevent Paystack retries
    res.status(200).json({ received: true, processed: result.success });
  } catch (error) {
    // Log error but still return 200 to prevent Paystack retries
    logger.error('Paystack webhook error:', error);
    res.status(200).json({ received: true, processed: false });
  }
}

// Get payment configuration (public endpoint for booking flow)
export async function getPaymentConfig(req: Request, res: Response): Promise<void> {
  try {
    let platformFeePercentage = 5; // Default fallback
    
    try {
      const feePercentStr = await escrowService.getPolicyValue('platform_fee_percentage');
      const parsedFee = parseFloat(feePercentStr);
      if (!isNaN(parsedFee)) {
        platformFeePercentage = parsedFee;
      }
    } catch (policyError) {
      logger.warn('Failed to fetch platform_fee_percentage, using default 5%', { policyError });
    }

    successResponse(res, {
      platformFeePercentage,
    });
  } catch (error) {
    errorResponse(res, 'CONFIG_ERROR', (error as Error).message, 500);
  }
}
