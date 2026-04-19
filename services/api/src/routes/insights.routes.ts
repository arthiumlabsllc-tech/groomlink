import { Router } from 'express';
import * as insightsController from '../controllers/insights.controller';
import { authenticateToken, requireRole, UserRole } from '../middleware/auth';
import { requireFeature } from '../middleware/subscription';

const router = Router();

// All routes require authentication and salon owner role
// All insights routes require the advanced_analytics feature (Pro/Premium)
router.use(authenticateToken);
router.use(requireRole(UserRole.SALON_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN));
router.use(requireFeature('advanced_analytics'));

// Peak hours analytics
router.get('/peak-hours', insightsController.getPeakHours);

// Pricing insights - compare with city average
router.get('/pricing', insightsController.getPricingInsights);

// Staff performance metrics
router.get('/staff-performance', insightsController.getStaffPerformance);

// Loyalty metrics - repeat customers, at-risk customers
router.get('/loyalty-metrics', insightsController.getLoyaltyMetrics);

// Revenue aggregated by period (daily, weekly, monthly)
router.get('/revenue', insightsController.getRevenue);

export default router;
