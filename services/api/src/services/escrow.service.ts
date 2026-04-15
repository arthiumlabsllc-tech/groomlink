import prisma from '../config/database';
import logger from '../config/logger';
import redis from '../config/redis';
import axios from 'axios';
import { EscrowAccount } from '@prisma/client';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Helper function to get Paystack secret key from SiteSettings
async function getPaystackSecretKey(): Promise<string | null> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' }
  });
  
  if (!settings || !settings.paystackSecretKey) {
    logger.warn('Paystack secret key not configured in SiteSettings');
    return null;
  }
  
  return settings.paystackSecretKey;
}

/**
 * Get policy value from PlatformPolicy table with Redis caching
 */
export async function getPolicyValue(policyName: string): Promise<string> {
  const cacheKey = `policy:${policyName}`;
  
  try {
    // Check Redis cache first
    const cachedValue = await redis.get(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }
    
    // Query database if not in cache
    const policy = await prisma.platformPolicy.findUnique({
      where: { policyName }
    });
    
    if (!policy) {
      throw new Error(`Platform policy '${policyName}' not found`);
    }
    
    // Cache in Redis with 5-minute TTL (300 seconds)
    await redis.setex(cacheKey, 300, policy.policyValue);
    
    return policy.policyValue;
  } catch (error) {
    logger.error('Error fetching policy value:', { policyName, error });
    throw error;
  }
}

export interface CreateEscrowParams {
  bookingId: string;
  customerId: string;
  providerId: string;
  salonId: string;
  amount: number; // total amount paid by customer
  paymentTransactionId?: string;
}

/**
 * Create a new escrow account for a booking
 */
export async function createEscrow(params: CreateEscrowParams): Promise<EscrowAccount> {
  const { bookingId, customerId, providerId, salonId, amount, paymentTransactionId } = params;
  
  try {
    // Fetch platform fee percentage from policy
    const feePercentStr = await getPolicyValue('platform_fee_percentage');
    const feePercent = parseFloat(feePercentStr);
    
    if (isNaN(feePercent)) {
      throw new Error('Invalid platform_fee_percentage policy value');
    }
    
    // Calculate amounts
    const platformFee = amount * (feePercent / 100);
    const providerAmount = amount - platformFee;
    
    // Create escrow account and initial transaction in a transaction
    const escrow = await prisma.$transaction(async (tx) => {
      // Create the escrow account
      const escrowAccount = await tx.escrowAccount.create({
        data: {
          bookingId,
          customerId,
          providerId,
          salonId,
          amountHeld: amount,
          platformFee,
          providerAmount,
          status: 'held',
          paymentTransactionId,
        }
      });
      
      // Create initial hold transaction
      await tx.escrowTransaction.create({
        data: {
          escrowId: escrowAccount.id,
          transactionType: 'hold',
          amount,
          previousBalance: 0,
          newBalance: amount,
          reference: paymentTransactionId,
        }
      });
      
      return escrowAccount;
    });
    
    logger.info(`Escrow created for booking ${bookingId}`, {
      escrowId: escrow.id,
      amount,
      platformFee,
      providerAmount
    });
    
    return escrow;
  } catch (error) {
    logger.error('Error creating escrow:', { bookingId, error });
    throw error;
  }
}

/**
 * Release escrow funds to the provider
 */
export async function releaseEscrow(escrowId: string): Promise<EscrowAccount> {
  try {
    // Fetch escrow with booking and salon relations
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
      include: {
        booking: true,
        salon: true,
      }
    });
    
    if (!escrow) {
      throw new Error('Escrow account not found');
    }
    
    if (escrow.status !== 'held') {
      throw new Error(`Cannot release escrow with status: ${escrow.status}`);
    }
    
    const providerAmount = parseFloat(escrow.providerAmount.toString());
    const amountHeld = parseFloat(escrow.amountHeld.toString());
    
    // Try to initiate Paystack transfer if salon has recipient code
    if (escrow.salon.paystackRecipientCode) {
      const secretKey = await getPaystackSecretKey();
      
      if (secretKey) {
        try {
          const reference = `ESCROW-RELEASE-${escrowId}-${Date.now()}`;
          
          await axios.post(
            `${PAYSTACK_BASE_URL}/transfer`,
            {
              source: 'balance',
              amount: Math.round(providerAmount * 100), // Convert to pesewas
              recipient: escrow.salon.paystackRecipientCode,
              reason: `Booking payment - ${escrow.booking.reference || escrow.bookingId}`,
              reference,
            },
            {
              headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          logger.info(`Paystack transfer initiated for escrow ${escrowId}`, {
            recipient: escrow.salon.paystackRecipientCode,
            amount: providerAmount
          });
        } catch (transferError: any) {
          logger.warn('Paystack transfer failed, proceeding with ledger update only:', {
            escrowId,
            error: transferError.message,
            response: transferError.response?.data
          });
          // Continue with ledger update even if transfer fails
        }
      } else {
        logger.warn('Paystack not configured, skipping transfer for escrow:', { escrowId });
      }
    } else {
      logger.warn('Salon has no paystackRecipientCode, skipping transfer for escrow:', { escrowId });
    }
    
    // Update escrow status and create transaction
    const updatedEscrow = await prisma.$transaction(async (tx) => {
      // Update escrow account
      const updated = await tx.escrowAccount.update({
        where: { id: escrowId },
        data: {
          status: 'released',
          releasedAt: new Date(),
        }
      });
      
      // Create release transaction
      await tx.escrowTransaction.create({
        data: {
          escrowId,
          transactionType: 'release',
          amount: providerAmount,
          previousBalance: amountHeld,
          newBalance: 0,
        }
      });
      
      return updated;
    });
    
    logger.info(`Escrow released for booking ${escrow.bookingId}`, {
      escrowId,
      providerAmount
    });
    
    return updatedEscrow;
  } catch (error) {
    logger.error('Error releasing escrow:', { escrowId, error });
    throw error;
  }
}

