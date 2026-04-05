

export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
};

jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: mockRedis,
  redis: mockRedis,
}));

export default mockRedis;
