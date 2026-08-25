import prisma from '../config/database';
import logger from '../config/logger';
import redis from '../config/redis';
import { EscrowAccount } from '@prisma/client';
import { initiateHubtelPayout, getHubtelChannel, formatGhanaPhone } from './payout.service';
import { PaystackProvider } from './paystack.provider';
import { paymentProviderRegistry } from './payment-provider.registry';
import * as pushService from './pushNotification.service';

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
export function detectMomoProviderFromPhone(phone: string): 'mtn' | 'vodafone' | 'airteltigo' {
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
 * Get the active payment gateway from SiteSettings (admin dashboard configuration).
 * Falls back to 'paystack' if not configured, since that's our primary gateway.
 */
export async function getActivePaymentGateway(): Promise<'paystack' | 'hubtel'> {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });
    return (settings?.paymentGateway as any) || 'paystack';
  } catch {
    return 'paystack';
  }
}

/**
 * Process a refund via Paystack reverse charge (works for both card and MoMo payments).
 * Returns the refund reference on success, or undefined on failure.
 */
async function refundViaPaystack(
  providerRef: string,
  amount: number,
  reason: string
): Promise<string | undefined> {
  try {
    const providerResult = await paymentProviderRegistry.getProvider('paystack');
    if (!providerResult) {
      logger.warn('Paystack provider not available for refund');
      return undefined;
    }

    const result = await providerResult.provider.processRefund(
      { transactionReference: providerRef, amount, reason },
      providerResult.credentials
    );

    if (result.success) {
      logger.info('Paystack refund processed', { providerRef, amount, refundRef: result.refundReference });
      return result.refundReference;
    }

    logger.warn('Paystack refund failed', { providerRef, message: result.message });
    return undefined;
  } catch (error: any) {
    logger.error('Paystack refund error', { providerRef, error: error.message });
    return undefined;
  }
}

/**
 * Send a payout via Paystack transfers (bank or mobile money).
 * Returns { reference, error } — reference is set on success, error on failure.
 */
