import prisma from '../config/database';
import logger from '../config/logger';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';
import * as emailService from './email.service';
import * as escrowService from './escrow.service';
import * as notificationService from './notification.service';
import * as smsService from './sms.service';
import { generateCheckinCode } from './checkin.service';
import { emitNewBooking } from '../config/socket';

// Re-export getPolicyValue from escrow.service for use in payment calculations
export const getPolicyValue = escrowService.getPolicyValue;

export interface InitializePaymentData {
  bookingId: string;
  provider: PaymentProvider;
  phoneNumber: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  reference?: string;
  message: string;
  authorization_url?: string;
  access_code?: string;
}

export interface PaystackKeys {
  publicKey: string;
  secretKey: string;
  isTestMode: boolean;
}

// Helper function to get Paystack keys from SiteSettings with env var fallback
async function getPaystackKeys(): Promise<PaystackKeys | null> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' }
  });
  
  // Check if SiteSettings has keys configured
  const dbSecretKey = settings?.paystackSecretKey;
  const dbPublicKey = settings?.paystackPublicKey;
  
  if (dbSecretKey && dbPublicKey) {
    logger.info('Paystack keys loaded from SiteSettings', {
      source: 'database',
      isTestMode: settings.isPaymentTestMode
    });
    return {
      publicKey: dbPublicKey,
      secretKey: dbSecretKey,
      isTestMode: settings.isPaymentTestMode,
    };
  }
  
  // Fall back to environment variables
  const envSecretKey = process.env.PAYSTACK_SECRET_KEY;
  const envPublicKey = process.env.PAYSTACK_PUBLIC_KEY;
  
  if (envSecretKey && envPublicKey) {
    logger.info('Paystack keys loaded from environment variables', {
      source: 'env_vars',
      isTestMode: envSecretKey.startsWith('sk_test_')
    });
    return {
      publicKey: envPublicKey,
      secretKey: envSecretKey,
      isTestMode: envSecretKey.startsWith('sk_test_'),
    };
  }
  
  // Neither SiteSettings nor env vars have keys configured
  logger.warn('Paystack keys not configured in SiteSettings or environment variables');
  return null;
}

/**
 * Send all booking notifications after payment success
 * This is called from both verifyAndCompletePayment() and handlePaystackWebhook()
 * to ensure consistent notification behavior regardless of payment path.
 */
async function sendBookingNotificationsOnPaymentSuccess(params: {
  bookingId: string;
  salonId: string;
  salonName: string;
  salonAddress: string;
  salonPhone?: string | null;
  serviceName: string;
  workerName?: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phoneNumber?: string | null;
  };
  salonOwnerId?: string | null;
  salonOwnerEmail?: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  totalAmount: number;
  finalAmount: number;
  customerNotes?: string | null;
  isGroupBooking?: boolean;
  totalPeople?: number;
}): Promise<void> {
  const {
    bookingId,
    salonId,
    salonName,
    salonAddress,
    salonPhone,
    serviceName,
    workerName,
    customer,
    salonOwnerId,
    salonOwnerEmail,
    date,
    startTime,
    endTime,
    totalAmount,
    finalAmount,
    customerNotes,
    isGroupBooking,
    totalPeople,
  } = params;

  // 1. Generate check-in code for the booking
  await generateCheckinCode(bookingId).catch((err) => {
    logger.error('Failed to generate check-in code after payment success', { bookingId, err });
  });

  // Fetch guests for group booking if applicable
  let guests: Array<{
    guestName: string;
    guestPhone: string | null;
    service: string;
    staff?: string;
    isChild: boolean;
  }> = [];
  
  if (isGroupBooking) {
    const bookingWithGuests = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guests: {
          include: {
            service: { select: { name: true } },
            staff: { select: { fullName: true } },
          },
        },
      },
    });
    
    if (bookingWithGuests?.guests) {
      guests = bookingWithGuests.guests.map((g) => ({
        guestName: g.guestName,
        guestPhone: g.guestPhone,
        service: g.service?.name || 'Unknown Service',
        staff: g.staff?.fullName || undefined,
        isChild: g.isChild,
      }));
    }
  }

  // Prepare group booking data for emails
  const groupEmailData = isGroupBooking && guests.length > 0
    ? {
        isGroupBooking: true,
        totalPeople: totalPeople || guests.length,
        guests,
      }
    : undefined;

  const customerFullName = `${customer.firstName} ${customer.lastName}`.trim();

  // 2. Send booking confirmation email to customer
  if (customer.email) {
    emailService
      .sendBookingConfirmationEmail(
        customer.email,
        {
          customerName: customerFullName,
          bookingReference: bookingId,
          salonName,
          salonAddress,
          salonPhone: salonPhone || undefined,
          serviceName,
          workerName: workerName || undefined,
          date: date.toISOString(),
          startTime,
          endTime,
          totalAmount,
          finalAmount,
          customerNotes: customerNotes || undefined,
          ...(groupEmailData || {}),
        }
      )
      .catch((err) =>
        logger.error('Failed to send booking confirmation email to customer', { err })
      );
  }

  // 3. Send new booking notification email to salon owner
  if (salonOwnerEmail) {
    emailService
      .sendNewBookingNotificationEmail(
        salonOwnerEmail,
        {
          customerName: customerFullName,
          bookingReference: bookingId,
          serviceName,
          workerName: workerName || undefined,
          date: date.toISOString(),
          startTime,
          endTime,
          finalAmount,
          customerPhone: customer.phoneNumber || undefined,
          customerNotes: customerNotes || undefined,
          ...(groupEmailData || {}),
        }
      )
      .catch((err) =>
        logger.error('Failed to send new booking notification email to salon owner', { err })
      );
  }

  // 4. Send SMS confirmation to customer
  if (customer.phoneNumber) {
    if (isGroupBooking && guests.length > 0) {
      // Send group booking SMS to primary customer and guests
      const guestPhones = guests
        .map((g) => g.guestPhone)
        .filter((phone): phone is string => !!phone);

      smsService
        .sendGroupBookingConfirmation(
          customer.phoneNumber,
          guestPhones,
          bookingId,
          salonName,
          date,
          startTime,
          totalPeople || guests.length
        )
        .catch((err) =>
          logger.error('Failed to send group booking confirmation SMS', { err })
        );
    } else {
      // Regular single booking SMS
      smsService
        .sendBookingConfirmation(
          customer.phoneNumber,
          bookingId,
          salonName,
          date,
          startTime
        )
        .catch((err) =>
          logger.error('Failed to send booking confirmation SMS', { err })
        );
    }

    // Schedule 2-hour reminder
    smsService
      .scheduleBookingReminder(
        customer.phoneNumber,
        salonName,
        date,
        startTime
      )
      .catch((err) =>
        logger.error('Failed to schedule booking reminder SMS', { err })
      );
  }

  // 5. Emit socket event to salon for audible/real-time notification
  // Fetch minimal booking data for socket emission
  const bookingForSocket = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      salon: { select: { id: true, businessName: true } },
      service: { select: { name: true } },
      worker: { select: { fullName: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
  });
  
  if (bookingForSocket) {
    emitNewBooking(salonId, bookingForSocket);
  }

  // 6. Notify salon owner of new booking via in-app notification
  if (salonOwnerId) {
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    notificationService.notifySalonOwnerOfNewBooking(
      salonOwnerId,
      bookingId,
      customerFullName,
      serviceName,
      salonName,
      dateStr,
      startTime
    ).catch((err) => logger.error('Failed to send new booking notification', { err }));
  }

  logger.info(`Booking notifications sent for booking: ${bookingId}`);
}

