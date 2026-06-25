-- AlterTable
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminder_sent_24h" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "noshow_reminder_sent" BOOLEAN NOT NULL DEFAULT false;
