import { Router } from 'express';
import * as sponsorshipController from '../controllers/sponsorship.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Authenticated - SALON_OWNER (self-service sponsorship checkout)
router.get('/packages', authenticateToken, requireRole('SALON_OWNER'), sponsorshipController.getPackagesHandler);
router.get('/status', authenticateToken, requireRole('SALON_OWNER'), sponsorshipController.getSponsorshipStatusHandler);
router.post('/purchase', authenticateToken, requireRole('SALON_OWNER'), sponsorshipController.purchaseSponsorshipHandler);
router.post('/resume-payment', authenticateToken, requireRole('SALON_OWNER'), sponsorshipController.resumePaymentHandler);

// Webhook (public)
router.post('/webhook/hubtel', sponsorshipController.handleSponsorshipWebhook);

export default router;
