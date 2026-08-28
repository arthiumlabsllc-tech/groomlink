/**
 * Admin Subscription Service
 *
 * Backs the admin dashboard subscription pages (/subscriptions/*).
 * Maps the Prisma subscription models into the flat DTO shape the admin
 * frontend expects (monthlyPrice/yearlyPrice/platformFeePercent and
 * features as a human-readable string list).
 */

import prisma from '../config/database';
import logger from '../config/logger';
import {
  BillingPeriod,
  InvoiceStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Feature flag <-> human-readable label mapping
// ---------------------------------------------------------------------------

const FEATURE_LABELS: Record<string, string> = {
  instant_payouts: 'Instant Payouts',
  priority_support: 'Priority Support',
  advanced_analytics: 'Advanced Analytics',
  analytics: 'Advanced Analytics', // legacy key in seed data
  custom_branding: 'Custom Branding',
  staff_management: 'Staff Management',
  multi_location: 'Multi-Location',
  loyalty_program: 'Loyalty Program',
  marketing_tools: 'Marketing Tools',
  api_access: 'API Access',
  dedicated_account_manager: 'Dedicated Account Manager',
};

const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(FEATURE_LABELS).map(([key, label]) => [label.toLowerCase(), key])
);

function featuresToLabels(features: unknown): string[] {
  const flags = (features && typeof features === 'object' ? features : {}) as Record<string, unknown>;
  const labels: string[] = [];
  for (const [key, value] of Object.entries(flags)) {
    if (key === 'description') continue;
    if (value === true) {
      const label = FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      if (!labels.includes(label)) labels.push(label);
    }
  }
  return labels;
}

function labelsToFeatures(labels: string[] | undefined): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const label of labels ?? []) {
    const key = LABEL_TO_KEY[label.toLowerCase()] || label.toLowerCase().replace(/\s+/g, '_');
    flags[key] = true;
  }
  return flags;
}

// Plan description is stored inside the features JSON under a reserved
// "description" key (SubscriptionPlan has no dedicated column).
function extractDescription(features: unknown): string | null {
  const flags = (features && typeof features === 'object' ? features : {}) as Record<string, unknown>;
  return typeof flags.description === 'string' ? flags.description : null;
}

// ---------------------------------------------------------------------------
// DTO mapping
// ---------------------------------------------------------------------------

export interface AdminPlanDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  platformFeePercent: number;
  maxStaff: number;
  maxLocations: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

type PlanRow = Awaited<ReturnType<typeof prisma.subscriptionPlan.findUniqueOrThrow>>;

