import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../middleware/auth';

const router = Router();

// Protected routes - Customers and Salon Owners (both can book services)
router.post('/', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.createBooking);

// Capacity check (for group bookings)
router.post('/check-capacity', authenticateToken, bookingController.checkCapacityHandler);

// QR completion (salon owner only) - must be before /:id catch-all
router.post('/complete-by-qr', authenticateToken, requireRole(UserRole.SALON_OWNER), bookingController.qrCompleteHandler);

// Check-in by QR/code (salon owner only)
router.post('/checkin-by-qr', authenticateToken, requireRole(UserRole.SALON_OWNER), bookingController.checkinByQrHandler);

// Customer auto check-in via geofence (customer only)
router.post('/auto-checkin', authenticateToken, requireRole(UserRole.CUSTOMER), bookingController.customerAutoCheckInHandler);

// Get salon queue (salon owner or admin)
router.get('/salon/:salonId/queue', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.getSalonQueueHandler);

// Specific named routes MUST come BEFORE /:id catch-all route
router.get('/my', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.getMyBookings);
router.get('/slots/:salonId', bookingController.getAvailableSlots);

// Group booking lookup
router.get('/group/:groupRef', authenticateToken, bookingController.getGroupBookingHandler);

// Guest check-in (for salon owners)
router.put('/guest/:guestId/checkin', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.checkInGuestHandler);

// Routes with :id parameter (catch-all) - must be after all specific named routes
router.get('/:id', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.getBookingById);

// Get queue position for a booking (customer only)
router.get('/:id/queue-position', authenticateToken, requireRole(UserRole.CUSTOMER), bookingController.getQueuePositionHandler);

// QR code generation (customer only)
router.get('/:id/qr-code', authenticateToken, requireRole(UserRole.CUSTOMER), bookingController.getQRCodeHandler);

// Cancellation route (POST for customer or provider)
router.post('/:id/cancel', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.cancelBooking);

// Refund preview (for customers before cancelling)
router.get('/:id/refund-preview', authenticateToken, requireRole(UserRole.CUSTOMER), bookingController.refundPreviewHandler);

// Reschedule route
router.put('/:id/reschedule', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.rescheduleBooking);

// No-show marking (provider or admin only)
router.post('/:id/no-show', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.markNoShowHandler);

// Dispute no-show (customer only)
router.post('/:id/dispute-no-show', authenticateToken, requireRole(UserRole.CUSTOMER), bookingController.disputeNoShowHandler);

// Rating route
router.post('/:id/rate', authenticateToken, requireRole(UserRole.CUSTOMER, UserRole.SALON_OWNER), bookingController.rateBooking);

// Customer confirms completion
router.post('/:id/confirm-completion', authenticateToken, requireRole(UserRole.CUSTOMER), bookingController.customerConfirmHandler);

// Raise dispute (customer only)
router.post('/:id/dispute', authenticateToken, requireRole(UserRole.CUSTOMER), bookingController.raiseDisputeHandler);

// Protected routes - Salon Owners
router.get('/salon/:salonId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.getSalonBookings);
router.post('/:id/confirm', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.confirmBooking);
router.post('/:id/complete', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), bookingController.completeBooking);

export default router;
