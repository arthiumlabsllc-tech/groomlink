import prisma from '../config/database';
import logger from '../config/logger';
import { Prisma } from '@prisma/client';

export interface AddSponsoredSalonData {
  salonId: string;
  durationHours: number;
  endTime?: Date;
  amountPaid?: number;
  packageId?: string;
  adminId?: string;
}

// Decimal columns from Prisma serialize as strings in JSON. Coerce to number
// for the API response so the admin UI can call formatCurrency() / arithmetic
// without runtime type juggling.
function toNumber(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

function serializeSponsorship<T extends { amountPaid: any }>(s: T): T & { amountPaid: number | null } {
  return { ...s, amountPaid: toNumber(s.amountPaid) };
}

function serializePackage<T extends { priceGhs: any }>(p: T): T & { priceGhs: number } {
  return { ...p, priceGhs: toNumber(p.priceGhs) ?? 0 };
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

  // Guard: prevent multiple concurrent active sponsorships for the same salon
  // (the Salon row only stores ONE isSponsored flag + priority, so two active
  // SponsoredSalon rows would silently overwrite each other).
  const existingActive = await prisma.sponsoredSalon.findFirst({
    where: { salonId, isActive: true },
    select: { id: true, endTime: true },
  });
  if (existingActive) {
    throw new Error('This salon already has an active sponsorship. Remove it first before adding a new one.');
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

  // Create + flag salon atomically so the two rows can never drift
  const [sponsoredSalon] = await prisma.$transaction([
    prisma.sponsoredSalon.create({
      data: {
        salonId,
        durationHours,
        startTime,
        endTime: calculatedEndTime,
        amountPaid: amountPaid != null ? new Prisma.Decimal(amountPaid) : null,
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
            address: true,
            logo: true,
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
    }),
    prisma.salon.update({
      where: { id: salonId },
      data: {
        isSponsored: true,
        sponsorshipPriority: priority,
        sponsorshipExpiresAt: calculatedEndTime,
      },
    }),
  ]);

  logger.info(`Sponsored salon added: ${salonId} for ${durationHours} hours, expires at ${calculatedEndTime.toISOString()}`);
  return serializeSponsorship(sponsoredSalon);
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

  // Atomic: deactivate sponsorship + clear salon flags together
  const [updatedSponsorship] = await prisma.$transaction([
    prisma.sponsoredSalon.update({
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
            address: true,
            logo: true,
          },
        },
      },
    }),
    prisma.salon.update({
      where: { id: sponsorship.salonId },
      data: {
        isSponsored: false,
        sponsorshipPriority: 0,
        sponsorshipExpiresAt: null,
      },
    }),
  ]);

  logger.info(`Sponsored salon removed: ${sponsorshipId}, salon ${sponsorship.salonId}`);
  return serializeSponsorship(updatedSponsorship);
}

/**
 * Get sponsored salons (paginated, with optional active/expired filter)
 */
export async function getSponsoredSalons(
  page: number = 1,
  limit: number = 20,
  status?: 'active' | 'expired'
): Promise<{ data: any[]; total: number; totalPages: number }> {
  const where: any = {};
  if (status === 'active') where.isActive = true;
  else if (status === 'expired') where.isActive = false;

  const [rows, total] = await Promise.all([
    prisma.sponsoredSalon.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        salon: {
          select: {
            id: true,
            businessName: true,
            city: true,
            region: true,
            address: true,
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
        { isActive: 'desc' },
        { priority: 'asc' },
        { startTime: 'desc' },
      ],
    }),
    prisma.sponsoredSalon.count({ where }),
  ]);

  const data = rows.map(serializeSponsorship);
  return { data, total, totalPages: Math.ceil(total / limit) };
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

  return packages.map(serializePackage);
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
