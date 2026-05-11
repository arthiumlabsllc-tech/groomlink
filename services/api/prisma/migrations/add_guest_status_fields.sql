-- Migration: Add status, cancelledAt, cancelledBy, cancelReason fields to booking_guests
-- Date: 2026-05-06

-- Add status column with default 'PENDING'
ALTER TABLE "booking_guests" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';

-- Backfill existing rows: set CHECKED_IN where checkedIn = true, PENDING otherwise
UPDATE "booking_guests" SET "status" = 'CHECKED_IN' WHERE "checked_in" = true;
UPDATE "booking_guests" SET "status" = 'PENDING' WHERE "checked_in" = false;

-- Add cancellation tracking columns
ALTER TABLE "booking_guests" ADD COLUMN "cancelled_at" TIMESTAMP(3);
ALTER TABLE "booking_guests" ADD COLUMN "cancelled_by" TEXT;
ALTER TABLE "booking_guests" ADD COLUMN "cancel_reason" TEXT;
