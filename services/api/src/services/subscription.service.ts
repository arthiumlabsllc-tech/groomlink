import prisma from '../config/database';
import logger from '../config/logger';
import { SubscriptionStatus, BillingPeriod, InvoiceStatus } from '@prisma/client';
import axios from 'axios';
import * as smsService from './sms.service';

// Hubtel credentials helper (reused pattern from payment.service.ts)
interface HubtelCredentials {
  apiId: string;
  apiSecret: string;
  merchantAccountId: string;
}

async function getHubtelCredentials(): Promise<HubtelCredentials | null> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' }
  });

  const dbApiId = (settings as any)?.hubtelApiId;
  const dbApiSecret = (settings as any)?.hubtelApiSecret;
  const dbMerchantAccountId = (settings as any)?.hubtelMerchantAccountId;

  if (dbApiId && dbApiSecret && dbMerchantAccountId) {
    return {
      apiId: dbApiId,
      apiSecret: dbApiSecret,
      merchantAccountId: dbMerchantAccountId,
    };
  }

  const envApiId = process.env.HUBTEL_API_ID;
  const envApiSecret = process.env.HUBTEL_API_SECRET;
  const envMerchantAccountId = process.env.HUBTEL_MERCHANT_ACCOUNT_ID;

  if (envApiId && envApiSecret && envMerchantAccountId) {
    return {
      apiId: envApiId,
      apiSecret: envApiSecret,
      merchantAccountId: envMerchantAccountId,
    };
  }

  logger.warn('Hubtel credentials not configured in SiteSettings or environment variables');
  return null;
}

function getHubtelAuthHeader(apiId: string, apiSecret: string) {
  const credentials = Buffer.from(`${apiId}:${apiSecret}`).toString('base64');
  return { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' };
}

// ---------------------------------------------------------------------------
// Paystack (primary gateway) for subscription payments
// ---------------------------------------------------------------------------

interface SubscriptionPaymentRequest {
  salonId: string;
  planName: string;
  billingPeriod: BillingPeriod;
  amount: number;
  customerEmail: string;
  phoneNumber?: string | null;
  paymentReference: string;
}

async function initPaystackSubscriptionPayment(
  req: SubscriptionPaymentRequest
): Promise<{ checkoutUrl?: string }> {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const secretKey = (settings as any)?.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
    const publicKey = (settings as any)?.paystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY;

    if (!secretKey || !publicKey) {
      logger.warn('Paystack credentials not configured — skipping Paystack subscription init');
      return {};
    }

    const { PaystackProvider } = await import('./paystack.provider');
    const provider = new PaystackProvider();

    const result = await provider.initializePayment(
      {
        amount: req.amount,
        email: req.customerEmail,
        phoneNumber: req.phoneNumber || undefined,
        reference: req.paymentReference,
        bookingId: '', // subscription payment — no booking involved
        metadata: {
          purpose: 'subscription',
          plan_name: req.planName,
          billing_period: req.billingPeriod,
        },
      },
      { secretKey, publicKey }
    );

    if (!result.success || !result.authorizationUrl) {
      logger.error('Paystack subscription init failed', {
        reference: req.paymentReference,
        message: result.message,
      });
      return {};
    }

    logger.info(`Paystack subscription payment initialized: ${req.paymentReference}`, {
      salonId: req.salonId,
      amount: req.amount,
    });
    return { checkoutUrl: result.authorizationUrl };
  } catch (error) {
    logger.error('Paystack subscription init error:', error);
    return {};
  }
}

// Free plan defaults
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
  },
};

/**
 * 1. Get all active subscription plans ordered by sortOrder
 */
export async function getPlans() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Enrich each plan with feature_list for UI display
    return plans.map((plan) => {
      const features = plan.features as Record<string, boolean> || {};
      const featureList = [
        { name: 'Instant Payouts', included: features.instant_payouts || false },
        { name: 'Priority Support', included: features.priority_support || false },
        { name: 'Advanced Analytics', included: features.advanced_analytics || false },
        { name: 'Custom Branding', included: features.custom_branding || false },
        { name: 'Staff Management', included: features.staff_management || false },
        { name: 'Multi-Location', included: features.multi_location || false },
        { name: 'Loyalty Program', included: features.loyalty_program || false },
        { name: 'Marketing Tools', included: features.marketing_tools || false },
        { name: 'API Access', included: features.api_access || false },
        { name: 'Dedicated Account Manager', included: features.dedicated_account_manager || false },
      ];

      return {
        ...plan,
        feature_list: featureList,
      };
    });
  } catch (error) {
    logger.error('Error fetching subscription plans:', error);
    throw error;
  }
}