export function mapPlanToDto(plan: PlanRow): AdminPlanDto {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: extractDescription(plan.features),
    monthlyPrice: Number(plan.priceMonthlyGhs),
    yearlyPrice: Number(plan.priceYearlyGhs ?? 0),
    platformFeePercent: Number(plan.transactionFeePercentage),
    maxStaff: plan.maxStaff,
    maxLocations: plan.maxLocations,
    features: featuresToLabels(plan.features),
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

// Frontend expects CANCELLED/PENDING; Prisma enum uses CANCELED/PENDING_PAYMENT
function mapStatus(status: SubscriptionStatus): string {
  switch (status) {
    case SubscriptionStatus.CANCELED:
      return 'CANCELLED';
    case SubscriptionStatus.PENDING_PAYMENT:
      return 'PENDING';
    default:
      return status;
  }
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function getAllPlans(includeInactive = true): Promise<AdminPlanDto[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return plans.map(mapPlanToDto);
}

export interface AdminCreatePlanInput {
  name: string;
  slug: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  platformFeePercent: number;
  maxStaff: number;
  maxLocations: number;
  features?: string[];
}

export async function createPlan(input: AdminCreatePlanInput): Promise<AdminPlanDto> {
  const slug = input.slug.trim().toLowerCase();
  const existing = await prisma.subscriptionPlan.findUnique({ where: { slug } });
  if (existing) {
    throw new Error(`A plan with slug "${slug}" already exists`);
  }

  const featuresJson: Record<string, boolean | string> = labelsToFeatures(input.features);
  if (input.description) featuresJson.description = input.description;

  const maxSort = await prisma.subscriptionPlan.aggregate({ _max: { sortOrder: true } });

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name: input.name.trim(),
      slug,
      priceMonthlyGhs: new Prisma.Decimal(input.monthlyPrice || 0),
      priceYearlyGhs: new Prisma.Decimal(input.yearlyPrice || 0),
      transactionFeePercentage: new Prisma.Decimal(input.platformFeePercent || 0),
      maxStaff: input.maxStaff || 1,
      maxLocations: input.maxLocations || 1,
      features: featuresJson as Prisma.InputJsonObject,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  logger.info(`Admin created subscription plan ${plan.slug} (${plan.id})`);
  return mapPlanToDto(plan);
}

export interface AdminUpdatePlanInput {
  name?: string;
  description?: string | null;
  monthlyPrice?: number;
  yearlyPrice?: number;
  platformFeePercent?: number;
  maxStaff?: number;
  maxLocations?: number;
  features?: string[];
  isActive?: boolean;
}

export async function updatePlan(planId: string, input: AdminUpdatePlanInput): Promise<AdminPlanDto> {
  const current = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!current) {
    throw new Error('Subscription plan not found');
  }

  const data: Prisma.SubscriptionPlanUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.monthlyPrice !== undefined) data.priceMonthlyGhs = new Prisma.Decimal(input.monthlyPrice);
  if (input.yearlyPrice !== undefined) data.priceYearlyGhs = new Prisma.Decimal(input.yearlyPrice);
  if (input.platformFeePercent !== undefined) {
    data.transactionFeePercentage = new Prisma.Decimal(input.platformFeePercent);
  }
  if (input.maxStaff !== undefined) data.maxStaff = input.maxStaff;
  if (input.maxLocations !== undefined) data.maxLocations = input.maxLocations;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  if (input.features !== undefined || input.description !== undefined) {
    const flags: Record<string, unknown> =
      input.features !== undefined ? labelsToFeatures(input.features) : ((current.features as Record<string, unknown>) ?? {});
    // Rebuild feature flags cleanly (drops stale "description" key)
    const clean: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, value] of Object.entries(flags)) {
      if (key !== 'description') clean[key] = value as Prisma.InputJsonValue;
    }
    const description = input.description ?? extractDescription(current.features);
    if (description) clean.description = description;
    data.features = clean as Prisma.InputJsonObject;
  }

  const plan = await prisma.subscriptionPlan.update({ where: { id: planId }, data });
  logger.info(`Admin updated subscription plan ${plan.slug} (${plan.id})`);
  return mapPlanToDto(plan);
}

// ---------------------------------------------------------------------------
// Overview stats
// ---------------------------------------------------------------------------

export async function getOverview() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalSubscribers, activeSubscriptions, revenueAgg, freeSalons] = await Promise.all([
    prisma.salonSubscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
    prisma.salonSubscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: { select: { slug: true } } },
    }),
    prisma.subscriptionInvoice.aggregate({
      _sum: { amount: true },
      where: { status: InvoiceStatus.PAID, paidAt: { gte: startOfMonth } },
    }),
    prisma.salon.count({ where: { subscriptionStatus: 'free' } }),
  ]);

  let activePro = 0;
  let activePremium = 0;
  let expiringSoon = 0;
  for (const sub of activeSubscriptions) {
    if (sub.plan.slug === 'pro') activePro++;
    if (sub.plan.slug === 'premium') activePremium++;
    if (sub.expiresAt && sub.expiresAt >= now && sub.expiresAt <= sevenDaysFromNow) expiringSoon++;
  }

  return {
    totalSubscribers,
    revenueThisMonth: Number(revenueAgg._sum.amount ?? 0),
    activePro,
    activePremium,
    expiringSoon,
    subscribersByTier: {
      free: freeSalons,
      pro: activePro,
      premium: activePremium,
    },
  };
}

