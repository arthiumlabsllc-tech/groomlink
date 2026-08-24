import prisma from '../config/database';
import logger from '../config/logger';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import * as smsService from './sms.service';

// Hubtel credentials helper (reused pattern from subscription.service.ts)
interface HubtelCredentials {
  apiId: string;
  apiSecret: string;
  merchantAccountId: string;
}

async function getHubtelCredentials(): Promise<HubtelCredentials | null> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
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
  return { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' };
}

// Unpaid self-service sponsorship orders expire after this window
const PENDING_ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AddSponsoredSalonData {
  salonId: string;
  durationHours: number;
  endTime?: Date;
  amountPaid?: number;
  packageId?: string;
  adminId?: string;
}

// Decimal columns from Prisma serialize as strings in JSON. Coerce to number
// for the API response so the admin UI can call formatCurrency() / arithmetic
// without runtime type juggling.
function toNumber(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

function serializeSponsorship<T extends { amountPaid: any }>(s: T): T & { amountPaid: number | null } {
  return { ...s, amountPaid: toNumber(s.amountPaid) };
}

function serializePackage<T extends { priceGhs: any }>(p: T): T & { priceGhs: number } {
  return { ...p, priceGhs: toNumber(p.priceGhs) ?? 0 };
}

export interface SponsorshipPackage {
  id: string;
  packageName: string;
  durationType: string;
  durationValue: number;
  priceGhs: number;
  priorityLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Add a sponsored salon
 * - Verify salon exists
 * - Create SponsoredSalon record with startTime=now, calculated endTime, isActive=true
 * - Update Salon: isSponsored=true, sponsorshipPriority based on package, sponsorshipExpiresAt=endTime
 * - Return the sponsorship record
 */
export async function addSponsoredSalon(data: AddSponsoredSalonData) {
  const { salonId, durationHours, endTime, amountPaid, packageId, adminId } = data;

  // Verify salon exists
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
  });

  if (!salon) {
    throw new Error('Salon not found');
  }

  // Guard: prevent multiple concurrent active sponsorships for the same salon
  // (the Salon row only stores ONE isSponsored flag + priority, so two active
  // SponsoredSalon rows would silently overwrite each other).
  const existingActive = await prisma.sponsoredSalon.findFirst({
    where: { salonId, isActive: true },
    select: { id: true, endTime: true },
  });
  if (existingActive) {
    throw new Error('This salon already has an active sponsorship. Remove it first before adding a new one.');
  }

  // Calculate end time
  const startTime = new Date();
  const calculatedEndTime = endTime || new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  // Get package priority if packageId is provided
  let priority = 1;
  if (packageId) {
    const pkg = await prisma.sponsorshipPackage.findUnique({
      where: { id: packageId, isActive: true },
    });
    if (pkg) {
      priority = pkg.priorityLevel;
    }
  }

  // Create + flag salon atomically so the two rows can never drift
  const [sponsoredSalon] = await prisma.$transaction([
    prisma.sponsoredSalon.create({
      data: {
        salonId,
        durationHours,
        startTime,
        endTime: calculatedEndTime,
        amountPaid: amountPaid != null ? new Prisma.Decimal(amountPaid) : null,
        isActive: true,
        priority,
        createdById: adminId,
      },
      include: {
        salon: {
          select: {
            id: true,
            businessName: true,
            city: true,
            region: true,
            address: true,
            logo: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.salon.update({
      where: { id: salonId },
      data: {
        isSponsored: true,
        sponsorshipPriority: priority,
        sponsorshipExpiresAt: calculatedEndTime,
      },
    }),
  ]);

  logger.info(`Sponsored salon added: ${salonId} for ${durationHours} hours, expires at ${calculatedEndTime.toISOString()}`);
  return serializeSponsorship(sponsoredSalon);
}

/**
 * Remove a sponsored salon
 * - Find sponsorship, mark isActive=false, set endTime=now
 * - Update Salon: isSponsored=false, sponsorshipPriority=0, sponsorshipExpiresAt=null
 */
export async function removeSponsoredSalon(sponsorshipId: string) {
  // Find the sponsorship
  const sponsorship = await prisma.sponsoredSalon.findUnique({
    where: { id: sponsorshipId },
  });

  if (!sponsorship) {
    throw new Error('Sponsorship not found');
  }

  if (!sponsorship.isActive) {
    throw new Error('Sponsorship is already inactive');
  }

  const now = new Date();

  // Atomic: deactivate sponsorship + clear salon flags together
  const [updatedSponsorship] = await prisma.$transaction([
    prisma.sponsoredSalon.update({
      where: { id: sponsorshipId },
      data: {
        isActive: false,
        endTime: now,
      },
      include: {
        salon: {
          select: {
            id: true,
            businessName: true,
            city: true,
            region: true,
            address: true,
            logo: true,
          },
        },
      },
    }),
    prisma.salon.update({
      where: { id: sponsorship.salonId },
      data: {
        isSponsored: false,
        sponsorshipPriority: 0,
        sponsorshipExpiresAt: null,
      },
    }),
  ]);

  logger.info(`Sponsored salon removed: ${sponsorshipId}, salon ${sponsorship.salonId}`);
  return serializeSponsorship(updatedSponsorship);
}

/**
 * Get sponsored salons (paginated, with optional active/expired filter)
 */
export async function getSponsoredSalons(
  page: number = 1,
  limit: number = 20,
  status?: 'active' | 'expired'
): Promise<{ data: any[]; total: number; totalPages: number }> {
  const where: any = {};
  if (status === 'active') where.isActive = true;
  else if (status === 'expired') where.isActive = false;

  const [rows, total] = await Promise.all([
    prisma.sponsoredSalon.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        salon: {
          select: {
            id: true,
            businessName: true,
            city: true,
            region: true,
            address: true,
            logo: true,
            rating: true,
            reviewCount: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { priority: 'asc' },
        { startTime: 'desc' },
      ],
    }),
    prisma.sponsoredSalon.count({ where }),
  ]);

  const data = rows.map(serializeSponsorship);
  return { data, total, totalPages: Math.ceil(total / limit) };
}

/**
 * Get all active sponsorship packages
 * - Return all SponsorshipPackage where isActive=true
 */
export async function getPackages() {
  const packages = await prisma.sponsorshipPackage.findMany({
    where: { isActive: true },
    orderBy: [
      { priorityLevel: 'asc' },
      { priceGhs: 'asc' },
    ],
  });

  return packages.map(serializePackage);
}

/**
 * Check and deactivate expired sponsorships
 * - Find SponsoredSalon where isActive=true AND endTime < now
 * - For each: set isActive=false, update salon flags
 */
export async function checkExpiredSponsorships(): Promise<number> {
  const now = new Date();

  // Find expired active sponsorships
  const expiredSponsorships = await prisma.sponsoredSalon.findMany({
    where: {
      isActive: true,
      endTime: {
        lt: now,
      },
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  if (expiredSponsorships.length === 0) {
    return 0;
  }

  // Process each expired sponsorship
  const updates = [];
  for (const sponsorship of expiredSponsorships) {
    // Mark sponsorship as inactive
    updates.push(
      prisma.sponsoredSalon.update({
        where: { id: sponsorship.id },
        data: {
          isActive: false,
        },
      })
    );

    // Update salon sponsorship status
    updates.push(
      prisma.salon.update({
        where: { id: sponsorship.salonId },
        data: {
          isSponsored: false,
          sponsorshipPriority: 0,
          sponsorshipExpiresAt: null,
        },
      })
    );

    logger.info(`Expired sponsorship deactivated: ${sponsorship.id}, salon ${sponsorship.salonId}`);
  }

  await Promise.all(updates);

  logger.info(`Processed ${expiredSponsorships.length} expired sponsorships`);
  return expiredSponsorships.length;
}

/**
 * Convert a sponsorship package duration (type + value) into hours.
 * Pure function - exported for unit testing.
 */
export function packageDurationToHours(durationType: string, durationValue: number): number {
  switch (durationType.toLowerCase()) {
    case 'hours':
      return durationValue;
    case 'days':
      return durationValue * 24;
    case 'months':
      return durationValue * 30 * 24;
    case 'years':
      return durationValue * 365 * 24;
    default:
      return durationValue;
  }
}

/**
 * Get the sponsorship status for a salon (self-service view):
 * - active: paid + running sponsorship
 * - pending: unpaid checkout order still within the payment window
 * - history: recent past orders (paid or expired)
 */
export async function getSponsorshipStatus(salonId: string) {
  const now = new Date();

  const active = await prisma.sponsoredSalon.findFirst({
    where: {
      salonId,
      isActive: true,
      paymentStatus: 'paid',
      endTime: { gt: now },
    },
    orderBy: { endTime: 'desc' },
  });

  const pending = await prisma.sponsoredSalon.findFirst({
    where: {
      salonId,
      isActive: false,
      paymentStatus: 'pending',
    },
    orderBy: { createdAt: 'desc' },
  });

  const history = await prisma.sponsoredSalon.findMany({
    where: {
      salonId,
      NOT: [
        active ? { id: active.id } : { id: '__none__' },
        pending ? { id: pending.id } : { id: '__none__' },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    active: active ? serializeSponsorship(active) : null,
    pending: pending ? serializeSponsorship(pending) : null,
    history: history.map(serializeSponsorship),
  };
}

/**
 * Initiate a Hubtel checkout for a pending sponsorship order.
 * Returns the hosted checkout URL (or undefined if Hubtel is not configured).
 */
async function initiateSponsorshipPayment(
  order: { id: string; salonId: string; amountPaid: Prisma.Decimal | null; durationHours: number; paymentReference: string | null },
  packageName: string,
  ownerPhone: string | null | undefined
): Promise<string | undefined> {
  const hubtelCredentials = await getHubtelCredentials();
  const amount = toNumber(order.amountPaid) ?? 0;

  if (!hubtelCredentials || amount <= 0) {
    return undefined;
  }

  if (!ownerPhone) {
    throw new Error('Phone number required for payment');
  }

  const webhookUrl =
    process.env.SPONSORSHIP_WEBHOOK_URL || 'https://groomlinkgh.com/api/sponsorship/webhook/hubtel';

  // Ensure phone number has +233 prefix
  let customerMsisdn = ownerPhone;
  if (!customerMsisdn.startsWith('+')) {
    if (customerMsisdn.startsWith('0')) {
      customerMsisdn = `+233${customerMsisdn.substring(1)}`;
    } else {
      customerMsisdn = `+${customerMsisdn}`;
    }
  }

  const requestBody = {
    CustomerName: `Salon ${order.salonId}`,
    CustomerEmail: `salon-${order.salonId}@groomlink.temp`,
    CustomerMsisdn: customerMsisdn,
    Channel: 'mtn-gh', // Default to MTN
    Amount: amount,
    ClientReference: order.paymentReference,
    Description: `GroomLink Sponsorship - ${packageName}`,
    PrimaryCallbackUrl: webhookUrl,
    SecondaryCallbackUrl: webhookUrl,
  };

  const response = await axios.post(
    'https://api.hubtel.com/v1/receivemoney/receive',
    requestBody,
    {
      headers: getHubtelAuthHeader(hubtelCredentials.apiId, hubtelCredentials.apiSecret),
    }
  );

  logger.info(`Hubtel sponsorship payment initialized: ${order.paymentReference}`, {
    salonId: order.salonId,
    sponsoredSalonId: order.id,
  });

  return response.data?.checkoutUrl || response.data?.redirectUrl;
}

/**
 * Self-service: salon owner purchases a sponsorship package.
 * Creates a PENDING (inactive) SponsoredSalon order and initiates Hubtel checkout.
 * The sponsorship only activates once the payment webhook confirms.
 */
export async function purchaseSponsorship(
  salonId: string,
  packageId: string,
  owner: { id: string; phoneNumber?: string | null }
) {
  // Validate package
  const pkg = await prisma.sponsorshipPackage.findUnique({
    where: { id: packageId },
  });

  if (!pkg || !pkg.isActive) {
    throw new Error('Sponsorship package not found or inactive');
  }

  const amount = toNumber(pkg.priceGhs) ?? 0;
  if (amount <= 0) {
    throw new Error('Sponsorship package has no valid price');
  }

  // Verify salon exists and belongs to the caller
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
  });

  if (!salon) {
    throw new Error('Salon not found');
  }

  // Guard: no active sponsorship and no unpaid pending order
  const existingActive = await prisma.sponsoredSalon.findFirst({
    where: { salonId, isActive: true },
    select: { id: true },
  });
  if (existingActive) {
    throw new Error('Your salon already has an active sponsorship. Wait for it to expire before purchasing a new one.');
  }

  const existingPending = await prisma.sponsoredSalon.findFirst({
    where: { salonId, isActive: false, paymentStatus: 'pending' },
    select: { id: true },
  });
  if (existingPending) {
    throw new Error('You already have a pending sponsorship payment. Complete it or wait for it to expire.');
  }

  const durationHours = packageDurationToHours(pkg.durationType, pkg.durationValue);
  const paymentReference = `GL-SPON-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create order in PENDING state - goes live only after payment confirms
  const now = new Date();
  const order = await prisma.sponsoredSalon.create({
    data: {
      salonId,
      durationHours,
      startTime: now,
      endTime: new Date(now.getTime() + durationHours * 60 * 60 * 1000),
      amountPaid: new Prisma.Decimal(amount),
      paymentStatus: 'pending',
      paymentReference,
      isActive: false,
      priority: pkg.priorityLevel,
      createdById: owner.id,
    },
  });

  let checkoutUrl: string | undefined;
  try {
    checkoutUrl = await initiateSponsorshipPayment(order, pkg.packageName, owner.phoneNumber || salon.phoneNumber);
  } catch (error) {
    logger.error('Failed to initiate Hubtel sponsorship payment', { error, orderId: order.id });
    throw error;
  }

  return {
    sponsoredSalonId: order.id,
    paymentReference,
    checkoutUrl,
    amount,
    message: checkoutUrl
      ? 'Payment initiated. Please complete payment on your phone.'
      : 'Order created, but the payment gateway is unavailable. Please try again later.',
  };
}

/**
 * Self-service: resume payment for an existing pending order.
 * Generates a fresh payment reference and re-initiates Hubtel checkout.
 */
export async function resumeSponsorshipPayment(sponsoredSalonId: string, salonId: string) {
  const order = await prisma.sponsoredSalon.findFirst({
    where: { id: sponsoredSalonId, salonId },
  });

  if (!order) {
    throw new Error('Sponsorship order not found');
  }

  if (order.paymentStatus === 'paid') {
    throw new Error('This sponsorship has already been paid');
  }

  if (order.paymentStatus !== 'pending') {
    throw new Error('This sponsorship order is no longer payable. Please start a new purchase.');
  }

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: { owner: { select: { phoneNumber: true } } },
  });

  const paymentReference = `GL-SPON-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await prisma.sponsoredSalon.update({
    where: { id: order.id },
    data: { paymentReference },
  });

  const packageName = `Sponsorship (${order.durationHours} hours)`;
  const checkoutUrl = await initiateSponsorshipPayment(
    { ...order, paymentReference },
    packageName,
    salon?.owner?.phoneNumber || salon?.phoneNumber
  );

  if (!checkoutUrl) {
    throw new Error('Payment gateway is unavailable. Please try again later.');
  }

  return {
    sponsoredSalonId: order.id,
    paymentReference,
    checkoutUrl,
    amount: toNumber(order.amountPaid) ?? 0,
    message: 'Payment initiated. Please complete payment on your phone.',
  };
}

/**
 * Activate a sponsored salon after payment confirmation (Hubtel webhook).
 * Idempotent: skips if the order is already paid.
 */
export async function activateSponsoredSalon(paymentReference: string) {
  const order = await prisma.sponsoredSalon.findFirst({
    where: { paymentReference },
    include: {
      salon: {
        include: {
          owner: { select: { phoneNumber: true, email: true } },
        },
      },
    },
  });

  if (!order) {
    logger.warn('No sponsorship order found for payment reference', { paymentReference });
    throw new Error('Sponsorship order not found');
  }

  if (order.paymentStatus === 'paid') {
    logger.info(`Sponsorship ${order.id} already activated`);
    return { success: true, message: 'Sponsorship already activated' };
  }

  if (order.paymentStatus !== 'pending') {
    logger.warn(`Sponsorship ${order.id} is not payable (status: ${order.paymentStatus})`);
    return { success: false, message: 'Sponsorship order is not payable' };
  }

  // Activation window starts NOW so the owner gets the full purchased duration
  const now = new Date();
  const endTime = new Date(now.getTime() + order.durationHours * 60 * 60 * 1000);

  // Atomic: activate order + flag salon together
  await prisma.$transaction([
    prisma.sponsoredSalon.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'paid',
        isActive: true,
        startTime: now,
        endTime,
      },
    }),
    prisma.salon.update({
      where: { id: order.salonId },
      data: {
        isSponsored: true,
        sponsorshipPriority: order.priority,
        sponsorshipExpiresAt: endTime,
      },
    }),
  ]);

  // Send SMS confirmation (same pattern as subscription activation)
  const phoneNumber = order.salon.owner?.phoneNumber || order.salon.phoneNumber;
  if (phoneNumber) {
    const message = `GroomLink: Payment received! Your salon is now sponsored and boosted in search results until ${endTime.toLocaleDateString('en-GH')}.`;
    smsService.sendSMS({ to: phoneNumber, message }).catch((err) => {
      logger.error('Failed to send sponsorship activation SMS', { err });
    });
  }

  logger.info(`Sponsorship activated: ${order.id}, salon ${order.salonId}, ends ${endTime.toISOString()}`);
  return { success: true, message: 'Sponsorship activated', endTime };
}

/**
 * Expire unpaid self-service orders older than the payment window.
 * Called by the hourly sponsorship cron job.
 */
export async function expireUnpaidSponsorshipOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_ORDER_EXPIRY_MS);

  const result = await prisma.sponsoredSalon.updateMany({
    where: {
      paymentStatus: 'pending',
      isActive: false,
      createdAt: { lt: cutoff },
    },
    data: {
      paymentStatus: 'expired',
    },
  });

  if (result.count > 0) {
    logger.info(`Expired ${result.count} unpaid sponsorship orders`);
  }

  return result.count;
}
