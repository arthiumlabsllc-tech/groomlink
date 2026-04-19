import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignFreePlanToExistingSalons() {
  console.log('Starting free plan assignment for existing salons...');

  // 1. Find or verify the Free plan exists
  const freePlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: 'free' }
  });

  if (!freePlan) {
    console.error('Free plan not found! Run seed first.');
    process.exit(1);
  }

  // 2. Find all salons without a subscription (subscriptionId is null)
  const salonsWithoutSubscription = await prisma.salon.findMany({
    where: { subscriptionId: null }
  });

  console.log(`Found ${salonsWithoutSubscription.length} salons without subscriptions`);

  // 3. For each salon, create a SalonSubscription and update the salon
  let successCount = 0;
  let errorCount = 0;

  for (const salon of salonsWithoutSubscription) {
    try {
      // Create subscription
      const subscription = await prisma.salonSubscription.create({
        data: {
          salonId: salon.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          billingPeriod: 'MONTHLY',
          amountPaid: 0,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }
      });

      // Update salon with subscription reference
      await prisma.salon.update({
        where: { id: salon.id },
        data: {
          subscriptionId: subscription.id,
          subscriptionStatus: 'active',
          subscriptionExpiresAt: subscription.expiresAt,
          featureFlags: freePlan.features as any,
        }
      });

      successCount++;
      console.log(`  ✓ Assigned Free plan to: ${salon.businessName} (${salon.id})`);
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Failed for salon ${salon.id}:`, error);
    }
  }

  console.log(`\nMigration complete: ${successCount} salons updated, ${errorCount} errors`);
}

assignFreePlanToExistingSalons()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
