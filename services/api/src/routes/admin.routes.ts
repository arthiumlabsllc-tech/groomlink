import { Router } from 'express';
import multer from 'multer';
import * as adminController from '../controllers/admin.controller';
import * as supportTicketController from '../controllers/support-ticket.controller';
import * as sponsorshipController from '../controllers/sponsorship.controller';
import * as securityController from '../controllers/security.controller';
import { authenticateToken, requireAdminOrHigher, requireSuperAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { salonStorage } from '../config/cloudinary';

const router = Router();

// Multer config for site logo uploads (using Cloudinary)
const uploadSiteLogo = multer({ storage: salonStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// Public endpoint (NO AUTH) - must be before authenticated routes
router.get('/public-settings', adminController.getPublicSiteSettings);

// Salon Approval (requires 'salons' permission)
router.get('/salons/pending', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.getPendingSalons);
router.post('/salons/:id/approve', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.approveSalon);
router.post('/salons/:id/reject', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.rejectSalon);
router.post('/salons/:id/suspend', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.suspendSalon);
router.post('/salons/:id/reactivate', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.reactivateSalon);
router.post('/salons/:id/feature', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.toggleFeaturedSalon);

// Coupon Management
router.get('/coupons', authenticateToken, requireAdminOrHigher, adminController.getCoupons);
router.post('/coupons', authenticateToken, requireAdminOrHigher, adminController.createCoupon);
router.put('/coupons/:id', authenticateToken, requireAdminOrHigher, adminController.updateCoupon);
router.delete('/coupons/:id', authenticateToken, requireAdminOrHigher, adminController.deleteCoupon);

// Transactions & Disputes (requires 'transactions' permission)
router.get('/transactions', authenticateToken, requireAdminOrHigher, requirePermission('transactions'), adminController.getTransactions);
router.get('/transactions/:id', authenticateToken, requireAdminOrHigher, requirePermission('transactions'), adminController.getTransactionDetails);
router.post('/transactions/:id/refund', authenticateToken, requireAdminOrHigher, requirePermission('transactions'), adminController.refundTransaction);

// Payment Sync with Hubtel
router.post('/payments/:paymentId/sync', authenticateToken, requireAdminOrHigher, adminController.syncPaymentStatus);
router.post('/payments/sync-all', authenticateToken, requireAdminOrHigher, adminController.syncAllProcessingPayments);

// System Health & Metrics (requires 'dashboard' permission)
router.get('/health', authenticateToken, requireAdminOrHigher, requirePermission('dashboard'), adminController.getSystemHealth);
router.get('/metrics', authenticateToken, requireAdminOrHigher, requirePermission('dashboard'), adminController.getSystemMetrics);
router.get('/bookings/stats', authenticateToken, requireAdminOrHigher, requirePermission('dashboard'), adminController.getBookingStats);
router.get('/revenue/stats', authenticateToken, requireAdminOrHigher, requirePermission('dashboard'), adminController.getRevenueStats);
router.get('/revenue/comprehensive', authenticateToken, requireAdminOrHigher, requirePermission('dashboard'), adminController.getComprehensiveRevenueStats);

// Payment Gateway Balance (gateway-aware: Paystack or Hubtel based on active gateway)
router.get('/gateway-balance', authenticateToken, requireAdminOrHigher, adminController.getGatewayBalanceHandler);
// Legacy Hubtel-specific balance endpoint (kept for back-compat with older admin builds)
router.get('/hubtel-balance', authenticateToken, requireAdminOrHigher, adminController.getHubtelBalanceHandler);

// Recent Activities (requires 'dashboard' permission)
router.get('/activities', authenticateToken, requireAdminOrHigher, requirePermission('dashboard'), adminController.getRecentActivities);

// Admin management (requires 'admins' permission - SUPER_ADMIN only in controller)
router.post('/admins', authenticateToken, requireAdminOrHigher, requirePermission('admins'), adminController.createAdmin);
router.get('/admins', authenticateToken, requireAdminOrHigher, requirePermission('admins'), adminController.getAdmins);
router.put('/admins/:id/permissions', authenticateToken, requireAdminOrHigher, requirePermission('admins'), adminController.updateAdminPermissions);
router.delete('/admins/:id', authenticateToken, requireAdminOrHigher, requirePermission('admins'), adminController.deleteAdmin);

// Site settings (requires 'settings' permission)
router.get('/settings', authenticateToken, requireAdminOrHigher, requirePermission('settings'), adminController.getSiteSettings);
router.put('/settings', authenticateToken, requireAdminOrHigher, requirePermission('settings'), adminController.updateSiteSettings);
router.post('/settings/maintenance', authenticateToken, requireAdminOrHigher, requirePermission('settings'), adminController.toggleMaintenanceMode);

// Site logo uploads (requires 'settings' permission)
router.post('/settings/upload-header-logo', authenticateToken, requireAdminOrHigher, requirePermission('settings'), uploadSiteLogo.single('logo'), adminController.uploadHeaderLogo);
router.post('/settings/upload-footer-logo', authenticateToken, requireAdminOrHigher, requirePermission('settings'), uploadSiteLogo.single('logo'), adminController.uploadFooterLogo);

// Payment settings (requires 'settings' permission)
router.get('/payment-settings', authenticateToken, requireAdminOrHigher, requirePermission('settings'), adminController.getPaymentSettings);
router.put('/payment-settings', authenticateToken, requireAdminOrHigher, requirePermission('settings'), adminController.updatePaymentSettings);
router.post('/payment-settings/test-connection', authenticateToken, requireAdminOrHigher, requirePermission('settings'), adminController.testPaymentConnection);
router.get('/payment-settings/status', authenticateToken, requireAdminOrHigher, requirePermission('settings'), adminController.getPaymentProviderStatus);

// App version settings (requires 'settings' permission)
router.get('/app-version-settings', authenticateToken, requireAdminOrHigher, requirePermission('settings'), adminController.getAppVersionSettings);
router.put('/app-version-settings', authenticateToken, requireAdminOrHigher, requirePermission('settings'), adminController.updateAppVersionSettings);

// User activity & security (requires 'users' permission)
router.get('/users/:id/activities', authenticateToken, requireAdminOrHigher, requirePermission('users'), adminController.getUserActivities);
router.get('/suspicious-activities', authenticateToken, requireAdminOrHigher, requirePermission('security'), adminController.getSuspiciousUsers);
router.post('/users/:id/ban', authenticateToken, requireAdminOrHigher, requirePermission('users'), adminController.banUser);
router.post('/users/:id/unban', authenticateToken, requireAdminOrHigher, requirePermission('users'), adminController.unbanUser);

// Salon management (requires 'salons' permission)
router.post('/salons', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.adminCreateSalon);
router.get('/salons/:id', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.adminGetSalonDetails);
router.get('/salons', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.adminGetAllSalons);

// Customer management (requires 'users' permission)  
router.post('/customers', authenticateToken, requireAdminOrHigher, requirePermission('users'), adminController.adminCreateCustomer);
router.get('/users/:id', authenticateToken, requireAdminOrHigher, requirePermission('users'), adminController.adminGetUserDetails);

// Support Tickets (requires 'support' permission)
router.get('/support/tickets', authenticateToken, requireAdminOrHigher, requirePermission('support'), supportTicketController.getAllTickets);
router.get('/support/tickets/:id', authenticateToken, requireAdminOrHigher, requirePermission('support'), supportTicketController.getTicketById);
router.put('/support/tickets/:id/status', authenticateToken, requireAdminOrHigher, requirePermission('support'), supportTicketController.updateTicketStatus);
router.post('/support/tickets/:id/messages', authenticateToken, requireAdminOrHigher, requirePermission('support'), supportTicketController.sendTicketMessage);
router.get('/support/tickets/:id/messages', authenticateToken, requireAdminOrHigher, requirePermission('support'), supportTicketController.getTicketMessages);
router.put('/support/tickets/:id/assign', authenticateToken, requireAdminOrHigher, requirePermission('support'), supportTicketController.assignTicket);

// Escrow Management (requires 'escrow' permission)
router.get('/escrow', authenticateToken, requireAdminOrHigher, requirePermission('escrow'), adminController.getEscrowDashboardHandler);

// Platform Policies (requires 'policies' permission)
router.get('/policies', authenticateToken, requireAdminOrHigher, requirePermission('policies'), adminController.getPoliciesHandler);
router.put('/policies/:id', authenticateToken, requireAdminOrHigher, requirePermission('policies'), adminController.updatePolicyHandler);

// Cancellation Records (requires 'cancellations' permission)
router.get('/cancellations', authenticateToken, requireAdminOrHigher, requirePermission('cancellations'), adminController.getCancellationsHandler);

// No-Show Records (requires 'no-shows' permission)
router.get('/no-shows', authenticateToken, requireAdminOrHigher, requirePermission('no-shows'), adminController.getNoShowsHandler);
router.put('/no-shows/:id/resolve', authenticateToken, requireAdminOrHigher, requirePermission('no-shows'), adminController.resolveDisputeHandler);

// Salon Reviews (requires 'salons' permission)
router.get('/reviews', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.getAllReviewsHandler);
router.delete('/reviews/:id', authenticateToken, requireAdminOrHigher, requirePermission('salons'), adminController.deleteReviewHandler);

// Completion Dispute Resolution (requires 'escrow' permission)
router.put('/disputes/:id/resolve', authenticateToken, requireAdminOrHigher, requirePermission('escrow'), adminController.resolveCompletionDisputeHandler);

// Sponsored Salons Management (requires 'sponsored-salons' permission)
router.post('/sponsored-salons', authenticateToken, requireAdminOrHigher, requirePermission('sponsored-salons'), sponsorshipController.addSponsoredSalon);
router.delete('/sponsored-salons/:id', authenticateToken, requireAdminOrHigher, requirePermission('sponsored-salons'), sponsorshipController.removeSponsoredSalon);
router.get('/sponsored-salons', authenticateToken, requireAdminOrHigher, requirePermission('sponsored-salons'), sponsorshipController.getSponsoredSalons);
router.get('/sponsorship-packages', authenticateToken, requireAdminOrHigher, requirePermission('sponsored-salons'), sponsorshipController.getPackages);

// Security events (requires 'security' permission)
router.get('/security/events', authenticateToken, requireAdminOrHigher, requirePermission('security'), securityController.listEvents);
router.get('/security/stats', authenticateToken, requireAdminOrHigher, requirePermission('security'), securityController.getStats);
router.patch('/security/events/:id/resolve', authenticateToken, requireAdminOrHigher, requirePermission('security'), securityController.resolveEvent);
router.patch('/security/events/:id/reopen', authenticateToken, requireAdminOrHigher, requirePermission('security'), securityController.reopenEvent);

export default router;
