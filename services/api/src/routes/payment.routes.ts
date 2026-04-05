import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/initiate', authenticateToken, paymentController.initializePayment);
router.post('/verify', authenticateToken, paymentController.verifyPayment);
router.get('/history', authenticateToken, paymentController.getPaymentHistory);
router.get('/:id', authenticateToken, paymentController.getPaymentById);

// Webhook (public but should verify signature)
router.post('/webhook/momo', paymentController.handleWebhook);

export default router;
