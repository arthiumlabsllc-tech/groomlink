import { Router } from 'express';
import * as salonController from '../controllers/salon.controller';

const router = Router();

// Public endpoint for fetching salon reviews (mobile app compatibility)
// This is an alias to /salons/:id/reviews
router.get('/salon/:salonId', salonController.getSalonReviews);

export default router;
