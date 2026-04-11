import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../middleware/auth';

const router = Router();

// Protected routes - Customers and Salon Owners (both can book services)
router.post('/', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.createBooking);

// Specific named routes MUST come BEFORE /:id catch-all route
router.get('/my', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.getMyBookings);
router.get('/slots/:salonId', bookingController.getAvailableSlots);

// Routes with :id parameter (catch-all) - must be after all specific named routes
router.get('/:id', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.getBookingById);
router.put('/:id/cancel', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.cancelBooking);
router.put('/:id/reschedule', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.rescheduleBooking);
router.post('/:id/rate', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.rateBooking);

// Protected routes - Salon Owners
router.get('/salon/:salonId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.getSalonBookings);
router.post('/:id/confirm', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.confirmBooking);
router.post('/:id/complete', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.completeBooking);

export default router;
