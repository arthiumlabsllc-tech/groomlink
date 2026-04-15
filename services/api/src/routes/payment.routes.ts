import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/initialize', authenticateToken, paymentController.initializePayment);
router.post('/verify', authenticateToken, paymentController.verifyPayment);
router.get('/history', authenticateToken, paymentController.getPaymentHistory);
router.get('/:id', authenticateToken, paymentController.getPaymentById);

// Webhook endpoints (public but should verify signature)
// Legacy mock webhook
router.post('/webhook/momo', paymentController.handleWebhook);

// Paystack webhook - uses express.raw() for signature verification
// Note: The raw body parser must be configured at the app level for this to work
router.post('/webhook/paystack', paymentController.handlePaystackWebhook);

export default router;