// Mock payment provider implementations (fallback when Paystack is not configured)
class MockPaymentProvider {
  static async initiateMTNMomo(phoneNumber: string, amount: number, reference: string): Promise<PaymentResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate 90% success rate
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        reference,
        message: 'Payment request sent. Please approve on your phone.',
      };
    } else {
      return {
        success: false,
        message: 'Failed to initiate payment. Please try again.',
      };
    }
  }

  static async initiateVodafoneCash(phoneNumber: string, amount: number, reference: string): Promise<PaymentResult> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        reference,
        message: 'Payment request sent. Please check your Vodafone Cash app.',
      };
    } else {
      return {
        success: false,
        message: 'Failed to initiate Vodafone Cash payment.',
      };
    }
  }

  static async initiateAirtelTigoMoney(phoneNumber: string, amount: number, reference: string): Promise<PaymentResult> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        reference,
        message: 'Payment request sent. Please approve on your phone.',
      };
    } else {
      return {
        success: false,
        message: 'Failed to initiate AirtelTigo Money payment.',
      };
    }
  }

  static async verifyPayment(reference: string): Promise<PaymentResult> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate 95% success rate for verification
    const success = Math.random() > 0.05;
    
    if (success) {
      return {
        success: true,
        reference,
        message: 'Payment verified successfully.',
      };
    } else {
      return {
        success: false,
        message: 'Payment verification failed.',
      };
    }
  }
}

// Paystack Payment Provider
class PaystackPaymentProvider {
  private static BASE_URL = 'https://api.paystack.co';

  /**
   * Map internal payment provider to Paystack mobile money provider code
   */
  private static getMobileMoneyProvider(provider: PaymentProvider): string {
    const providerMap: Record<string, string> = {
      [PaymentProvider.MTN_MOMO]: 'mtn',
      [PaymentProvider.VODAFONE_CASH]: 'vod',
      [PaymentProvider.AIRTELTIGO_MONEY]: 'tgo',
    };
    return providerMap[provider] || 'mtn';
  }

