import { Router } from 'express';
import * as queueController from '../controllers/queue.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../middleware/auth';

const router = Router();

// Public routes - no authentication required
router.get('/salon/:salonId', queueController.getQueueStatus);

// Protected routes - require authentication
router.post('/join', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), queueController.joinQueue);

// Specific named routes MUST come BEFORE /:id catch-all route
router.get('/my-position/:salonId', authenticateToken, queueController.getMyPosition);

// Routes with :id parameter (catch-all) - must be after all specific named routes
router.delete('/:id/leave', authenticateToken, queueController.leaveQueue);

// Salon owner only routes
router.post('/:id/call-next', authenticateToken, requireRole(UserRole.SALON_OWNER), queueController.callNext);
router.post('/:id/start', authenticateToken, requireRole(UserRole.SALON_OWNER), queueController.startService);
router.post('/:id/complete', authenticateToken, requireRole(UserRole.SALON_OWNER), queueController.completeService);
router.post('/:id/skip', authenticateToken, requireRole(UserRole.SALON_OWNER), queueController.skipCustomer);

export default router;
