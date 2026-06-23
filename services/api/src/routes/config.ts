import { Router, Request, Response } from 'express';
import prisma from '../config/database';

const router = Router();

/**
 * GET /api/config
 * Returns app configuration for mobile apps
 * This endpoint is PUBLIC - returns only non-sensitive config
 */
router.get('/', (req: Request, res: Response) => {
  const config = {
    // Google Maps - client-facing WEB key (referrer-restricted). Falls back to
    // GOOGLE_MAPS_API_KEY for backward-compat on envs that haven't split keys.
    googleMapsApiKey: process.env.GOOGLE_MAPS_WEB_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    
    // API URLs
    apiBaseUrl: process.env.API_BASE_URL || 'https://groomlinkgh.com/api',
    wsBaseUrl: process.env.WS_BASE_URL || 'https://groomlinkgh.com',
    
    // App Metadata
    appName: process.env.APP_NAME || 'GroomLink',
    appVersion: process.env.APP_VERSION || '1.0.0',
    
    // Features (can be toggled without app update)
    features: {
      mapsEnabled: true,
      notificationsEnabled: true,
      paymentsEnabled: true,
    },
    
    // Note: Sensitive keys (JWT_SECRET, DB credentials, etc.) are NEVER exposed
  };

  res.json({
    success: true,
    config,
  });
});

/**
 * Compare semantic versions: returns -1, 0, or 1
 * "1.0.28" vs "1.0.35" → -1 (a < b)
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

// Store URLs
const STORE_URLS: Record<string, Record<string, string>> = {
  customer: {
    ios: 'https://apps.apple.com/app/id6778125298',
    android: 'https://play.google.com/store/apps/details?id=com.arthiumlabsllc.groomlink',
  },
  partners: {
    ios: 'https://apps.apple.com/app/id6778136462',
    android: 'https://play.google.com/store/apps/details?id=com.arthiumlabsllc.partners',
  },
};

/**
 * GET /api/config/app-version
 * Returns version check info for app update prompts
 * Query params:
 *   app=customer|partners
 *   platform=ios|android
 *   currentVersion=1.0.28
 */
router.get('/app-version', async (req: Request, res: Response): Promise<void> => {
  try {
    const { app, platform, currentVersion } = req.query;

    // Validate params
    if (!app || !['customer', 'partners'].includes(app as string)) {
      res.status(400).json({ success: false, message: 'app must be "customer" or "partners"' });
      return;
    }
    if (!platform || !['ios', 'android'].includes(platform as string)) {
      res.status(400).json({ success: false, message: 'platform must be "ios" or "android"' });
      return;
    }
    if (!currentVersion || typeof currentVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(currentVersion)) {
      res.status(400).json({ success: false, message: 'currentVersion must be in format X.Y.Z' });
      return;
    }

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } }) as any;

    const appKey = app as 'customer' | 'partners';
    const platKey = platform as 'ios' | 'android';

    const latestVersion = appKey === 'customer'
      ? (settings?.customerAppLatestVersion ?? null)
      : (settings?.partnersAppLatestVersion ?? null);
    const minVersion = appKey === 'customer'
      ? (settings?.customerAppMinVersion ?? null)
      : (settings?.partnersAppMinVersion ?? null);
    const updateMessage = settings?.appUpdateMessage || 'A new version of GroomLink is available! Update now for the best experience.';

    // If no versions configured, no update needed
    if (!latestVersion && !minVersion) {
      res.json({
        success: true,
        data: {
          updateAvailable: false,
          mandatory: false,
          latestVersion: currentVersion,
          updateUrl: null,
          message: null,
        },
      });
      return;
    }

    const effectiveLatest = latestVersion || minVersion || currentVersion;
    const updateAvailable = compareVersions(currentVersion, effectiveLatest) < 0;
    const mandatory = minVersion ? compareVersions(currentVersion, minVersion) < 0 : false;
    const updateUrl = STORE_URLS[appKey]?.[platKey] || null;

    res.json({
      success: true,
      data: {
        updateAvailable,
        mandatory,
        latestVersion: effectiveLatest,
        updateUrl,
        message: updateAvailable ? updateMessage : null,
      },
    });
  } catch (error) {
    console.error('Error checking app version:', error);
    // Graceful fallback - don't block app if endpoint fails
    res.json({
      success: true,
      data: {
        updateAvailable: false,
        mandatory: false,
        latestVersion: null,
        updateUrl: null,
        message: null,
      },
    });
  }
});

export default router;
