import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../middleware/auth';

const router = Router();

// Protected routes - Users
router.get('/', authenticateToken, notificationController.getNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.put('/:id/read', authenticateToken, notificationController.markAsRead);
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);

// Admin only
router.post('/send', authenticateToken, requireRole(UserRole.ADMIN), notificationController.sendNotification);

export default router;
