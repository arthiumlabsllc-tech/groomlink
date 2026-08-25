/**
 * ai-accountant.service.ts
 *
 * AI Accountant for GroomLink's admin panel.
 *
 * - Financial data layer: safe Prisma-only queries over payments, escrow,
 *   fees, refunds, payouts, subscriptions and sponsorships.
 * - OpenAI tool-calling chat: the LLM may only invoke the predefined data
 *   tools below (no raw SQL, no write access).
 * - On-demand accountant-grade financial reports (markdown).
 *
 * Graceful degradation: when OPENAI_API_KEY is not configured, chat/report
 * functions throw AiNotConfiguredError (mapped to HTTP 503 by the controller)
 * while all data-layer functions keep working.
 */

import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import prisma from '../config/database';
import logger from '../config/logger';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AiNotConfiguredError extends Error {
  constructor() {
    super('AI Accountant is not configured. Set OPENAI_API_KEY in the API environment to enable it.');
    this.name = 'AiNotConfiguredError';
  }
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export type ReportPeriod = '7d' | '30d' | '90d' | 'ytd' | 'all';

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  '7d': 'the last 7 days',
  '30d': 'the last 30 days',
  '90d': 'the last 90 days',
  ytd: 'year to date',
  all: 'all time',
};

export function normalizePeriod(value: unknown): ReportPeriod {
  if (value === '7d' || value === '30d' || value === '90d' || value === 'ytd' || value === 'all') {
    return value;
  }
  return '30d';
}

export function getPeriodStart(period: ReportPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    case '90d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d;
    }
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
      return null;
  }
}

function describePeriod(period: ReportPeriod): string {
  return PERIOD_LABELS[period];
}

const toNum = (v: unknown): number => Number(v ?? 0);
const round2 = (v: number): number => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------
// Data layer: revenue
// ---------------------------------------------------------------------------

export async function getRevenueSummary(period: ReportPeriod) {
  const start = getPeriodStart(period);
  const timeFilter = start ? { completedAt: { gte: start } } : {};

  const [current, byGateway, payments] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCESS, ...timeFilter },
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ['paymentGateway'],
      where: { status: PaymentStatus.SUCCESS, ...timeFilter },
      _sum: { amount: true },
      _count: true,
    }),
    start
      ? prisma.payment.findMany({
          where: { status: PaymentStatus.SUCCESS, ...timeFilter },
          select: { amount: true, completedAt: true },
        })
      : Promise.resolve([]),
  ]);

  // Previous-period comparison (same length window immediately before `start`)
  let previousTotal = 0;
  if (start) {
    const windowMs = Date.now() - start.getTime();
    const prevStart = new Date(start.getTime() - windowMs);
    const prev = await prisma.payment.aggregate({
      where: {
        status: PaymentStatus.SUCCESS,
        completedAt: { gte: prevStart, lt: start },
      },
      _sum: { amount: true },
    });
    previousTotal = toNum(prev._sum.amount);
  }

  // Daily trend (bucketed in JS, capped to 90 buckets)
  const buckets = new Map<string, { revenue: number; count: number }>();
  for (const p of payments) {
    if (!p.completedAt) continue;
    const key = p.completedAt.toISOString().split('T')[0];
    const bucket = buckets.get(key) || { revenue: 0, count: 0 };
    bucket.revenue += toNum(p.amount);
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  const trend = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-90)
    .map(([date, b]) => ({ date, revenue: round2(b.revenue), count: b.count }));

  const totalRevenue = toNum(current._sum.amount);
  return {
    period,
    periodLabel: describePeriod(period),
    currency: 'GHS',
    totalRevenue: round2(totalRevenue),
    transactionCount: current._count,
    averageTransaction: round2(toNum(current._avg.amount)),
    previousPeriodRevenue: round2(previousTotal),
    changeVsPreviousPeriod:
      previousTotal > 0 ? round2(((totalRevenue - previousTotal) / previousTotal) * 100) : null,
    byGateway: byGateway.map((g) => ({
      gateway: g.paymentGateway || 'unknown',
      revenue: round2(toNum(g._sum.amount)),
      count: g._count,
    })),
    dailyTrend: trend,
  };
}

