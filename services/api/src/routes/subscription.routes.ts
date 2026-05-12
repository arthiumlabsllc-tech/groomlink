import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public
router.get('/plans', subscriptionController.getPlans);

// Authenticated- SALON_OWNER
router.get('/status', authenticateToken, requireRole('SALON_OWNER'), subscriptionController.getSubscriptionStatusHandler);
router.post('/subscribe', authenticateToken, requireRole('SALON_OWNER'), subscriptionController.subscribeToPlanHandler);
router.post('/cancel', authenticateToken, requireRole('SALON_OWNER'), subscriptionController.cancelSubscriptionHandler);
router.get('/invoices', authenticateToken, requireRole('SALON_OWNER'), subscriptionController.getInvoicesHandler);

// Authenticated- any role
router.get('/check-feature', authenticateToken, subscriptionController.checkFeatureHandler);

// Webhook (public)
router.post('/webhook/hubtel', subscriptionController.handleSubscriptionWebhook);

export default router;