  /**
   * Initialize a payment transaction with Paystack
   */
  static async initializePayment(
    amount: number,
    email: string,
    reference: string,
    bookingId: string,
    provider: PaymentProvider,
    secretKey: string,
    phoneNumber?: string
  ): Promise<PaymentResult> {
    try {
      // Convert amount to pesewas (smallest currency unit for GHS)
      const amountInPesewas = Math.round(amount * 100);
      
      // Map provider to Paystack mobile money channel
      const channelMap: Record<string, string[]> = {
        [PaymentProvider.MTN_MOMO]: ['mobile_money'],
        [PaymentProvider.VODAFONE_CASH]: ['mobile_money'],
        [PaymentProvider.AIRTELTIGO_MONEY]: ['mobile_money'],
        [PaymentProvider.CASH]: [],
      };
      
      const channels = channelMap[provider] || ['mobile_money'];
      
      // Build the request body
      const requestBody: any = {
        amount: amountInPesewas,
        email,
        reference,
        channels,
        callback_url: process.env.PAYSTACK_CALLBACK_URL || 'https://my.groomlinkgh.com/payment/verify',
        metadata: {
          bookingId,
          provider,
          custom_fields: [
            {
              display_name: 'Booking',
              variable_name: 'booking_id',
              value: bookingId,
            },
          ],
        },
      };
      
      // Add mobile_money object for Ghana mobile money payments
      // This is critical for the MoMo prompt to appear on the customer's phone
      if (channels.includes('mobile_money') && phoneNumber) {
        const momoProvider = this.getMobileMoneyProvider(provider);
        requestBody.mobile_money = {
          phone: phoneNumber,
          provider: momoProvider,
        };
        logger.info(`Mobile money payment configured for ${provider}`, { 
          phone: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone for logging
          momoProvider 
        });
      }

      const response = await axios.post(
        `${this.BASE_URL}/transaction/initialize`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { data } = response.data;
      
      logger.info(`Paystack payment initialized: ${reference}`, { bookingId });
      
      return {
        success: true,
        reference: data.reference,
        authorization_url: data.authorization_url,
        access_code: data.access_code,
        message: 'Payment initialized. Please complete payment.',
      };
    } catch (error: any) {
      logger.error('Paystack initialize payment error:', {
        message: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to initialize payment with Paystack',
      };
    }
  }

  /**
   * Verify a payment transaction with Paystack
   */
  static async verifyPayment(
    reference: string,
    secretKey: string
  ): Promise<{ success: boolean; status: string; data: any }> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      const { data } = response.data;
      const status = data.status;
      
      logger.info(`Paystack payment verified: ${reference}`, { status });
      
      return {
        success: status === 'success',
        status,
        data,
      };
    } catch (error: any) {
      logger.error('Paystack verify payment error:', {
        message: error.message,
        response: error.response?.data,
      });
      
      return {
        success: false,
        status: 'failed',
        data: null,
      };
    }
  }

  /**
   * Verify webhook signature from Paystack
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secretKey: string
  ): boolean {
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }

  /**
   * Initiate a refund with Paystack
   */
  static async refund(
    transactionRef: string,
    secretKey: string,
    amount?: number
  ): Promise<{ success: boolean; data?: any }> {
    try {
      const body: any = { transaction: transactionRef };
      if (amount) {
        body.amount = Math.round(amount * 100); // Convert to pesewas
      }
      
      const response = await axios.post(
        `${this.BASE_URL}/refund`,
        body,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Paystack refund initiated: ${transactionRef}`);
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      logger.error('Paystack refund error:', {
        message: error.message,
        response: error.response?.data,
      });
      
      return {
        success: false,
      };
    }
  }
}

export async function initializePayment(
  userId: string,
  data: InitializePaymentData
): Promise<PaymentResult> {
  const { bookingId, provider, phoneNumber } = data;

  // Get booking details with customer info for email
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { 
      payment: true,
      customer: { select: { email: true, phoneNumber: true } }
    },
  });

  if (!booking) {
    return { success: false, message: 'Booking not found' };
  }

  if (booking.customerId !== userId) {
    return { success: false, message: 'Unauthorized' };
  }

  if (booking.payment && booking.payment.status === PaymentStatus.SUCCESS) {
    return { success: false, message: 'Payment already completed' };
  }

  // Validate phone number format
  const ghanaPhoneRegex = /^\+233[0-9]{9}$/;
  if (!ghanaPhoneRegex.test(phoneNumber)) {
    return { success: false, message: 'Invalid phone number format. Use +233XXXXXXXXX' };
  }

  // Generate reference
  const reference = `GL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Calculate platform fee and total charge amount
  let feePercent = 5; // Default fallback
  try {
    const feePercentStr = await escrowService.getPolicyValue('platform_fee_percentage');
    const parsedFee = parseFloat(feePercentStr);
    if (!isNaN(parsedFee)) {
      feePercent = parsedFee;
    }
  } catch (policyError) {
    logger.warn('Failed to fetch platform_fee_percentage, using default 5%', { policyError });
  }
  
  const serviceAmount = Number(booking.finalAmount);
  const platformFee = serviceAmount * (feePercent / 100);
  const totalChargeAmount = serviceAmount + platformFee;

  logger.info(`Payment amount calculation for booking ${bookingId}`, {
    serviceAmount,
    platformFee,
    feePercent,
    totalChargeAmount
  });

  // Create or update payment record
  const payment = await prisma.payment.upsert({
    where: { bookingId },
    create: {
      bookingId,
      userId,
      provider,
      amount: totalChargeAmount,
      currency: 'GHS',
      status: PaymentStatus.PENDING,
      providerRef: reference,
      providerData: {
        serviceAmount,
        platformFee,
        feePercent,
      },
    },
    update: {
      provider,
      providerRef: reference,
      status: PaymentStatus.PENDING,
      providerData: {
        serviceAmount,
        platformFee,
        feePercent,
      },
    },
  });

  // Check if Paystack is configured
  const paystackKeys = await getPaystackKeys();
  // Use totalChargeAmount which includes platform fee
  const amount = totalChargeAmount;

  // Cash payment doesn't need payment gateway
  if (provider === PaymentProvider.CASH) {
    const result: PaymentResult = {
      success: true,
      reference,
      message: 'Cash payment recorded. Please pay at the salon.',
    };
    
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PROCESSING },
    });
    
    logger.info(`Cash payment initiated: ${payment.id} for booking: ${bookingId}`);
    return { ...result, paymentId: payment.id };
  }

