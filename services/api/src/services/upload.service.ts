import cloudinary from '../config/cloudinary';
import logger from '../config/logger';

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  resourceType: string;
  width: number;
  height: number;
  bytes: number;
}

export interface TransformationOptions {
  width?: number;
  height?: number;
  crop?: string;
  gravity?: string;
  radius?: string | number;
  quality?: string | number;
  format?: string;
}

class UploadService {
  /**
   * Delete an image from Cloudinary by public ID
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      logger.error('Failed to delete image from Cloudinary:', error);
      return false;
    }
  }

  /**
   * Generate a transformed URL for an image
   */
  getTransformedUrl(
    publicId: string,
    options: TransformationOptions = {}
  ): string {
    const transformation: object[] = [];

    if (options.width || options.height) {
      transformation.push({
        width: options.width,
        height: options.height,
        crop: options.crop || 'fill',
        gravity: options.gravity,
      });
    }

    if (options.quality) {
      transformation.push({ quality: options.quality });
    }

    if (options.radius) {
      transformation.push({ radius: options.radius });
    }

    if (options.format) {
      transformation.push({ fetch_format: options.format });
    }

    return cloudinary.url(publicId, {
      transformation,
      secure: true,
    });
  }

  /**
   * Get thumbnail URL (200x200)
   */
  getThumbnailUrl(publicId: string): string {
    return this.getTransformedUrl(publicId, {
      width: 200,
      height: 200,
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    });
  }

  /**
   * Get medium URL (400x400)
   */
  getMediumUrl(publicId: string): string {
    return this.getTransformedUrl(publicId, {
      width: 400,
      height: 400,
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    });
  }

  /**
   * Get large URL (800x800)
   */
  getLargeUrl(publicId: string): string {
    return this.getTransformedUrl(publicId, {
      width: 800,
      height: 800,
      crop: 'limit',
      quality: 'auto',
      format: 'auto',
    });
  }

  /**
   * Get hero/banner URL (1200x600)
   */
  getHeroUrl(publicId: string): string {
    return this.getTransformedUrl(publicId, {
      width: 1200,
      height: 600,
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    });
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    try {
      // Handle URLs like: https://res.cloudinary.com/dcqqwq/image/upload/v12345/groomlink/avatars/abc123.jpg
      const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Upload an image from base64 string
   */
  async uploadBase64(
    base64Data: string,
    folder: string = 'groomlink'
  ): Promise<UploadResult | null> {
    try {
      const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
        folder,
        resource_type: 'image',
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (error) {
      logger.error('Failed to upload base64 image to Cloudinary:', error);
      return null;
    }
  }
}

export const uploadService = new UploadService();
export default uploadService;
