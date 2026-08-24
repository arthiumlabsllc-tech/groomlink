import { mockPrisma } from '../mocks/prisma';

// Mock Logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// Import after mocks
import {
  evaluateRefundSpike,
  evaluatePaymentFailureRate,
  evaluateStuckEscrows,
  evaluateStuckPayments,
  evaluatePayoutBacklog,
} from '../../services/accounting-anomaly.service';

describe('Accounting Anomaly Evaluators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateRefundSpike', () => {
    it('returns null when refund volume is below the absolute floor', () => {
      // GHS 30 is below the GHS 50 floor even though it is 10x the baseline
      expect(evaluateRefundSpike(30, 3, 2)).toBeNull();
    });

    it('returns null when current volume is within 3x of baseline', () => {
      expect(evaluateRefundSpike(280, 100, 5)).toBeNull();
    });

    it('flags a MEDIUM alert when refunds exceed 3x baseline', () => {
      const result = evaluateRefundSpike(400, 100, 6);
      expect(result).not.toBeNull();
      expect(result!.alertType).toBe('refund_spike');
      expect(result!.severity).toBe('MEDIUM');
      expect(result!.details.currentAmount).toBe(400);
    });

    it('flags a HIGH alert when refunds exceed 5x baseline', () => {
      const result = evaluateRefundSpike(600, 100, 8);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('HIGH');
    });

    it('flags a spike from a zero baseline only with enough transactions', () => {
      expect(evaluateRefundSpike(80, 0, 2)).toBeNull();
      const result = evaluateRefundSpike(80, 0, 4);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('MEDIUM');
    });
  });

  describe('evaluatePaymentFailureRate', () => {
    it('returns null when sample size is below the minimum', () => {
      // 2 of 3 failed (67%) but only 3 settled payments
      expect(evaluatePaymentFailureRate('paystack', 1, 2)).toBeNull();
    });

    it('returns null when failure rate is at or below 20%', () => {
      expect(evaluatePaymentFailureRate('paystack', 8, 2)).toBeNull();
    });

    it('flags a HIGH alert when failures exceed 20%', () => {
      const result = evaluatePaymentFailureRate('hubtel', 6, 4);
      expect(result).not.toBeNull();
      expect(result!.alertType).toBe('payment_failure_rate');
      expect(result!.severity).toBe('HIGH');
      expect(result!.details.gateway).toBe('hubtel');
      expect(result!.details.failureRatePercent).toBe(40);
    });

    it('flags a CRITICAL alert when failures reach 50% or more', () => {
      const result = evaluatePaymentFailureRate('theteller', 3, 7);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('CRITICAL');
    });
  });

  describe('evaluateStuckEscrows', () => {
    it('returns null when there are no stuck escrows', () => {
      expect(evaluateStuckEscrows(0, 0)).toBeNull();
    });

    it('flags a MEDIUM alert for small stuck amounts', () => {
      const result = evaluateStuckEscrows(2, 350);
      expect(result).not.toBeNull();
      expect(result!.alertType).toBe('stuck_escrow');
      expect(result!.severity).toBe('MEDIUM');
    });

    it('flags a HIGH alert when GHS 1000+ is stuck', () => {
      const result = evaluateStuckEscrows(5, 1500);
      expect(result!.severity).toBe('HIGH');
    });
  });

  describe('evaluateStuckPayments', () => {
    it('returns null below the minimum count', () => {
      expect(evaluateStuckPayments(0)).toBeNull();
      expect(evaluateStuckPayments(2)).toBeNull();
    });

    it('flags a MEDIUM alert at and above the minimum count', () => {
      const result = evaluateStuckPayments(3);
      expect(result).not.toBeNull();
      expect(result!.alertType).toBe('stuck_payment');
      expect(result!.severity).toBe('MEDIUM');
      expect(result!.details.stuckCount).toBe(3);
    });
  });

  describe('evaluatePayoutBacklog', () => {
    it('returns null when there is no backlog', () => {
      expect(evaluatePayoutBacklog(0, 0)).toBeNull();
    });

    it('flags a MEDIUM alert for a small backlog', () => {
      const result = evaluatePayoutBacklog(4, 800);
      expect(result).not.toBeNull();
      expect(result!.alertType).toBe('payout_backlog');
      expect(result!.severity).toBe('MEDIUM');
    });

    it('flags a HIGH alert when GHS 2000+ is overdue', () => {
      const result = evaluatePayoutBacklog(10, 2500);
      expect(result!.severity).toBe('HIGH');
    });
  });

  // Keep the shared prisma mock referenced so the module wiring is exercised
  it('uses the mocked prisma client', () => {
    expect(mockPrisma).toBeDefined();
  });
});
