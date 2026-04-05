
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { generateTestToken } from '../helpers/auth';
import { UserRole } from '@prisma/client';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should call next() with valid token', () => {
      const token = generateTestToken('user-id', UserRole.CUSTOMER);
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.userId).toBe('user-id');
    });

    it('should return 401 without token', () => {
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 401 with invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 with malformed header', () => {
      mockReq.headers = { authorization: 'invalid-format' };

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireRole', () => {
    it('should call next() for authorized role', () => {
      mockReq.user = { userId: 'user-id', role: UserRole.ADMIN };

      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() for multiple allowed roles', () => {
      mockReq.user = { userId: 'user-id', role: UserRole.SALON_OWNER };

      const middleware = requireRole(UserRole.ADMIN, UserRole.SALON_OWNER);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for unauthorized role', () => {
      mockReq.user = { userId: 'user-id', role: UserRole.CUSTOMER };

      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 403 without user', () => {
      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
