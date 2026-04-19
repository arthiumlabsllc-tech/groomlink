import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes (no auth required)
router.get('/config', paymentController.getPaymentConfig);

// Protected routes
router.post('/initialize', authenticateToken, paymentController.initializePayment);
router.post('/verify', authenticateToken, paymentController.verifyPayment);
router.get('/history', authenticateToken, paymentController.getPaymentHistory);
router.get('/:id', authenticateToken, paymentController.getPaymentById);

// Webhook endpoints (public - no auth required)
// Legacy mock webhook
router.post('/webhook/momo', paymentController.handleWebhook);

// Hubtel webhook - handles mobile money payment callbacks
// Hubtel uses ResponseCode validation instead of HMAC signatures
router.post('/webhook/hubtel', paymentController.handleHubtelWebhook);

// Paystack webhook - handles Paystack payment events
router.post('/webhook/paystack', paymentController.handlePaystackWebhook);

// Paystack callback - handles redirect after payment
router.post('/callback/paystack', paymentController.handlePaystackCallback);
router.get('/callback/paystack', paymentController.handlePaystackCallback);

export default router;
