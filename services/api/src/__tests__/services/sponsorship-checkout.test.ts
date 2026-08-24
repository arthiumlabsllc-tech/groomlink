import { mockPrisma } from '../mocks/prisma';

// Mock Logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// Mock SMS service (no real sending in unit tests)
const mockSendSMS = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/sms.service', () => ({
  sendSMS: (...args: any[]) => mockSendSMS(...args),
}));

// Import after mocks
import {
  packageDurationToHours,
  activateSponsoredSalon,
  expireUnpaidSponsorshipOrders,
} from '../../services/sponsorship.service';

describe('Sponsorship Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('packageDurationToHours', () => {
    it('converts hours directly', () => {
      expect(packageDurationToHours('hours', 12)).toBe(12);
    });

    it('converts days to hours', () => {
      expect(packageDurationToHours('days', 3)).toBe(72);
    });

    it('converts months to hours (30-day months)', () => {
      expect(packageDurationToHours('months', 1)).toBe(720);
    });

    it('converts years to hours (365-day years)', () => {
      expect(packageDurationToHours('years', 1)).toBe(8760);
    });

    it('is case-insensitive for duration type', () => {
      expect(packageDurationToHours('Days', 2)).toBe(48);
    });

    it('falls back to raw value for unknown types', () => {
      expect(packageDurationToHours('fortnights', 5)).toBe(5);
    });
  });

  describe('activateSponsoredSalon', () => {
    const pendingOrder = {
      id: 'order-1',
      salonId: 'salon-1',
      durationHours: 48,
      paymentStatus: 'pending',
      paymentReference: 'GL-SPON-123',
      priority: 2,
      isActive: false,
      amountPaid: '100.00',
      salon: {
        phoneNumber: null,
        owner: { phoneNumber: '+233501234567', email: 'owner@test.com' },
      },
    };

    it('throws when no order matches the payment reference', async () => {
      mockPrisma.sponsoredSalon.findFirst.mockResolvedValue(null);

      await expect(activateSponsoredSalon('GL-SPON-missing')).rejects.toThrow(
        'Sponsorship order not found'
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('is idempotent when the order is already paid', async () => {
      mockPrisma.sponsoredSalon.findFirst.mockResolvedValue({
        ...pendingOrder,
        paymentStatus: 'paid',
      });

      const result = await activateSponsoredSalon('GL-SPON-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Sponsorship already activated');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not activate orders that are not payable (e.g. expired)', async () => {
      mockPrisma.sponsoredSalon.findFirst.mockResolvedValue({
        ...pendingOrder,
        paymentStatus: 'expired',
      });

      const result = await activateSponsoredSalon('GL-SPON-123');

      expect(result.success).toBe(false);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('activates a pending order atomically and grants the full duration from now', async () => {
      mockPrisma.sponsoredSalon.findFirst.mockResolvedValue(pendingOrder);
      mockPrisma.sponsoredSalon.update.mockResolvedValue({});
      mockPrisma.salon.update.mockResolvedValue({});
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const before = Date.now();
      const result = await activateSponsoredSalon('GL-SPON-123');
      const after = Date.now();

      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Order update: paid + active + fresh start/end window
      const orderUpdateCall = mockPrisma.sponsoredSalon.update.mock.calls[0][0];
      expect(orderUpdateCall.where).toEqual({ id: 'order-1' });
      expect(orderUpdateCall.data.paymentStatus).toBe('paid');
      expect(orderUpdateCall.data.isActive).toBe(true);

      const start = orderUpdateCall.data.startTime.getTime();
      const end = orderUpdateCall.data.endTime.getTime();
      expect(start).toBeGreaterThanOrEqual(before);
      expect(start).toBeLessThanOrEqual(after);
      // 48 hours duration
      expect(Math.round((end - start) / (60 * 60 * 1000))).toBe(48);

      // Salon flag update
      const salonUpdateCall = mockPrisma.salon.update.mock.calls[0][0];
      expect(salonUpdateCall.where).toEqual({ id: 'salon-1' });
      expect(salonUpdateCall.data.isSponsored).toBe(true);
      expect(salonUpdateCall.data.sponsorshipPriority).toBe(2);

      // SMS confirmation sent to the owner
      expect(mockSendSMS).toHaveBeenCalledTimes(1);
      expect(mockSendSMS.mock.calls[0][0].to).toBe('+233501234567');
    });

    it('skips SMS when no phone number is available', async () => {
      mockPrisma.sponsoredSalon.findFirst.mockResolvedValue({
        ...pendingOrder,
        salon: { phoneNumber: null, owner: { phoneNumber: null, email: null } },
      });
      mockPrisma.sponsoredSalon.update.mockResolvedValue({});
      mockPrisma.salon.update.mockResolvedValue({});
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await activateSponsoredSalon('GL-SPON-123');

      expect(result.success).toBe(true);
      expect(mockSendSMS).not.toHaveBeenCalled();
    });
  });

  describe('expireUnpaidSponsorshipOrders', () => {
    it('expires only pending inactive orders older than the cutoff', async () => {
      mockPrisma.sponsoredSalon.updateMany.mockResolvedValue({ count: 3 });

      const count = await expireUnpaidSponsorshipOrders();

      expect(count).toBe(3);
      const call = mockPrisma.sponsoredSalon.updateMany.mock.calls[0][0];
      expect(call.where.paymentStatus).toBe('pending');
      expect(call.where.isActive).toBe(false);
      expect(call.where.createdAt.lt).toBeInstanceOf(Date);
      // Cutoff should be ~24h in the past
      const ageMs = Date.now() - call.where.createdAt.lt.getTime();
      expect(Math.round(ageMs / (60 * 60 * 1000))).toBe(24);
      expect(call.data.paymentStatus).toBe('expired');
    });
  });
});
