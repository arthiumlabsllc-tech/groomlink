import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateToken, authenticateRegistrationToken } from '../middleware/auth';
import { authValidations } from '../middleware/validation';
import { loginBruteForceLimiter } from '../middleware/brute-force.middleware';

const router = Router();

// Public routes with validation
router.post('/otp/request', authValidations.requestOTP, authController.requestOTP);
router.post('/otp/verify', authValidations.verifyOTP, authController.verifyOTP);
router.post('/otp/email/request', authController.requestEmailOTP);
router.post('/otp/email/verify', authController.verifyEmailOTP);
router.post('/complete-registration', authenticateRegistrationToken, authController.completeRegistration);
router.post('/login', loginBruteForceLimiter, authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);

export default router;
