-- AlterTable: Add auto_release_at for countdown timer display in customer-app
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "auto_release_at" TIMESTAMP(3);