export async function payoutViaPaystack(params: {
  recipientPhone: string;
  recipientName: string;
  amount: number;
  momoProvider?: string;
  reference: string;
  description: string;
}): Promise<{ reference?: string; error?: string }> {
  try {
    const providerResult = await paymentProviderRegistry.getProvider('paystack');
    if (!providerResult) {
      logger.warn('Paystack provider not available for payout');
      return { error: 'Paystack payment provider is not configured' };
    }

    const result = await providerResult.provider.sendPayout(
      {
        recipient: {
          name: params.recipientName,
          payoutType: 'mobile_money',
          mobileMoneyNumber: params.recipientPhone,
          mobileMoneyProvider: params.momoProvider || 'mtn',
        },
        amount: params.amount,
        reference: params.reference,
        reason: params.description,
      },
      providerResult.credentials
    );

    if (result.success) {
      logger.info('Paystack payout sent', { reference: params.reference, amount: params.amount });
      return { reference: result.payoutReference };
    }

    logger.warn('Paystack payout failed', { reference: params.reference, message: result.message });
    return { error: result.message || 'Paystack payout failed' };
  } catch (error: any) {
    logger.error('Paystack payout error', { reference: params.reference, error: error.message });
    return { error: error.response?.data?.message || error.message || 'Paystack payout error' };
  }
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
 * New fee model: Customer pays flat GHS 2 booking fee (non-refundable).
 * Partner pays 5% commission (calculated at escrow release, not here).
 */
export async function createEscrow(params: CreateEscrowParams): Promise<EscrowAccount> {
  const { bookingId, customerId, providerId, salonId, amount, paymentTransactionId } = params;
  
  try {
    // Fetch flat booking fee from policy (default GHS 2)
    let bookingFee = 2;
    try {
      const feeStr = await getPolicyValue('platform_booking_fee');
      const parsedFee = parseFloat(feeStr);
      if (!isNaN(parsedFee)) {
        bookingFee = parsedFee;
      }
    } catch (policyError) {
      logger.warn('Failed to fetch platform_booking_fee, using default GHS 2', { policyError });
    }

    // amount = total paid by customer (servicePrice + bookingFee)
    // At creation: platformFee = bookingFee only, providerAmount = servicePrice
    // Commission (5% of servicePrice) is calculated at release time
    const servicePrice = amount - bookingFee;
    const platformFee = bookingFee; // only booking fee at creation
    const providerAmount = servicePrice; // provider gets full service price (commission deducted at release)
    
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
          bookingFee,
          commission: null, // calculated at release
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
      bookingFee,
      servicePrice,
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
 * At release time: calculate 5% commission on service price.
 * Platform earns: bookingFee + commission
 * Provider gets: servicePrice - commission
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

    // Calculate commission at release time
    const amountHeld = parseFloat(escrow.amountHeld.toString());
    const bookingFee = parseFloat(escrow.bookingFee?.toString() || '2');
    const servicePrice = amountHeld - bookingFee;

    // Fetch partner commission percentage from policy (default 5%)
    let commissionRate = 5;
    try {
      const commStr = await getPolicyValue('partner_commission_percentage');
      const parsedComm = parseFloat(commStr);
      if (!isNaN(parsedComm)) {
        commissionRate = parsedComm;
      }
    } catch (policyError) {
      logger.warn('Failed to fetch partner_commission_percentage, using default 5%', { policyError });
    }

    const commission = servicePrice * (commissionRate / 100);
    const providerPayout = servicePrice - commission;
    const totalPlatformEarnings = bookingFee + commission;

    logger.info(`Escrow release calculation for escrow ${escrowId}`, {
      amountHeld,
      bookingFee,
      servicePrice,
      commissionRate,
      commission,
      providerPayout,
      totalPlatformEarnings,
    });
    
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

    // Route payout through the active payment gateway (admin-configured)
    const activeGateway = await getActivePaymentGateway();
    const payoutReference = 'GROOMLINK-PAYOUT-' + escrow.booking.reference + '-' + Date.now();
    let payoutRef: string | undefined;
    let payoutGateway = 'unknown';

    // Try Hubtel if admin set it as active gateway
    if (activeGateway === 'hubtel') {
      try {
        const payoutResult = await initiateHubtelPayout({
          recipientPhone: escrow.salon.momoNumber,
          recipientName: escrow.salon.businessName,
          amount: providerPayout,
          channel: getHubtelChannel(escrow.salon.momoProvider),
          reference: payoutReference,
          description: 'Payment for service completion',
        });
        payoutRef = payoutResult?.Data?.ClientReference || payoutReference;
        payoutGateway = 'hubtel';
        logger.info(`Hubtel payout initiated for escrow ${escrowId}`, {
          recipient: escrow.salon.momoNumber,
          amount: providerPayout,
          payoutRef,
        });
      } catch (hubtelError: any) {
        logger.warn('Hubtel payout failed, falling back to Paystack', {
          escrowId,
          error: hubtelError.message,
        });
        // Fall through to Paystack fallback
      }
    }

    // Try Paystack (when active gateway is paystack, or as Hubtel fallback)
    if (!payoutRef) {
      const detectedProvider = detectMomoProviderFromPhone(escrow.salon.momoNumber);
      const psResult = await payoutViaPaystack({
        recipientPhone: escrow.salon.momoNumber,
        recipientName: escrow.salon.businessName,
        amount: providerPayout,
        momoProvider: detectedProvider,
        reference: payoutReference,
        description: 'Payment for service completion',
      });
      if (psResult.reference) {
        payoutRef = psResult.reference;
        payoutGateway = 'paystack';
      } else if (psResult.error) {
        logger.warn('Paystack fallback failed', { escrowId, error: psResult.error });
      }
    }

    if (!payoutRef) {
      // Payout could not be sent right now (gateway down / not configured).
      // Do NOT block booking completion: leave the escrow 'held' so the
      // partner can withdraw via the manual payout flow once the gateway
      // recovers (or the 48h safety net retries it).
      logger.error(`Escrow release payout failed for escrow ${escrowId} — escrow left held for manual payout`, {
        escrowId,
        activeGateway,
        providerPayout,
      });
      pushService.pushPayoutFailed(
        escrow.providerId,
        providerPayout,
        'Auto-payout failed. Your funds are safe and available for manual withdrawal in Earnings.'
      ).catch((err) => logger.error('Failed to send payout failure notification', { err, escrowId }));
      return escrow;
    }
    
    // Update escrow status, store final commission/platformFee, and create transaction
    const updatedEscrow = await prisma.$transaction(async (tx) => {
      // Only claim the escrow if it is still 'held' — guards against a
      // concurrent release (e.g. customer confirmation racing the 48h
      // safety-net job) causing a ledger inconsistency.
      const claimed = await tx.escrowAccount.updateMany({
        where: { id: escrowId, status: 'held' },
        data: {
          status: 'released',
          releasedAt: new Date(),
          platformFee: totalPlatformEarnings, // total platform earnings (bookingFee + commission)
          providerAmount: providerPayout,     // what provider actually receives
          commission: commission,             // 5% of service price
          hubtelPayoutReference: payoutGateway === 'hubtel' ? payoutRef : undefined,
          payoutGateway: payoutGateway,
        },
      });

      if (claimed.count === 0) {
        // A concurrent release won the race. This call already sent its
        // transfer, so flag it loudly for manual reconciliation.
        logger.error(
          `POSSIBLE DOUBLE PAYOUT for escrow ${escrowId}: transfer ${payoutReference} was sent but the escrow was claimed by a concurrent release`,
          { escrowId, payoutReference, payoutGateway }
        );
        return null;
      }

      // Create release transaction
      await tx.escrowTransaction.create({
        data: {
          escrowId,
          transactionType: 'release',
          amount: providerPayout,
          previousBalance: amountHeld,
          newBalance: 0,
        }
      });

      return tx.escrowAccount.findUnique({ where: { id: escrowId } });
    });

    if (!updatedEscrow) {
      return escrow;
    }
    
    logger.info(`Escrow released for booking ${escrow.bookingId}`, {
      escrowId,
      providerPayout,
      commission,
      totalPlatformEarnings,
    });

    // Send push notification to partner about auto-payout
    pushService.pushPayoutSent(
      escrow.providerId,
      providerPayout,
      escrow.salon.momoProvider
    ).catch((err) => logger.error('Failed to send auto-payout notification', { err, escrowId }));
    
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
    // Fetch escrow with booking, customer, and payment relations
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
      include: {
        booking: {
          include: {
            customer: true,
            payment: true,
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
    
    const amountHeld = parseFloat(escrow.amountHeld.toString()); // total = servicePrice + bookingFee
    const bookingFee = parseFloat(escrow.bookingFee?.toString() || '2');
    const servicePrice = amountHeld - bookingFee; // only service price is refundable
    let refundAmount = servicePrice * (refundPercentage / 100); // refund % applies to service price only
    
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
    
    // Route refund through the active payment gateway (admin-configured)
    const activeGateway = await getActivePaymentGateway();
    let refundRef: string | undefined;
    let refundGateway = 'unknown';
    const customerPhone = escrow.booking.customer?.phoneNumber;

    if (customerPhone) {
      const refundReference = 'GROOMLINK-REFUND-' + escrow.booking.reference + '-' + Date.now();

      // Try Hubtel if admin set it as active gateway
      if (activeGateway === 'hubtel') {
        const detectedProvider = detectMomoProviderFromPhone(customerPhone);
        try {
          const payoutResult = await initiateHubtelPayout({
            recipientPhone: customerPhone,
            recipientName: `${escrow.booking.customer.firstName} ${escrow.booking.customer.lastName}`,
            amount: refundAmount,
            channel: getHubtelChannel(detectedProvider),
            reference: refundReference,
            description: 'Refund for cancelled booking',
          });
          refundRef = payoutResult?.Data?.ClientReference || refundReference;
          refundGateway = 'hubtel';
          logger.info(`Hubtel refund payout initiated for escrow ${escrowId}`, {
            customerPhone: formatGhanaPhone(customerPhone),
            refundAmount,
            refundRef,
          });
        } catch (hubtelError: any) {
          logger.warn('Hubtel refund payout failed, falling back to Paystack', {
            escrowId,
            error: hubtelError.message,
          });
        }
      }

      // Try Paystack (when active gateway is paystack, or as Hubtel fallback)
      if (!refundRef) {
        const payment = escrow.booking.payment;
        const providerRef = payment?.providerRef || payment?.paystackTransactionId;

        if (providerRef) {
          const psRef = await refundViaPaystack(
            providerRef,
            refundAmount,
            'Refund for cancelled booking'
          );
          if (psRef) {
            refundRef = psRef;
            refundGateway = 'paystack';
          }
        }

        // Last resort: try Paystack transfer to customer phone
        if (!refundRef) {
          const detectedProvider = detectMomoProviderFromPhone(customerPhone);
          const psResult = await payoutViaPaystack({
            recipientPhone: customerPhone,
            recipientName: `${escrow.booking.customer.firstName} ${escrow.booking.customer.lastName}`,
            amount: refundAmount,
            momoProvider: detectedProvider,
            reference: refundReference,
            description: 'Refund for cancelled booking',
          });
          if (psResult.reference) {
            refundRef = psResult.reference;
            refundGateway = 'paystack_transfer';
          } else if (psResult.error) {
            logger.warn('Paystack refund payout failed', { escrowId, error: psResult.error });
          }
        }
      }

      if (!refundRef) {
        logger.warn(`All refund payout methods failed for escrow ${escrowId}. Status will be set to refund_failed so one-click refund can retry.`);
      }
    } else {
      logger.warn('No customer phone number found for escrow, skipping refund payout:', { escrowId });
    }

    const payoutSucceeded = !!refundRef;

    // Update escrow status and create transaction
    const updatedEscrow = await prisma.$transaction(async (tx) => {
      // Update escrow account — only mark 'refunded' if actual payout succeeded
      const updated = await tx.escrowAccount.update({
        where: { id: escrowId },
        data: {
          status: payoutSucceeded ? 'refunded' : 'refund_failed',
          hubtelPayoutReference: refundGateway === 'hubtel' ? refundRef : undefined,
          payoutGateway: payoutSucceeded ? refundGateway : undefined,
          refundTransactionId: refundRef,
        }
      });
      
      // Create refund transaction only when payout actually succeeded
      if (payoutSucceeded) {
        await tx.escrowTransaction.create({
          data: {
            escrowId,
            transactionType: 'refund',
            amount: refundAmount,
            previousBalance: amountHeld,
            newBalance: amountHeld - refundAmount,
            reference: refundRef,
          }
        });
      }
      
      return updated;
    });
    
    logger.info(`Escrow ${payoutSucceeded ? 'refunded' : 'refund_failed'} for booking ${escrow.bookingId}`, {
      escrowId,
      refundAmount,
      refundPercentage,
      payoutSucceeded,
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
