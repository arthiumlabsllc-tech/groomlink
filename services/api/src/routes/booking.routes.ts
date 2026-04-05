import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Protected routes - Customers
router.post('/', authenticateToken, requireRole(UserRole.CUSTOMER), bookingController.createBooking);
router.get('/my', authenticateToken, requireRole(UserRole.CUSTOMER), bookingController.getMyBookings);
router.get('/:id', authenticateToken, bookingController.getBookingById);
router.put('/:id/cancel', authenticateToken, bookingController.cancelBooking);
router.put('/:id/reschedule', authenticateToken, bookingController.rescheduleBooking);
router.post('/:id/rate', authenticateToken, bookingController.rateBooking);

// Protected routes - Salon Owners
router.get('/salon/:salonId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.getSalonBookings);
router.post('/:id/confirm', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.confirmBooking);
router.post('/:id/complete', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.completeBooking);

// Available slots (public)
router.get('/slots/:salonId', bookingController.getAvailableSlots);

export default router;
