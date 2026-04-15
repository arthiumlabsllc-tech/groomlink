import { Router } from 'express';
import * as salonController from '../controllers/salon.controller';
import { authenticateToken, requireRole, UserRole } from '../middleware/auth';
import { salonValidations } from '../middleware/validation';

const router = Router();

// Public routes with validation
router.get('/', salonValidations.searchSalons, salonController.getSalons);
router.get('/nearby', salonValidations.searchSalons, salonController.getNearbySalons);
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

export default router;
