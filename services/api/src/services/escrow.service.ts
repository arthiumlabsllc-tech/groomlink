import prisma from '../config/database';
import logger from '../config/logger';
import redis from '../config/redis';
import { EscrowAccount } from '@prisma/client';
import { initiateHubtelPayout, getHubtelChannel, formatGhanaPhone } from './payout.service';

// Ghana phone prefix to mobile money provider mapping (for refund detection)
const GHANA_PHONE_PREFIX_MAP: Record<string, 'mtn' | 'vodafone' | 'airteltigo'> = {
  '024': 'mtn',
  '054': 'mtn',
  '055': 'mtn',
  '059': 'mtn',
  '020': 'vodafone',
  '050': 'vodafone',
  '053': 'vodafone',
  '058': 'vodafone',
  '027': 'airteltigo',
  '057': 'airteltigo',
  '026': 'airteltigo',
  '056': 'airteltigo',
};

/**
 * Detect MoMo provider from a Ghana phone number prefix.
 * Returns 'mtn' as a fallback if the prefix is not recognised.
 */
function detectMomoProviderFromPhone(phone: string): 'mtn' | 'vodafone' | 'airteltigo' {
  const cleaned = phone.replace(/[\s-]/g, '');
  // Extract the local prefix: 0XX
  let localPrefix: string | undefined;
  const localMatch = cleaned.match(/^0(\d{2})/);
  if (localMatch) {
    localPrefix = `0${localMatch[1]}`;
  } else {
    const intlMatch = cleaned.match(/^\+?233(\d{2})/);
    if (intlMatch) {
      localPrefix = `0${intlMatch[1]}`;
    }
  }
  if (localPrefix && GHANA_PHONE_PREFIX_MAP[localPrefix]) {
    return GHANA_PHONE_PREFIX_MAP[localPrefix];
  }
  return 'mtn'; // fallback
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
    
    // Check if salon has MoMo payout details configured
    if (!escrow.salon.momoNumber || !escrow.salon.momoProvider) {
      logger.error('Cannot release escrow: Salon has no MoMo payout account configured', { 
        escrowId,
        salonId: escrow.salonId 
      });
      throw new Error(
        'Cannot release payment: Salon owner has not set up a MoMo payout account. ' +
        'Please ask the salon owner to configure their payout settings in the dashboard.'
      );
    }

    // Initiate Hubtel Send Money payout to salon
    const payoutReference = 'GROOMLINK-PAYOUT-' + escrow.booking.reference + '-' + Date.now();
    let hubtelPayoutReference: string | undefined;

    try {
      const payoutResult = await initiateHubtelPayout({
        recipientPhone: escrow.salon.momoNumber,
        recipientName: escrow.salon.businessName,
        amount: providerAmount, // GHS (cedis decimal), NOT pesewas
        channel: getHubtelChannel(escrow.salon.momoProvider),
        reference: payoutReference,
        description: 'Payment for service completion',
      });

      hubtelPayoutReference = payoutResult?.Data?.ClientReference || payoutReference;

      logger.info(`Hubtel payout initiated for escrow ${escrowId}`, {
        recipient: escrow.salon.momoNumber,
        amount: providerAmount,
        hubtelPayoutReference,
      });
    } catch (transferError: any) {
      logger.error('Hubtel payout failed:', {
        escrowId,
        error: transferError.message,
        response: transferError.response?.data
      });

      // Throw error so the caller knows the transfer failed
      const errorMessage = transferError.response?.data?.message || transferError.message;
      throw new Error(`Failed to transfer funds: ${errorMessage}. Please try again or contact support.`);
    }
    
    // Update escrow status and create transaction
    const updatedEscrow = await prisma.$transaction(async (tx) => {
      // Update escrow account
      const updated = await tx.escrowAccount.update({
        where: { id: escrowId },
        data: {
          status: 'released',
          releasedAt: new Date(),
          hubtelPayoutReference,
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
    // Fetch escrow with booking and customer relations
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
      include: {
        booking: {
          include: {
            customer: true,
          }
        },
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
    
    // Send refund via Hubtel Send Money back to the customer
    let hubtelPayoutReference: string | undefined;
    const customerPhone = escrow.booking.customer?.phoneNumber;

    if (customerPhone) {
      const refundReference = 'GROOMLINK-REFUND-' + escrow.booking.reference + '-' + Date.now();
      const detectedProvider = detectMomoProviderFromPhone(customerPhone);

      try {
        const payoutResult = await initiateHubtelPayout({
          recipientPhone: customerPhone,
          recipientName: `${escrow.booking.customer.firstName} ${escrow.booking.customer.lastName}`,
          amount: refundAmount, // GHS (cedis decimal), NOT pesewas
          channel: getHubtelChannel(detectedProvider),
          reference: refundReference,
          description: 'Refund for cancelled booking',
        });

        hubtelPayoutReference = payoutResult?.Data?.ClientReference || refundReference;

        logger.info(`Hubtel refund payout initiated for escrow ${escrowId}`, {
          customerPhone: formatGhanaPhone(customerPhone),
          refundAmount,
          hubtelPayoutReference,
        });
      } catch (refundError: any) {
        logger.error('Hubtel refund payout failed:', {
          escrowId,
          error: refundError.message,
          response: refundError.response?.data
        });
        // Continue with ledger update even if refund payout fails
      }
    } else {
      logger.warn('No customer phone number found for escrow, skipping Hubtel refund payout:', { escrowId });
    }
    
    // Update escrow status and create transaction
    const updatedEscrow = await prisma.$transaction(async (tx) => {
      // Update escrow account
      const updated = await tx.escrowAccount.update({
        where: { id: escrowId },
        data: {
          status: 'refunded',
          hubtelPayoutReference,
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
          reference: hubtelPayoutReference,
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
