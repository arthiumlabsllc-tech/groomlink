import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export const generateTestToken = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  phoneNumber: '+233241234567',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  role: UserRole.CUSTOMER,
  status: 'ACTIVE',
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestSalon = (overrides = {}) => ({
  id: 'test-salon-id',
  businessName: 'Test Salon',
  description: 'A test salon',
  type: 'BARBERSHOP',
  status: 'APPROVED',
  phoneNumber: '+233241234567',
  email: 'salon@example.com',
  address: '123 Test St',
  city: 'Accra',
  region: 'Greater Accra',
  latitude: 5.6037,
  longitude: -0.1870,
  openingTime: '08:00',
  closingTime: '18:00',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  hasParking: true,
  hasWifi: true,
  hasAC: true,
  acceptsWalkIns: true,
  ownerId: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestBooking = (overrides = {}) => ({
  id: 'test-booking-id',
  customerId: 'test-user-id',
  salonId: 'test-salon-id',
  workerId: 'test-worker-id',
  serviceId: 'test-service-id',
  status: 'PENDING',
  scheduledDate: new Date(),
  startTime: '10:00',
  endTime: '11:00',
  totalAmount: 50,
  notes: 'Test booking',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