  let result: PaymentResult;

  // Use Paystack if keys are configured, otherwise fall back to mock
  if (paystackKeys) {
    // Use customer email or generate a placeholder email
    const email = booking.customer?.email || `customer_${userId}@groomlink.temp`;
    
    result = await PaystackPaymentProvider.initializePayment(
      amount,
      email,
      reference,
      bookingId,
      provider,
      paystackKeys.secretKey,
      phoneNumber  // Pass phone number for mobile money prompt
    );
    
    logger.info(`Paystack payment initiated for booking: ${bookingId}`, { 
      mode: paystackKeys.isTestMode ? 'test' : 'live' 
    });
  } else {
    // Fall back to mock provider
    logger.warn('Paystack not configured, using mock payment provider');
    
    switch (provider) {
      case PaymentProvider.MTN_MOMO:
        result = await MockPaymentProvider.initiateMTNMomo(phoneNumber, amount, reference);
        break;
      case PaymentProvider.VODAFONE_CASH:
        result = await MockPaymentProvider.initiateVodafoneCash(phoneNumber, amount, reference);
        break;
      case PaymentProvider.AIRTELTIGO_MONEY:
        result = await MockPaymentProvider.initiateAirtelTigoMoney(phoneNumber, amount, reference);
        break;
      default:
        return { success: false, message: 'Unsupported payment provider' };
    }

    // Simulate webhook for mock provider in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(async () => {
        await verifyAndCompletePayment(payment.id, reference);
      }, 5000);
    }
  }

  if (result.success) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PROCESSING },
    });
  }

  logger.info(`Payment initiated: ${payment.id} for booking: ${bookingId}`);
  return { ...result, paymentId: payment.id };
}

export interface VerifyPaymentResult extends PaymentResult {
  bookingConfirmed?: boolean;
  bookingReference?: string;
  amountPaid?: number;
  serviceName?: string;
  bookingDate?: string;
  bookingTime?: string;
  salonName?: string;
}

