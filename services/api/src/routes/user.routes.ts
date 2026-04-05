import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
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
router.get('/', authenticateToken, requireRole(UserRole.ADMIN), userController.getAllUsers);
router.put('/:id/status', authenticateToken, requireRole(UserRole.ADMIN), userController.updateUserStatus);
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), userController.adminDeleteUser);

export default router;
