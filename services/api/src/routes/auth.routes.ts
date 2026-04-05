import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';
import { authValidations } from '../middleware/validation';

const router = Router();

// Public routes with validation
router.post('/otp/request', authValidations.requestOTP, authController.requestOTP);
router.post('/otp/verify', authValidations.verifyOTP, authController.verifyOTP);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);

export default router;