export async function verifyAndCompletePayment(paymentId: string, reference: string): Promise<VerifyPaymentResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: {
          salon: {
            select: {
              id: true,
              businessName: true,
              address: true,
              phoneNumber: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
          worker: {
            select: {
              fullName: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    return { success: false, message: 'Payment not found', bookingConfirmed: false };
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    const booking = payment.booking;
    return { 
      success: true, 
      message: 'Payment already completed',
      bookingConfirmed: true,
      bookingReference: booking.id,
      amountPaid: Number(payment.amount),
      serviceName: booking.service.name,
      bookingDate: booking.date.toISOString(),
      bookingTime: booking.startTime,
      salonName: booking.salon.businessName,
    };
  }

  // Check if Paystack is configured
  const paystackKeys = await getPaystackKeys();
  let isSuccess = false;

  if (paystackKeys) {
    // Verify with Paystack
    const verification = await PaystackPaymentProvider.verifyPayment(
      reference,
      paystackKeys.secretKey
    );
    
    isSuccess = verification.success;
    
    // Store provider data
    if (verification.data) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          providerData: verification.data,
        },
      });
    }
  } else {
    // Fall back to mock verification
    const verification = await MockPaymentProvider.verifyPayment(reference);
    isSuccess = verification.success;
  }

  if (isSuccess) {
    const completedAt = new Date();
    
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCESS,
        completedAt,
      },
    });

    // Send payment receipt emails (fire-and-forget)
    const booking = payment.booking;

    // Calculate cancellation deadline based on policy
    let cancellationDeadline: Date | undefined;
    try {
      const freeCancellationHoursStr = await escrowService.getPolicyValue('free_cancellation_hours');
      const freeCancellationHours = parseInt(freeCancellationHoursStr, 10) || 48;
      const bookingDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.startTime}`);
      cancellationDeadline = new Date(bookingDateTime.getTime() - (freeCancellationHours * 60 * 60 * 1000));
    } catch (policyError) {
      logger.warn('Failed to get free_cancellation_hours policy, using default 48h', { policyError });
      const bookingDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.startTime}`);
      cancellationDeadline = new Date(bookingDateTime.getTime() - (48 * 60 * 60 * 1000));
    }

    // Confirm the booking with escrow fields
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { 
        status: 'CONFIRMED',
        cancellationDeadline,
        refundEligible: true,
        refundPercentage: 100,
      },
    });

    logger.info(`Payment completed: ${paymentId}`);

    // Create escrow account (non-blocking - don't let escrow failures break payment flow)
    try {
      await escrowService.createEscrow({
        bookingId: booking.id,
        customerId: booking.customer.id,
        providerId: booking.salon.owner?.id || booking.salon.id,
        salonId: booking.salon.id,
        amount: Number(payment.amount),
        paymentTransactionId: payment.providerRef || undefined,
      });
      logger.info(`Escrow created for booking: ${booking.id}`);
    } catch (escrowError) {
      logger.error('Failed to create escrow after payment success:', { 
        paymentId, 
        bookingId: payment.bookingId, 
        error: escrowError 
      });
      // Don't throw - payment is still successful even if escrow creation fails
    }

    // Send ALL booking notifications (email, SMS, check-in code, socket events)
    // This is the ONLY place these notifications should be sent - after payment success
    sendBookingNotificationsOnPaymentSuccess({
      bookingId: booking.id,
      salonId: booking.salon.id,
      salonName: booking.salon.businessName,
      salonAddress: booking.salon.address,
      salonPhone: booking.salon.phoneNumber,
      serviceName: booking.service.name,
      workerName: booking.worker?.fullName,
      customer: {
        id: booking.customer.id,
        firstName: booking.customer.firstName,
        lastName: booking.customer.lastName,
        email: booking.customer.email,
        phoneNumber: booking.customer.phoneNumber,
      },
      salonOwnerId: booking.salon.owner?.id,
      salonOwnerEmail: booking.salon.owner?.email,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalAmount: Number(booking.totalAmount),
      finalAmount: Number(booking.finalAmount),
      customerNotes: booking.customerNotes,
      isGroupBooking: booking.isGroupBooking,
      totalPeople: booking.totalPeople,
    }).catch((err) => {
      logger.error('Failed to send booking notifications after payment success', { bookingId: booking.id, err });
    });

    const customerFullName = `${booking.customer.firstName} ${booking.customer.lastName}`.trim();
    const paymentMethod = payment.provider.replace(/_/g, ' ');
    const formattedDate = new Date(booking.date).toLocaleDateString('en-GB');

    // Send to customer
    if (booking.customer.email) {
      emailService.sendPaymentReceiptEmail(
        booking.customer.email,
        {
          customerName: customerFullName,
          bookingReference: booking.id,
          paymentReference: payment.providerRef || undefined,
          salonName: booking.salon.businessName,
          serviceName: booking.service.name,
          date: booking.date.toISOString(),
          startTime: booking.startTime,
          amount: Number(payment.amount),
          currency: payment.currency,
          paymentMethod,
          paidAt: completedAt.toISOString(),
        }
      ).catch((err) => logger.error('Failed to send payment receipt email to customer', { err }));
    }

    // Send to salon owner
    if (booking.salon.owner?.email) {
      emailService.sendPaymentReceivedNotificationEmail(
        booking.salon.owner.email,
        {
          customerName: customerFullName,
          bookingReference: booking.id,
          paymentReference: payment.providerRef || undefined,
          serviceName: booking.service.name,
          date: booking.date.toISOString(),
          startTime: booking.startTime,
          amount: Number(payment.amount),
          currency: payment.currency,
          paymentMethod,
          paidAt: completedAt.toISOString(),
        }
      ).catch((err) => logger.error('Failed to send payment received notification email to salon owner', { err }));
    }

    // Send in-app notifications
    // Notify customer
    notificationService.notifyPaymentReceived(
      booking.customer.id,
      booking.id,
      Number(payment.amount),
      booking.service.name
    ).catch((err) => logger.error('Failed to send payment notification to customer', { err }));

    // Notify salon owner
    if (booking.salon.owner?.id) {
      notificationService.notifyPaymentReceived(
        booking.salon.owner.id,
        booking.id,
        Number(payment.amount),
        booking.service.name
      ).catch((err) => logger.error('Failed to send payment notification to salon owner', { err }));
    }
    
    return { 
      success: true, 
      reference, 
      message: 'Payment verified successfully.',
      bookingConfirmed: true,
      bookingReference: booking.id,
      amountPaid: Number(payment.amount),
      serviceName: booking.service.name,
      bookingDate: booking.date.toISOString(),
      bookingTime: booking.startTime,
      salonName: booking.salon.businessName,
    };
  } else {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED },
    });

    // Send in-app notification for failed payment
    const booking = payment.booking;
    notificationService.notifyPaymentFailed(
      booking.customer.id,
      booking.id,
      Number(payment.amount),
      booking.service.name
    ).catch((err) => logger.error('Failed to send payment failed notification to customer', { err }));
    
    return { 
      success: false, 
      message: 'Payment verification failed.',
      bookingConfirmed: false,
    };
  }
}

