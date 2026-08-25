/**
 * Resolves an avatar/image URL to a full absolute URL.
 * The API stores avatar paths as relative (e.g. /uploads/avatars/filename.jpg).
 * This utility prepends the domain so React Native Image can load them.
 */

const API_DOMAIN = 'https://api.groomlinkgh.com/api';

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Already a full URL (Cloudinary, S3, etc.)
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Local file URI (from image picker before upload completes)
  if (url.startsWith('file://')) return url;
  // Relative path from the API - prepend domain
  return `${API_DOMAIN}${url}`;
}
