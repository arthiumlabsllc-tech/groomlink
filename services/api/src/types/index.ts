import { Request } from 'express';
import { UserRole, UserStatus } from '../middleware/auth';

export interface AuthenticatedUser {
  id: string;
  phoneNumber: string | null;
  role: UserRole;
  status: UserStatus;
  impersonatedBy?: string; // ID of support staff if impersonating
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface TokenPayload {
  userId: string;
  phoneNumber: string | null;
  role: UserRole;
  impersonatedBy?: string; // ID of support staff if impersonating
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SalonFilters {
  type?: string;
  city?: string;
  minRating?: number;
  maxPrice?: number;
  services?: string[];
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
}

export interface BookingTimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface PaymentInitializeRequest {
  bookingId: string;
  provider: string;
  phoneNumber: string;
}

export interface PaymentVerifyRequest {
  paymentId: string;
  reference: string;
}
