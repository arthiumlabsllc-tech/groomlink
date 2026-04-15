import { Router, Router as RouterType } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import salonRoutes from './salon.routes';
import salonOwnerRoutes from './salon-owner.routes';
import staffRoutes from './staff.routes';
import bookingRoutes from './booking.routes';
import paymentRoutes from './payment.routes';
import notificationRoutes from './notification.routes';
import adminRoutes from './admin.routes';
import supportRoutes from './support.routes';
import uploadRoutes from './upload.routes';
import impersonationRoutes from './impersonation.routes';
import queueRoutes from './queue.routes';
import kycRoutes from './kyc.routes';
import reviewRoutes from './review.routes';

const router: RouterType = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/salons', salonRoutes);
router.use('/salon-owner', salonOwnerRoutes);
router.use('/staff', staffRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/support', supportRoutes);
router.use('/uploads', uploadRoutes);
router.use('/impersonation', impersonationRoutes);
router.use('/queue', queueRoutes);
router.use('/kyc', kycRoutes);
router.use('/reviews', reviewRoutes);

export default router;
