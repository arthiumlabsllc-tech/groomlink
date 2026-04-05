
import request from 'supertest';
import express from 'express';
import salonRoutes from '../../routes/salon.routes';
import { mockPrisma } from '../mocks/prisma';
import { generateTestToken, createTestUser, createTestSalon } from '../helpers/auth';
import { UserRole } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/salons', salonRoutes);

describe('Salon Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /salons', () => {
    it('should return list of salons', async () => {
      const salons = [
        createTestSalon({ id: '1', businessName: 'Salon 1' }),
        createTestSalon({ id: '2', businessName: 'Salon 2' }),
      ];

      mockPrisma.salon.findMany.mockResolvedValue(salons);
      mockPrisma.salon.count.mockResolvedValue(2);

      const response = await request(app).get('/salons');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter salons by status', async () => {
      const pendingSalons = [
        createTestSalon({ id: '1', status: 'PENDING' }),
      ];

      mockPrisma.salon.findMany.mockResolvedValue(pendingSalons);
      mockPrisma.salon.count.mockResolvedValue(1);

      const response = await request(app).get('/salons?status=PENDING');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /salons/:id', () => {
    it('should return a single salon', async () => {
      const salon = createTestSalon();
      
      mockPrisma.salon.findUnique.mockResolvedValue(salon);

      const response = await request(app).get('/salons/test-salon-id');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(salon.id);
    });

    it('should return 404 for non-existent salon', async () => {
      mockPrisma.salon.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/salons/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /salons (Admin only)', () => {
    it('should create a new salon', async () => {
      const adminToken = generateTestToken('admin-id', UserRole.ADMIN);
      const newSalon = createTestSalon();

      mockPrisma.user.findUnique.mockResolvedValue(createTestUser({ id: 'admin-id', role: UserRole.ADMIN }));
      mockPrisma.salon.create.mockResolvedValue(newSalon);

      const response = await request(app)
        .post('/salons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Salon',
          type: 'BARBERSHOP',
          phoneNumber: '+233241234567',
          address: '123 Test St',
          city: 'Accra',
          region: 'Greater Accra',
          latitude: 5.6037,
          longitude: -0.1870,
          openingTime: '08:00',
          closingTime: '18:00',
          workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        });

      expect(response.status).toBe(201);
    });

    it('should return 403 for non-admin users', async () => {
      const customerToken = generateTestToken('customer-id', UserRole.CUSTOMER);

      mockPrisma.user.findUnique.mockResolvedValue(createTestUser({ id: 'customer-id', role: UserRole.CUSTOMER }));

      const response = await request(app)
        .post('/salons')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'New Salon',
          type: 'BARBERSHOP',
        });

      expect(response.status).toBe(403);
    });
  });
});
