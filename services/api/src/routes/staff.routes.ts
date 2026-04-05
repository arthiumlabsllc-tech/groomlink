import { Router } from 'express';
import * as staffController from '../controllers/staff.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/:id', staffController.getStaffProfile);
router.get('/:id/availability', staffController.getStaffAvailability);
router.get('/:id/reviews', staffController.getStaffReviews);

export default router;
