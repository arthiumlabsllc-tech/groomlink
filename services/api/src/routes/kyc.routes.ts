import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth';
import { kycStorage } from '../config/cloudinary';
import { kycController } from '../controllers/kyc.controller';
import logger from '../config/logger';

const router = Router();

// Configure multer for KYC uploads (50MB limit for videos)
const uploadKyc = multer({
  storage: kycStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

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
        message = 'File is too large. Maximum size is 50MB.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Only one file allowed per upload.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field name: "${err.field}". Use "file" as the field name.`;
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

  // Handle Cloudinary errors
  if (err.message && err.message.includes('not allowed')) {
    logger.error('File type not allowed', { error: err.message });
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'File type not allowed. Allowed formats: JPG, JPEG, PNG, WebP, PDF, MP4, MOV, AVI',
      },
    });
  }

  // Pass other errors to the global error handler
  next(err);
};

// All KYC routes require authentication
router.use(authenticateToken);

// ==================== Partner routes ====================

/**
 * @route GET /api/kyc/status
 * @desc Get current user's KYC submission status
 * @access Private (SALON_OWNER)
 */
router.get(
  '/status',
  requireRole('SALON_OWNER'),
  kycController.getKycStatus.bind(kycController)
);

/**
 * @route POST /api/kyc/submit
 * @desc Create or update KYC submission with form data
 * @access Private (SALON_OWNER)
 */
router.post(
  '/submit',
  requireRole('SALON_OWNER'),
  kycController.submitKyc.bind(kycController)
);

/**
 * @route POST /api/kyc/upload/:field
 * @desc Upload a KYC document/video
 * @param field - One of: governmentId, selfieWithId, storefrontVideo, interiorVideo, businessCert, proofOfAddress
 * @access Private (SALON_OWNER)
 */
router.post(
  '/upload/:field',
  requireRole('SALON_OWNER'),
  uploadKyc.single('file'),
  handleMulterError,
  kycController.uploadKycDocument.bind(kycController)
);

// ==================== Admin routes ====================

/**
 * @route GET /api/kyc/admin/submissions
 * @desc List all KYC submissions (optionally filtered by status)
 * @query status - Filter by PENDING, APPROVED, or REJECTED
 * @access Private (ADMIN, SUPER_ADMIN)
 */
router.get(
  '/admin/submissions',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  kycController.getKycSubmissions.bind(kycController)
);

/**
 * @route GET /api/kyc/admin/submissions/:id
 * @desc Get a single KYC submission by ID with full details
 * @access Private (ADMIN, SUPER_ADMIN)
 */
router.get(
  '/admin/submissions/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  kycController.getKycSubmissionDetail.bind(kycController)
);

/**
 * @route POST /api/kyc/admin/submissions/:id/approve
 * @desc Approve a KYC submission and update salon status to APPROVED
 * @access Private (ADMIN, SUPER_ADMIN)
 */
router.post(
  '/admin/submissions/:id/approve',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  kycController.approveKyc.bind(kycController)
);

/**
 * @route POST /api/kyc/admin/submissions/:id/reject
 * @desc Reject a KYC submission with a reason
 * @body rejectionReason - Required, reason for rejection
 * @access Private (ADMIN, SUPER_ADMIN)
 */
router.post(
  '/admin/submissions/:id/reject',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  kycController.rejectKyc.bind(kycController)
);

export default router;
