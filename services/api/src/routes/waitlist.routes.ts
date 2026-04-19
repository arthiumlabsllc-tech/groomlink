import { Router } from 'express';
import * as waitlistController from '../controllers/waitlist.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.post('/join', authenticateToken, waitlistController.joinWaitlist);
router.get('/my', authenticateToken, waitlistController.getMyWaitlist);
router.delete('/:id', authenticateToken, waitlistController.leaveWaitlist);

export default router;
