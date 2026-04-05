
import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.routes';
import { mockPrisma } from '../mocks/prisma';
import { generateTestToken, createTestUser } from '../helpers/auth';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/otp/request', () => {
    it('should request OTP for valid phone number', async () => {
      const phoneNumber = '+233241234567';
      
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(createTestUser({ phoneNumber }));

      const response = await request(app)
        .post('/auth/otp/request')
        .send({ phoneNumber });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('OTP sent');
    });

    it('should return error for invalid phone number', async () => {
      const response = await request(app)
        .post('/auth/otp/request')
        .send({ phoneNumber: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle existing user', async () => {
      const phoneNumber = '+233241234567';
      const existingUser = createTestUser({ phoneNumber });
      
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/otp/request')
        .send({ phoneNumber });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /auth/otp/verify', () => {
    it('should verify OTP and return token', async () => {
      const phoneNumber = '+233241234567';
      const otp = '123456';
      const user = createTestUser({ phoneNumber });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, lastLoginAt: new Date() });

      const response = await request(app)
        .post('/auth/otp/verify')
        .send({ phoneNumber, otp });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    it('should return error for invalid OTP', async () => {
      const response = await request(app)
        .post('/auth/otp/verify')
        .send({ phoneNumber: '+233241234567', otp: '000000' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      const user = createTestUser();
      const token = generateTestToken(user.id, user.role);

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(user.id);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
