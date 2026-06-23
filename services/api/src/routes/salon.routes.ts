import { Router } from 'express';
import * as salonController from '../controllers/salon.controller';
import * as payoutController from '../controllers/payout.controller';
import * as userController from '../controllers/user.controller';
import { authenticateToken, requireRole, UserRole } from '../middleware/auth';
import { salonValidations } from '../middleware/validation';

const router = Router();

// Public routes with validation
router.get('/', salonValidations.searchSalons, salonController.getSalons);
router.get('/nearby', salonValidations.searchSalons, salonController.getNearbySalons);
router.get('/recommended', authenticateToken, userController.getRecommendedSalons);
router.get('/map', salonController.getSalonsForMap);  // Public endpoint, no auth needed
router.get('/:id', salonController.getSalonById);
router.get('/:id/staff', salonController.getSalonStaff);
router.get('/:id/services', salonController.getSalonServices);
router.get('/:id/reviews', salonController.getSalonReviews);  // Public endpoint for reviews

// Protected routes - Salon Owners with validation
router.post('/', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonValidations.createSalon, salonController.createSalon);
router.put('/:id', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonValidations.updateSalon, salonController.updateSalon);
router.get('/my/list', authenticateToken, requireRole(UserRole.SALON_OWNER), salonController.getMySalons);
router.get('/:id/stats', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonController.getSalonStats);

// Admin routes
router.get('/admin/pending', authenticateToken, requireRole(UserRole.ADMIN), salonController.getPendingSalons);
router.post('/:id/approve', authenticateToken, requireRole(UserRole.ADMIN), salonController.approveSalon);
router.post('/:id/reject', authenticateToken, requireRole(UserRole.ADMIN), salonController.rejectSalon);

// Completion settings (salon owner only)
router.get('/:id/completion-settings', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonController.getCompletionSettings);
router.put('/:id/completion-settings', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonController.updateCompletionSettings);

// Payout account settings (salon owner only)
router.get('/:id/payout-account', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), payoutController.getPayoutAccount);
router.post('/:id/payout-account', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), payoutController.setupPayoutAccount);
router.get('/:id/payout-balance', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), payoutController.getPayoutBalance);
router.post('/:id/request-payout', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), payoutController.requestPayout);
router.get('/:id/payout-history', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), payoutController.getPayoutHistory);

// Payout reference data (public)
router.get('/payouts/banks', payoutController.getSupportedBanks);
router.get('/payouts/momo-providers', payoutController.getSupportedMomoProviders);

export default router;
