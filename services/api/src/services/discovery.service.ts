import prisma from '../config/database';
import logger from '../config/logger';
import { SalonStatus } from '@prisma/client';

/**
 * Get salons that joined in the last 30 days, ordered by createdAt desc
 */
export async function getNewSalons(limit: number = 10) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const salons = await prisma.salon.findMany({
    where: {
      status: SalonStatus.APPROVED,
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      businessName: true,
      type: true,
      city: true,
      coverImage: true,
      logo: true,
      rating: true,
      reviewCount: true,
      address: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      slug: true,
      services: {
        where: { isActive: true },
        take: 3,
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          discountPrice: true,
          duration: true,
        },
      },
    },
  });

  return salons;
}

/**
 * Get salons filtered by city
 */
export async function getSalonsByCity(city: string) {
  const salons = await prisma.salon.findMany({
    where: {
      status: SalonStatus.APPROVED,
      city: {
        contains: city,
        mode: 'insensitive',
      },
    },
    orderBy: [
      { isSponsored: 'desc' },
      { sponsorshipPriority: 'desc' },
      { rating: 'desc' },
    ],
    select: {
      id: true,
      businessName: true,
      type: true,
      city: true,
      coverImage: true,
      logo: true,
      rating: true,
      reviewCount: true,
      address: true,
      latitude: true,
      longitude: true,
      slug: true,
      services: {
        where: { isActive: true },
        take: 3,
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          discountPrice: true,
          duration: true,
        },
      },
    },
  });

  return salons;
}

/**
 * Get distinct cities with salon count per city
 */
export async function getCitiesWithCounts() {
  const cities = await prisma.salon.groupBy({
    by: ['city'],
    where: { status: SalonStatus.APPROVED },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  return cities.map((c) => ({
    city: c.city,
    salonCount: c._count.id,
  }));
}

/**
 * Get count of today's bookings (Africa/Accra timezone)
 */
export async function getBookingsToday() {
  // Get current date in Africa/Accra timezone (UTC+0)
  const now = new Date();
  const accraOffset = 0; // Africa/Accra is UTC+0 (no DST)
  const utcNow = new Date(now.getTime() + accraOffset * 60 * 1000);

  const startOfDay = new Date(
    Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate(), 0, 0, 0, 0)
  );
  const endOfDay = new Date(
    Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate(), 23, 59, 59, 999)
  );

  const count = await prisma.booking.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return count;
}

/**
 * Get branded page for a specific salon (owner view, includes unpublished)
 */
export async function getMyBrandedPage(salonId: string) {
  const brandedPage = await prisma.brandedPage.findUnique({
    where: { salonId },
  });

  return brandedPage;
}

/**
 * Get branded page by slug with salon info
 */
export async function getBrandedPage(slug: string) {
  const brandedPage = await prisma.brandedPage.findUnique({
    where: { slug },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          type: true,
          city: true,
    
          coverImage: true,
          logo: true,
          rating: true,
          reviewCount: true,
          address: true,
          phoneNumber: true,
          email: true,
          website: true,
          description: true,
          openingTime: true,
          closingTime: true,
          workingDays: true,
          hasParking: true,
          hasWifi: true,
          hasAC: true,
          slug: true,
          services: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              category: true,
              description: true,
              price: true,
              discountPrice: true,
              promoLabel: true,
              duration: true,
              image: true,
            },
          },
          workers: {
            where: { isActive: true },
            select: {
              id: true,
              fullName: true,
              avatar: true,
              specialties: true,
              rating: true,
            },
          },
          images: true,
          videos: true,
        },
      },
    },
  });

  if (!brandedPage) {
    return null;
  }

  // Only return published pages (unless it's the salon owner viewing- handled at controller level)
  if (!brandedPage.isPublished) {
    return null;
  }

  // Hide branded pages whose underlying salon is not APPROVED (suspended/rejected/pending)
  const salonStatus = await prisma.salon.findUnique({
    where: { id: brandedPage.salonId },
    select: { status: true },
  });
  if (!salonStatus || salonStatus.status !== SalonStatus.APPROVED) {
    return null;
  }

  return brandedPage;
}

/**
 * Slugify a string: lowercase, replace spaces with hyphens, remove special chars
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-')  // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a suffix if needed
 */
async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.brandedPage.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  return slug;
}

export interface UpsertBrandedPageData {
  primaryColor?: string;
  tagline?: string;
  logoUrl?: string;
  isPublished?: boolean;
  slug?: string;
}

/**
 * Create or update a branded page for a salon owner
 */
export async function upsertBrandedPage(salonId: string, data: UpsertBrandedPageData) {
  // Verify the salon exists
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, businessName: true, brandedPage: true },
  });

  if (!salon) {
    throw new Error('Salon not found');
  }

  if (salon.brandedPage) {
    // Update existing branded page
    const updateData: any = {};

    if (data.primaryColor !== undefined) updateData.primaryColor = data.primaryColor;
    if (data.tagline !== undefined) updateData.tagline = data.tagline;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

    // Handle slug update- if provided, ensure uniqueness
    if (data.slug !== undefined) {
      const newSlug = slugify(data.slug);
      // Check if slug is being changed and if it's unique
      if (newSlug !== salon.brandedPage.slug) {
        const existing = await prisma.brandedPage.findUnique({ where: { slug: newSlug } });
        if (existing && existing.salonId !== salonId) {
          throw new Error('Slug is already taken. Please choose a different one.');
        }
        updateData.slug = newSlug;
      }
    }

    const updated = await prisma.brandedPage.update({
      where: { salonId },
      data: updateData,
    });

    logger.info(`Branded page updated for salon: ${salonId}`);
    return updated;
  } else {
    // Create new branded page
    let slug: string;

    if (data.slug) {
      slug = slugify(data.slug);
    } else {
      // Auto-generate from business name
      slug = slugify(salon.businessName);
    }

    // Ensure uniqueness
    slug = await generateUniqueSlug(slug);

    const created = await prisma.brandedPage.create({
      data: {
        salonId,
        slug,
        primaryColor: data.primaryColor || '#CE1126',
        tagline: data.tagline || null,
        logoUrl: data.logoUrl || null,
        isPublished: data.isPublished || false,
      },
    });

    logger.info(`Branded page created for salon: ${salonId} with slug: ${slug}`);
    return created;
  }
}
