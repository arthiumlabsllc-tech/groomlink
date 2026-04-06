import { Router, Router as RouterType } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth';
import uploadController from '../controllers/upload.controller';
import { avatarStorage, salonStorage, workerStorage, serviceStorage } from '../config/cloudinary';

const router: RouterType = Router();

// Configure multer for different upload types
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
const uploadSalon = multer({ storage: salonStorage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
const uploadWorker = multer({ storage: workerStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
const uploadService = multer({ storage: serviceStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// All upload routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/uploads/avatar
 * @desc Upload user avatar
 * @access Private (All authenticated users)
 */
router.post(
  '/avatar',
  uploadAvatar.single('avatar'),
  uploadController.uploadAvatar.bind(uploadController)
);

/**
 * @route POST /api/uploads/salon/:salonId/logo
 * @desc Upload salon logo
 * @access Private (Salon owner only)
 */
router.post(
  '/salon/:salonId/logo',
  requireRole('SALON_OWNER', 'ADMIN'),
  uploadSalon.single('logo'),
  uploadController.uploadSalonLogo.bind(uploadController)
);

/**
 * @route POST /api/uploads/salon/:salonId/cover
 * @desc Upload salon cover image
 * @access Private (Salon owner only)
 */
router.post(
  '/salon/:salonId/cover',
  requireRole('SALON_OWNER', 'ADMIN'),
  uploadSalon.single('cover'),
  uploadController.uploadSalonCover.bind(uploadController)
);

/**
 * @route POST /api/uploads/salon/:salonId/gallery
 * @desc Upload salon gallery images (max 5 at once)
 * @access Private (Salon owner only)
 */
router.post(
  '/salon/:salonId/gallery',
  requireRole('SALON_OWNER', 'ADMIN'),
  uploadSalon.array('images', 5),
  uploadController.uploadSalonGallery.bind(uploadController)
);

/**
 * @route DELETE /api/uploads/salon/:salonId/gallery
 * @desc Delete image from salon gallery
 * @access Private (Salon owner only)
 */
router.delete(
  '/salon/:salonId/gallery',
  requireRole('SALON_OWNER', 'ADMIN'),
  uploadController.deleteGalleryImage.bind(uploadController)
);

/**
 * @route POST /api/uploads/worker/:workerId
 * @desc Upload worker/barber photo
 * @access Private (Salon owner only)
 */
router.post(
  '/worker/:workerId',
  requireRole('SALON_OWNER', 'ADMIN'),
  uploadWorker.single('photo'),
  uploadController.uploadWorkerPhoto.bind(uploadController)
);

/**
 * @route POST /api/uploads/service/:serviceId
 * @desc Upload service image
 * @access Private (Salon owner only)
 */
router.post(
  '/service/:serviceId',
  requireRole('SALON_OWNER', 'ADMIN'),
  uploadService.single('image'),
  uploadController.uploadServiceImage.bind(uploadController)
);

export default router;
