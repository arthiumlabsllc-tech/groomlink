import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { errorResponse } from '../utils/response';
import prisma from '../config/database';
import { checkFeatureAccess, getSalonPlan } from '../services/subscription.service';

// Feature flags type
interface PlanFeatures {
  instant_payouts: boolean;
  priority_support: boolean;
  advanced_analytics: boolean;
  custom_branding: boolean;
  staff_management: boolean;
  multi_location: boolean;
  loyalty_program: boolean;
  marketing_tools: boolean;
  api_access: boolean;
  dedicated_account_manager: boolean;
}

// Free plan defaults for when no subscription exists
const FREE_PLAN = {
  id: 'free',
  name: 'Free',
  slug: 'free',
  priceMonthlyGhs: 0,
  priceYearlyGhs: 0,
  transactionFeePercentage: 5,
  maxStaff: 1,
  maxLocations: 1,
  features: {
    instant_payouts: false,
    priority_support: false,
    advanced_analytics: false,
    custom_branding: false,
    staff_management: false,
    multi_location: false,
    loyalty_program: false,
    marketing_tools: false,
    api_access: false,
    dedicated_account_manager: false,
  } as PlanFeatures,
};

// Subscription plan type
interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  priceMonthlyGhs: number;
  priceYearlyGhs: number;
  transactionFeePercentage: number;
  maxStaff: number;
  maxLocations: number;
  features: PlanFeatures;
}

/**
 * Extended request interface with subscription info
 */
export interface SubscriptionRequest extends AuthenticatedRequest {
  subscription?: {
    plan: SubscriptionPlan;
    status: string;
    expiresAt: Date | null;
    features: PlanFeatures;
  };
}

/**
 * Helper to get salonId from request
 * Tries req.params.salonId first, then looks up salon by owner (req.user.id)
 */
async function getSalonIdFromRequest(req: AuthenticatedRequest): Promise<string | null> {
  // First check if salonId is in params
  if (req.params.salonId) {
    return req.params.salonId;
  }

  // If user is authenticated, try to find their salon
  if (req.user?.id) {
    const salon = await prisma.salon.findFirst({
      where: { ownerId: req.user.id },
      select: { id: true },
    });
    return salon?.id || null;
  }

  return null;
}

/**
 * Middleware factory: Require a specific feature to be available
 * Returns an Express middleware that checks if the salon has access to the specified feature
 */
export function requireFeature(featureName: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salonId = await getSalonIdFromRequest(req);

    if (!salonId) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    try {
      const hasAccess = await checkFeatureAccess(salonId, featureName);

      if (!hasAccess) {
        res.status(403).json({
          error: 'FEATURE_NOT_AVAILABLE',
          message: 'This feature requires an upgraded subscription.',
          upgradeUrl: '/pricing',
        });
        return;
      }

      next();
    } catch (error) {
      errorResponse(res, 'CHECK_FAILED', 'Failed to check feature access', 500);
    }
  };
}

/**
 * Middleware: Check if salon has reached its staff limit
 * Blocks request if staff count >= plan.maxStaff
 */
export async function checkStaffLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  const salonId = await getSalonIdFromRequest(req);

  if (!salonId) {
    errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
    return;
  }

  try {
    const plan = await getSalonPlan(salonId);
    const staffCount = await prisma.worker.count({
      where: { salonId },
    });

    if (staffCount >= plan.maxStaff) {
      res.status(403).json({
        error: 'STAFF_LIMIT_REACHED',
        message: `Your plan allows up to ${plan.maxStaff} staff members. Upgrade to add more.`,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  } catch (error) {
    errorResponse(res, 'CHECK_FAILED', 'Failed to check staff limit', 500);
  }
}

/**
 * Middleware: Check if owner has reached their location/salon limit
 * Blocks request if salon count >= plan.maxLocations
 */
export async function checkLocationLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  try {
    // For location limit, we need to get the plan for the user's existing salon
    // or use free plan defaults if they don't have one yet
    let plan;
    
    const existingSalon = await prisma.salon.findFirst({
      where: { ownerId: req.user.id },
      select: { id: true },
    });

    if (existingSalon) {
      plan = await getSalonPlan(existingSalon.id);
    } else {
      // No existing salon, use free plan defaults
      plan = FREE_PLAN;
    }

    const salonCount = await prisma.salon.count({
      where: { ownerId: req.user.id },
    });

    if (salonCount >= plan.maxLocations) {
      res.status(403).json({
        error: 'LOCATION_LIMIT_REACHED',
        message: `Your plan allows up to ${plan.maxLocations} location${plan.maxLocations === 1 ? '' : 's'}. Upgrade to add more.`,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  } catch (error) {
    errorResponse(res, 'CHECK_FAILED', 'Failed to check location limit', 500);
  }
}

/**
 * Middleware: Load subscription info and attach to req.subscription
 * This is a loader middleware - it always calls next() and never blocks
 */
export async function tenantSubscriptionLoader(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Default free-tier subscription
  req.subscription = {
    plan: FREE_PLAN,
    status: 'free',
    expiresAt: null,
    features: FREE_PLAN.features,
  };

  // Try to load actual subscription if user is authenticated
  if (req.user?.id) {
    try {
      const salonId = await getSalonIdFromRequest(req);

      if (salonId) {
        const plan = await getSalonPlan(salonId);
        
        // Extract plan features with defaults
        const planFeatures: PlanFeatures = {
          instant_payouts: (plan.features as Record<string, boolean>)?.instant_payouts ?? false,
          priority_support: (plan.features as Record<string, boolean>)?.priority_support ?? false,
          advanced_analytics: (plan.features as Record<string, boolean>)?.advanced_analytics ?? false,
          custom_branding: (plan.features as Record<string, boolean>)?.custom_branding ?? false,
          staff_management: (plan.features as Record<string, boolean>)?.staff_management ?? false,
          multi_location: (plan.features as Record<string, boolean>)?.multi_location ?? false,
          loyalty_program: (plan.features as Record<string, boolean>)?.loyalty_program ?? false,
          marketing_tools: (plan.features as Record<string, boolean>)?.marketing_tools ?? false,
          api_access: (plan.features as Record<string, boolean>)?.api_access ?? false,
          dedicated_account_manager: (plan.features as Record<string, boolean>)?.dedicated_account_manager ?? false,
        };

        req.subscription = {
          plan: {
            id: plan.id,
            name: plan.name,
            slug: plan.slug,
            priceMonthlyGhs: (plan as any).priceMonthlyGhs ?? 0,
            priceYearlyGhs: (plan as any).priceYearlyGhs ?? 0,
            transactionFeePercentage: (plan as any).transactionFeePercentage ?? 5,
            maxStaff: plan.maxStaff,
            maxLocations: plan.maxLocations,
            features: planFeatures,
          },
          status: plan.subscriptionStatus,
          expiresAt: plan.expiresAt || null,
          features: planFeatures,
        };
      }
    } catch (error) {
      // Silently fall back to free plan - this is a loader, not a gate
      // Log error for debugging but don't block the request
      console.error('Error loading subscription:', error);
    }
  }

  next();
}