// ---------------------------------------------------------------------------
// Data layer: platform earnings (booking fee + commission)
// ---------------------------------------------------------------------------

export async function getPlatformEarnings(period: ReportPeriod) {
  const start = getPeriodStart(period);
  const releasedFilter = start ? { status: 'released', releasedAt: { gte: start } } : { status: 'released' };

  const [released, held] = await Promise.all([
    prisma.escrowAccount.aggregate({
      where: releasedFilter,
      _sum: { platformFee: true, bookingFee: true, commission: true },
      _count: true,
    }),
    prisma.escrowAccount.aggregate({
      where: { status: 'held' },
      _sum: { platformFee: true, bookingFee: true },
      _count: true,
    }),
  ]);

  const bookingFees = toNum(released._sum.bookingFee);
  const commission = toNum(released._sum.commission);
  return {
    period,
    periodLabel: describePeriod(period),
    currency: 'GHS',
    note: 'platformFee = total platform earnings recorded per escrow; bookingFee is the flat GHS 2 customer fee; commission is 5% of the service price, recognized on release.',
    realized: {
      releasedEscrows: released._count,
      bookingFeesEarned: round2(bookingFees),
      commissionEarned: round2(commission),
      platformFeeTotal: round2(toNum(released._sum.platformFee)),
      totalRealizedEarnings: round2(bookingFees + commission),
    },
    pendingOnHeldEscrows: {
      heldEscrows: held._count,
      bookingFees: round2(toNum(held._sum.bookingFee)),
      platformFees: round2(toNum(held._sum.platformFee)),
    },
  };
}

// ---------------------------------------------------------------------------
// Data layer: escrow health
// ---------------------------------------------------------------------------

