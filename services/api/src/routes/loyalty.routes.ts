import { Router } from 'express';
import * as loyaltyController from '../controllers/loyalty.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All loyalty routes require authentication
router.get('/', authenticateToken, loyaltyController.getLoyaltyAccount);
router.get('/transactions', authenticateToken, loyaltyController.getLoyaltyTransactions);
router.post('/redeem', authenticateToken, loyaltyController.redeemPoints);

export default router;
