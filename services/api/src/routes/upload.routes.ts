import { Router, Router as RouterType } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth';
import uploadController from '../controllers/upload.controller';
import { avatarStorage, salonStorage, workerStorage, serviceStorage } from '../config/cloudinary';
import logger from '../config/logger';

const router: RouterType = Router();

// Configure multer for different upload types
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
const uploadSalon = multer({ storage: salonStorage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
const uploadWorker = multer({ storage: workerStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
const uploadService = multer({ storage: serviceStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// Multer error handler middleware
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    logger.error('Multer error', {
      code: err.code,
      message: err.message,
      field: err.field,
      path: req.path,
      method: req.method,
    });
    
    let message = 'File upload failed';
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File is too large. Maximum size is 10MB.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum is 5 files.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field name: "${err.field}". Check that the field name matches the expected value.`;
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many form fields';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in the form';
        break;
    }
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message,
        details: {
          multerCode: err.code,
          field: err.field,
        },
      },
    });
  }
  
  // Handle Cloudinary errors (these are not MulterErrors but might come from multer-storage-cloudinary)
  if (err.message && err.message.includes('not allowed')) {
    logger.error('File type not allowed', { error: err.message });
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'File type not allowed. Allowed formats: JPG, JPEG, PNG, WebP',
      },
    });
  }
  
  // Pass other errors to the global error handler
  next(err);
};

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
  handleMulterError,
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
  handleMulterError,
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
  handleMulterError,
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
  handleMulterError,
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
  handleMulterError,
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
  handleMulterError,
  uploadController.uploadServiceImage.bind(uploadController)
);

export default router;