/**
 * Refund escrow funds to the customer
 */
export async function refundEscrow(
  escrowId: string,
  refundPercentage: number
): Promise<{ escrow: EscrowAccount; refundAmount: number }> {
  try {
    // Fetch escrow
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
      include: {
        booking: true,
      }
    });
    
    if (!escrow) {
      throw new Error('Escrow account not found');
    }
    
    if (escrow.status !== 'held') {
      throw new Error(`Cannot refund escrow with status: ${escrow.status}`);
    }
    
    const amountHeld = parseFloat(escrow.amountHeld.toString());
    let refundAmount = amountHeld * (refundPercentage / 100);
    
    // If 100% refund, deduct processing fee
    if (refundPercentage === 100) {
      try {
        const processingFeeStr = await getPolicyValue('cancellation_processing_fee');
        const processingFee = parseFloat(processingFeeStr);
        
        if (!isNaN(processingFee) && processingFee > 0) {
          refundAmount = Math.max(0, refundAmount - processingFee);
        }
      } catch (policyError) {
        logger.warn('Cancellation processing fee policy not found, using full refund amount');
      }
    }
    
    // Try Paystack refund if we have the payment transaction ID
    let refundTransactionId: string | undefined;
    
    if (escrow.paymentTransactionId) {
      const secretKey = await getPaystackSecretKey();
      
      if (secretKey) {
        try {
          const response = await axios.post(
            `${PAYSTACK_BASE_URL}/refund`,
            {
              transaction: escrow.paymentTransactionId,
              amount: Math.round(refundAmount * 100), // Convert to pesewas
            },
            {
              headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          refundTransactionId = response.data.data?.reference || response.data.data?.id;
          
          logger.info(`Paystack refund initiated for escrow ${escrowId}`, {
            transactionId: escrow.paymentTransactionId,
            refundAmount
          });
        } catch (refundError: any) {
          logger.error('Paystack refund failed:', {
            escrowId,
            error: refundError.message,
            response: refundError.response?.data
          });
          // Continue with ledger update even if refund fails
        }
      } else {
        logger.warn('Paystack not configured, skipping refund for escrow:', { escrowId });
      }
    } else {
      logger.warn('No payment transaction ID found for escrow, skipping Paystack refund:', { escrowId });
    }
    
    // Update escrow status and create transaction
    const updatedEscrow = await prisma.$transaction(async (tx) => {
      // Update escrow account
      const updated = await tx.escrowAccount.update({
        where: { id: escrowId },
        data: {
          status: 'refunded',
          refundTransactionId,
        }
      });
      
      // Create refund transaction
      await tx.escrowTransaction.create({
        data: {
          escrowId,
          transactionType: 'refund',
          amount: refundAmount,
          previousBalance: amountHeld,
          newBalance: amountHeld - refundAmount,
          reference: refundTransactionId,
        }
      });
      
      return updated;
    });
    
    logger.info(`Escrow refunded for booking ${escrow.bookingId}`, {
      escrowId,
      refundAmount,
      refundPercentage
    });
    
    return { escrow: updatedEscrow, refundAmount };
  } catch (error) {
    logger.error('Error refunding escrow:', { escrowId, error });
    throw error;
  }
}

/**
 * Get escrow account by booking ID
 */
export async function getEscrowByBookingId(bookingId: string): Promise<EscrowAccount | null> {
  try {
    const escrow = await prisma.escrowAccount.findUnique({
      where: { bookingId }
    });
    
    return escrow;
  } catch (error) {
    logger.error('Error fetching escrow by booking ID:', { bookingId, error });
    throw error;
  }
}
