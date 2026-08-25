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
  PAYSTACK = 'PAYSTACK',
}

const initializePaymentSchema = z.object({
  bookingId: z.string().uuid(),
  provider: z.enum(['MTN_MOMO', 'VODAFONE_CASH', 'AIRTELTIGO_MONEY']),
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

    // Reference is required, paymentId is optional (we can find payment by reference)
    if (!reference) {
      errorResponse(res, 'MISSING_PARAMS', 'Payment reference is required', 400);
      return;
    }

    // If paymentId is not provided, find payment by reference
    let effectivePaymentId = paymentId;
    if (!effectivePaymentId) {
      const payment = await paymentService.findPaymentByReference(reference);
      if (!payment) {
        errorResponse(res, 'NOT_FOUND', 'Payment not found for this reference', 404);
        return;
      }
      effectivePaymentId = payment.id;
    }

    const result = await paymentService.verifyAndCompletePayment(effectivePaymentId, reference);

    if (result.success) {
      successResponse(res, result);
    } else if (result.status === 'PROCESSING') {
      // Payment is still being processed at the provider - return 200 with processing status
      // so the client can continue polling without treating this as an error
      successResponse(res, { 
        success: false, 
        status: 'PROCESSING', 
        message: result.message 
      });
    } else if (result.status === 'FAILED') {
      // Payment explicitly failed - return 200 with FAILED status
      // so the client can properly detect and stop polling
      successResponse(res, { 
        success: false, 
        status: 'FAILED', 
        message: result.message 
      });
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

// Hubtel webhook endpoint
// Hubtel webhooks don't use HMAC signatures - validate by checking ResponseCode
export async function handleHubtelWebhook(req: Request, res: Response): Promise<void> {
  try {
    // Get the request body
    const payload = req.body;
    
    // Hubtel webhook payload structure: { ResponseCode: "0000", Data: { ClientReference, Amount, TransactionId, ... } }
    // ResponseCode "0000" means success
    const responseCode = payload?.ResponseCode;
    const data = payload?.Data;
    
    logger.info('Hubtel webhook received', { 
      responseCode, 
      clientReference: data?.ClientReference,
      transactionId: data?.TransactionId,
      transactionStatus: data?.TransactionStatus
    });

    // Process the webhook through the payment service
    // The service handles both success and failure cases
    const result = await paymentService.handleHubtelWebhook(
      JSON.stringify(payload),
      '' // Hubtel doesn't use signature-based verification in this implementation
    );
    
    // Always return 200 to prevent Hubtel retries
    res.status(200).json({ received: true, processed: result.success });
  } catch (error) {
    // Log error but still return 200 to prevent Hubtel retries
    logger.error('Hubtel webhook error:', error);
    res.status(200).json({ received: true, processed: false });
  }
}

// Get payment configuration (public endpoint for booking flow)
export async function getPaymentConfig(req: Request, res: Response): Promise<void> {
  try {
    // Fetch flat booking fee from policy (default GHS 2)
    let platformBookingFee = 2;
    try {
      const feeStr = await escrowService.getPolicyValue('platform_booking_fee');
      const parsedFee = parseFloat(feeStr);
      if (!isNaN(parsedFee)) {
        platformBookingFee = parsedFee;
      }
    } catch (policyError) {
      logger.warn('Failed to fetch platform_booking_fee, using default GHS 2', { policyError });
    }

    // Fetch partner commission percentage (default 5%)
    let commissionPercentage = 5;
    try {
      const commStr = await escrowService.getPolicyValue('partner_commission_percentage');
      const parsedComm = parseFloat(commStr);
      if (!isNaN(parsedComm)) {
        commissionPercentage = parsedComm;
      }
    } catch (policyError) {
      logger.warn('Failed to fetch partner_commission_percentage, using default 5%', { policyError });
    }

    successResponse(res, {
      platformBookingFee,
      commissionPercentage,
    });
  } catch (error) {
    errorResponse(res, 'CONFIG_ERROR', (error as Error).message, 500);
  }
}

// Paystack webhook endpoint
export async function handlePaystackWebhook(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = JSON.stringify(req.body);
    const headers = req.headers as Record<string, string>;
    
    logger.info('Paystack webhook received', {
      event: req.body.event,
      reference: req.body.data?.reference,
    });

    // Process the webhook through the payment service
    const result = await paymentService.handlePaystackWebhook(rawBody, headers);

    // Raise a HIGH security alert if signature verification failed
    if (!result.success && /signature/i.test(result.message || '')) {
      try {
        const { recordBadWebhookSignature } = await import('../services/security-alert.service');
        recordBadWebhookSignature({ provider: 'Paystack', reason: result.message, req }).catch(() => undefined);
      } catch (_) { /* ignore */ }
    }
    
    // Always return 200 to prevent Paystack retries
    res.status(200).json({ received: true, processed: result.success });
  } catch (error) {
    // Log error but still return 200 to prevent Paystack retries
    logger.error('Paystack webhook error:', error);
    res.status(200).json({ received: true, processed: false });
  }
}

// Paystack callback endpoint (redirect after payment)
export async function handlePaystackCallback(req: AuthenticatedRequest | Request, res: Response): Promise<void> {
  try {
    const { reference, trxref } = req.query;
    
    if (!reference && !trxref) {
      // Redirect to frontend payment callback with error
      res.redirect(`${process.env.FRONTEND_URL || 'https://groomlinkgh.com'}/payment/callback?error=missing_reference`);
      return;
    }
    
    const paymentReference = (reference || trxref) as string;
    
    logger.info('Paystack callback received', { reference: paymentReference });

    // Find payment by reference
    const payment = await paymentService.findPaymentByReference(paymentReference);
    
    if (!payment) {
      res.redirect(`${process.env.FRONTEND_URL || 'https://groomlinkgh.com'}/payment/callback?error=payment_not_found&reference=${paymentReference}`);
      return;
    }

    // Verify payment with Paystack
    const result = await paymentService.verifyAndCompletePayment(payment.id, paymentReference);
    
    if (result.success) {
      // Redirect to the payment callback page with reference - the frontend will poll and show success
      const bookingRef = result.bookingReference || payment.bookingId;
      res.redirect(
        `${process.env.FRONTEND_URL || 'https://groomlinkgh.com'}/payment/callback?reference=${paymentReference}&status=success&bookingRef=${bookingRef}&amount=${result.amountPaid || 0}`
      );
    } else {
      // Redirect to payment callback with failure info
      res.redirect(
        `${process.env.FRONTEND_URL || 'https://groomlinkgh.com'}/payment/callback?reference=${paymentReference}&status=failed&error=verification_failed`
      );
    }
  } catch (error) {
    logger.error('Paystack callback error:', error);
    res.redirect(
      `${process.env.FRONTEND_URL || 'https://groomlinkgh.com'}/payment/callback?error=callback_error`
    );
  }
}
