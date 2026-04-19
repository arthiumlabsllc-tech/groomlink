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
  checkout_url?: string;
  access_code?: string;
}

export interface HubtelCredentials {
  apiId: string;
  apiSecret: string;
  merchantAccountId: string;
}

// Helper function to get Hubtel credentials from SiteSettings with env var fallback
async function getHubtelCredentials(): Promise<HubtelCredentials | null> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' }
  });
  
  // Check if SiteSettings has credentials configured
  const dbApiId = (settings as any)?.hubtelApiId;
  const dbApiSecret = (settings as any)?.hubtelApiSecret;
  const dbMerchantAccountId = (settings as any)?.hubtelMerchantAccountId;
  
  if (dbApiId && dbApiSecret && dbMerchantAccountId) {
    logger.info('Hubtel credentials loaded from SiteSettings', {
      source: 'database',
    });
    return {
      apiId: dbApiId,
      apiSecret: dbApiSecret,
      merchantAccountId: dbMerchantAccountId,
    };
  }
  
  // Fall back to environment variables
  const envApiId = process.env.HUBTEL_API_ID;
  const envApiSecret = process.env.HUBTEL_API_SECRET;
  const envMerchantAccountId = process.env.HUBTEL_MERCHANT_ACCOUNT_ID;
  
  if (envApiId && envApiSecret && envMerchantAccountId) {
    logger.info('Hubtel credentials loaded from environment variables', {
      source: 'env_vars',
    });
    return {
      apiId: envApiId,
      apiSecret: envApiSecret,
      merchantAccountId: envMerchantAccountId,
    };
  }
  
  // Neither SiteSettings nor env vars have credentials configured
  logger.warn('Hubtel credentials not configured in SiteSettings or environment variables');
  return null;
}

