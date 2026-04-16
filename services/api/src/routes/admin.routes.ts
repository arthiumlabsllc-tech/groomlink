import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as supportTicketController from '../controllers/support-ticket.controller';
import { authenticateToken, requireAdminOrHigher, requireSuperAdmin } from '../middleware/auth';

const router = Router();

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

// System Health & Metrics
router.get('/health', authenticateToken, requireAdminOrHigher, adminController.getSystemHealth);
router.get('/metrics', authenticateToken, requireAdminOrHigher, adminController.getSystemMetrics);
router.get('/bookings/stats', authenticateToken, requireAdminOrHigher, adminController.getBookingStats);
router.get('/revenue/stats', authenticateToken, requireAdminOrHigher, adminController.getRevenueStats);
router.get('/revenue/comprehensive', authenticateToken, requireAdminOrHigher, adminController.getComprehensiveRevenueStats);

// Paystack Balance
router.get('/paystack-balance', authenticateToken, requireAdminOrHigher, adminController.getPaystackBalanceHandler);

// Recent Activities
router.get('/activities', authenticateToken, requireAdminOrHigher, adminController.getRecentActivities);

// Admin management (SUPER_ADMIN only)
router.post('/admins', authenticateToken, requireSuperAdmin, adminController.createAdmin);
router.get('/admins', authenticateToken, requireAdminOrHigher, adminController.getAdmins);
router.put('/admins/:id/permissions', authenticateToken, requireSuperAdmin, adminController.updateAdminPermissions);
router.delete('/admins/:id', authenticateToken, requireSuperAdmin, adminController.deleteAdmin);

// Site settings
router.get('/settings', authenticateToken, requireAdminOrHigher, adminController.getSiteSettings);
router.put('/settings', authenticateToken, requireSuperAdmin, adminController.updateSiteSettings);
router.post('/settings/maintenance', authenticateToken, requireSuperAdmin, adminController.toggleMaintenanceMode);

// Payment settings
router.get('/payment-settings', authenticateToken, requireAdminOrHigher, adminController.getPaymentSettings);
router.put('/payment-settings', authenticateToken, requireSuperAdmin, adminController.updatePaymentSettings);

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

export default router;