export async function getPaymentHistory(userId: string, page: number = 1, limit: number = 20) {
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            salon: {
              select: {
                id: true,
                businessName: true,
                logo: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where: { userId } }),
  ]);

  return { payments, total };
}

// Find payment by provider reference (used when Paystack redirects with just the reference)
export async function findPaymentByReference(reference: string) {
  const payment = await prisma.payment.findFirst({
    where: { providerRef: reference },
  });
  
  return payment;
}

export async function getPaymentById(paymentId: string, userId: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId,
    },
    include: {
      booking: {
        include: {
          salon: {
            select: {
              id: true,
              businessName: true,
              logo: true,
              address: true,
            },
          },
          service: true,
        },
      },
    },
  });

  return payment;
}

// Webhook handler for payment provider callbacks
export async function handlePaymentWebhook(provider: string, payload: any): Promise<void> {
  logger.info(`Webhook received from ${provider}`, { payload });

  // In a real implementation, verify webhook signature
  // and update payment status accordingly
  
  const { reference, status } = payload;
  
  if (status === 'success') {
    const payment = await prisma.payment.findFirst({
      where: { providerRef: reference },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          completedAt: new Date(),
          providerData: payload,
        },
      });

      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });
    }
  }
}

// Paystack webhook handler
export async function handlePaystackWebhook(
  rawBody: string,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get Paystack keys for signature verification
    const paystackKeys = await getPaystackKeys();
    
    if (!paystackKeys) {
      logger.warn('Paystack webhook received but keys not configured');
      return { success: false, message: 'Paystack not configured' };
    }

    // Verify webhook signature
    const isValid = PaystackPaymentProvider.verifyWebhookSignature(
      rawBody,
      signature,
      paystackKeys.secretKey
    );

    if (!isValid) {
      logger.warn('Paystack webhook signature verification failed');
      return { success: false, message: 'Invalid signature' };
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    logger.info(`Paystack webhook event: ${event}`, { reference: data?.reference });

    // Handle different event types
    switch (event) {
      case 'charge.success': {
        const payment = await prisma.payment.findFirst({
          where: { providerRef: data.reference },
          include: {
            booking: {
              include: {
                salon: {
                  select: {
                    id: true,
                    businessName: true,
                    address: true,
                    phoneNumber: true,
                    owner: {
                      select: {
                        id: true,
                        email: true,
                      },
                    },
                  },
                },
                service: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                worker: {
                  select: {
                    fullName: true,
                  },
                },
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        });

        if (payment) {
          const completedAt = new Date();
          
          // Update payment status
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              completedAt,
              providerData: data,
            },
          });

          // Send payment receipt emails (fire-and-forget)
          const booking = payment.booking;

          // Calculate cancellation deadline based on policy
          let cancellationDeadline: Date | undefined;
          try {
            const freeCancellationHoursStr = await escrowService.getPolicyValue('free_cancellation_hours');
            const freeCancellationHours = parseInt(freeCancellationHoursStr, 10) || 48;
            const bookingDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.startTime}`);
            cancellationDeadline = new Date(bookingDateTime.getTime() - (freeCancellationHours * 60 * 60 * 1000));
          } catch (policyError) {
            logger.warn('Failed to get free_cancellation_hours policy, using default 48h', { policyError });
            const bookingDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.startTime}`);
            cancellationDeadline = new Date(bookingDateTime.getTime() - (48 * 60 * 60 * 1000));
          }

          // Update booking status with escrow fields
          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { 
              status: 'CONFIRMED',
              cancellationDeadline,
              refundEligible: true,
              refundPercentage: 100,
            },
          });

          logger.info(`Payment completed via webhook: ${payment.id}`);

          // Create escrow account (non-blocking - don't let escrow failures break payment flow)
          try {
            await escrowService.createEscrow({
              bookingId: booking.id,
              customerId: booking.customer.id,
              providerId: booking.salon.owner?.id || booking.salon.id,
              salonId: booking.salon.id,
              amount: Number(payment.amount),
              paymentTransactionId: payment.providerRef || undefined,
            });
            logger.info(`Escrow created for booking: ${booking.id}`);
          } catch (escrowError) {
            logger.error('Failed to create escrow after payment success:', { 
              paymentId: payment.id, 
              bookingId: payment.bookingId, 
              error: escrowError 
            });
            // Don't throw - payment is still successful even if escrow creation fails
          }

          // Send ALL booking notifications (email, SMS, check-in code, socket events)
          // This is the ONLY place these notifications should be sent - after payment success
          sendBookingNotificationsOnPaymentSuccess({
            bookingId: booking.id,
            salonId: booking.salon.id,
            salonName: booking.salon.businessName,
            salonAddress: booking.salon.address,
            salonPhone: booking.salon.phoneNumber,
            serviceName: booking.service.name,
            workerName: booking.worker?.fullName,
            customer: {
              id: booking.customer.id,
              firstName: booking.customer.firstName,
              lastName: booking.customer.lastName,
              email: booking.customer.email,
              phoneNumber: booking.customer.phoneNumber,
            },
            salonOwnerId: booking.salon.owner?.id,
            salonOwnerEmail: booking.salon.owner?.email,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            totalAmount: Number(booking.totalAmount),
            finalAmount: Number(booking.finalAmount),
            customerNotes: booking.customerNotes,
            isGroupBooking: booking.isGroupBooking,
            totalPeople: booking.totalPeople,
          }).catch((err) => {
            logger.error('Failed to send booking notifications after payment success', { bookingId: booking.id, err });
          });

          const customerFullName = `${booking.customer.firstName} ${booking.customer.lastName}`.trim();
          const paymentMethod = payment.provider.replace(/_/g, ' ');

          // Send to customer
          if (booking.customer.email) {
            emailService.sendPaymentReceiptEmail(
              booking.customer.email,
              {
                customerName: customerFullName,
                bookingReference: booking.id,
                paymentReference: payment.providerRef || undefined,
                salonName: booking.salon.businessName,
                serviceName: booking.service.name,
                date: booking.date.toISOString(),
                startTime: booking.startTime,
                amount: Number(payment.amount),
                currency: payment.currency,
                paymentMethod,
                paidAt: completedAt.toISOString(),
              }
            ).catch((err) => logger.error('Failed to send payment receipt email to customer', { err }));
          }

          // Send to salon owner
          if (booking.salon.owner?.email) {
            emailService.sendPaymentReceivedNotificationEmail(
              booking.salon.owner.email,
              {
                customerName: customerFullName,
                bookingReference: booking.id,
                paymentReference: payment.providerRef || undefined,
                serviceName: booking.service.name,
                date: booking.date.toISOString(),
                startTime: booking.startTime,
                amount: Number(payment.amount),
                currency: payment.currency,
                paymentMethod,
                paidAt: completedAt.toISOString(),
              }
            ).catch((err) => logger.error('Failed to send payment received notification email to salon owner', { err }));
          }
        }
        break;
      }

      case 'charge.failed': {
        const payment = await prisma.payment.findFirst({
          where: { providerRef: data.reference },
          include: {
            booking: {
              include: {
                customer: {
                  select: {
                    id: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              providerData: data,
            },
          });

          // Update booking with failure reason and increment retry count
          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
              paymentFailedReason: data.gateway_response || 'Payment failed',
              paymentRetryCount: { increment: 1 },
            },
          });

          logger.info(`Payment failed via webhook: ${payment.id}`);

          // Send failure SMS to customer if phone number is available
          const booking = payment.booking;
          if (booking?.customer?.phoneNumber) {
            const failureMessage = `GroomLink: Payment failed for your booking. Please try again. Ref: ${booking.reference}`;
            smsService.sendSMS({
              to: booking.customer.phoneNumber,
              message: failureMessage,
            }).catch((err) => logger.error('Failed to send payment failure SMS to customer', { err }));
          }
        }
        break;
      }

      default:
        logger.info(`Unhandled Paystack event: ${event}`);
    }

    return { success: true, message: 'Webhook processed' };
  } catch (error) {
    logger.error('Paystack webhook error:', error);
    return { success: false, message: 'Webhook processing failed' };
  }
}

