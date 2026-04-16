import prisma from '../config/database';
import logger from '../config/logger';

export interface AddSponsoredSalonData {
  salonId: string;
  durationHours: number;
  endTime?: Date;
  amountPaid?: number;
  packageId?: string;
  adminId?: string;
}

export interface SponsorshipPackage {
  id: string;
  packageName: string;
  durationType: string;
  durationValue: number;
  priceGhs: number;
  priorityLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Add a sponsored salon
 * - Verify salon exists
 * - Create SponsoredSalon record with startTime=now, calculated endTime, isActive=true
 * - Update Salon: isSponsored=true, sponsorshipPriority based on package, sponsorshipExpiresAt=endTime
 * - Return the sponsorship record
 */
export async function addSponsoredSalon(data: AddSponsoredSalonData) {
  const { salonId, durationHours, endTime, amountPaid, packageId, adminId } = data;

  // Verify salon exists
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
  });

  if (!salon) {
    throw new Error('Salon not found');
  }

  // Calculate end time
  const startTime = new Date();
  const calculatedEndTime = endTime || new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  // Get package priority if packageId is provided
  let priority = 1;
  if (packageId) {
    const pkg = await prisma.sponsorshipPackage.findUnique({
      where: { id: packageId, isActive: true },
    });
    if (pkg) {
      priority = pkg.priorityLevel;
    }
  }

  // Create sponsored salon record
  const sponsoredSalon = await prisma.sponsoredSalon.create({
    data: {
      salonId,
      durationHours,
      startTime,
      endTime: calculatedEndTime,
      amountPaid: amountPaid ? String(amountPaid) : '0',
      isActive: true,
      priority,
      createdById: adminId,
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          city: true,
          region: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Update salon sponsorship status
  await prisma.salon.update({
    where: { id: salonId },
    data: {
      isSponsored: true,
      sponsorshipPriority: priority,
      sponsorshipExpiresAt: calculatedEndTime,
    },
  });

  logger.info(`Sponsored salon added: ${salonId} for ${durationHours} hours, expires at ${calculatedEndTime.toISOString()}`);
  return sponsoredSalon;
}

/**
 * Remove a sponsored salon
 * - Find sponsorship, mark isActive=false, set endTime=now
 * - Update Salon: isSponsored=false, sponsorshipPriority=0, sponsorshipExpiresAt=null
 */
export async function removeSponsoredSalon(sponsorshipId: string) {
  // Find the sponsorship
  const sponsorship = await prisma.sponsoredSalon.findUnique({
    where: { id: sponsorshipId },
  });

  if (!sponsorship) {
    throw new Error('Sponsorship not found');
  }

  if (!sponsorship.isActive) {
    throw new Error('Sponsorship is already inactive');
  }

  const now = new Date();

  // Mark sponsorship as inactive
  const updatedSponsorship = await prisma.sponsoredSalon.update({
    where: { id: sponsorshipId },
    data: {
      isActive: false,
      endTime: now,
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          city: true,
          region: true,
        },
      },
    },
  });

  // Update salon sponsorship status
  await prisma.salon.update({
    where: { id: sponsorship.salonId },
    data: {
      isSponsored: false,
      sponsorshipPriority: 0,
      sponsorshipExpiresAt: null,
    },
  });

  logger.info(`Sponsored salon removed: ${sponsorshipId}, salon ${sponsorship.salonId}`);
  return updatedSponsorship;
}

/**
 * Get all active sponsored salons
 * - Return all where isActive=true, include salon details, order by priority ASC
 */
export async function getSponsoredSalons() {
  const sponsoredSalons = await prisma.sponsoredSalon.findMany({
    where: { isActive: true },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          city: true,
          region: true,
          logo: true,
          rating: true,
          reviewCount: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [
      { priority: 'asc' },
      { startTime: 'desc' },
    ],
  });

  return sponsoredSalons;
}

/**
 * Get all active sponsorship packages
 * - Return all SponsorshipPackage where isActive=true
 */
export async function getPackages() {
  const packages = await prisma.sponsorshipPackage.findMany({
    where: { isActive: true },
    orderBy: [
      { priorityLevel: 'asc' },
      { priceGhs: 'asc' },
    ],
  });

  return packages;
}

/**
 * Check and deactivate expired sponsorships
 * - Find SponsoredSalon where isActive=true AND endTime < now
 * - For each: set isActive=false, update salon flags
 */
export async function checkExpiredSponsorships(): Promise<number> {
  const now = new Date();

  // Find expired active sponsorships
  const expiredSponsorships = await prisma.sponsoredSalon.findMany({
    where: {
      isActive: true,
      endTime: {
        lt: now,
      },
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  if (expiredSponsorships.length === 0) {
    return 0;
  }

  // Process each expired sponsorship
  const updates = [];
  for (const sponsorship of expiredSponsorships) {
    // Mark sponsorship as inactive
    updates.push(
      prisma.sponsoredSalon.update({
        where: { id: sponsorship.id },
        data: {
          isActive: false,
        },
      })
    );

    // Update salon sponsorship status
    updates.push(
      prisma.salon.update({
        where: { id: sponsorship.salonId },
        data: {
          isSponsored: false,
          sponsorshipPriority: 0,
          sponsorshipExpiresAt: null,
        },
      })
    );

    logger.info(`Expired sponsorship deactivated: ${sponsorship.id}, salon ${sponsorship.salonId}`);
  }

  await Promise.all(updates);

  logger.info(`Processed ${expiredSponsorships.length} expired sponsorships`);
  return expiredSponsorships.length;
}
