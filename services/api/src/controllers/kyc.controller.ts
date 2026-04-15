import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import prisma from '../config/database';
import logger from '../config/logger';

// File type from multer-storage-cloudinary v4.x
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string; // Cloudinary public_id in v4.x
  path?: string;     // Cloudinary URL in v4.x
  buffer?: Buffer;
  format?: string;
  resource_type?: string;
}

// Valid field names for KYC document upload
const VALID_UPLOAD_FIELDS = [
  'governmentId',
  'selfieWithId',
  'storefrontVideo',
  'interiorVideo',
  'businessCert',
  'proofOfAddress',
] as const;

type UploadField = typeof VALID_UPLOAD_FIELDS[number];

// Map field param to DB column name
function getFieldToColumnMap(field: UploadField): string {
  const mapping: Record<UploadField, string> = {
    governmentId: 'governmentIdUrl',
    selfieWithId: 'selfieWithIdUrl',
    storefrontVideo: 'storefrontVideoUrl',
    interiorVideo: 'interiorVideoUrl',
    businessCert: 'businessCertUrl',
    proofOfAddress: 'proofOfAddressUrl',
  };
  return mapping[field];
}

class KycController {
  // ==================== Partner-facing methods ====================

  /**
   * Get current user's KYC submission status
   * GET /api/kyc/status
   */
  async getKycStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      // Find the salon owned by the user
      const salon = await prisma.salon.findFirst({
        where: { ownerId: userId },
        select: { id: true, businessName: true, status: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
        return;
      }

      // Find KYC submission for this salon
      const kycSubmission = await prisma.kycSubmission.findUnique({
        where: { salonId: salon.id },
      });

      successResponse(res, {
        salon: {
          id: salon.id,
          businessName: salon.businessName,
          status: salon.status,
        },
        kyc: kycSubmission,
      });
    } catch (error) {
      logger.error('Get KYC status error:', error);
      errorResponse(res, 'FETCH_FAILED', 'Failed to get KYC status', 500);
    }
  }

