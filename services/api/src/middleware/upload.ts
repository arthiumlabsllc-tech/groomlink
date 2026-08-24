import multer from 'multer';
import { Request } from 'express';
import { avatarStorage } from '../config/cloudinary';

// Allowed image mime types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// File filter to only allow images
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error(`Invalid file type. Only images are allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

// Avatars are stored on Cloudinary instead of the local disk so they
// survive deploys/restarts on hosts with ephemeral filesystems (e.g. Render).
// With multer-storage-cloudinary, `file.path` is the Cloudinary secure URL.
const upload = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

export default upload;
