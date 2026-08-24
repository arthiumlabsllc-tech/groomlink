-- AlterTable: add gallery videos column to salons
ALTER TABLE "salons" ADD COLUMN "videos" TEXT[] DEFAULT ARRAY[]::TEXT[];