  /**
   * Create or update KYC submission
   * POST /api/kyc/submit
   */
  async submitKyc(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { businessType, ownerLegalName, businessRegName, tinNumber, registrationNumber } = req.body;

      // Validate required fields
      if (!businessType || !ownerLegalName) {
        errorResponse(res, 'VALIDATION_ERROR', 'businessType and ownerLegalName are required', 400);
        return;
      }

      // Validate businessType
      if (!['REGISTERED_COMPANY', 'INDIVIDUAL'].includes(businessType)) {
        errorResponse(res, 'VALIDATION_ERROR', 'businessType must be either REGISTERED_COMPANY or INDIVIDUAL', 400);
        return;
      }

      // Find the salon owned by the user
      const salon = await prisma.salon.findFirst({
        where: { ownerId: userId },
        select: { id: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
        return;
      }

      // Check for existing KYC submission
      const existingKyc = await prisma.kycSubmission.findUnique({
        where: { salonId: salon.id },
      });

      if (existingKyc) {
        // If already approved, reject changes
        if (existingKyc.status === 'APPROVED') {
          errorResponse(res, 'ALREADY_APPROVED', 'KYC is already approved and cannot be modified', 400);
          return;
        }

        // If rejected, allow re-submission (reset status to PENDING)
        if (existingKyc.status === 'REJECTED') {
          const updatedKyc = await prisma.kycSubmission.update({
            where: { id: existingKyc.id },
            data: {
              businessType,
              ownerLegalName,
              businessRegName: businessRegName || null,
              tinNumber: tinNumber || null,
              registrationNumber: registrationNumber || null,
              status: 'PENDING',
              rejectionReason: null,
              reviewedBy: null,
              reviewedAt: null,
              updatedAt: new Date(),
            },
          });
          successResponse(res, updatedKyc);
          return;
        }

        // If pending, update the existing submission
        const updatedKyc = await prisma.kycSubmission.update({
          where: { id: existingKyc.id },
          data: {
            businessType,
            ownerLegalName,
            businessRegName: businessRegName || null,
            tinNumber: tinNumber || null,
            registrationNumber: registrationNumber || null,
            updatedAt: new Date(),
          },
        });
        successResponse(res, updatedKyc);
        return;
      }

      // Create new KYC submission
      const newKyc = await prisma.kycSubmission.create({
        data: {
          salonId: salon.id,
          businessType,
          ownerLegalName,
          businessRegName: businessRegName || null,
          tinNumber: tinNumber || null,
          registrationNumber: registrationNumber || null,
          status: 'PENDING',
        },
      });

      successResponse(res, newKyc, 201);
    } catch (error) {
      logger.error('Submit KYC error:', error);
      errorResponse(res, 'CREATE_FAILED', 'Failed to submit KYC', 500);
    }
  }

  /**
   * Upload a KYC document/video
   * POST /api/kyc/upload/:field
   */
  async uploadKycDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { field } = req.params;
      const file = req.file as MulterFile;

      // Validate field name
      if (!VALID_UPLOAD_FIELDS.includes(field as UploadField)) {
        errorResponse(
          res,
          'INVALID_FIELD',
          `Invalid field name. Valid fields are: ${VALID_UPLOAD_FIELDS.join(', ')}`,
          400
        );
        return;
      }

      // Validate file
      if (!file || !file.path) {
        errorResponse(res, 'UPLOAD_FAILED', 'No file uploaded or upload failed', 400);
        return;
      }

      // Find the salon owned by the user
      const salon = await prisma.salon.findFirst({
        where: { ownerId: userId },
        select: { id: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
        return;
      }

      const dbColumn = getFieldToColumnMap(field as UploadField);

      // Check if KYC submission exists
      const existingKyc = await prisma.kycSubmission.findUnique({
        where: { salonId: salon.id },
      });

      let kycSubmission;

      if (existingKyc) {
        // Check if already approved
        if (existingKyc.status === 'APPROVED') {
          errorResponse(res, 'ALREADY_APPROVED', 'KYC is already approved and cannot be modified', 400);
          return;
        }

        // Update existing submission with the document URL
        kycSubmission = await prisma.kycSubmission.update({
          where: { id: existingKyc.id },
          data: {
            [dbColumn]: file.path,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create a new KYC submission with minimal defaults
        kycSubmission = await prisma.kycSubmission.create({
          data: {
            salonId: salon.id,
            businessType: 'INDIVIDUAL', // Default, can be updated later
            ownerLegalName: '', // Default, can be updated later
            [dbColumn]: file.path,
            status: 'PENDING',
          },
        });
      }

      logger.info(`KYC document uploaded: ${field} for salon ${salon.id}`, {
        salonId: salon.id,
        field,
        publicId: file.filename,
      });

      successResponse(res, {
        field,
        url: file.path,
        publicId: file.filename,
        kyc: kycSubmission,
        message: `${field} uploaded successfully`,
      });
    } catch (error) {
      logger.error('Upload KYC document error:', error);
      errorResponse(res, 'UPLOAD_FAILED', 'Failed to upload KYC document', 500);
    }
  }

  // ==================== Admin-facing methods ====================

  /**
   * List all KYC submissions (optionally filtered by status)
   * GET /api/kyc/admin/submissions
   */
  async getKycSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const where: any = {};
      if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        where.status = status;
      }

      const [submissions, total] = await Promise.all([
        prisma.kycSubmission.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { submittedAt: 'desc' },
          include: {
            salon: {
              select: {
                id: true,
                businessName: true,
                status: true,
                ownerId: true,
                owner: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        }),
        prisma.kycSubmission.count({ where }),
      ]);

      // Flatten salon.owner into top-level owner field and include ownerId
      const formattedSubmissions = submissions.map(sub => ({
        ...sub,
        owner: sub.salon?.owner || null,
        ownerId: sub.salon?.ownerId || null,
      }));

      paginatedResponse(res, formattedSubmissions, page, limit, total);
    } catch (error) {
      logger.error('Get KYC submissions error:', error);
      errorResponse(res, 'FETCH_FAILED', 'Failed to get KYC submissions', 500);
    }
  }

  /**
   * Get a single KYC submission by ID with full details
   * GET /api/kyc/admin/submissions/:id
   */
  async getKycSubmissionDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const submission = await prisma.kycSubmission.findUnique({
        where: { id },
        include: {
          salon: {
            select: {
              id: true,
              businessName: true,
              type: true,
              status: true,
              address: true,
              city: true,
              region: true,
              phoneNumber: true,
              email: true,
              ownerId: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phoneNumber: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      if (!submission) {
        errorResponse(res, 'NOT_FOUND', 'KYC submission not found', 404);
        return;
      }

      // Flatten salon.owner into top-level owner field and include ownerId
      const formattedSubmission = {
        ...submission,
        owner: submission.salon?.owner || null,
        ownerId: submission.salon?.ownerId || null,
      };

      successResponse(res, formattedSubmission);
    } catch (error) {
      logger.error('Get KYC submission detail error:', error);
      errorResponse(res, 'FETCH_FAILED', 'Failed to get KYC submission details', 500);
    }
  }

  /**
   * Approve a KYC submission
   * POST /api/kyc/admin/submissions/:id/approve
   */
  async approveKyc(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      const submission = await prisma.kycSubmission.findUnique({
        where: { id },
        include: { salon: { select: { id: true, businessName: true, ownerId: true } } },
      });

      if (!submission) {
        errorResponse(res, 'NOT_FOUND', 'KYC submission not found', 404);
        return;
      }

      if (submission.status === 'APPROVED') {
        errorResponse(res, 'ALREADY_APPROVED', 'KYC is already approved', 400);
        return;
      }

      // Use transaction to update both KYC status and salon status
      const [updatedSubmission] = await prisma.$transaction([
        prisma.kycSubmission.update({
          where: { id },
          data: {
            status: 'APPROVED',
            reviewedBy: adminId,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          },
          include: {
            salon: {
              select: {
                id: true,
                businessName: true,
                status: true,
                owner: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        }),
        // Update salon status to APPROVED
        prisma.salon.update({
          where: { id: submission.salon.id },
          data: { status: 'APPROVED' },
        }),
      ]);

      // Create notification for salon owner
      await prisma.notification.create({
        data: {
          userId: submission.salon.ownerId,
          type: 'SYSTEM',
          title: 'KYC Approved',
          message: `Your KYC verification has been approved. Your salon "${submission.salon.businessName}" is now live!`,
          data: { kycId: id, salonId: submission.salon.id },
        },
      });

      logger.info(`KYC approved: ${id} by admin ${adminId}`, {
        kycId: id,
        salonId: submission.salon.id,
        adminId,
      });

      successResponse(res, updatedSubmission);
    } catch (error) {
      logger.error('Approve KYC error:', error);
      errorResponse(res, 'UPDATE_FAILED', 'Failed to approve KYC', 500);
    }
  }

  /**
   * Reject a KYC submission
   * POST /api/kyc/admin/submissions/:id/reject
   */
  async rejectKyc(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const adminId = req.user?.id;

      if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
        errorResponse(res, 'VALIDATION_ERROR', 'rejectionReason is required', 400);
        return;
      }

      const submission = await prisma.kycSubmission.findUnique({
        where: { id },
        include: { salon: { select: { id: true, businessName: true, ownerId: true } } },
      });

      if (!submission) {
        errorResponse(res, 'NOT_FOUND', 'KYC submission not found', 404);
        return;
      }

      if (submission.status === 'APPROVED') {
        errorResponse(res, 'ALREADY_APPROVED', 'Cannot reject an approved KYC submission', 400);
        return;
      }

      const updatedSubmission = await prisma.kycSubmission.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
          reviewedBy: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          salon: {
            select: {
              id: true,
              businessName: true,
              status: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Create notification for salon owner
      await prisma.notification.create({
        data: {
          userId: submission.salon.ownerId,
          type: 'SYSTEM',
          title: 'KYC Rejected',
          message: `Your KYC verification was rejected. Reason: ${rejectionReason}`,
          data: { kycId: id, salonId: submission.salon.id, reason: rejectionReason },
        },
      });

      logger.info(`KYC rejected: ${id} by admin ${adminId}`, {
        kycId: id,
        salonId: submission.salon.id,
        adminId,
        reason: rejectionReason,
      });

      successResponse(res, updatedSubmission);
    } catch (error) {
      logger.error('Reject KYC error:', error);
      errorResponse(res, 'UPDATE_FAILED', 'Failed to reject KYC', 500);
    }
  }
}

export const kycController = new KycController();
export default kycController;
