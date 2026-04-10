import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticateToken, requireAdminOrHigher } from '../middleware/auth';

const router = Router();

// Salon Approval
router.get('/salons/pending', authenticateToken, requireAdminOrHigher, adminController.getPendingSalons);
router.post('/salons/:id/approve', authenticateToken, requireAdminOrHigher, adminController.approveSalon);
router.post('/salons/:id/reject', authenticateToken, requireAdminOrHigher, adminController.rejectSalon);

// Coupon Management
router.get('/coupons', authenticateToken, requireAdminOrHigher, adminController.getCoupons);
router.post('/coupons', authenticateToken, requireAdminOrHigher, adminController.createCoupon);
router.put('/coupons/:id', authenticateToken, requireAdminOrHigher, adminController.updateCoupon);
router.delete('/coupons/:id', authenticateToken, requireAdminOrHigher, adminController.deleteCoupon);

// Transactions & Disputes
router.get('/transactions', authenticateToken, requireAdminOrHigher, adminController.getTransactions);
router.get('/transactions/:id', authenticateToken, requireAdminOrHigher, adminController.getTransactionDetails);
router.post('/transactions/:id/refund', authenticateToken, requireAdminOrHigher, adminController.refundTransaction);

// System Health & Metrics
router.get('/health', authenticateToken, requireAdminOrHigher, adminController.getSystemHealth);
router.get('/metrics', authenticateToken, requireAdminOrHigher, adminController.getSystemMetrics);

export default router;
