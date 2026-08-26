
import { Response, NextFunction } from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../types';
import { generateTestToken } from '../helpers/auth';
import { UserRole, UserStatus } from '@prisma/client';

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
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

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe('user-id');
    });

    it('should return 401 without token', () => {
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 401 with invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 with malformed header', () => {
      mockReq.headers = { authorization: 'invalid-format' };

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireRole', () => {
    it('should call next() for authorized role', () => {
      mockReq.user = { id: 'user-id', phoneNumber: null, role: UserRole.ADMIN, status: UserStatus.ACTIVE };

      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() for multiple allowed roles', () => {
      mockReq.user = { id: 'user-id', phoneNumber: null, role: UserRole.SALON_OWNER, status: UserStatus.ACTIVE };

      const middleware = requireRole(UserRole.ADMIN, UserRole.SALON_OWNER);
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for unauthorized role', () => {
      mockReq.user = { id: 'user-id', phoneNumber: null, role: UserRole.CUSTOMER, status: UserStatus.ACTIVE };

      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 401 without user', () => {
      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
