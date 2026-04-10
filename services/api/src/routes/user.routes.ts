import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateToken, requireRole, requireAdminOrHigher } from '../middleware/auth';
import { UserRole } from '../middleware/auth';

const router = Router();

// Protected routes
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.put('/location', authenticateToken, userController.updateLocation);

// Favorites - Salons
router.get('/favorites', authenticateToken, userController.getFavorites);
router.post('/favorites', authenticateToken, userController.addFavorite);
router.delete('/favorites/:id', authenticateToken, userController.removeFavorite);

// Favorites - Staff
router.post('/favorites/staff', authenticateToken, userController.addFavoriteStaff);
router.delete('/favorites/staff/:staffId', authenticateToken, userController.removeFavoriteStaff);

// Bookings
router.get('/bookings', authenticateToken, userController.getUserBookings);

// GDPR/Ghana DPA - Data deletion
router.delete('/account', authenticateToken, userController.deleteAccount);
router.post('/export-data', authenticateToken, userController.exportUserData);

// Admin routes
router.get('/', authenticateToken, requireAdminOrHigher, userController.getAllUsers);
router.put('/:id/status', authenticateToken, requireAdminOrHigher, userController.updateUserStatus);
router.delete('/:id', authenticateToken, requireAdminOrHigher, userController.adminDeleteUser);

// Support staff management (ADMIN and SUPER_ADMIN)
router.post('/support-staff', authenticateToken, requireAdminOrHigher, userController.createSupportStaff);
router.get('/support-staff', authenticateToken, requireAdminOrHigher, userController.getSupportStaff);

export default router;