// Helper to build Hubtel Basic Auth header
function getHubtelAuthHeader(apiId: string, apiSecret: string) {
  const credentials = Buffer.from(`${apiId}:${apiSecret}`).toString('base64');
  return { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' };
}

/**
 * Send all booking notifications after payment success
 * This is called from both verifyAndCompletePayment() and handleHubtelWebhook()
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

// Mock payment provider implementations (fallback when Hubtel is not configured)
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

// Hubtel Payment Provider
class HubtelPaymentProvider {
  private static BASE_URL = 'https://api.hubtel.com/v1/receivemoney';

  /**
   * Map internal payment provider to Hubtel mobile money channel code
   */
  private static getChannel(provider: PaymentProvider): string {
    const channelMap: Record<string, string> = {
      [PaymentProvider.MTN_MOMO]: 'mtn-gh',
      [PaymentProvider.VODAFONE_CASH]: 'vod-gh',
      [PaymentProvider.AIRTELTIGO_MONEY]: 'tgo-gh',
    };
    return channelMap[provider] || 'mtn-gh';
  }

  /**
   * Initialize a payment transaction with Hubtel
   */
  static async initializePayment(
    amount: number,
    email: string,
    reference: string,
    bookingId: string,
    provider: PaymentProvider,
    apiId: string,
    apiSecret: string,
    merchantAccountId: string,
    phoneNumber?: string
  ): Promise<PaymentResult> {
    try {
      // Amount in GHS (cedis) — NOT pesewas
      const channel = this.getChannel(provider);

      // Ensure phone number has +233 prefix
      let customerMsisdn = phoneNumber || '';
      if (customerMsisdn && !customerMsisdn.startsWith('+')) {
        customerMsisdn = `+${customerMsisdn}`;
      }

      const webhookUrl = process.env.HUBTEL_PAYMENT_WEBHOOK_URL || 'https://groomlinkgh.com/api/payments/webhook/hubtel';

      const requestBody = {
        CustomerName: email || 'Customer',
        CustomerEmail: email,
        CustomerMsisdn: customerMsisdn,
        Channel: channel,
        Amount: amount,
        ClientReference: reference,
        Description: `GroomLink Booking ${bookingId}`,
        PrimaryCallbackUrl: webhookUrl,
        SecondaryCallbackUrl: webhookUrl,
      };

      const response = await axios.post(
        `${this.BASE_URL}/receive`,
        requestBody,
        {
          headers: getHubtelAuthHeader(apiId, apiSecret),
        }
      );

      const data = response.data;

      logger.info(`Hubtel payment initialized: ${reference}`, { bookingId });

      return {
        success: true,
        reference,
        checkout_url: data?.checkoutUrl || data?.redirectUrl || undefined,
        message: 'Payment initialized. Please complete payment on your phone.',
      };
    } catch (error: any) {
      logger.error('Hubtel initialize payment error:', {
        message: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to initialize payment with Hubtel',
      };
    }
  }

  /**
   * Verify a payment transaction with Hubtel
   */
  static async verifyPayment(
    reference: string,
    apiId: string,
    apiSecret: string
  ): Promise<{ success: boolean; status: string; data: any }> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/status?ClientReference=${reference}`,
        {
          headers: getHubtelAuthHeader(apiId, apiSecret),
        }
      );

      const data = response.data;
      const isSuccessful = data.Status === '0000' && data.Data?.TransactionStatus === 'success';

      logger.info(`Hubtel payment verified: ${reference}`, { status: data.Status, transactionStatus: data.Data?.TransactionStatus });

      return {
        success: isSuccessful,
        status: isSuccessful ? 'success' : (data.Data?.TransactionStatus || 'unknown'),
        data,
      };
    } catch (error: any) {
      logger.error('Hubtel verify payment error:', {
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
   * Verify webhook signature from Hubtel
   * Hubtel uses HMAC-SHA512 of request body with API secret
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    apiSecret: string
  ): boolean {
    const hash = crypto
      .createHmac('sha512', apiSecret)
      .update(payload)
      .digest('hex');
    return hash === signature;
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

  // Check if Hubtel is configured
  const hubtelCredentials = await getHubtelCredentials();
  // Use totalChargeAmount which includes platform fee (already in GHS, NOT pesewas)
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

  // Use Hubtel if credentials are configured, otherwise fall back to mock
  if (hubtelCredentials) {
    // Use customer email or generate a placeholder email
    const email = booking.customer?.email || `customer_${userId}@groomlink.temp`;
    
    result = await HubtelPaymentProvider.initializePayment(
      amount,
      email,
      reference,
      bookingId,
      provider,
      hubtelCredentials.apiId,
      hubtelCredentials.apiSecret,
      hubtelCredentials.merchantAccountId,
      phoneNumber  // Pass phone number for mobile money prompt
    );
    
    logger.info(`Hubtel payment initiated for booking: ${bookingId}`);
  } else {
    // Fall back to mock provider
    logger.warn('Hubtel not configured, using mock payment provider');
    
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
  serviceAmount?: number;
  platformFee?: number;
  serviceName?: string;
  bookingDate?: string;
  bookingTime?: string;
  salonName?: string;
  isGroupBooking?: boolean;
  totalPeople?: number;
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
    // Extract service amount and platform fee from providerData if available
    const providerData = payment.providerData as { serviceAmount?: number; platformFee?: number; feePercent?: number } | null;
    const serviceAmount = providerData?.serviceAmount ?? Number(booking.finalAmount);
    const platformFee = providerData?.platformFee ?? (Number(payment.amount) - serviceAmount);
    
    return { 
      success: true, 
      message: 'Payment already completed',
      bookingConfirmed: true,
      bookingReference: booking.id,
      amountPaid: Number(payment.amount),
      serviceAmount: serviceAmount,
      platformFee: platformFee,
      serviceName: booking.service.name,
      bookingDate: booking.date.toISOString(),
      bookingTime: booking.startTime,
      salonName: booking.salon.businessName,
      isGroupBooking: booking.isGroupBooking,
      totalPeople: booking.totalPeople,
    };
  }

  // Check if Hubtel is configured
  const hubtelCredentials = await getHubtelCredentials();
  let isSuccess = false;

  if (hubtelCredentials) {
    // Verify with Hubtel
    const verification = await HubtelPaymentProvider.verifyPayment(
      reference,
      hubtelCredentials.apiId,
      hubtelCredentials.apiSecret
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
    
    // Extract service amount and platform fee from providerData if available
    const providerData = payment.providerData as { serviceAmount?: number; platformFee?: number; feePercent?: number } | null;
    const serviceAmount = providerData?.serviceAmount ?? Number(booking.finalAmount);
    const platformFee = providerData?.platformFee ?? (Number(payment.amount) - serviceAmount);
    
    return { 
      success: true, 
      reference, 
      message: 'Payment verified successfully.',
      bookingConfirmed: true,
      bookingReference: booking.id,
      amountPaid: Number(payment.amount),
      serviceAmount: serviceAmount,
      platformFee: platformFee,
      serviceName: booking.service.name,
      bookingDate: booking.date.toISOString(),
      bookingTime: booking.startTime,
      salonName: booking.salon.businessName,
      isGroupBooking: booking.isGroupBooking,
      totalPeople: booking.totalPeople,
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

// Find payment by provider reference (used when Hubtel redirects with just the reference)
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

// Hubtel webhook handler
export async function handleHubtelWebhook(
  rawBody: string,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get Hubtel credentials for signature verification
    const hubtelCredentials = await getHubtelCredentials();
    
    if (!hubtelCredentials) {
      logger.warn('Hubtel webhook received but credentials not configured');
      return { success: false, message: 'Hubtel not configured' };
    }

    // Verify webhook signature (Hubtel uses HMAC-SHA512 with API secret)
    const isValid = HubtelPaymentProvider.verifyWebhookSignature(
      rawBody,
      signature,
      hubtelCredentials.apiSecret
    );

    if (!isValid) {
      logger.warn('Hubtel webhook signature verification failed');
      return { success: false, message: 'Invalid signature' };
    }

    const payload = JSON.parse(rawBody);
    const clientReference = payload.ClientReference;
    const transactionId = payload.TransactionId;
    const transactionStatus = payload.TransactionStatus;
    const status = payload.Status;

    logger.info(`Hubtel webhook event: Status=${status}, TransactionStatus=${transactionStatus}`, { clientReference });

    // Handle success: Status === "0000" or TransactionStatus === "success"
    if ((status === '0000' || transactionStatus === 'success') && clientReference) {
      const payment = await prisma.payment.findFirst({
        where: { providerRef: clientReference },
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
        
        // Update payment status and store hubtelTransactionId
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            completedAt,
            providerData: {
              ...((payment.providerData as any) || {}),
              hubtelTransactionId: transactionId,
              hubtelPayload: payload,
            },
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
    } else if (transactionStatus === 'failed' && clientReference) {
      // Handle failed payment
      const payment = await prisma.payment.findFirst({
        where: { providerRef: clientReference },
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
            providerData: {
              ...((payment.providerData as any) || {}),
              hubtelTransactionId: transactionId,
              hubtelPayload: payload,
            },
          },
        });

        // Update booking with failure reason and increment retry count
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentFailedReason: payload.Reason || 'Payment failed',
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
    } else {
      logger.info(`Unhandled Hubtel webhook: Status=${status}, TransactionStatus=${transactionStatus}`);
    }

    return { success: true, message: 'Webhook processed' };
  } catch (error) {
    logger.error('Hubtel webhook error:', error);
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

// Export HubtelPaymentProvider and credential helper for direct use
export { HubtelPaymentProvider, getHubtelCredentials };

/**
 * Verify a payment with Hubtel by reference
 * This is a reusable function that can be used by both the existing verify flow AND admin sync
 * @param reference - The Hubtel client reference
 * @returns The Hubtel verification response data (status, amount, etc.)
 */
export async function verifyPaymentWithHubtel(reference: string): Promise<{
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
    const hubtelCredentials = await getHubtelCredentials();
    
    if (!hubtelCredentials) {
      logger.warn('Hubtel credentials not configured, cannot verify payment');
      return {
        success: false,
        status: 'error',
        error: 'Hubtel not configured',
      };
    }

    const response = await axios.get(
      `https://api.hubtel.com/v1/receivemoney/status?ClientReference=${reference}`,
      {
        headers: getHubtelAuthHeader(hubtelCredentials.apiId, hubtelCredentials.apiSecret),
      }
    );

    const data = response.data;
    const isSuccessful = data.Status === '0000' && data.Data?.TransactionStatus === 'success';
    const status = isSuccessful ? 'success' : (data.Data?.TransactionStatus || data.Status || 'unknown');
    
    logger.info(`Hubtel payment verified via API: ${reference}`, { 
      status: data.Status,
      transactionStatus: data.Data?.TransactionStatus,
      amount: data.Data?.Amount,
    });
    
    return {
      success: isSuccessful,
      status,
      amount: data.Data?.Amount, // Already in GHS, no conversion needed
      currency: 'GHS',
      gatewayResponse: data.Data?.TransactionStatus,
      paidAt: data.Data?.TransactionDate,
      channel: data.Data?.Channel,
      data,
    };
  } catch (error: any) {
    logger.error('Hubtel verify payment API error:', {
      reference,
      message: error.message,
      response: error.response?.data,
    });
    
    return {
      success: false,
      status: 'error',
      error: error.response?.data?.message || error.message || 'Failed to verify payment with Hubtel',
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
        // For PROCESSING payments: try to verify with Hubtel first
        const verification = await verifyPaymentWithHubtel(payment.providerRef);
        
        if (verification.success && verification.status === 'success') {
          // Payment was actually successful on Hubtel - complete it normally
          logger.info(`Orphaned payment ${payment.id} verified as successful via Hubtel`, {
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
          // Hubtel says failed or not found - mark as FAILED
          logger.info(`Orphaned PROCESSING payment ${payment.id} marked as failed after Hubtel verification`, {
            reference: payment.providerRef,
            hubtelStatus: verification.status,
          });
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              providerData: verification.data || { cleanupReason: 'Orphaned - Hubtel verification failed' },
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

/**
 * Handle Paystack webhook events
 */
export async function handlePaystackWebhook(
  rawBody: string,
  headers: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  try {
    const event = JSON.parse(rawBody);
    
    logger.info('Paystack webhook event received', {
      event: event.event,
      reference: event.data?.reference,
      status: event.data?.status,
    });

    // Get Paystack credentials
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' }
    });
    
    const paystackSecretKey = (settings as any)?.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
    
    if (!paystackSecretKey) {
      logger.error('Paystack secret key not configured');
      return { success: false, message: 'Paystack not configured' };
    }

    const credentials = {
      secretKey: paystackSecretKey,
      publicKey: (settings as any)?.paystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY || '',
    };

    // Import Paystack provider
    const { PaystackProvider } = await import('./paystack.provider');
    const paystack = new PaystackProvider();

    // Verify webhook signature
    const isValidSignature = paystack.verifyWebhookSignature(
      { rawBody, headers },
      credentials
    );

    if (!isValidSignature) {
      logger.error('Invalid Paystack webhook signature');
      return { success: false, message: 'Invalid signature' };
    }

    // Handle the webhook event
    const webhookResponse = await paystack.handleWebhook(
      { rawBody, headers },
      credentials
    );

    // Process based on event type
    switch (event.event) {
      case 'charge.success':
        const reference = event.data.reference;
        
        // Find payment by reference
        const payment = await prisma.payment.findFirst({
          where: {
            providerRef: reference,
          },
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
          logger.warn('Payment not found for Paystack webhook', { reference });
          return { success: false, message: 'Payment not found' };
        }

        if (payment.status === PaymentStatus.SUCCESS) {
          logger.info('Payment already completed', { reference });
          return { success: true, message: 'Payment already processed' };
        }

        // Verify payment with Paystack
        const verification = await paystack.verifyPayment(reference, credentials);
        
        if (!verification.success) {
          logger.error('Paystack payment verification failed', { reference });
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              providerData: {
                ...event.data,
                failedAt: new Date().toISOString(),
              },
            },
          });

          return { success: false, message: 'Payment verification failed' };
        }

        // Complete payment
        const result = await verifyAndCompletePayment(payment.id, reference);
        
        if (result.success) {
          logger.info('Paystack payment completed via webhook', {
            reference,
            bookingId: payment.bookingId,
          });
        } else {
          logger.error('Failed to complete Paystack payment', {
            reference,
            message: result.message,
          });
        }

        return { success: result.success, message: result.message };

      case 'transfer.success':
        logger.info('Paystack transfer successful', {
          reference: event.data.reference,
        });
        // Update escrow account if needed
        break;

      case 'transfer.failed':
        logger.error('Paystack transfer failed', {
          reference: event.data.reference,
        });
        // Handle failed payout
        break;

      default:
        logger.info('Unhandled Paystack webhook event', { event: event.event });
    }

    return { success: true, message: 'Webhook processed' };
  } catch (error: any) {
    logger.error('Paystack webhook handling error', {
      message: error.message,
      stack: error.stack,
    });

    return { success: false, message: 'Webhook processing failed' };
  }
}