/**
 * 2. Subscribe to a plan
 */
export async function subscribeToPlan(
  salonId: string,
  planSlug: string,
  billingPeriod: BillingPeriod,
  user: { id: string; phoneNumber?: string | null }
) {
  try {
    // Find the plan by slug
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { slug: planSlug },
    });

    if (!plan || !plan.isActive) {
      throw new Error('Subscription plan not found or inactive');
    }

    // Calculate amount based on billing period
    const amount = billingPeriod === BillingPeriod.YEARLY && plan.priceYearlyGhs
      ? Number(plan.priceYearlyGhs)
      : Number(plan.priceMonthlyGhs);

    // Check if salon already has an active subscription
    const existingSubscription = await prisma.salonSubscription.findFirst({
      where: {
        salonId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT] },
      },
    });

    if (existingSubscription) {
      // If upgrading, we can handle it gracefully by creating a new subscription
      // The old one will be replaced when the new one is activated
      logger.info(`Salon ${salonId} has existing subscription, creating new one for upgrade`);
    }

    // Contact details for the payer (Paystack needs an email, SMS uses phone)
    const salonWithOwner = await prisma.salon.findUnique({
      where: { id: salonId },
      include: { owner: { select: { phoneNumber: true, email: true } } },
    });
    const phoneNumber = user.phoneNumber || salonWithOwner?.owner?.phoneNumber || salonWithOwner?.phoneNumber;
    const customerEmail =
      salonWithOwner?.email || salonWithOwner?.owner?.email || `salon-${salonId}@groomlinkgh.com`;

    // Generate payment reference ("GL-SUB-PS-" marks Paystack-paid subscriptions)
    const paymentReference = `GL-SUB-PS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the subscription record first (PENDING_PAYMENT until paid)
    const subscription = await prisma.salonSubscription.create({
      data: {
        salonId,
        planId: plan.id,
        status: SubscriptionStatus.PENDING_PAYMENT,
        billingPeriod,
        amountPaid: amount > 0 ? amount : 0,
        paymentReference,
        startsAt: new Date(),
      },
    });

    // Free plan: activate immediately, no payment flow
    if (amount <= 0) {
      await activateSubscription(paymentReference);
      return {
        subscriptionId: subscription.id,
        paymentReference,
        checkoutUrl: undefined,
        amount: 0,
        message: 'Free plan activated',
      };
    }

    // Paid plans: Paystack first (primary gateway), Hubtel as fallback
    let checkoutUrl: string | undefined;

    const paystackResult = await initPaystackSubscriptionPayment({
      salonId,
      planName: plan.name,
      billingPeriod,
      amount,
      customerEmail,
      phoneNumber,
      paymentReference,
    });
    checkoutUrl = paystackResult.checkoutUrl;

    if (!checkoutUrl) {
      // Fallback to Hubtel if Paystack is not configured or failed
      const hubtelCredentials = await getHubtelCredentials();
      if (hubtelCredentials && phoneNumber) {
        const webhookUrl = process.env.HUBTEL_PAYMENT_WEBHOOK_URL || 'https://api.groomlinkgh.com/api/payments/webhook/hubtel';

        // Ensure phone number has +233 prefix
        let customerMsisdn = phoneNumber;
        if (!customerMsisdn.startsWith('+')) {
          if (customerMsisdn.startsWith('0')) {
            customerMsisdn = `+233${customerMsisdn.substring(1)}`;
          } else {
            customerMsisdn = `+${customerMsisdn}`;
          }
        }

        const requestBody = {
          CustomerName: `Salon ${salonId}`,
          CustomerEmail: customerEmail,
          CustomerMsisdn: customerMsisdn,
          Channel: 'mtn-gh', // Default to MTN
          Amount: amount,
          ClientReference: paymentReference,
          Description: `GroomLink Subscription - ${plan.name} (${billingPeriod})`,
          PrimaryCallbackUrl: webhookUrl,
          SecondaryCallbackUrl: webhookUrl,
        };

        try {
          const response = await axios.post(
            'https://api.hubtel.com/v1/receivemoney/receive',
            requestBody,
            {
              headers: getHubtelAuthHeader(hubtelCredentials.apiId, hubtelCredentials.apiSecret),
            }
          );
          checkoutUrl = response.data?.checkoutUrl || response.data?.redirectUrl;
          logger.info(`Hubtel subscription payment initialized: ${paymentReference}`, { salonId, planId: plan.id });
        } catch (error) {
          logger.error('Hubtel subscription init failed:', error);
        }
      }
    }

    if (!checkoutUrl) {
      throw new Error('Payment gateway is not configured. Please contact support.');
    }

    return {
      subscriptionId: subscription.id,
      paymentReference,
      checkoutUrl,
      amount,
      message: 'Payment initiated. Please complete payment to activate your plan.',
    };
  } catch (error) {
    logger.error('Error subscribing to plan:', error);
    throw error;
  }
}

/**
 * 3. Activate subscription after payment verification
 */
export async function activateSubscription(paymentReference: string) {
  try {
    const subscription = await prisma.salonSubscription.findFirst({
      where: { paymentReference },
      include: { plan: true, salon: { include: { owner: true } } },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      logger.info(`Subscription ${subscription.id} is already active`);
      return { success: true, message: 'Subscription already active' };
    }

    // Calculate expiresAt based on billing period
    const now = new Date();
    const expiresAt = subscription.billingPeriod === BillingPeriod.YEARLY
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update subscription status to ACTIVE
    const updatedSubscription = await prisma.salonSubscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt,
      },
    });

    // Update Salon model with subscription details
    const planFeatures = subscription.plan.features as Record<string, boolean> || {};
    await prisma.salon.update({
      where: { id: subscription.salonId },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
        featureFlags: planFeatures,
      },
    });

    // Create SubscriptionInvoice with status PAID
    await prisma.subscriptionInvoice.create({
      data: {
        salonId: subscription.salonId,
        subscriptionId: subscription.id,
        amount: subscription.amountPaid || 0,
        status: InvoiceStatus.PAID,
        paymentReference,
        periodStart: now,
        periodEnd: expiresAt,
        paidAt: now,
      },
    });

    // Send SMS notification
    const phoneNumber = subscription.salon.owner?.phoneNumber || subscription.salon.phoneNumber;
    if (phoneNumber) {
      const message = `GroomLink: Your ${subscription.plan.name} subscription is now active! Expires on ${expiresAt.toLocaleDateString('en-GH')}. Enjoy premium features!`;
      smsService.sendSMS({ to: phoneNumber, message }).catch((err) => {
        logger.error('Failed to send subscription activation SMS', { err });
      });
    }

    logger.info(`Subscription activated: ${subscription.id}`);
    return {
      success: true,
      subscription: updatedSubscription,
      expiresAt,
    };
  } catch (error) {
    logger.error('Error activating subscription:', error);
    throw error;
  }
}

/**
 * 4. Cancel subscription
 */
export async function cancelSubscription(salonId: string, cancelImmediately: boolean = false) {
  try {
    const subscription = await prisma.salonSubscription.findFirst({
      where: {
        salonId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { salon: true },
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (cancelImmediately) {
      // Cancel immediately
      await prisma.salonSubscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
        },
      });

      // Clear salon's subscription fields
      await prisma.salon.update({
        where: { id: salonId },
        data: {
          subscriptionStatus: 'canceled',
          featureFlags: {},
        },
      });

      logger.info(`Subscription ${subscription.id} canceled immediately`);
      return { success: true, message: 'Subscription canceled immediately' };
    } else {
      // Set to cancel at period end
      await prisma.salonSubscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
        },
      });

      logger.info(`Subscription ${subscription.id} set to cancel at period end`);
      return {
        success: true,
        message: `Subscription will be canceled on ${subscription.expiresAt?.toLocaleDateString('en-GH')}`,
        cancelAt: subscription.expiresAt,
      };
    }
  } catch (error) {
    logger.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * 5. Get subscription status for a salon
 */
export async function getSubscriptionStatus(salonId: string) {
  try {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        activeSubscription: {
          include: { plan: true },
        },
        featureUsages: {
          where: {
            periodEnd: { gte: new Date() },
          },
        },
      },
    });

    if (!salon) {
      throw new Error('Salon not found');
    }

    if (!salon.activeSubscription) {
      return {
        plan: FREE_PLAN,
        status: 'free',
        expires_at: null,
        features: FREE_PLAN.features,
        usage_stats: {},
      };
    }

    const subscription = salon.activeSubscription;
    const planFeatures = subscription.plan.features as Record<string, boolean> || {};

    // Calculate usage stats
    const usageStats: Record<string, { used: number; limit: number | null }> = {};
    for (const usage of salon.featureUsages) {
      usageStats[usage.featureName] = {
        used: usage.usageCount,
        limit: usage.usageLimit,
      };
    }

    return {
      plan: {
        name: subscription.plan.name,
        slug: subscription.plan.slug,
        maxStaff: subscription.plan.maxStaff,
        maxLocations: subscription.plan.maxLocations,
      },
      status: subscription.status,
      expires_at: subscription.expiresAt,
      features: planFeatures,
      usage_stats: usageStats,
      cancel_at_period_end: subscription.cancelAtPeriodEnd,
    };
  } catch (error) {
    logger.error('Error getting subscription status:', error);
    throw error;
  }
}

/**
 * 6. Check if salon has access to a specific feature
 */
export async function checkFeatureAccess(salonId: string, featureName: string): Promise<boolean> {
  try {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        activeSubscription: {
          include: { plan: true },
        },
      },
    });

    if (!salon) {
      return false;
    }

    // Check if subscription is active and not expired
    if (!salon.activeSubscription) {
      // Check free plan features
      const freeFeatures = FREE_PLAN.features as Record<string, boolean>;
      return freeFeatures[featureName] === true;
    }

    const subscription = salon.activeSubscription;

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return false;
    }

    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      return false;
    }

    // Check plan features
    const planFeatures = subscription.plan.features as Record<string, boolean> || {};
    return planFeatures[featureName] === true;
  } catch (error) {
    logger.error('Error checking feature access:', error);
    return false;
  }
}

/**
 * 7. Get salon's current plan with limits
 */
export async function getSalonPlan(salonId: string) {
  try {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        activeSubscription: {
          include: { plan: true },
        },
      },
    });

    if (!salon) {
      throw new Error('Salon not found');
    }

    if (!salon.activeSubscription) {
      return {
        ...FREE_PLAN,
        subscriptionStatus: 'free',
      };
    }

    const subscription = salon.activeSubscription;
    const planFeatures = subscription.plan.features as Record<string, boolean> || {};

    return {
      id: subscription.plan.id,
      name: subscription.plan.name,
      slug: subscription.plan.slug,
      maxStaff: subscription.plan.maxStaff,
      maxLocations: subscription.plan.maxLocations,
      features: planFeatures,
      subscriptionStatus: subscription.status,
      expiresAt: subscription.expiresAt,
    };
  } catch (error) {
    logger.error('Error getting salon plan:', error);
    throw error;
  }
}

/**
 * 8a. Check usage limit for a feature
 */
export async function checkUsageLimit(salonId: string, featureName: string): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // End of current month

    const usage = await prisma.featureUsage.findUnique({
      where: {
        salonId_featureName_periodStart: {
          salonId,
          featureName,
          periodStart,
        },
      },
    });

    if (!usage) {
      // No usage record yet, check if there's a limit defined
      const plan = await getSalonPlan(salonId);
      const limit = getFeatureLimit(plan, featureName);
      return { allowed: true, used: 0, limit };
    }

    if (usage.usageLimit === null) {
      // Unlimited usage
      return { allowed: true, used: usage.usageCount, limit: null };
    }

    return {
      allowed: usage.usageCount < usage.usageLimit,
      used: usage.usageCount,
      limit: usage.usageLimit,
    };
  } catch (error) {
    logger.error('Error checking usage limit:', error);
    return { allowed: false, used: 0, limit: 0 };
  }
}

/**
 * 8b. Increment usage for a feature
 */
export async function incrementUsage(salonId: string, featureName: string): Promise<void> {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get plan to determine limit
    const plan = await getSalonPlan(salonId);
    const limit = getFeatureLimit(plan, featureName);

    await prisma.featureUsage.upsert({
      where: {
        salonId_featureName_periodStart: {
          salonId,
          featureName,
          periodStart,
        },
      },
      create: {
        salonId,
        featureName,
        usageCount: 1,
        usageLimit: limit,
        periodStart,
        periodEnd,
      },
      update: {
        usageCount: { increment: 1 },
        usageLimit: limit,
        periodEnd,
      },
    });
  } catch (error) {
    logger.error('Error incrementing usage:', error);
    throw error;
  }
}

// Helper to get feature limit from plan
function getFeatureLimit(plan: any, featureName: string): number | null {
  const limits: Record<string, number | null> = {
    'sms_notifications': plan.slug === 'free' ? 10 : plan.slug === 'basic' ? 100 : null,
    'email_campaigns': plan.slug === 'free' ? 0 : plan.slug === 'basic' ? 5 : null,
    'custom_reports': plan.slug === 'free' ? 0 : plan.slug === 'basic' ? 3 : null,
  };
  return limits[featureName] ?? null;
}

/**
 * 9. Process expired subscriptions
 */
export async function processExpiredSubscriptions(): Promise<{ expired: number }> {
  try {
    const now = new Date();

    const expiredSubscriptions = await prisma.salonSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      include: {
        salon: {
          include: { owner: { select: { phoneNumber: true } } },
        },
      },
    });

    let expiredCount = 0;

    for (const subscription of expiredSubscriptions) {
      try {
        // Update subscription status to EXPIRED
        await prisma.salonSubscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.EXPIRED,
          },
        });

        // Clear salon's subscription fields
        await prisma.salon.update({
          where: { id: subscription.salonId },
          data: {
            subscriptionStatus: 'expired',
            featureFlags: {},
            subscriptionId: null,
          },
        });

        // Send SMS notification
        const phoneNumber = subscription.salon.owner?.phoneNumber || subscription.salon.phoneNumber;
        if (phoneNumber) {
          const message = `GroomLink: Your subscription has expired. Renew now to continue enjoying premium features. Visit your dashboard to resubscribe.`;
          smsService.sendSMS({ to: phoneNumber, message }).catch((err) => {
            logger.error('Failed to send subscription expiry SMS', { err });
          });
        }

        expiredCount++;
        logger.info(`Subscription ${subscription.id} marked as expired`);
      } catch (error) {
        logger.error(`Error processing expired subscription ${subscription.id}:`, error);
      }
    }

    logger.info(`Processed ${expiredCount} expired subscriptions`);
    return { expired: expiredCount };
  } catch (error) {
    logger.error('Error processing expired subscriptions:', error);
    throw error;
  }
}

/**
 * 10. Send expiration reminders
 */
export async function sendExpirationReminders(): Promise<{ reminded: number }> {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringSubscriptions = await prisma.salonSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: {
          gte: now,
          lte: sevenDaysFromNow,
        },
        cancelAtPeriodEnd: false,
      },
      include: {
        salon: {
          include: { owner: { select: { phoneNumber: true } } },
        },
        plan: true,
      },
    });

    let remindedCount = 0;

    for (const subscription of expiringSubscriptions) {
      try {
        const daysRemaining = subscription.expiresAt
          ? Math.ceil((subscription.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const phoneNumber = subscription.salon.owner?.phoneNumber || subscription.salon.phoneNumber;
        if (phoneNumber) {
          const message = `GroomLink: Your ${subscription.plan.name} subscription expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Renew now to avoid interruption of premium features.`;
          smsService.sendSMS({ to: phoneNumber, message }).catch((err) => {
            logger.error('Failed to send subscription reminder SMS', { err });
          });
          remindedCount++;
        }

        logger.info(`Sent expiration reminder for subscription ${subscription.id}`);
      } catch (error) {
        logger.error(`Error sending reminder for subscription ${subscription.id}:`, error);
      }
    }

    logger.info(`Sent ${remindedCount} expiration reminders`);
    return { reminded: remindedCount };
  } catch (error) {
    logger.error('Error sending expiration reminders:', error);
    throw error;
  }
}