// ---------------------------------------------------------------------------
// Subscriptions list
// ---------------------------------------------------------------------------

export async function getSubscriptions(page = 1, limit = 20, status?: string) {
  const where: Prisma.SalonSubscriptionWhereInput = {};
  if (status) {
    // Accept frontend statuses (CANCELLED/PENDING) and map back to the enum
    const enumStatus =
      status === 'CANCELLED' ? SubscriptionStatus.CANCELED
      : status === 'PENDING' ? SubscriptionStatus.PENDING_PAYMENT
      : (status as SubscriptionStatus);
    where.status = enumStatus;
  }

  const [total, rows] = await Promise.all([
    prisma.salonSubscription.count({ where }),
    prisma.salonSubscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        salon: { select: { id: true, businessName: true, email: true, phoneNumber: true } },
        plan: true,
      },
    }),
  ]);

  return {
    data: rows.map((sub) => ({
      id: sub.id,
      salonId: sub.salonId,
      planId: sub.planId,
      status: mapStatus(sub.status),
      currentPeriodStart: sub.startsAt,
      currentPeriodEnd: sub.expiresAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      salon: sub.salon,
      plan: mapPlanToDto(sub.plan),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function getInvoices(
  page = 1,
  limit = 20,
  status?: string,
  startDate?: string,
  endDate?: string,
  planSlug?: string
) {
  const where: Prisma.SubscriptionInvoiceWhereInput = {};
  if (status) where.status = status as InvoiceStatus;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
  }
  if (planSlug) where.subscription = { plan: { slug: planSlug } };

  const [total, rows] = await Promise.all([
    prisma.subscriptionInvoice.count({ where }),
    prisma.subscriptionInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        salon: { select: { businessName: true } },
        subscription: { include: { plan: { select: { name: true } } } },
      },
    }),
  ]);

  return {
    data: rows.map((inv) => ({
      id: inv.id,
      subscriptionId: inv.subscriptionId,
      salonId: inv.salonId,
      salonName: inv.salon.businessName,
      planName: inv.subscription.plan.name,
      amount: Number(inv.amount),
      status: inv.status,
      paymentReference: inv.paymentReference,
      paymentMethod: inv.paymentReference?.startsWith('GL-SUB-PS-') ? 'paystack' : inv.paymentReference?.startsWith('GL-SUB-') ? 'hubtel' : null,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getSalonInvoices(salonId: string) {
  const rows = await prisma.subscriptionInvoice.findMany({
    where: { salonId },
    orderBy: { createdAt: 'desc' },
    include: {
      salon: { select: { businessName: true } },
      subscription: { include: { plan: { select: { name: true } } } },
    },
  });
  return rows.map((inv) => ({
    id: inv.id,
    subscriptionId: inv.subscriptionId,
    salonId: inv.salonId,
    salonName: inv.salon.businessName,
    planName: inv.subscription.plan.name,
    amount: Number(inv.amount),
    status: inv.status,
    paymentReference: inv.paymentReference,
    paymentMethod: null,
    paidAt: inv.paidAt,
    createdAt: inv.createdAt,
    periodStart: inv.periodStart,
    periodEnd: inv.periodEnd,
  }));
}

// ---------------------------------------------------------------------------
// Recent / expiring
// ---------------------------------------------------------------------------

export async function getRecentSubscriptions(limit = 10) {
  const rows = await prisma.salonSubscription.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      salon: { select: { businessName: true } },
      plan: { select: { name: true } },
    },
  });
  return rows.map((sub) => ({
    id: sub.id,
    salonName: sub.salon.businessName,
    planName: sub.plan.name,
    status: mapStatus(sub.status),
    changedAt: sub.updatedAt,
  }));
}

export async function getExpiringSoonSubscriptions(days = 7) {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const rows = await prisma.salonSubscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      expiresAt: { gte: now, lte: horizon },
    },
    orderBy: { expiresAt: 'asc' },
    include: {
      salon: { select: { businessName: true } },
      plan: { select: { name: true } },
    },
  });
  return rows.map((sub) => ({
    id: sub.id,
    salonId: sub.salonId,
    salonName: sub.salon.businessName,
    planName: sub.plan.name,
    expiryDate: sub.expiresAt,
    daysRemaining: sub.expiresAt
      ? Math.max(0, Math.ceil((sub.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      : 0,
  }));
}

// ---------------------------------------------------------------------------
// Salon-level operations
// ---------------------------------------------------------------------------

export async function getSalonSubscription(salonId: string) {
  const sub = await prisma.salonSubscription.findFirst({
    where: {
      salonId,
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      salon: { select: { id: true, businessName: true, email: true, phoneNumber: true } },
      plan: true,
    },
  });
  if (!sub) return null;
  return {
    id: sub.id,
    salonId: sub.salonId,
    planId: sub.planId,
    status: mapStatus(sub.status),
    currentPeriodStart: sub.startsAt,
    currentPeriodEnd: sub.expiresAt,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    salon: sub.salon,
    plan: mapPlanToDto(sub.plan),
  };
}

/** Admin manually assigns a plan to a salon (free grant, no payment). */
export async function assignPlanToSalon(salonId: string, planSlug: string) {
  const [salon, plan] = await Promise.all([
    prisma.salon.findUnique({ where: { id: salonId } }),
    prisma.subscriptionPlan.findUnique({ where: { slug: planSlug.toLowerCase() } }),
  ]);
  if (!salon) throw new Error('Salon not found');
  if (!plan) throw new Error(`Plan "${planSlug}" not found`);

  // Deactivate any existing active/pending subscription
  await prisma.salonSubscription.updateMany({
    where: {
      salonId,
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT] },
    },
    data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subscription = await prisma.salonSubscription.create({
    data: {
      salonId,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      billingPeriod: BillingPeriod.MONTHLY,
      amountPaid: 0,
      startsAt: now,
      expiresAt,
    },
    include: {
      salon: { select: { id: true, businessName: true, email: true, phoneNumber: true } },
      plan: true,
    },
  });

  await prisma.salon.update({
    where: { id: salonId },
    data: {
      subscriptionId: subscription.id,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: expiresAt,
      featureFlags: (plan.features as Prisma.InputJsonObject) ?? {},
    },
  });

  logger.info(`Admin assigned plan ${plan.slug} to salon ${salonId}`);
  return {
    id: subscription.id,
    salonId: subscription.salonId,
    planId: subscription.planId,
    status: mapStatus(subscription.status),
    currentPeriodStart: subscription.startsAt,
    currentPeriodEnd: subscription.expiresAt,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    salon: subscription.salon,
    plan: mapPlanToDto(subscription.plan),
  };
}

/** Extend (or restore) a salon's active subscription by N days. */
export async function extendSubscription(salonId: string, days: number) {
  const sub = await prisma.salonSubscription.findFirst({
    where: { salonId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED] } },
    orderBy: { createdAt: 'desc' },
    include: {
      salon: { select: { id: true, businessName: true, email: true, phoneNumber: true } },
      plan: true,
    },
  });
  if (!sub) throw new Error('No subscription found for this salon');

  const base = sub.expiresAt && sub.expiresAt > new Date() ? sub.expiresAt : new Date();
  const expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  const updated = await prisma.salonSubscription.update({
    where: { id: sub.id },
    data: { status: SubscriptionStatus.ACTIVE, expiresAt },
  });

  await prisma.salon.update({
    where: { id: salonId },
    data: {
      subscriptionId: updated.id,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: expiresAt,
      featureFlags: (sub.plan.features as Prisma.InputJsonObject) ?? {},
    },
  });

  logger.info(`Admin extended subscription ${updated.id} by ${days} days (now expires ${expiresAt.toISOString()})`);
  return {
    id: updated.id,
    salonId: updated.salonId,
    planId: updated.planId,
    status: mapStatus(updated.status),
    currentPeriodStart: updated.startsAt,
    currentPeriodEnd: updated.expiresAt,
    cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    salon: sub.salon,
    plan: mapPlanToDto(sub.plan),
  };
}
