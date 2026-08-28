import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as adminAuthController from '../controllers/admin-auth.controller';
import { authenticateToken, authenticateRegistrationToken, requireAdminOrHigher } from '../middleware/auth';
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

// Admin portal login: email + password + TOTP 2FA
router.post('/admin/login', loginBruteForceLimiter, adminAuthController.adminLogin);
router.post('/admin/2fa/verify', loginBruteForceLimiter, adminAuthController.verifyAdminTwoFactor);
router.get('/admin/2fa/status', authenticateToken, requireAdminOrHigher, adminAuthController.twoFactorStatus);
router.post('/admin/2fa/setup', authenticateToken, requireAdminOrHigher, adminAuthController.setupTwoFactor);
router.post('/admin/2fa/enable', authenticateToken, requireAdminOrHigher, adminAuthController.enableTwoFactor);
router.post('/admin/2fa/disable', authenticateToken, requireAdminOrHigher, adminAuthController.disableTwoFactor);
router.post('/admin/change-password', authenticateToken, requireAdminOrHigher, adminAuthController.changePassword);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);

export default router;
