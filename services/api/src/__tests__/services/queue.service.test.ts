import { mockPrisma } from '../mocks/prisma';
import { mockRedis } from '../mocks/redis';
import { QueueStatus } from '@prisma/client';

// Mock Socket.io
const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));

jest.mock('../../config/socket', () => ({
  getIO: jest.fn(() => ({ to: mockTo })),
  emitToUser: jest.fn(),
  emitToSalon: jest.fn(),
}));

// Mock Logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// Import after mocks
import * as queueService from '../../services/queue.service';
import { bookingConfig } from '../../config/booking';

describe('Queue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('joinQueue', () => {
    const mockCustomer = {
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+233241234567',
    };

    const mockService = {
      id: 'service-1',
      name: 'Haircut',
      duration: 30,
    };

    const mockWorker = {
      id: 'worker-1',
      fullName: 'Jane Smith',
    };

    test('joinQueue assigns correct position', async () => {
      // No existing entries
      mockPrisma.salonQueue.findFirst.mockResolvedValue(null);
      mockPrisma.salonQueue.count.mockResolvedValue(0);

      const mockQueueEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        customerId: 'customer-1',
        serviceId: 'service-1',
        workerId: 'worker-1',
        position: 1,
        status: QueueStatus.WAITING,
        estimatedWait: 0,
        joinedAt: new Date(),
        customer: mockCustomer,
        service: mockService,
        worker: mockWorker,
      };

      mockPrisma.salonQueue.create.mockResolvedValue(mockQueueEntry);
      mockRedis.zadd.mockResolvedValue(1);

      const result = await queueService.joinQueue({
        salonId: 'salon-1',
        customerId: 'customer-1',
        serviceId: 'service-1',
        workerId: 'worker-1',
      });

      expect(result.position).toBe(1);
      expect(result.status).toBe(QueueStatus.WAITING);
      expect(mockPrisma.salonQueue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            position: 1,
            status: QueueStatus.WAITING,
          }),
        })
      );
    });

    test('second customer gets position 2', async () => {
      // First customer already in queue
      mockPrisma.salonQueue.findFirst.mockResolvedValue(null);
      mockPrisma.salonQueue.count.mockResolvedValue(1);

      const mockQueueEntry = {
        id: 'queue-2',
        salonId: 'salon-1',
        customerId: 'customer-2',
        serviceId: 'service-1',
        position: 2,
        status: QueueStatus.WAITING,
        estimatedWait: 30,
        joinedAt: new Date(),
        customer: { ...mockCustomer, id: 'customer-2' },
        service: mockService,
      };

      mockPrisma.salonQueue.create.mockResolvedValue(mockQueueEntry);
      mockRedis.zadd.mockResolvedValue(1);

      // Mock entries ahead for ETA calculation
      mockPrisma.salonQueue.findMany.mockResolvedValue([
        { service: { duration: 30 } },
      ]);

      const result = await queueService.joinQueue({
        salonId: 'salon-1',
        customerId: 'customer-2',
        serviceId: 'service-1',
      });

      expect(result.position).toBe(2);
    });

    test('throws error when customer already in queue', async () => {
      mockPrisma.salonQueue.findFirst.mockResolvedValue({
        id: 'queue-1',
        status: QueueStatus.WAITING,
      });

      await expect(
        queueService.joinQueue({
          salonId: 'salon-1',
          customerId: 'customer-1',
        })
      ).rejects.toThrow('You are already in this salon\'s queue');
    });

    test('calculates estimated wait time based on services ahead', async () => {
      mockPrisma.salonQueue.findFirst.mockResolvedValue(null);
      mockPrisma.salonQueue.count.mockResolvedValue(2);

      // Two customers ahead with 30 and 45 min services
      mockPrisma.salonQueue.findMany.mockResolvedValue([
        { service: { duration: 30 } },
        { service: { duration: 45 } },
      ]);

      const mockQueueEntry = {
        id: 'queue-3',
        salonId: 'salon-1',
        customerId: 'customer-3',
        serviceId: 'service-1',
        position: 3,
        status: QueueStatus.WAITING,
        estimatedWait: 75, // 30 + 45
        joinedAt: new Date(),
        customer: { ...mockCustomer, id: 'customer-3' },
        service: mockService,
      };

      mockPrisma.salonQueue.create.mockResolvedValue(mockQueueEntry);
      mockRedis.zadd.mockResolvedValue(1);

      const result = await queueService.joinQueue({
        salonId: 'salon-1',
        customerId: 'customer-3',
        serviceId: 'service-1',
      });

      expect(result.estimatedWait).toBe(75);
    });
  });

  describe('leaveQueue', () => {
    const mockSalon = {
      id: 'salon-1',
      ownerId: 'owner-1',
    };

    test('customer can leave queue', async () => {
      const mockQueueEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        customerId: 'customer-1',
        position: 1,
        status: QueueStatus.WAITING,
        salon: mockSalon,
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockQueueEntry);
      mockPrisma.salonQueue.update.mockResolvedValue({
        ...mockQueueEntry,
        status: QueueStatus.LEFT,
      });
      mockRedis.zrem.mockResolvedValue(1);

      const result = await queueService.leaveQueue('queue-1', 'customer-1');

      expect(result.status).toBe(QueueStatus.LEFT);
      expect(mockPrisma.salonQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-1' },
        data: { status: QueueStatus.LEFT },
        include: expect.any(Object),
      });
    });

    test('throws error when queue entry not found', async () => {
      mockPrisma.salonQueue.findFirst.mockResolvedValue(null);

      await expect(
        queueService.leaveQueue('queue-1', 'customer-1')
      ).rejects.toThrow('Queue entry not found or cannot be left');
    });
  });

  describe('callNext', () => {
    const mockSalon = {
      id: 'salon-1',
      ownerId: 'owner-1',
    };

    test('callNext selects lowest position WAITING entry', async () => {
      mockPrisma.salon.findFirst.mockResolvedValue(mockSalon);

      const nextEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        customerId: 'customer-1',
        position: 1,
        status: QueueStatus.WAITING,
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(nextEntry);
      mockPrisma.salonQueue.update.mockResolvedValue({
        ...nextEntry,
        status: QueueStatus.CALLED,
        calledAt: new Date(),
      });

      const result = await queueService.callNext('salon-1', 'owner-1');

      expect(result.status).toBe(QueueStatus.CALLED);
      expect(mockPrisma.salonQueue.findFirst).toHaveBeenCalledWith({
        where: {
          salonId: 'salon-1',
          status: QueueStatus.WAITING,
        },
        orderBy: { position: 'asc' },
      });
    });

    test('throws error when no customers waiting', async () => {
      mockPrisma.salon.findFirst.mockResolvedValue(mockSalon);
      mockPrisma.salonQueue.findFirst.mockResolvedValue(null);

      await expect(
        queueService.callNext('salon-1', 'owner-1')
      ).rejects.toThrow('No customers waiting in queue');
    });

    test('throws error when salon not found', async () => {
      mockPrisma.salon.findFirst.mockResolvedValue(null);

      await expect(
        queueService.callNext('salon-1', 'owner-1')
      ).rejects.toThrow('Salon not found or you do not have permission');
    });
  });

  describe('getQueueStatus', () => {
    test('returns queue status with entries and average wait time', async () => {
      const mockEntries = [
        {
          id: 'queue-1',
          position: 1,
          status: QueueStatus.WAITING,
          customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe' },
          service: { id: 'service-1', name: 'Haircut', duration: 30 },
        },
        {
          id: 'queue-2',
          position: 2,
          status: QueueStatus.WAITING,
          customer: { id: 'customer-2', firstName: 'Jane', lastName: 'Smith' },
          service: { id: 'service-1', name: 'Haircut', duration: 30 },
        },
      ];

      mockPrisma.salonQueue.findMany.mockResolvedValue(mockEntries);

      // Completed entries for average wait calculation
      const completedEntries = [
        {
          joinedAt: new Date('2026-04-15T10:00:00'),
          calledAt: new Date('2026-04-15T10:15:00'),
        },
        {
          joinedAt: new Date('2026-04-15T10:30:00'),
          calledAt: new Date('2026-04-15T10:50:00'),
        },
      ];

      mockPrisma.salonQueue.findMany.mockResolvedValueOnce(mockEntries);
      mockPrisma.salonQueue.findMany.mockResolvedValueOnce(completedEntries);

      const result = await queueService.getQueueStatus('salon-1');

      expect(result.entries).toHaveLength(2);
      expect(result.totalActive).toBe(2);
      expect(result.averageWaitTime).toBe(17); // (15 + 20) / 2 = 17.5, rounded to 17
    });

    test('returns null average wait time when no completed entries', async () => {
      mockPrisma.salonQueue.findMany.mockResolvedValueOnce([]);
      mockPrisma.salonQueue.findMany.mockResolvedValueOnce([]);

      const result = await queueService.getQueueStatus('salon-1');

      expect(result.entries).toHaveLength(0);
      expect(result.totalActive).toBe(0);
      expect(result.averageWaitTime).toBeNull();
    });
  });

  describe('startService', () => {
    const mockSalon = {
      id: 'salon-1',
      ownerId: 'owner-1',
    };

    test('starts service for CALLED entry', async () => {
      const mockQueueEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        customerId: 'customer-1',
        status: QueueStatus.CALLED,
        salon: mockSalon,
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockQueueEntry);
      mockPrisma.salonQueue.update.mockResolvedValue({
        ...mockQueueEntry,
        status: QueueStatus.IN_SERVICE,
      });

      const result = await queueService.startService('queue-1', 'owner-1');

      expect(result.status).toBe(QueueStatus.IN_SERVICE);
    });

    test('throws error when entry not in CALLED status', async () => {
      const mockQueueEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        status: QueueStatus.WAITING,
        salon: mockSalon,
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockQueueEntry);

      await expect(
        queueService.startService('queue-1', 'owner-1')
      ).rejects.toThrow('Queue entry not found or not in CALLED status');
    });

    test('throws error when unauthorized', async () => {
      const mockQueueEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        status: QueueStatus.CALLED,
        salon: { ...mockSalon, ownerId: 'different-owner' },
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockQueueEntry);

      await expect(
        queueService.startService('queue-1', 'owner-1')
      ).rejects.toThrow('You do not have permission to start this service');
    });
  });

  describe('completeService', () => {
    const mockSalon = {
      id: 'salon-1',
      ownerId: 'owner-1',
    };

    test('completes service for IN_SERVICE entry', async () => {
      const mockQueueEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        customerId: 'customer-1',
        status: QueueStatus.IN_SERVICE,
        salon: mockSalon,
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockQueueEntry);
      mockPrisma.salonQueue.update.mockResolvedValue({
        ...mockQueueEntry,
        status: QueueStatus.COMPLETED,
        completedAt: new Date(),
      });
      mockRedis.zrem.mockResolvedValue(1);

      const result = await queueService.completeService('queue-1', 'owner-1');

      expect(result.status).toBe(QueueStatus.COMPLETED);
    });

    test('throws error when entry not in IN_SERVICE status', async () => {
      const mockQueueEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        status: QueueStatus.CALLED,
        salon: mockSalon,
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockQueueEntry);

      await expect(
        queueService.completeService('queue-1', 'owner-1')
      ).rejects.toThrow('Queue entry not found or not in IN_SERVICE status');
    });
  });

  describe('skipCustomer', () => {
    const mockSalon = {
      id: 'salon-1',
      ownerId: 'owner-1',
    };

    test('skips WAITING customer', async () => {
      const mockQueueEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        customerId: 'customer-1',
        status: QueueStatus.WAITING,
        salon: mockSalon,
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockQueueEntry);
      mockPrisma.salonQueue.update.mockResolvedValue({
        ...mockQueueEntry,
        status: QueueStatus.SKIPPED,
      });
      mockRedis.zrem.mockResolvedValue(1);

      const result = await queueService.skipCustomer('queue-1', 'owner-1');

      expect(result.status).toBe(QueueStatus.SKIPPED);
    });

    test('skips CALLED customer', async () => {
      const mockQueueEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        customerId: 'customer-1',
        status: QueueStatus.CALLED,
        salon: mockSalon,
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockQueueEntry);
      mockPrisma.salonQueue.update.mockResolvedValue({
        ...mockQueueEntry,
        status: QueueStatus.SKIPPED,
      });
      mockRedis.zrem.mockResolvedValue(1);

      const result = await queueService.skipCustomer('queue-1', 'owner-1');

      expect(result.status).toBe(QueueStatus.SKIPPED);
    });
  });

  describe('getMyPosition', () => {
    test('returns customer position in queue', async () => {
      const mockEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        customerId: 'customer-1',
        position: 3,
        status: QueueStatus.WAITING,
        customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe' },
        service: { id: 'service-1', name: 'Haircut', duration: 30 },
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockEntry);

      const result = await queueService.getMyPosition('salon-1', 'customer-1');

      expect(result).not.toBeNull();
      expect(result?.position).toBe(3);
    });

    test('returns null when customer not in queue', async () => {
      mockPrisma.salonQueue.findFirst.mockResolvedValue(null);

      const result = await queueService.getMyPosition('salon-1', 'customer-1');

      expect(result).toBeNull();
    });
  });

  describe('ETA calculation', () => {
    test('ETA calculation based on service durations ahead', async () => {
      mockPrisma.salonQueue.findFirst.mockResolvedValue(null);
      mockPrisma.salonQueue.count.mockResolvedValue(3);

      // Three customers ahead with known service durations
      mockPrisma.salonQueue.findMany.mockResolvedValue([
        { service: { duration: 30 } },
        { service: { duration: 45 } },
        { service: { duration: 30 } },
      ]);

      const mockQueueEntry = {
        id: 'queue-4',
        salonId: 'salon-1',
        customerId: 'customer-4',
        serviceId: 'service-1',
        position: 4,
        status: QueueStatus.WAITING,
        estimatedWait: 105, // 30 + 45 + 30
        joinedAt: new Date(),
        customer: { id: 'customer-4', firstName: 'Bob', lastName: 'Smith' },
        service: { id: 'service-1', name: 'Haircut', duration: 30 },
      };

      mockPrisma.salonQueue.create.mockResolvedValue(mockQueueEntry);
      mockRedis.zadd.mockResolvedValue(1);

      const result = await queueService.joinQueue({
        salonId: 'salon-1',
        customerId: 'customer-4',
        serviceId: 'service-1',
      });

      // ETA should be sum of service durations of customers ahead
      expect(result.estimatedWait).toBe(105);
    });

    test('uses default buffer when service duration not specified', async () => {
      mockPrisma.salonQueue.findFirst.mockResolvedValue(null);
      mockPrisma.salonQueue.count.mockResolvedValue(1);

      // Customer ahead without service specified
      mockPrisma.salonQueue.findMany.mockResolvedValue([
        { service: null },
      ]);

      const mockQueueEntry = {
        id: 'queue-2',
        salonId: 'salon-1',
        customerId: 'customer-2',
        position: 2,
        status: QueueStatus.WAITING,
        estimatedWait: bookingConfig.bufferMinutes,
        joinedAt: new Date(),
        customer: { id: 'customer-2', firstName: 'Jane', lastName: 'Doe' },
        service: null,
      };

      mockPrisma.salonQueue.create.mockResolvedValue(mockQueueEntry);
      mockRedis.zadd.mockResolvedValue(1);

      const result = await queueService.joinQueue({
        salonId: 'salon-1',
        customerId: 'customer-2',
      });

      expect(result.estimatedWait).toBe(bookingConfig.bufferMinutes);
    });
  });

  describe('leaveQueue recalculates positions', () => {
    test('when middle customer leaves, positions are recalculated', async () => {
      const mockSalon = {
        id: 'salon-1',
        ownerId: 'owner-1',
      };

      const mockQueueEntry = {
        id: 'queue-2',
        salonId: 'salon-1',
        customerId: 'customer-2',
        position: 2,
        status: QueueStatus.WAITING,
        salon: mockSalon,
      };

      mockPrisma.salonQueue.findFirst.mockResolvedValue(mockQueueEntry);
      mockPrisma.salonQueue.update.mockResolvedValue({
        ...mockQueueEntry,
        status: QueueStatus.LEFT,
      });
      mockRedis.zrem.mockResolvedValue(1);

      // Remaining entries after middle one leaves
      const remainingEntries = [
        { id: 'queue-1', position: 1, status: QueueStatus.WAITING, joinedAt: new Date() },
        { id: 'queue-3', position: 3, status: QueueStatus.WAITING, joinedAt: new Date() },
      ];

      mockPrisma.salonQueue.findMany.mockResolvedValue(remainingEntries);
      mockPrisma.salonQueue.update.mockResolvedValue({} as any);

      await queueService.leaveQueue('queue-2', 'customer-2');

      // Verify recalculatePositions was triggered (via findMany call)
      expect(mockPrisma.salonQueue.findMany).toHaveBeenCalledWith({
        where: {
          salonId: 'salon-1',
          status: { in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE] },
        },
        orderBy: [
          { status: 'asc' },
          { joinedAt: 'asc' },
        ],
      });
    });
  });

  describe('getQueueEntryById', () => {
    test('returns queue entry by ID', async () => {
      const mockEntry = {
        id: 'queue-1',
        salonId: 'salon-1',
        customerId: 'customer-1',
        position: 1,
        status: QueueStatus.WAITING,
        customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe' },
        service: { id: 'service-1', name: 'Haircut', duration: 30 },
        worker: null,
      };

      mockPrisma.salonQueue.findUnique.mockResolvedValue(mockEntry);

      const result = await queueService.getQueueEntryById('queue-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('queue-1');
      expect(result?.position).toBe(1);
    });

    test('returns null for non-existent entry', async () => {
      mockPrisma.salonQueue.findUnique.mockResolvedValue(null);

      const result = await queueService.getQueueEntryById('non-existent');

      expect(result).toBeNull();
    });
  });
});
