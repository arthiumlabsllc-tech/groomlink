import { Router } from 'express';
import * as discoveryController from '../controllers/discovery.controller';
import { authenticateToken, requireRole, UserRole } from '../middleware/auth';

const router = Router();

// Public routes (no auth required)
router.get('/new-salons', discoveryController.getNewSalons);
router.get('/by-city/:city', discoveryController.getSalonsByCity);
router.get('/cities', discoveryController.getCities);
router.get('/bookings-today', discoveryController.getBookingsToday);
router.get('/branded-page/:slug', discoveryController.getBrandedPage);

// Protected routes (auth required, salon owner only)
router.get('/branded-page/my', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), discoveryController.getMyBrandedPage);
router.put('/branded-page', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), discoveryController.updateBrandedPage);

export default router;
