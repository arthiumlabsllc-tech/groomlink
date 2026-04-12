import { Router } from 'express';
import * as salonOwnerController from '../controllers/salon-owner.controller';
import { authenticateToken, requireRole, UserRole } from '../middleware/auth';

const router = Router();

// Staff Management
router.get('/:salonId/staff', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.getStaff);
router.post('/:salonId/staff', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.addStaff);
router.put('/:salonId/staff/:staffId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.updateStaff);
router.delete('/:salonId/staff/:staffId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.removeStaff);

// Service Management
router.get('/:salonId/services', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.getServices);
router.post('/:salonId/services', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.addService);
router.put('/:salonId/services/:serviceId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.updateService);
router.delete('/:salonId/services/:serviceId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.removeService);

// Staff Service Pricing
router.post('/:salonId/staff/:staffId/services', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.setStaffServicePrice);
router.delete('/:salonId/staff/:staffId/services/:serviceId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.removeStaffService);

// Availability Management
router.get('/:salonId/staff/:staffId/availability', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.getStaffAvailability);
router.post('/:salonId/staff/:staffId/availability', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.setStaffAvailability);
router.put('/:salonId/staff/:staffId/availability/:availabilityId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.updateStaffAvailability);
router.delete('/:salonId/staff/:staffId/availability/:availabilityId', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.deleteStaffAvailability);

// Today's Appointments
router.get('/:salonId/today', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.getTodayAppointments);
router.put('/:salonId/bookings/:bookingId/status', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.updateBookingStatus);

// Analytics & Earnings
router.get('/:salonId/dashboard-stats', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.getDashboardStats);
router.get('/:salonId/analytics', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.getAnalytics);
router.get('/:salonId/earnings', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.getEarnings);

// Reviews Management
router.get('/:salonId/reviews', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.getSalonReviews);
router.post('/:salonId/reviews/:reviewId/reply', authenticateToken, requireRole(UserRole.SALON_OWNER, UserRole.ADMIN), salonOwnerController.replyToReview);

export default router;
