import { Router } from 'express';
import * as adminSubscriptionController from '../controllers/admin-subscription.controller';
import { authenticateToken, requireAdminOrHigher } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';

const router = Router();

// All routes require an admin user with the 'subscriptions' page permission
// (SUPER_ADMIN bypasses the permission check in the middleware)
router.use(authenticateToken, requireAdminOrHigher, requirePermission('subscriptions'));

// Overview + lists
router.get('/overview', adminSubscriptionController.getOverviewHandler);
router.get('/recent', adminSubscriptionController.getRecentHandler);
router.get('/expiring-soon', adminSubscriptionController.getExpiringSoonHandler);
router.get('/invoices', adminSubscriptionController.getInvoicesHandler);

// Plan management
router.get('/plans', adminSubscriptionController.getPlansHandler);
router.post('/plans', adminSubscriptionController.createPlanHandler);
router.put('/plans/:planId', adminSubscriptionController.updatePlanHandler);

// Manual assignment
router.post('/assign', adminSubscriptionController.assignPlanHandler);

// Salon-scoped
router.get('/salon/:salonId/invoices', adminSubscriptionController.getSalonInvoicesHandler);
router.get('/salon/:salonId', adminSubscriptionController.getSalonSubscriptionHandler);
router.post('/salon/:salonId/extend', adminSubscriptionController.extendSubscriptionHandler);

// Paginated subscription list (kept last so specific paths win)
router.get('/', adminSubscriptionController.getSubscriptionsHandler);

export default router;
