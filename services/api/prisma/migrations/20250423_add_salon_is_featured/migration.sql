-- Migration: Add isFeatured field to Salon model
-- Date: 2025-04-23

ALTER TABLE "salons" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;