/**
 * Complete a service and release escrow funds to the provider
 * This should be called when the service has been rendered and the booking is complete
 */
export async function completeServiceAndRelease(bookingId: string): Promise<{ booking: any; escrow: any }> {
  try {
    // Fetch the booking with related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        escrow: true,
        salon: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify booking status is confirmed
    if (booking.status !== 'CONFIRMED') {
      throw new Error(`Cannot complete booking with status: ${booking.status}`);
    }

    // Verify service time has passed
    const bookingDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.endTime}`);
    const now = new Date();
    if (bookingDateTime > now) {
      throw new Error('Cannot complete booking before service end time');
    }

    // Get escrow by bookingId
    const escrow = await escrowService.getEscrowByBookingId(bookingId);
    if (!escrow) {
      throw new Error('Escrow account not found for this booking');
    }

    // Verify escrow status is held
    if (escrow.status !== 'held') {
      throw new Error(`Cannot release escrow with status: ${escrow.status}`);
    }

    // Release escrow funds to salon
    const updatedEscrow = await escrowService.releaseEscrow(escrow.id);

    // Update booking status to completed
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    logger.info(`Service completed and escrow released for booking: ${bookingId}`, {
      escrowId: escrow.id,
      providerAmount: updatedEscrow.providerAmount,
    });

    return { booking: updatedBooking, escrow: updatedEscrow };
  } catch (error) {
    logger.error('Error completing service and releasing escrow:', { bookingId, error });
    throw error;
  }
}

// Export PaystackPaymentProvider for direct use (e.g., refunds)
export { PaystackPaymentProvider, getPaystackKeys };

/**
 * Verify a payment with Paystack by reference
 * This is a reusable function that can be used by both the existing verify flow AND admin sync
 * @param reference - The Paystack transaction reference
 * @returns The Paystack verification response data (status, amount, etc.)
 */
export async function verifyPaymentWithPaystack(reference: string): Promise<{
  success: boolean;
  status: string;
  amount?: number;
  currency?: string;
  gatewayResponse?: string;
  paidAt?: string;
  channel?: string;
  data?: any;
  error?: string;
}> {
  try {
    const paystackKeys = await getPaystackKeys();
    
    if (!paystackKeys) {
      logger.warn('Paystack keys not configured, cannot verify payment');
      return {
        success: false,
        status: 'error',
        error: 'Paystack not configured',
      };
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackKeys.secretKey}`,
        },
      }
    );

    const { data } = response.data;
    const status = data.status;
    
    logger.info(`Paystack payment verified via API: ${reference}`, { 
      status,
      amount: data.amount,
      currency: data.currency,
    });
    
    return {
      success: status === 'success',
      status,
      amount: data.amount ? data.amount / 100 : undefined, // Convert from pesewas
      currency: data.currency,
      gatewayResponse: data.gateway_response,
      paidAt: data.paid_at,
      channel: data.channel,
      data,
    };
  } catch (error: any) {
    logger.error('Paystack verify payment API error:', {
      reference,
      message: error.message,
      response: error.response?.data,
    });
    
    return {
      success: false,
      status: 'error',
      error: error.response?.data?.message || error.message || 'Failed to verify payment with Paystack',
    };
  }
}

