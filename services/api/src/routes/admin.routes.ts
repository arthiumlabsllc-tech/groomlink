import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Salon Approval
router.get('/salons/pending', authenticateToken, requireRole(UserRole.ADMIN), adminController.getPendingSalons);
router.post('/salons/:id/approve', authenticateToken, requireRole(UserRole.ADMIN), adminController.approveSalon);
router.post('/salons/:id/reject', authenticateToken, requireRole(UserRole.ADMIN), adminController.rejectSalon);

// Coupon Management
router.get('/coupons', authenticateToken, requireRole(UserRole.ADMIN), adminController.getCoupons);
router.post('/coupons', authenticateToken, requireRole(UserRole.ADMIN), adminController.createCoupon);
router.put('/coupons/:id', authenticateToken, requireRole(UserRole.ADMIN), adminController.updateCoupon);
router.delete('/coupons/:id', authenticateToken, requireRole(UserRole.ADMIN), adminController.deleteCoupon);

// Transactions & Disputes
router.get('/transactions', authenticateToken, requireRole(UserRole.ADMIN), adminController.getTransactions);
router.get('/transactions/:id', authenticateToken, requireRole(UserRole.ADMIN), adminController.getTransactionDetails);
router.post('/transactions/:id/refund', authenticateToken, requireRole(UserRole.ADMIN), adminController.refundTransaction);

// System Health & Metrics
router.get('/health', authenticateToken, requireRole(UserRole.ADMIN), adminController.getSystemHealth);
router.get('/metrics', authenticateToken, requireRole(UserRole.ADMIN), adminController.getSystemMetrics);

export default router;
