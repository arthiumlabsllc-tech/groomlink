import { Request, Response } from 'express';
import multer from 'multer';
import { AuthenticatedRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import prisma from '../config/database';
import { uploadService } from '../services/upload.service';
import logger from '../config/logger';

// File type from multer-storage-cloudinary v4.x
// In v4.x, the file object properties are:
// - file.path: The Cloudinary URL (replaces file.secure_url from v3.x)
// - file.filename: The Cloudinary public_id (replaces file.public_id from v3.x)
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
  // Cloudinary v3.x properties (not present in v4.x):
  // public_id?: string;  // Use filename instead
  // secure_url?: string; // Use path instead
  format?: string;
  resource_type?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

class UploadController {
  /**
   * Upload user avatar
   * POST /api/uploads/avatar
   */
  async uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const file = req.file as MulterFile;
      
      if (!file || !file.path) {
        errorResponse(res, 'UPLOAD_FAILED', 'No file uploaded', 400);
        return;
      }

      const userId = req.user?.id;
      const oldAvatar = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      // Update user avatar in database
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: file.path },
      });

      // Delete old avatar from Cloudinary if exists
      if (oldAvatar?.avatar) {
        const publicId = uploadService.extractPublicId(oldAvatar.avatar);
        if (publicId) {
          uploadService.deleteImage(publicId).catch(() => {});
        }
      }

      successResponse(res, {
        avatar: file.path,
        publicId: file.filename,
        thumbnail: uploadService.getThumbnailUrl(file.filename || ''),
        medium: uploadService.getMediumUrl(file.filename || ''),
        message: 'Avatar uploaded successfully',
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      errorResponse(res, 'UPLOAD_FAILED', 'Failed to upload avatar', 500);
    }
  }

  /**
   * Upload salon logo
   * POST /api/uploads/salon/:salonId/logo
   */
  async uploadSalonLogo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { salonId } = req.params;
      const file = req.file as MulterFile;
      
      if (!file) {
        errorResponse(res, 'UPLOAD_FAILED', 'No file uploaded. Ensure the field name is "logo"', 400);
        return;
      }

      if (!file.path) {
        errorResponse(res, 'UPLOAD_FAILED', 'File upload to Cloudinary failed. Check Cloudinary credentials and configuration.', 400);
        return;
      }

      // Verify ownership
      const salon = await prisma.salon.findFirst({
        where: { id: salonId, ownerId: req.user?.id },
        select: { logo: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'Salon not found or unauthorized', 404);
        return;
      }

      // Update salon logo
      await prisma.salon.update({
        where: { id: salonId },
        data: { logo: file.path },
      });

      // Delete old logo
      if (salon.logo) {
        const publicId = uploadService.extractPublicId(salon.logo);
        if (publicId) {
          uploadService.deleteImage(publicId).catch(() => {});
        }
      }

      successResponse(res, {
        logo: file.path,
        publicId: file.filename,
        thumbnail: uploadService.getThumbnailUrl(file.filename || ''),
        message: 'Logo uploaded successfully',
      });
    } catch (error) {
      console.error('Upload salon logo error:', error);
      errorResponse(res, 'UPLOAD_FAILED', 'Failed to upload logo', 500);
    }
  }

  /**
   * Upload a branded-page logo (separate from the salon's main logo).
   * POST /api/uploads/branded-page/:salonId/logo
   *
   * This endpoint uploads to Cloudinary and persists the URL ONLY on the
   * BrandedPage record — it must NEVER touch `salon.logo`. A dedicated
   * endpoint is required because the previous implementation re-used
   * uploadSalonLogo, which silently overwrote the salon's main logo and
   * deleted the old file from Cloudinary.
   */
  async uploadBrandedPageLogo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { salonId } = req.params;
      const file = req.file as MulterFile;

      if (!file) {
        errorResponse(res, 'UPLOAD_FAILED', 'No file uploaded. Ensure the field name is "logo"', 400);
        return;
      }

      if (!file.path) {
        errorResponse(res, 'UPLOAD_FAILED', 'File upload to Cloudinary failed. Check Cloudinary credentials and configuration.', 400);
        return;
      }

      // Verify ownership of the salon
      const salon = await prisma.salon.findFirst({
        where: { id: salonId, ownerId: req.user?.id },
        select: { id: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'Salon not found or unauthorized', 404);
        return;
      }

      // Look up the existing branded-page logo so we can delete it from
      // Cloudinary after we persist the new URL. This is the ONLY delete
      // allowed here — do not touch the salon's main logo.
      const existing = await prisma.brandedPage.findUnique({
        where: { salonId },
        select: { logoUrl: true },
      });

      // Upsert the branded-page record with the new logo URL. We use upsert
      // so the first-time flow (no branded page yet) also works. Required
      // fields on create: salonId + a slug. If no branded page exists yet
      // we fall back to a slug derived from the salon id to keep the schema
      // happy; the user can customize it later via the regular update flow.
      await prisma.brandedPage.upsert({
        where: { salonId },
        create: {
          salonId,
          slug: `salon-${salonId.slice(0, 8)}`,
          logoUrl: file.path,
        },
        update: {
          logoUrl: file.path,
        },
      });

      // Best-effort delete of the previous branded-page logo from Cloudinary.
      if (existing?.logoUrl) {
        const publicId = uploadService.extractPublicId(existing.logoUrl);
        if (publicId) {
          uploadService.deleteImage(publicId).catch(() => {});
        }
      }

      successResponse(res, {
        logo: file.path,
        publicId: file.filename,
        thumbnail: uploadService.getThumbnailUrl(file.filename || ''),
        message: 'Branded page logo uploaded successfully',
      });
    } catch (error) {
      console.error('Upload branded page logo error:', error);
      errorResponse(res, 'UPLOAD_FAILED', 'Failed to upload branded page logo', 500);
    }
  }

  /**
   * Upload salon cover image
   * POST /api/uploads/salon/:salonId/cover
   */
  async uploadSalonCover(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { salonId } = req.params;
      const file = req.file as MulterFile;
      
      if (!file) {
        errorResponse(res, 'UPLOAD_FAILED', 'No file uploaded. Ensure the field name is "cover"', 400);
        return;
      }

      if (!file.path) {
        errorResponse(res, 'UPLOAD_FAILED', 'File upload to Cloudinary failed. Check Cloudinary credentials and configuration.', 400);
        return;
      }

      // Verify ownership
      const salon = await prisma.salon.findFirst({
        where: { id: salonId, ownerId: req.user?.id },
        select: { coverImage: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'Salon not found or unauthorized', 404);
        return;
      }

      // Update salon cover image
      await prisma.salon.update({
        where: { id: salonId },
        data: { coverImage: file.path },
      });

      // Delete old cover image
      if (salon.coverImage) {
        const publicId = uploadService.extractPublicId(salon.coverImage);
        if (publicId) {
          uploadService.deleteImage(publicId).catch(() => {});
        }
      }

      successResponse(res, {
        coverImage: file.path,
        publicId: file.filename,
        hero: uploadService.getHeroUrl(file.filename || ''),
        message: 'Cover image uploaded successfully',
      });
    } catch (error) {
      console.error('Upload salon cover error:', error);
      errorResponse(res, 'UPLOAD_FAILED', 'Failed to upload cover image', 500);
    }
  }

  /**
   * Upload salon gallery image
   * POST /api/uploads/salon/:salonId/gallery
   */
  async uploadSalonGallery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { salonId } = req.params;
      const files = req.files as MulterFile[];
      
      if (!files || files.length === 0) {
        errorResponse(res, 'UPLOAD_FAILED', 'No files uploaded. Ensure the field name is "gallery"', 400);
        return;
      }

      // Verify ownership
      const salon = await prisma.salon.findFirst({
        where: { id: salonId, ownerId: req.user?.id },
        select: { images: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'Salon not found or unauthorized', 404);
        return;
      }

      // Get URLs from uploaded files
      const newUrls = files
        .filter(f => f.path)
        .map(f => f.path as string);

      // Add to existing images (max 20)
      const currentImages = salon.images || [];
      const updatedImages = [...currentImages, ...newUrls].slice(0, 20);

      // Update salon images
      await prisma.salon.update({
        where: { id: salonId },
        data: { images: updatedImages },
      });

      successResponse(res, {
        images: newUrls,
        totalImages: updatedImages.length,
        message: 'Gallery images uploaded successfully',
      });
    } catch (error) {
      console.error('Upload salon gallery error:', error);
      errorResponse(res, 'UPLOAD_FAILED', 'Failed to upload gallery images', 500);
    }
  }

  /**
   * Upload worker photo
   * POST /api/uploads/worker/:workerId
   */
  async uploadWorkerPhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = req.params;
      const file = req.file as MulterFile;
      
      if (!file || !file.path) {
        errorResponse(res, 'UPLOAD_FAILED', 'No file uploaded', 400);
        return;
      }

      // Verify ownership through salon
      const worker = await prisma.worker.findFirst({
        where: {
          id: workerId,
          salon: { ownerId: req.user?.id },
        },
        select: { avatar: true },
      });

      if (!worker) {
        errorResponse(res, 'NOT_FOUND', 'Worker not found or unauthorized', 404);
        return;
      }

      // Update worker avatar
      await prisma.worker.update({
        where: { id: workerId },
        data: { avatar: file.path },
      });

      // Delete old avatar
      if (worker.avatar) {
        const publicId = uploadService.extractPublicId(worker.avatar);
        if (publicId) {
          uploadService.deleteImage(publicId).catch(() => {});
        }
      }

      successResponse(res, {
        avatar: file.path,
        publicId: file.filename,
        thumbnail: uploadService.getThumbnailUrl(file.filename || ''),
        message: 'Worker photo uploaded successfully',
      });
    } catch (error) {
      console.error('Upload worker photo error:', error);
      errorResponse(res, 'UPLOAD_FAILED', 'Failed to upload worker photo', 500);
    }
  }

  /**
   * Upload service image
   * POST /api/uploads/service/:serviceId
   */
  async uploadServiceImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const file = req.file as MulterFile;
      
      if (!file || !file.path) {
        errorResponse(res, 'UPLOAD_FAILED', 'No file uploaded', 400);
        return;
      }

      // Verify ownership through salon
      const service = await prisma.service.findFirst({
        where: {
          id: serviceId,
          salon: { ownerId: req.user?.id },
        },
        select: { image: true },
      });

      if (!service) {
        errorResponse(res, 'NOT_FOUND', 'Service not found or unauthorized', 404);
        return;
      }

      // Update service image
      await prisma.service.update({
        where: { id: serviceId },
        data: { image: file.path },
      });

      // Delete old image
      if (service.image) {
        const publicId = uploadService.extractPublicId(service.image);
        if (publicId) {
          uploadService.deleteImage(publicId).catch(() => {});
        }
      }

      successResponse(res, {
        image: file.path,
        publicId: file.filename,
        message: 'Service image uploaded successfully',
      });
    } catch (error) {
      console.error('Upload service image error:', error);
      errorResponse(res, 'UPLOAD_FAILED', 'Failed to upload service image', 500);
    }
  }

  /**
   * Delete image from gallery
   * DELETE /api/uploads/salon/:salonId/gallery
   */
  async deleteGalleryImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { salonId } = req.params;
      const { imageUrl } = req.body;
      
      if (!imageUrl) {
        errorResponse(res, 'MISSING_PARAM', 'Image URL is required', 400);
        return;
      }

      // Verify ownership
      const salon = await prisma.salon.findFirst({
        where: { id: salonId, ownerId: req.user?.id },
        select: { images: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'Salon not found or unauthorized', 404);
        return;
      }

      // Remove image from array
      const updatedImages = (salon.images || []).filter(img => img !== imageUrl);
      
      await prisma.salon.update({
        where: { id: salonId },
        data: { images: updatedImages },
      });

      // Delete from Cloudinary
      const publicId = uploadService.extractPublicId(imageUrl);
      if (publicId) {
        await uploadService.deleteImage(publicId);
      }

      successResponse(res, { remainingImages: updatedImages.length, message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Delete gallery image error:', error);
      errorResponse(res, 'DELETE_FAILED', 'Failed to delete image', 500);
    }
  }

  /**
   * Upload salon gallery videos
   * POST /api/uploads/salon/:salonId/gallery/videos
   */
  async uploadSalonGalleryVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { salonId } = req.params;
      const files = req.files as MulterFile[];

      if (!files || files.length === 0) {
        errorResponse(res, 'UPLOAD_FAILED', 'No files uploaded. Ensure the field name is "videos"', 400);
        return;
      }

      // Verify ownership
      const salon = await prisma.salon.findFirst({
        where: { id: salonId, ownerId: req.user?.id },
        select: { videos: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'Salon not found or unauthorized', 404);
        return;
      }

      // Get URLs from uploaded files
      const newUrls = files
        .filter(f => f.path)
        .map(f => f.path as string);

      // Add to existing videos (max 5)
      const currentVideos = salon.videos || [];
      const updatedVideos = [...currentVideos, ...newUrls].slice(0, 5);

      await prisma.salon.update({
        where: { id: salonId },
        data: { videos: updatedVideos },
      });

      successResponse(res, {
        videos: newUrls,
        totalVideos: updatedVideos.length,
        message: 'Gallery videos uploaded successfully',
      });
    } catch (error) {
      console.error('Upload salon gallery video error:', error);
      errorResponse(res, 'UPLOAD_FAILED', 'Failed to upload gallery videos', 500);
    }
  }

  /**
   * Delete video from gallery
   * DELETE /api/uploads/salon/:salonId/gallery/videos
   */
  async deleteGalleryVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { salonId } = req.params;
      const { videoUrl } = req.body;

      if (!videoUrl) {
        errorResponse(res, 'MISSING_PARAM', 'Video URL is required', 400);
        return;
      }

      // Verify ownership
      const salon = await prisma.salon.findFirst({
        where: { id: salonId, ownerId: req.user?.id },
        select: { videos: true },
      });

      if (!salon) {
        errorResponse(res, 'NOT_FOUND', 'Salon not found or unauthorized', 404);
        return;
      }

      // Remove video from array
      const updatedVideos = (salon.videos || []).filter(vid => vid !== videoUrl);

      await prisma.salon.update({
        where: { id: salonId },
        data: { videos: updatedVideos },
      });

      // Delete from Cloudinary
      const publicId = uploadService.extractPublicId(videoUrl);
      if (publicId) {
        uploadService.deleteVideo(publicId).catch(() => {});
      }

      successResponse(res, { remainingVideos: updatedVideos.length, message: 'Video deleted successfully' });
    } catch (error) {
      console.error('Delete gallery video error:', error);
      errorResponse(res, 'DELETE_FAILED', 'Failed to delete video', 500);
    }
  }
}

export const uploadController = new UploadController();
export default uploadController;
