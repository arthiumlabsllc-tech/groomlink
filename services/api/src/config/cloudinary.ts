import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import logger from './logger';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  logger.warn('Cloudinary credentials not configured. File uploads will be disabled.');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

// Storage for user avatars
export const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'groomlink/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    resource_type: 'image',
  } as { folder: string; allowed_formats: string[]; transformation: object[]; resource_type: string },
});

// Storage for salon images (logo, cover, gallery)
export const salonStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'groomlink/salons',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit' }],
    resource_type: 'image',
  } as { folder: string; allowed_formats: string[]; transformation: object[]; resource_type: string },
});

// Storage for worker photos
export const workerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'groomlink/workers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    resource_type: 'image',
  } as { folder: string; allowed_formats: string[]; transformation: object[]; resource_type: string },
});

// Storage for service images
export const serviceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'groomlink/services',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 600, height: 400, crop: 'fill' }],
    resource_type: 'image',
  } as { folder: string; allowed_formats: string[]; transformation: object[]; resource_type: string },
});

// Storage for documents (business licenses, ID proofs)
export const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'groomlink/documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto',
  } as { folder: string; allowed_formats: string[]; resource_type: string },
});

// Storage for KYC documents and videos
export const kycStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'groomlink/kyc',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'mp4', 'mov', 'avi'],
    resource_type: 'auto',
  } as { folder: string; allowed_formats: string[]; resource_type: string },
});

// Default storage for general uploads
export const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'groomlink',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
  } as { folder: string; allowed_formats: string[]; transformation: object[] },
});

export default cloudinary;
