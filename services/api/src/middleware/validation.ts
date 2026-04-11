import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { errorResponse } from '../utils/response';

// Helper to run validations and handle errors
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : err.type,
      message: err.msg,
    }));

    errorResponse(res, 'VALIDATION_ERROR', 'Validation failed', 400, extractedErrors);
  };
};

// Common validation rules
export const commonValidations = {
  // Pagination
  page: query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  limit: query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  // ID params
  id: param('id').isUUID().withMessage('Invalid ID format'),
  salonId: param('salonId').isUUID().withMessage('Invalid salon ID format'),
  bookingId: param('bookingId').isUUID().withMessage('Invalid booking ID format'),

  // Phone number (Ghana format)
  phoneNumber: body('phoneNumber')
    .matches(/^\+233[0-9]{9}$/)
    .withMessage('Phone number must be in Ghana format (+233XXXXXXXXX)'),

  // OTP
  otp: body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  code: body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),

  // Email
  email: body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),

  // Names
  firstName: body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  lastName: body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),

  // Prices
  price: body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  amount: body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),

  // Dates
  date: body('date').isISO8601().withMessage('Invalid date format'),
  scheduledDate: body('scheduledDate').isISO8601().withMessage('Invalid scheduled date'),

  // Time (HH:mm format)
  time: body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:mm format'),

  // Coordinates
  latitude: body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  longitude: body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),

  // Ratings
  rating: body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  // Comments/Descriptions
  comment: body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters'),
  description: body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
};

// Auth validations
export const authValidations = {
  requestOTP: validate([
    commonValidations.phoneNumber,
  ]),

  verifyOTP: validate([
    commonValidations.phoneNumber,
    commonValidations.code,
  ]),

  updateProfile: validate([
    commonValidations.firstName,
    commonValidations.lastName,
    commonValidations.email,
  ]),
};

// Salon validations
export const salonValidations = {
  createSalon: validate([
    body('businessName').trim().isLength({ min: 2, max: 100 }).withMessage('Business name must be 2-100 characters'),
    body('type').isIn(['BARBERSHOP', 'HAIR_SALON', 'PEDICURE_SALON', 'NAIL_SALON', 'SPA', 'BEAUTY_SALON']).withMessage('Invalid salon type'),
    body('phoneNumber').matches(/^\+233[0-9]{9}$/).withMessage('Invalid phone number format'),
    body('address').trim().isLength({ min: 5, max: 200 }).withMessage('Address must be 5-200 characters'),
    body('city').trim().isLength({ min: 2, max: 50 }).withMessage('City must be 2-50 characters'),
    body('region').trim().isLength({ min: 2, max: 50 }).withMessage('Region must be 2-50 characters'),
    commonValidations.latitude,
    commonValidations.longitude,
    body('openingTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Opening time must be in HH:mm format'),
    body('closingTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Closing time must be in HH:mm format'),
    body('workingDays').isArray({ min: 1 }).withMessage('Working days must be an array with at least one day'),
  ]),

  updateSalon: validate([
    param('id').isUUID().withMessage('Invalid salon ID'),
    body('businessName').optional().trim().isLength({ min: 2, max: 100 }),
    body('phoneNumber').optional().matches(/^\+233[0-9]{9}$/),
    commonValidations.latitude,
    commonValidations.longitude,
  ]),

  searchSalons: validate([
    query('lat').optional().isFloat({ min: -90, max: 90 }),
    query('lng').optional().isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 1, max: 50000 }),
    commonValidations.page,
    commonValidations.limit,
  ]),
};

// Booking validations
export const bookingValidations = {
  createBooking: validate([
    body('salonId').isUUID().withMessage('Invalid salon ID'),
    body('workerId').isUUID().withMessage('Invalid worker ID'),
    body('serviceId').isUUID().withMessage('Invalid service ID'),
    commonValidations.scheduledDate,
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:mm format'),
    body('notes').optional().trim().isLength({ max: 500 }),
  ]),

  updateBookingStatus: validate([
    param('id').isUUID().withMessage('Invalid booking ID'),
    body('status').isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).withMessage('Invalid status'),
  ]),

  getBookings: validate([
    query('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    commonValidations.page,
    commonValidations.limit,
  ]),
};

// Payment validations
export const paymentValidations = {
  createPayment: validate([
    body('bookingId').isUUID().withMessage('Invalid booking ID'),
    body('provider').isIn(['MTN_MOMO', 'VODAFONE_CASH', 'AIRTEL_TIGO']).withMessage('Invalid payment provider'),
    commonValidations.amount,
  ]),

  refundPayment: validate([
    param('id').isUUID().withMessage('Invalid payment ID'),
    body('reason').optional().trim().isLength({ max: 500 }),
  ]),
};

// Review validations
export const reviewValidations = {
  createReview: validate([
    body('bookingId').isUUID().withMessage('Invalid booking ID'),
    commonValidations.rating,
    body('comment').optional().trim().isLength({ min: 5, max: 500 }).withMessage('Comment must be 5-500 characters'),
  ]),
};

// Coupon validations
export const couponValidations = {
  createCoupon: validate([
    body('code').trim().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9_]+$/).withMessage('Code must be 3-20 uppercase alphanumeric characters'),
    body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
    body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be positive'),
    body('validFrom').optional().isISO8601(),
    body('validUntil').optional().isISO8601(),
    body('usageLimit').optional().isInt({ min: 1 }),
  ]),
};

// User validations
export const userValidations = {
  updateUser: validate([
    commonValidations.firstName,
    commonValidations.lastName,
    commonValidations.email,
    body('phoneNumber').optional().matches(/^\+233[0-9]{9}$/),
  ]),

  blockUser: validate([
    param('id').isUUID().withMessage('Invalid user ID'),
    body('reason').optional().trim().isLength({ max: 500 }),
  ]),
};

export default validate;
