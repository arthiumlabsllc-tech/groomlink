/**
 * accounting-anomaly.service.ts
 *
 * Deterministic (no LLM cost) accounting anomaly detection for GroomLink.
 * Runs daily via the scheduler and on demand from the admin panel.
 *
 * The pure evaluators (evaluate*) are exported separately so they can be
 * unit tested without a database.
 */

import { PaymentStatus, BookingStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import logger from '../config/logger';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AnomalyCheckResult {
  alertType: 'refund_spike' | 'stuck_escrow' | 'payment_failure_rate' | 'stuck_payment' | 'payout_backlog';
  severity: AlertSeverity;
  title: string;
  message: string;
  details: Record<string, unknown>;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Pure evaluators (unit-testable)
// ---------------------------------------------------------------------------

/**
 * Refund spike: current 7-day refund volume more than 3x the previous 7-day
 * baseline, and above an absolute floor so tiny platforms don't false-alarm.
 */
export function evaluateRefundSpike(
  currentAmount: number,
  baselineAmount: number,
  currentCount: number
): AnomalyCheckResult | null {
  const FLOOR_GHS = 50;
  if (currentAmount < FLOOR_GHS) return null;
  if (baselineAmount > 0 && currentAmount <= baselineAmount * 3) return null;
  if (baselineAmount === 0 && currentCount < 3) return null;

  const ratio = baselineAmount > 0 ? currentAmount / baselineAmount : null;
  const severity: AlertSeverity = ratio !== null && ratio >= 5 ? 'HIGH' : 'MEDIUM';
  return {
    alertType: 'refund_spike',
    severity,
    title: 'Refund spike detected',
    message:
      `Refunds over the last 7 days total GHS ${round2(currentAmount).toFixed(2)} across ${currentCount} cancellation(s)` +
      (ratio !== null
        ? ` — ${ratio.toFixed(1)}x the previous 7-day baseline (GHS ${round2(baselineAmount).toFixed(2)}).`
        : ' with no refunds in the previous 7-day baseline.') +
      ' Review the cancellation records for patterns (same salon, same customer, gateway errors).',
    details: { currentAmount: round2(currentAmount), baselineAmount: round2(baselineAmount), currentCount },
  };
}

/**
 * High payment failure rate: more than 20% failures in the window, with a
 * minimum sample size so low-volume windows don't false-alarm.
 */
export function evaluatePaymentFailureRate(
  gateway: string,
  succeeded: number,
  failed: number
): AnomalyCheckResult | null {
  const MIN_SAMPLE = 5;
  const THRESHOLD_PERCENT = 20;
  const settled = succeeded + failed;
  if (settled < MIN_SAMPLE) return null;

  const failureRate = (failed / settled) * 100;
  if (failureRate <= THRESHOLD_PERCENT) return null;

  const severity: AlertSeverity = failureRate >= 50 ? 'CRITICAL' : 'HIGH';
  return {
    alertType: 'payment_failure_rate',
    severity,
    title: `High payment failure rate on ${gateway}`,
    message:
      `${failed} of ${settled} settled payments failed on ${gateway} in the last 24 hours ` +
      `(${failureRate.toFixed(1)}% failure rate). Check the gateway dashboard/credentials and consider ` +
      'switching the active gateway if failures persist.',
    details: { gateway, succeeded, failed, failureRatePercent: round2(failureRate) },
  };
}

/**
 * Stuck escrows: funds held for more than 7 days without release/refund.
 */
export function evaluateStuckEscrows(
  stuckCount: number,
  stuckTotalGhs: number
): AnomalyCheckResult | null {
  if (stuckCount === 0) return null;
  const severity: AlertSeverity = stuckTotalGhs >= 1000 ? 'HIGH' : 'MEDIUM';
  return {
    alertType: 'stuck_escrow',
    severity,
    title: `${stuckCount} escrow(s) stuck in "held" for over 7 days`,
    message:
      `GHS ${round2(stuckTotalGhs).toFixed(2)} across ${stuckCount} escrow(s) has been held for more than 7 days ` +
      'without being released or refunded. These bookings likely need completion verification, dispute resolution ' +
      'or a manual refund. Review them in the Escrow page.',
    details: { stuckCount, stuckTotalGhs: round2(stuckTotalGhs) },
  };
}

/**
 * Payments stuck in PENDING/PROCESSING for over 24 hours.
 */
export function evaluateStuckPayments(stuckCount: number): AnomalyCheckResult | null {
  const MIN_COUNT = 3;
  if (stuckCount < MIN_COUNT) return null;
  return {
    alertType: 'stuck_payment',
    severity: 'MEDIUM',
    title: `${stuckCount} payment(s) stuck pending for over 24 hours`,
    message:
      `${stuckCount} payments have remained in PENDING/PROCESSING for more than 24 hours. ` +
      'Run the payment sync (Transactions page) or reconcile with the gateway to avoid double-charges and stale bookings.',
    details: { stuckCount },
  };
}

/**
 * Payout backlog: bookings completed more than 3 days ago whose escrow has
 * still not been released.
 */
export function evaluatePayoutBacklog(backlogCount: number, backlogAmountGhs: number): AnomalyCheckResult | null {
  if (backlogCount === 0) return null;
  const severity: AlertSeverity = backlogAmountGhs >= 2000 ? 'HIGH' : 'MEDIUM';
  return {
    alertType: 'payout_backlog',
    severity,
    title: `Payout backlog: ${backlogCount} completed booking(s) unreleased`,
    message:
      `${backlogCount} bookings were completed more than 3 days ago (GHS ${round2(backlogAmountGhs).toFixed(2)} in escrow) ` +
      'but their escrows have not been released to the salons. Salons may be owed these payouts — verify completion ' +
      'confirmation status and release or resolve disputes as needed.',
    details: { backlogCount, backlogAmountGhs: round2(backlogAmountGhs) },
  };
}

// ---------------------------------------------------------------------------
// Scan: collect data, evaluate, persist (deduplicated against recent alerts)
// ---------------------------------------------------------------------------

export interface AnomalyScanResult {
  scannedAt: string;
  alertsCreated: number;
  alerts: AnomalyCheckResult[];
}

export async function runAnomalyScan(): Promise<AnomalyScanResult> {
  const now = Date.now();
  const findings: AnomalyCheckResult[] = [];

  try {
    // 1. Refund spike (7 days vs previous 7 days)
    const weekAgo = new Date(now - 7 * DAY_MS);
    const twoWeeksAgo = new Date(now - 14 * DAY_MS);
    const [currentRefunds, baselineRefunds] = await Promise.all([
      prisma.cancellationRecord.aggregate({
        where: { createdAt: { gte: weekAgo }, refundAmount: { not: null } },
        _sum: { refundAmount: true },
        _count: true,
      }),
      prisma.cancellationRecord.aggregate({
        where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo }, refundAmount: { not: null } },
        _sum: { refundAmount: true },
      }),
    ]);
    const refundFinding = evaluateRefundSpike(
      Number(currentRefunds._sum.refundAmount || 0),
      Number(baselineRefunds._sum.refundAmount || 0),
      currentRefunds._count
    );
    if (refundFinding) findings.push(refundFinding);

    // 2. Stuck escrows (held > 7 days)
    const stuckEscrows = await prisma.escrowAccount.aggregate({
      where: { status: 'held', createdAt: { lt: new Date(now - 7 * DAY_MS) } },
      _sum: { amountHeld: true },
      _count: true,
    });
    const stuckFinding = evaluateStuckEscrows(stuckEscrows._count, Number(stuckEscrows._sum.amountHeld || 0));
    if (stuckFinding) findings.push(stuckFinding);

    // 3. Payment failure rate per gateway (last 24 hours)
    const dayAgo = new Date(now - DAY_MS);
    const gatewayRows = await prisma.payment.groupBy({
      by: ['paymentGateway', 'status'],
      where: {
        createdAt: { gte: dayAgo },
        status: { in: [PaymentStatus.SUCCESS, PaymentStatus.FAILED] },
      },
      _count: true,
    });
    const gatewayCounts = new Map<string, { succeeded: number; failed: number }>();
    for (const row of gatewayRows) {
      const key = row.paymentGateway || 'unknown';
      const entry = gatewayCounts.get(key) || { succeeded: 0, failed: 0 };
      if (row.status === PaymentStatus.SUCCESS) entry.succeeded += row._count;
      else entry.failed += row._count;
      gatewayCounts.set(key, entry);
    }
    for (const [gateway, counts] of gatewayCounts.entries()) {
      const failureFinding = evaluatePaymentFailureRate(gateway, counts.succeeded, counts.failed);
      if (failureFinding) findings.push(failureFinding);
    }

    // 4. Payments stuck pending for > 24 hours
    const stuckPaymentCount = await prisma.payment.count({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        createdAt: { lt: dayAgo },
      },
    });
    const stuckPaymentFinding = evaluateStuckPayments(stuckPaymentCount);
    if (stuckPaymentFinding) findings.push(stuckPaymentFinding);

    // 5. Payout backlog (completed > 3 days ago, escrow still held)
    const backlog = await prisma.escrowAccount.aggregate({
      where: {
        status: 'held',
        booking: {
          status: BookingStatus.COMPLETED,
          completedAt: { lt: new Date(now - 3 * DAY_MS) },
        },
      },
      _sum: { amountHeld: true },
      _count: true,
    });
    const backlogFinding = evaluatePayoutBacklog(backlog._count, Number(backlog._sum.amountHeld || 0));
    if (backlogFinding) findings.push(backlogFinding);

    // Persist findings, skipping types that already raised an OPEN alert in
    // the last 24 hours (avoids duplicate noise on repeated/daily scans).
    let alertsCreated = 0;
    for (const finding of findings) {
      const recentDuplicate = await prisma.aiAccountantAlert.findFirst({
        where: {
          alertType: finding.alertType,
          status: 'OPEN',
          createdAt: { gte: new Date(now - DAY_MS) },
        },
        select: { id: true },
      });
      if (recentDuplicate) continue;

      await prisma.aiAccountantAlert.create({
        data: {
          alertType: finding.alertType,
          severity: finding.severity,
          title: finding.title,
          message: finding.message,
          details: finding.details as Prisma.InputJsonValue,
          status: 'OPEN',
        },
      });
      alertsCreated += 1;
    }

    logger.info('AI Accountant anomaly scan completed', {
      findings: findings.length,
      alertsCreated,
    });

    return {
      scannedAt: new Date().toISOString(),
      alertsCreated,
      alerts: findings,
    };
  } catch (error) {
    logger.error('AI Accountant anomaly scan failed', { error: (error as Error).message });
    throw error;
  }
}
