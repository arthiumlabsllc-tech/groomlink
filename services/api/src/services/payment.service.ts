import prisma from '../config/database';
import logger from '../config/logger';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

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
}

// Mock payment provider implementations
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

export async function initializePayment(
  userId: string,
  data: InitializePaymentData
): Promise<PaymentResult> {
  const { bookingId, provider, phoneNumber } = data;

  // Get booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
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

  // Create or update payment record
  const payment = await prisma.payment.upsert({
    where: { bookingId },
    create: {
      bookingId,
      userId,
      provider,
      amount: booking.finalAmount,
      currency: 'GHS',
      status: PaymentStatus.PENDING,
      providerRef: reference,
    },
    update: {
      provider,
      providerRef: reference,
      status: PaymentStatus.PENDING,
    },
  });

  // Initiate payment with provider
  let result: PaymentResult;
  const amount = Number(booking.finalAmount);

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
    case PaymentProvider.CASH:
      result = {
        success: true,
        reference,
        message: 'Cash payment recorded. Please pay at the salon.',
      };
      break;
    default:
      return { success: false, message: 'Unsupported payment provider' };
  }

  if (result.success) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PROCESSING },
    });

    // Simulate webhook - auto-verify after 5 seconds in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(async () => {
        await verifyAndCompletePayment(payment.id, reference);
      }, 5000);
    }
  }

  logger.info(`Payment initiated: ${payment.id} for booking: ${bookingId}`);
  return { ...result, paymentId: payment.id };
}

export async function verifyAndCompletePayment(paymentId: string, reference: string): Promise<PaymentResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });

  if (!payment) {
    return { success: false, message: 'Payment not found' };
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    return { success: true, message: 'Payment already completed' };
  }

  // Verify with provider
  const verification = await MockPaymentProvider.verifyPayment(reference);

  if (verification.success) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCESS,
        completedAt: new Date(),
      },
    });

    // Confirm the booking
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'CONFIRMED' },
    });

    logger.info(`Payment completed: ${paymentId}`);
  } else {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED },
    });
  }

  return verification;
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
                name: true,
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
              name: true,
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
