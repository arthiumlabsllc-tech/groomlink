import { Router } from 'express';
import multer from 'multer';
import * as adminController from '../controllers/admin.controller';
import * as supportTicketController from '../controllers/support-ticket.controller';
import * as sponsorshipController from '../controllers/sponsorship.controller';
import * as securityController from '../controllers/security.controller';
import { authenticateToken, requireAdminOrHigher, requireSuperAdmin } from '../middleware/auth';
import { salonStorage } from '../config/cloudinary';

const router = Router();

// Multer config for site logo uploads (using Cloudinary)
const uploadSiteLogo = multer({ storage: salonStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// Public endpoint (NO AUTH) - must be before authenticated routes
router.get('/public-settings', adminController.getPublicSiteSettings);

// Salon Approval
router.get('/salons/pending', authenticateToken, requireAdminOrHigher, adminController.getPendingSalons);
router.post('/salons/:id/approve', authenticateToken, requireAdminOrHigher, adminController.approveSalon);
router.post('/salons/:id/reject', authenticateToken, requireAdminOrHigher, adminController.rejectSalon);
router.post('/salons/:id/suspend', authenticateToken, requireAdminOrHigher, adminController.suspendSalon);
router.post('/salons/:id/reactivate', authenticateToken, requireAdminOrHigher, adminController.reactivateSalon);

// Coupon Management
router.get('/coupons', authenticateToken, requireAdminOrHigher, adminController.getCoupons);
router.post('/coupons', authenticateToken, requireAdminOrHigher, adminController.createCoupon);
router.put('/coupons/:id', authenticateToken, requireAdminOrHigher, adminController.updateCoupon);
router.delete('/coupons/:id', authenticateToken, requireAdminOrHigher, adminController.deleteCoupon);

// Transactions & Disputes
router.get('/transactions', authenticateToken, requireAdminOrHigher, adminController.getTransactions);
router.get('/transactions/:id', authenticateToken, requireAdminOrHigher, adminController.getTransactionDetails);
router.post('/transactions/:id/refund', authenticateToken, requireAdminOrHigher, adminController.refundTransaction);

// Payment Sync with Hubtel
router.post('/payments/:paymentId/sync', authenticateToken, requireAdminOrHigher, adminController.syncPaymentStatus);
router.post('/payments/sync-all', authenticateToken, requireAdminOrHigher, adminController.syncAllProcessingPayments);

// System Health & Metrics
router.get('/health', authenticateToken, requireAdminOrHigher, adminController.getSystemHealth);
router.get('/metrics', authenticateToken, requireAdminOrHigher, adminController.getSystemMetrics);
router.get('/bookings/stats', authenticateToken, requireAdminOrHigher, adminController.getBookingStats);
router.get('/revenue/stats', authenticateToken, requireAdminOrHigher, adminController.getRevenueStats);
router.get('/revenue/comprehensive', authenticateToken, requireAdminOrHigher, adminController.getComprehensiveRevenueStats);

// Hubtel Balance
router.get('/hubtel-balance', authenticateToken, requireAdminOrHigher, adminController.getHubtelBalanceHandler);

// Recent Activities
router.get('/activities', authenticateToken, requireAdminOrHigher, adminController.getRecentActivities);

// Admin management (ADMIN or SUPER_ADMIN can access, but SUPER_ADMIN protection is in controllers)
router.post('/admins', authenticateToken, requireAdminOrHigher, adminController.createAdmin);
router.get('/admins', authenticateToken, requireAdminOrHigher, adminController.getAdmins);
router.put('/admins/:id/permissions', authenticateToken, requireAdminOrHigher, adminController.updateAdminPermissions);
router.delete('/admins/:id', authenticateToken, requireAdminOrHigher, adminController.deleteAdmin);

// Site settings
router.get('/settings', authenticateToken, requireAdminOrHigher, adminController.getSiteSettings);
router.put('/settings', authenticateToken, requireAdminOrHigher, adminController.updateSiteSettings);
router.post('/settings/maintenance', authenticateToken, requireAdminOrHigher, adminController.toggleMaintenanceMode);

// Site logo uploads
router.post('/settings/upload-header-logo', authenticateToken, requireAdminOrHigher, uploadSiteLogo.single('logo'), adminController.uploadHeaderLogo);
router.post('/settings/upload-footer-logo', authenticateToken, requireAdminOrHigher, uploadSiteLogo.single('logo'), adminController.uploadFooterLogo);

// Payment settings
router.get('/payment-settings', authenticateToken, requireAdminOrHigher, adminController.getPaymentSettings);
router.put('/payment-settings', authenticateToken, requireAdminOrHigher, adminController.updatePaymentSettings);
router.post('/payment-settings/test-connection', authenticateToken, requireAdminOrHigher, adminController.testPaymentConnection);
router.get('/payment-settings/status', authenticateToken, requireAdminOrHigher, adminController.getPaymentProviderStatus);

// User activity & security
router.get('/users/:id/activities', authenticateToken, requireAdminOrHigher, adminController.getUserActivities);
router.get('/suspicious-activities', authenticateToken, requireAdminOrHigher, adminController.getSuspiciousUsers);
router.post('/users/:id/ban', authenticateToken, requireAdminOrHigher, adminController.banUser);
router.post('/users/:id/unban', authenticateToken, requireAdminOrHigher, adminController.unbanUser);

// Salon management
router.post('/salons', authenticateToken, requireAdminOrHigher, adminController.adminCreateSalon);
router.get('/salons/:id', authenticateToken, requireAdminOrHigher, adminController.adminGetSalonDetails);
router.get('/salons', authenticateToken, requireAdminOrHigher, adminController.adminGetAllSalons);

// Customer management  
router.post('/customers', authenticateToken, requireAdminOrHigher, adminController.adminCreateCustomer);
router.get('/users/:id', authenticateToken, requireAdminOrHigher, adminController.adminGetUserDetails);

// Support Tickets
router.get('/support/tickets', authenticateToken, requireAdminOrHigher, supportTicketController.getAllTickets);
router.get('/support/tickets/:id', authenticateToken, requireAdminOrHigher, supportTicketController.getTicketById);
router.put('/support/tickets/:id/status', authenticateToken, requireAdminOrHigher, supportTicketController.updateTicketStatus);
router.post('/support/tickets/:id/messages', authenticateToken, requireAdminOrHigher, supportTicketController.sendTicketMessage);
router.get('/support/tickets/:id/messages', authenticateToken, requireAdminOrHigher, supportTicketController.getTicketMessages);
router.put('/support/tickets/:id/assign', authenticateToken, requireAdminOrHigher, supportTicketController.assignTicket);

// Escrow Management
router.get('/escrow', authenticateToken, requireAdminOrHigher, adminController.getEscrowDashboardHandler);

// Platform Policies
router.get('/policies', authenticateToken, requireAdminOrHigher, adminController.getPoliciesHandler);
router.put('/policies/:id', authenticateToken, requireAdminOrHigher, adminController.updatePolicyHandler);

// Cancellation Records
router.get('/cancellations', authenticateToken, requireAdminOrHigher, adminController.getCancellationsHandler);

// No-Show Records
router.get('/no-shows', authenticateToken, requireAdminOrHigher, adminController.getNoShowsHandler);
router.put('/no-shows/:id/resolve', authenticateToken, requireAdminOrHigher, adminController.resolveDisputeHandler);

// Completion Dispute Resolution
router.put('/disputes/:id/resolve', authenticateToken, requireAdminOrHigher, adminController.resolveCompletionDisputeHandler);

// Sponsored Salons Management
router.post('/sponsored-salons', authenticateToken, requireAdminOrHigher, sponsorshipController.addSponsoredSalon);
router.delete('/sponsored-salons/:id', authenticateToken, requireAdminOrHigher, sponsorshipController.removeSponsoredSalon);
router.get('/sponsored-salons', authenticateToken, requireAdminOrHigher, sponsorshipController.getSponsoredSalons);
router.get('/sponsorship-packages', authenticateToken, requireAdminOrHigher, sponsorshipController.getPackages);

// Security events (platform "security bot" dashboard)
router.get('/security/events', authenticateToken, requireAdminOrHigher, securityController.listEvents);
router.get('/security/stats', authenticateToken, requireAdminOrHigher, securityController.getStats);
router.patch('/security/events/:id/resolve', authenticateToken, requireAdminOrHigher, securityController.resolveEvent);
router.patch('/security/events/:id/reopen', authenticateToken, requireAdminOrHigher, securityController.reopenEvent);

export default router;
