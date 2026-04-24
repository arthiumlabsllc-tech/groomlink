import { Router } from 'express';
import * as salonController from '../controllers/salon.controller';

const router = Router();

// Public endpoint for fetching salon reviews (mobile app compatibility)
// This is an alias to /salons/:id/reviews
// Note: Use :id to match the controller's req.params.id expectation
router.get('/salon/:id', salonController.getSalonReviews);

export default router;