export async function getEscrowHealth() {
  const [byStatus, stuck] = await Promise.all([
    prisma.escrowAccount.groupBy({
      by: ['status'],
      _sum: { amountHeld: true, providerAmount: true, platformFee: true },
      _count: true,
    }),
    prisma.escrowAccount.findMany({
      where: { status: 'held', createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: {
        id: true,
        amountHeld: true,
        createdAt: true,
        booking: { select: { reference: true, status: true, date: true } },
        salon: { select: { businessName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
  ]);

  const statuses = byStatus.map((s) => ({
    status: s.status,
    count: s._count,
    totalHeld: round2(toNum(s._sum.amountHeld)),
    providerShare: round2(toNum(s._sum.providerAmount)),
    platformFees: round2(toNum(s._sum.platformFee)),
  }));

  return {
    currency: 'GHS',
    byStatus: statuses,
    stuckHeldEscrows: {
      definition: 'escrows still "held" for more than 7 days',
      count: stuck.length,
      items: stuck.map((e) => ({
        escrowId: e.id,
        bookingReference: e.booking.reference,
        bookingStatus: e.booking.status,
        amountHeld: round2(toNum(e.amountHeld)),
        heldSince: e.createdAt.toISOString(),
        salon: e.salon.businessName,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Data layer: refunds
// ---------------------------------------------------------------------------

export async function getRefundAnalysis(period: ReportPeriod) {
  const start = getPeriodStart(period);
  const timeFilter = start ? { updatedAt: { gte: start } } : {};
  const recordFilter = start ? { createdAt: { gte: start } } : {};

  const [refundedPayments, records, byCancelledBy] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: PaymentStatus.REFUNDED, ...timeFilter },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.cancellationRecord.aggregate({
      where: recordFilter,
      _sum: { refundAmount: true, platformFeeKept: true, providerCompensation: true },
      _count: true,
    }),
    prisma.cancellationRecord.groupBy({
      by: ['cancelledBy'],
      where: recordFilter,
      _count: true,
    }),
  ]);

  return {
    period,
    periodLabel: describePeriod(period),
    currency: 'GHS',
    refundedPayments: {
      count: refundedPayments._count,
      totalRefunded: round2(toNum(refundedPayments._sum.amount)),
    },
    cancellationRecords: {
      count: records._count,
      totalRefundAmount: round2(toNum(records._sum.refundAmount)),
      platformFeesKept: round2(toNum(records._sum.platformFeeKept)),
      providerCompensationPaid: round2(toNum(records._sum.providerCompensation)),
      byInitiator: byCancelledBy.map((r) => ({ cancelledBy: r.cancelledBy, count: r._count })),
    },
  };
}

// ---------------------------------------------------------------------------
// Data layer: payouts
// ---------------------------------------------------------------------------

export async function getPayoutSummary(period: ReportPeriod) {
  const start = getPeriodStart(period);
  const releasedFilter = start ? { status: 'released', releasedAt: { gte: start } } : { status: 'released' };

  const [released, held] = await Promise.all([
    prisma.escrowAccount.aggregate({
      where: releasedFilter,
      _sum: { providerAmount: true },
      _count: true,
    }),
    prisma.escrowAccount.aggregate({
      where: { status: 'held' },
      _sum: { providerAmount: true, amountHeld: true },
      _count: true,
    }),
  ]);

  return {
    period,
    periodLabel: describePeriod(period),
    currency: 'GHS',
    paidOut: {
      count: released._count,
      totalProviderPayouts: round2(toNum(released._sum.providerAmount)),
    },
    outstanding: {
      heldEscrows: held._count,
      pendingProviderAmount: round2(toNum(held._sum.providerAmount)),
      totalHeldFromCustomers: round2(toNum(held._sum.amountHeld)),
    },
  };
}

// ---------------------------------------------------------------------------
// Data layer: subscription revenue
// ---------------------------------------------------------------------------

export async function getSubscriptionRevenue(period: ReportPeriod) {
  const start = getPeriodStart(period);
  const timeFilter = start ? { status: 'PAID' as const, paidAt: { gte: start } } : { status: 'PAID' as const };

  const invoices = await prisma.subscriptionInvoice.findMany({
    where: timeFilter,
    select: {
      amount: true,
      paidAt: true,
      subscription: { select: { plan: { select: { name: true } } } },
    },
  });

  const byPlan = new Map<string, { revenue: number; count: number }>();
  let total = 0;
  for (const inv of invoices) {
    const amount = toNum(inv.amount);
    total += amount;
    const plan = inv.subscription.plan.name;
    const entry = byPlan.get(plan) || { revenue: 0, count: 0 };
    entry.revenue += amount;
    entry.count += 1;
    byPlan.set(plan, entry);
  }

  return {
    period,
    periodLabel: describePeriod(period),
    currency: 'GHS',
    totalSubscriptionRevenue: round2(total),
    invoicesPaid: invoices.length,
    byPlan: Array.from(byPlan.entries()).map(([plan, v]) => ({
      plan,
      revenue: round2(v.revenue),
      count: v.count,
    })),
  };
}

// ---------------------------------------------------------------------------
// Data layer: sponsorship revenue
// ---------------------------------------------------------------------------

export async function getSponsorshipRevenue(period: ReportPeriod) {
  const start = getPeriodStart(period);
  const timeFilter = start ? { createdAt: { gte: start } } : {};

  const sponsorships = await prisma.sponsoredSalon.findMany({
    where: { amountPaid: { gt: 0 }, ...timeFilter },
    select: { amountPaid: true, sponsorType: true },
  });

  const byType = new Map<string, { revenue: number; count: number }>();
  let total = 0;
  for (const s of sponsorships) {
    const amount = toNum(s.amountPaid);
    total += amount;
    const entry = byType.get(s.sponsorType) || { revenue: 0, count: 0 };
    entry.revenue += amount;
    entry.count += 1;
    byType.set(s.sponsorType, entry);
  }

  return {
    period,
    periodLabel: describePeriod(period),
    currency: 'GHS',
    totalSponsorshipRevenue: round2(total),
    sponsorshipsPaid: sponsorships.length,
    byType: Array.from(byType.entries()).map(([type, v]) => ({
      sponsorType: type,
      revenue: round2(v.revenue),
      count: v.count,
    })),
  };
}

// ---------------------------------------------------------------------------
// Data layer: top salons by revenue
// ---------------------------------------------------------------------------

export async function getTopSalonsRevenue(period: ReportPeriod, limit = 10) {
  const start = getPeriodStart(period);
  const timeFilter = start ? { completedAt: { gte: start } } : {};

  const grouped = await prisma.booking.groupBy({
    by: ['salonId'],
    where: {
      status: { not: BookingStatus.CANCELLED },
      payment: { status: PaymentStatus.SUCCESS, ...timeFilter },
    },
    _sum: { finalAmount: true },
    _count: true,
    orderBy: { _sum: { finalAmount: 'desc' } },
    take: Math.min(Math.max(limit, 1), 25),
  });

  const salons = await prisma.salon.findMany({
    where: { id: { in: grouped.map((g) => g.salonId) } },
    select: { id: true, businessName: true, city: true },
  });
  const nameMap = new Map(salons.map((s) => [s.id, s]));

  return {
    period,
    periodLabel: describePeriod(period),
    currency: 'GHS',
    topSalons: grouped.map((g) => ({
      salonId: g.salonId,
      businessName: nameMap.get(g.salonId)?.businessName || 'Unknown salon',
      city: nameMap.get(g.salonId)?.city || null,
      paidBookings: g._count,
      revenue: round2(toNum(g._sum.finalAmount)),
    })),
  };
}

// ---------------------------------------------------------------------------
// Data layer: payment failures
// ---------------------------------------------------------------------------

export async function getPaymentFailureAnalysis(period: ReportPeriod) {
  const start = getPeriodStart(period);
  const timeFilter = start ? { createdAt: { gte: start } } : {};

  const [byGateway, stuck] = await Promise.all([
    prisma.payment.groupBy({
      by: ['paymentGateway', 'status'],
      where: {
        status: { in: [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        ...timeFilter,
      },
      _count: true,
    }),
    prisma.payment.count({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const gateways = new Map<string, { succeeded: number; failed: number; pending: number }>();
  for (const row of byGateway) {
    const key = row.paymentGateway || 'unknown';
    const entry = gateways.get(key) || { succeeded: 0, failed: 0, pending: 0 };
    if (row.status === PaymentStatus.SUCCESS) entry.succeeded += row._count;
    else if (row.status === PaymentStatus.FAILED) entry.failed += row._count;
    else entry.pending += row._count;
    gateways.set(key, entry);
  }

  return {
    period,
    periodLabel: describePeriod(period),
    byGateway: Array.from(gateways.entries()).map(([gateway, v]) => {
      const settled = v.succeeded + v.failed;
      return {
        gateway,
        succeeded: v.succeeded,
        failed: v.failed,
        pendingOrProcessing: v.pending,
        failureRatePercent: settled > 0 ? round2((v.failed / settled) * 100) : 0,
      };
    }),
    stuckPayments: {
      definition: 'PENDING or PROCESSING payments older than 24 hours',
      count: stuck,
    },
  };
}

// ---------------------------------------------------------------------------
// Data layer: booking stats
// ---------------------------------------------------------------------------

export async function getBookingStats(period: ReportPeriod) {
  const start = getPeriodStart(period);
  const timeFilter = start ? { createdAt: { gte: start } } : {};

  const byStatus = await prisma.booking.groupBy({
    by: ['status'],
    where: timeFilter,
    _count: true,
    _sum: { finalAmount: true },
  });

  return {
    period,
    periodLabel: describePeriod(period),
    currency: 'GHS',
    byStatus: byStatus.map((b) => ({
      status: b.status,
      count: b._count,
      grossValue: round2(toNum(b._sum.finalAmount)),
    })),
  };
}

// ---------------------------------------------------------------------------
// Data layer: single transaction lookup
// ---------------------------------------------------------------------------

export async function getTransactionDetail(reference: string) {
  const ref = reference.trim();

  // Try booking reference first (GL-xxxxxxxx format)
  const booking = await prisma.booking.findFirst({
    where: { reference: { equals: ref, mode: 'insensitive' } },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true } },
      salon: { select: { businessName: true } },
      service: { select: { name: true } },
      payment: true,
      escrow: { include: { transactions: { orderBy: { createdAt: 'asc' } } } },
    },
  });

  if (booking) {
    const { escrow, payment, ...rest } = booking;
    return {
      foundAs: 'booking',
      booking: {
        ...rest,
        totalAmount: toNum(rest.totalAmount),
        discountAmount: rest.discountAmount ? toNum(rest.discountAmount) : null,
        finalAmount: toNum(rest.finalAmount),
      },
      payment: payment
        ? {
            id: payment.id,
            provider: payment.provider,
            gateway: payment.paymentGateway,
            amount: toNum(payment.amount),
            status: payment.status,
            createdAt: payment.createdAt,
            completedAt: payment.completedAt,
            gatewayTransactionId: payment.gatewayTransactionId,
          }
        : null,
      escrow: escrow
        ? {
            status: escrow.status,
            amountHeld: toNum(escrow.amountHeld),
            platformFee: toNum(escrow.platformFee),
            bookingFee: toNum(escrow.bookingFee),
            commission: escrow.commission ? toNum(escrow.commission) : null,
            providerAmount: toNum(escrow.providerAmount),
            releasedAt: escrow.releasedAt,
            ledger: escrow.transactions.map((t) => ({
              type: t.transactionType,
              amount: toNum(t.amount),
              createdAt: t.createdAt,
            })),
          }
        : null,
    };
  }

  // Fall back to matching a payment by provider/gateway transaction ids
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { providerRef: { equals: ref, mode: 'insensitive' } },
        { gatewayTransactionId: { equals: ref, mode: 'insensitive' } },
        { paystackTransactionId: { equals: ref, mode: 'insensitive' } },
        { hubtelTransactionId: { equals: ref, mode: 'insensitive' } },
      ],
    },
    include: { booking: { select: { reference: true, status: true, finalAmount: true } } },
  });

  if (payment) {
    return {
      foundAs: 'payment',
      payment: {
        id: payment.id,
        provider: payment.provider,
        gateway: payment.paymentGateway,
        amount: toNum(payment.amount),
        status: payment.status,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        bookingReference: payment.booking.reference,
      },
    };
  }

  return { foundAs: null, message: `No booking or payment found for reference "${ref}"` };
}

// ---------------------------------------------------------------------------
// Full snapshot (used by report generation and tests)
// ---------------------------------------------------------------------------

export async function getFinancialSnapshot(period: ReportPeriod) {
  const [revenue, earnings, escrow, refunds, payouts, subscriptions, sponsorships, failures, bookings] =
    await Promise.all([
      getRevenueSummary(period),
      getPlatformEarnings(period),
      getEscrowHealth(),
      getRefundAnalysis(period),
      getPayoutSummary(period),
      getSubscriptionRevenue(period),
      getSponsorshipRevenue(period),
      getPaymentFailureAnalysis(period),
      getBookingStats(period),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    period,
    periodLabel: describePeriod(period),
    revenue,
    platformEarnings: earnings,
    escrowHealth: escrow,
    refunds,
    payouts,
    subscriptionRevenue: subscriptions,
    sponsorshipRevenue: sponsorships,
    paymentFailures: failures,
    bookingStats: bookings,
  };
}

export type FinancialSnapshot = Awaited<ReturnType<typeof getFinancialSnapshot>>;

// ---------------------------------------------------------------------------
// OpenAI setup
// ---------------------------------------------------------------------------

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TOOL_ITERATIONS = 6;

let openaiClient: OpenAI | null = null;

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getOpenAi(): OpenAI {
  if (!isOpenAiConfigured()) {
    throw new AiNotConfiguredError();
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are GroomLink's AI Accountant — a meticulous, professional chartered accountant advising the founders and admins of GroomLink, a salon-booking marketplace operating in Ghana.

PLATFORM BUSINESS MODEL (use this when interpreting data):
- Currency: Ghana Cedi (GHS). Always format amounts as "GHS 1,234.56".
- Customers pay when booking. Funds are held in escrow until the service is completed and confirmed (48-hour auto-release after completion).
- Platform revenue per completed booking: a flat GHS 2.00 booking fee (paid by the customer) plus a 5% commission on the service price, recognized when the escrow is released.
- "platformFee" on an escrow record is the total platform earnings recorded for that booking.
- Escrow statuses: held (awaiting completion/release), released (paid out to salon), refunded (customer refunded), disputed.
- Refunds: full refund if cancelled 24+ hours before the appointment, partial for late cancellations, full refund if the salon cancels.
- Additional revenue streams: salon subscriptions (paid invoices) and sponsored salon placements.
- Payment gateways in use: Paystack, Hubtel.

RULES:
1. Base every figure strictly on the data returned by your tools. Never invent numbers.
2. If the data is insufficient to answer, say what is missing instead of guessing.
3. You are read-only: you cannot initiate refunds, payouts or any change — advise on the correct admin action instead.
4. Be concise but complete: lead with the answer, then supporting figures in short bullet points or compact markdown tables.
5. Where useful, flag risks (refund spikes, stuck escrows, gateway failure rates) like a real accountant would.
6. Current platform time is Ghana time (GMT+0).`;

// ---------------------------------------------------------------------------
// Tool definitions + executor
// ---------------------------------------------------------------------------

const periodEnum = {
  type: 'string',
  enum: ['7d', '30d', '90d', 'ytd', 'all'],
  description: 'Time window: 7d, 30d, 90d, ytd (year to date) or all (all time).',
};

const ACCOUNTANT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_revenue_summary',
      description: 'Total successful payment revenue, transaction counts, gateway breakdown and daily trend for a period.',
      parameters: {
        type: 'object',
        properties: { period: periodEnum },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_platform_earnings',
      description: 'Realized platform earnings (booking fees + commission) from released escrows, plus pending fees on held escrows.',
      parameters: {
        type: 'object',
        properties: { period: periodEnum },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_escrow_health',
      description: 'Escrow balances by status and a list of escrows stuck in "held" for more than 7 days.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_refund_analysis',
      description: 'Refunded payment totals and cancellation record breakdown (refunds issued, fees kept, provider compensation).',
      parameters: {
        type: 'object',
        properties: { period: periodEnum },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payout_summary',
      description: 'Amounts paid out to salons and outstanding provider amounts still held in escrow.',
      parameters: {
        type: 'object',
        properties: { period: periodEnum },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_subscription_revenue',
      description: 'Paid subscription invoice revenue by plan for a period.',
      parameters: {
        type: 'object',
        properties: { period: periodEnum },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sponsorship_revenue',
      description: 'Revenue from paid sponsored salon placements for a period.',
      parameters: {
        type: 'object',
        properties: { period: periodEnum },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_top_salons_revenue',
      description: 'Top salons ranked by successfully paid booking revenue for a period.',
      parameters: {
        type: 'object',
        properties: {
          period: periodEnum,
          limit: { type: 'number', description: 'How many salons to return (default 10, max 25).' },
        },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payment_failure_analysis',
      description: 'Payment success/failure counts and failure rate per gateway, plus payments stuck pending for over 24 hours.',
      parameters: {
        type: 'object',
        properties: { period: periodEnum },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_booking_stats',
      description: 'Booking counts and gross value by status for a period.',
      parameters: {
        type: 'object',
        properties: { period: periodEnum },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transaction_detail',
      description: 'Look up a single booking/payment by booking reference (e.g. GL-1a2b3c4d) or gateway transaction id.',
      parameters: {
        type: 'object',
        properties: {
          reference: { type: 'string', description: 'Booking reference or provider/gateway transaction id.' },
        },
        required: ['reference'],
      },
    },
  },
];

type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown>;

const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  get_revenue_summary: async (a) => getRevenueSummary(normalizePeriod(a.period)),
  get_platform_earnings: async (a) => getPlatformEarnings(normalizePeriod(a.period)),
  get_escrow_health: async () => getEscrowHealth(),
  get_refund_analysis: async (a) => getRefundAnalysis(normalizePeriod(a.period)),
  get_payout_summary: async (a) => getPayoutSummary(normalizePeriod(a.period)),
  get_subscription_revenue: async (a) => getSubscriptionRevenue(normalizePeriod(a.period)),
  get_sponsorship_revenue: async (a) => getSponsorshipRevenue(normalizePeriod(a.period)),
  get_top_salons_revenue: async (a) => getTopSalonsRevenue(normalizePeriod(a.period), Number(a.limit) || 10),
  get_payment_failure_analysis: async (a) => getPaymentFailureAnalysis(normalizePeriod(a.period)),
  get_booking_stats: async (a) => getBookingStats(normalizePeriod(a.period)),
  get_transaction_detail: async (a) => getTransactionDetail(String(a.reference || '')),
};

async function executeTool(name: string, rawArgs: string): Promise<unknown> {
  const executor = TOOL_EXECUTORS[name];
  if (!executor) {
    return { error: `Unknown tool: ${name}` };
  }
  try {
    const args = rawArgs ? JSON.parse(rawArgs) : {};
    return await executor(args);
  } catch (err) {
    logger.error('AI Accountant tool execution failed', { tool: name, error: (err as Error).message });
    return { error: `Tool ${name} failed: ${(err as Error).message}` };
  }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AccountantChatResult {
  reply: string;
  toolsUsed: string[];
}

export async function chatWithAccountant(
  message: string,
  history: ChatHistoryMessage[] = []
): Promise<AccountantChatResult> {
  const openai = getOpenAi();

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    // Keep the conversation bounded to control token usage
    ...history.slice(-10).map((m): ChatCompletionMessageParam => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const toolsUsed: string[] = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools: ACCOUNTANT_TOOLS,
      temperature: 0.3,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('OpenAI returned an empty response');
    }

    const assistantMessage = choice.message;
    messages.push(assistantMessage as ChatCompletionMessageParam);

    const toolCalls = assistantMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return { reply: assistantMessage.content || 'I could not generate an answer. Please try again.', toolsUsed };
    }

    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function') continue;
      const name = toolCall.function.name;
      toolsUsed.push(name);
      const result = await executeTool(name, toolCall.function.arguments);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Tool loop exhausted — ask for a final answer with what we have
  messages.push({
    role: 'user',
    content: 'You have used all available query steps. Answer now with the data collected so far.',
  });
  const finalResponse = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.3,
  });
  return {
    reply: finalResponse.choices[0]?.message.content || 'I could not complete the analysis. Please try a simpler question.',
    toolsUsed,
  };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

export type ReportType = 'pl' | 'full';

export interface FinancialReportResult {
  report: string;
  metrics: FinancialSnapshot;
  period: ReportPeriod;
  type: ReportType;
  generatedAt: string;
}

export async function generateFinancialReport(
  period: ReportPeriod,
  type: ReportType
): Promise<FinancialReportResult> {
  const openai = getOpenAi();
  const snapshot = await getFinancialSnapshot(period);

  const brief =
    type === 'pl'
      ? `Produce a concise Profit & Loss style summary for ${snapshot.periodLabel}:
- Revenue streams (booking revenue processed, realized platform earnings, subscription revenue, sponsorship revenue)
- Refunds as contra-revenue
- Estimated net platform position
- Month-over-period comparison where the data provides it
Format as a clean markdown report with a short executive summary, a figures table, and 3-5 bullet takeaways.`
      : `Produce a full financial health report for ${snapshot.periodLabel}:
1. Executive summary
2. Revenue analysis (totals, gateway mix, trend)
3. Platform earnings (booking fees, commission, pending on held escrows)
4. Escrow & payouts (balances by status, stuck escrows, outstanding provider amounts)
5. Refunds & cancellations (amounts, initiators, fees retained)
6. Subscriptions & sponsorships
7. Gateway performance (failure rates, stuck payments)
8. Risks & recommendations (act like a cautious accountant)
Format as clean markdown with tables where they improve readability.`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.3,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is the live financial data snapshot (JSON) for the GroomLink platform:\n\n${JSON.stringify(
          snapshot
        )}\n\n${brief}`,
      },
    ],
  });

  const report = response.choices[0]?.message.content || 'Report generation failed. Please try again.';
  return {
    report,
    metrics: snapshot,
    period,
    type,
    generatedAt: new Date().toISOString(),
  };
}