/**
 * Cleanup orphaned payments that have been stuck in PENDING or PROCESSING status
 * for more than 30 minutes without being completed.
 * 
 * This function is called by a cron job every 15 minutes.
 * 
 * @returns Summary of cleanup actions performed
 */
export async function cleanupOrphanedPayments(): Promise<{
  checked: number;
  verified: number;
  expired: number;
  failed: number;
}> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  logger.info('Starting orphaned payment cleanup job', { cutoffTime: thirtyMinutesAgo.toISOString() });
  
  // Find all payments stuck in PENDING or PROCESSING status for more than 30 minutes
  const orphanedPayments = await prisma.payment.findMany({
    where: {
      status: {
        in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
      },
      createdAt: {
        lt: thirtyMinutesAgo,
      },
    },
    include: {
      booking: {
        include: {
          customer: {
            select: {
              id: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });
  
  let verified = 0;
  let expired = 0;
  let failed = 0;
  
  for (const payment of orphanedPayments) {
    try {
      if (payment.status === PaymentStatus.PROCESSING && payment.providerRef) {
        // For PROCESSING payments: try to verify with Paystack first
        const verification = await verifyPaymentWithPaystack(payment.providerRef);
        
        if (verification.success && verification.status === 'success') {
          // Payment was actually successful on Paystack - complete it normally
          logger.info(`Orphaned payment ${payment.id} verified as successful via Paystack`, {
            reference: payment.providerRef,
          });
          
          // Update payment status to SUCCESS
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              completedAt: new Date(),
              providerData: verification.data,
            },
          });
          
          // Confirm the booking
          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED' },
          });
          
          verified++;
          
          // Send notification to customer
          notificationService.notifyPaymentReceived(
            payment.booking.customer.id,
            payment.bookingId,
            Number(payment.amount),
            'Booking'
          ).catch((err) => logger.error('Failed to send payment notification after cleanup verification', { err }));
          
          continue;
        } else {
          // Paystack says failed or not found - mark as FAILED
          logger.info(`Orphaned PROCESSING payment ${payment.id} marked as failed after Paystack verification`, {
            reference: payment.providerRef,
            paystackStatus: verification.status,
          });
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              providerData: verification.data || { cleanupReason: 'Orphaned - Paystack verification failed' },
            },
          });
          
          failed++;
        }
      } else {
        // For PENDING payments older than 30 minutes: mark as expired
        logger.info(`Orphaned PENDING payment ${payment.id} marked as expired`, {
          createdAt: payment.createdAt,
        });
        
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            providerData: { cleanupReason: 'Payment expired - not initiated within time limit' },
          },
        });
        
        expired++;
      }
      
      // Update the associated booking status back to PENDING so customer can retry
      const booking = payment.booking;
      
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: 'PENDING',
        },
      });
      
      logger.info(`Booking ${payment.bookingId} status reset to PENDING for retry after orphaned payment cleanup`);
      
      // Notify customer of payment failure
      notificationService.notifyPaymentFailed(
        booking.customer.id,
        payment.bookingId,
        Number(payment.amount),
        'Booking'
      ).catch((err: Error) => logger.error('Failed to send payment failed notification', { err }));
      
      // Send failure SMS if phone number available
      if (booking.customer.phoneNumber) {
        const failureMessage = `GroomLink: Payment expired for your booking. Please retry payment. Ref: ${payment.bookingId}`;
        smsService.sendSMS({
          to: booking.customer.phoneNumber,
          message: failureMessage,
        }).catch((err: Error) => logger.error('Failed to send payment expiry SMS to customer', { err }));
      }
    } catch (error) {
      logger.error(`Failed to cleanup orphaned payment ${payment.id}:`, error);
    }
  }
  
  const summary = {
    checked: orphanedPayments.length,
    verified,
    expired,
    failed,
  };
  
  logger.info('Orphaned payment cleanup completed', summary);
  
  return summary;
}
