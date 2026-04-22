import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/config
 * Returns app configuration for mobile apps
 * This endpoint is PUBLIC - returns only non-sensitive config
 */
router.get('/', (req: Request, res: Response) => {
  const config = {
    // Google Maps - Required for map functionality
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    
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

export default router;
