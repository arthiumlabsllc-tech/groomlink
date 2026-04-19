import prisma from '../config/database';
import logger from '../config/logger';

const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 100,
  GOLD: 500,
  PLATINUM: 1000,
} as const;

const REFERRAL_BONUS_POINTS = 50;
const FIFTH_VISIT_BONUS_POINTS = 25;

/**
 * Get or create a loyalty account for a customer.
 * If the account doesn't exist, it will be created automatically.
 */
export async function getOrCreateAccount(customerId: string) {
  const account = await prisma.loyaltyAccount.upsert({
    where: { customerId },
    create: {
      customerId,
      points: 0,
      lifetimePoints: 0,
      tier: 'BRONZE',
    },
    update: {},
    include: {
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
  });

  return account;
}

/**
 * Get a customer's loyalty account with points and tier.
 * Returns null if no account exists.
 */
export async function getAccount(customerId: string) {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { customerId },
    include: {
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
  });

  return account;
}

/**
 * Get paginated loyalty transaction history for a customer.
 */
export async function getTransactions(
  customerId: string,
  page: number = 1,
  limit: number = 20
) {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { customerId },
    select: { id: true },
  });

  if (!account) {
    return { transactions: [], total: 0 };
  }

  const [transactions, total] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.loyaltyTransaction.count({
      where: { accountId: account.id },
    }),
  ]);

  return { transactions, total };
}

/**
 * Award loyalty points for a booking.
 * - 1 point per GHS spent
 * - 2x points if it's the customer's birthday month
 * - Bonus points for 5th visit
 */
export async function awardPoints(
  customerId: string,
  bookingId: string,
  amountGHS: number
) {
  const account = await getOrCreateAccount(customerId);

  // Calculate base points (1 point per GHS spent, rounded down)
  let pointsToAward = Math.floor(amountGHS);
  let reasons: string[] = [`Earned ${pointsToAward} points for GHS ${amountGHS} spent`];

  // Check if this is the 5th visit (5th completed booking)
  const completedBookingsCount = await prisma.booking.count({
    where: {
      customerId,
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
  });

  // The current booking counts as the latest one, so if they already had 4 completed,
  // this makes it the 5th
  if (completedBookingsCount === 4) {
    pointsToAward += FIFTH_VISIT_BONUS_POINTS;
    reasons.push(`5th visit bonus: +${FIFTH_VISIT_BONUS_POINTS} points`);
  }

  // Create EARN transaction and update account in a single transaction
  const updatedAccount = await prisma.$transaction(async (tx) => {
    const transaction = await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'EARN',
        points: pointsToAward,
        reason: reasons.join('; '),
        bookingId,
      },
    });

    const updated = await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: { increment: pointsToAward },
        lifetimePoints: { increment: pointsToAward },
      },
    });

    return { transaction, account: updated };
  });

  // Update tier based on new lifetime points
  await updateTier(updatedAccount.account.id);

  logger.info(`Awarded ${pointsToAward} loyalty points to customer ${customerId}`, {
    customerId,
    bookingId,
    amountGHS,
    pointsAwarded: pointsToAward,
    reasons,
  });

  return {
    pointsAwarded: pointsToAward,
    newBalance: updatedAccount.account.points + pointsToAward,
    reasons,
  };
}

/**
 * Award referral bonus points to a customer.
 */
export async function awardReferralBonus(customerId: string) {
  const account = await getOrCreateAccount(customerId);

  const updatedAccount = await prisma.$transaction(async (tx) => {
    const transaction = await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'REFERRAL',
        points: REFERRAL_BONUS_POINTS,
        reason: `Referral bonus: +${REFERRAL_BONUS_POINTS} points`,
      },
    });

    const updated = await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: { increment: REFERRAL_BONUS_POINTS },
        lifetimePoints: { increment: REFERRAL_BONUS_POINTS },
      },
    });

    return { transaction, account: updated };
  });

  // Update tier based on new lifetime points
  await updateTier(updatedAccount.account.id);

  logger.info(`Awarded ${REFERRAL_BONUS_POINTS} referral bonus points to customer ${customerId}`);

  return {
    pointsAwarded: REFERRAL_BONUS_POINTS,
    newBalance: updatedAccount.account.points,
  };
}

/**
 * Redeem loyalty points.
 * Deducts points from the account and creates a REDEEM transaction.
 */
export async function redeemPoints(
  customerId: string,
  points: number,
  bookingId?: string
) {
  const account = await getOrCreateAccount(customerId);

  if (!account) {
    throw new Error('Loyalty account not found');
  }

  if (account.points < points) {
    throw new Error('Insufficient points');
  }

  if (points <= 0) {
    throw new Error('Points to redeem must be greater than 0');
  }

  const updatedAccount = await prisma.$transaction(async (tx) => {
    const transaction = await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'REDEEM',
        points: -points,
        reason: `Redeemed ${points} points`,
        bookingId: bookingId || null,
      },
    });

    const updated = await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: { decrement: points },
      },
    });

    return { transaction, account: updated };
  });

  // Update tier (tier might drop if lifetime threshold changes, though typically stays)
  await updateTier(updatedAccount.account.id);

  logger.info(`Customer ${customerId} redeemed ${points} loyalty points`, {
    customerId,
    pointsRedeemed: points,
    bookingId,
  });

  return {
    pointsRedeemed: points,
    newBalance: updatedAccount.account.points,
  };
}

/**
 * Update the tier of a loyalty account based on lifetime points.
 * BRONZE: 0-99, SILVER: 100-499, GOLD: 500-999, PLATINUM: 1000+
 */
export async function updateTier(accountId: string) {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { id: accountId },
    select: { lifetimePoints: true, tier: true },
  });

  if (!account) {
    logger.warn(`Loyalty account not found for tier update: ${accountId}`);
    return;
  }

  let newTier: string;
  if (account.lifetimePoints >= TIER_THRESHOLDS.PLATINUM) {
    newTier = 'PLATINUM';
  } else if (account.lifetimePoints >= TIER_THRESHOLDS.GOLD) {
    newTier = 'GOLD';
  } else if (account.lifetimePoints >= TIER_THRESHOLDS.SILVER) {
    newTier = 'SILVER';
  } else {
    newTier = 'BRONZE';
  }

  if (account.tier !== newTier) {
    await prisma.loyaltyAccount.update({
      where: { id: accountId },
      data: { tier: newTier },
    });

    logger.info(`Loyalty tier updated for account ${accountId}: ${account.tier} → ${newTier}`);
  }
}
