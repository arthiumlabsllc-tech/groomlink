-- CreateEnum
CREATE TYPE "ProviderCategory" AS ENUM ('BUSINESS', 'FREELANCER');

-- AlterTable: Add providerCategory to salons
ALTER TABLE "salons" ADD COLUMN "provider_category" "ProviderCategory" NOT NULL DEFAULT 'BUSINESS';

-- AlterTable: Add home service fields to services
ALTER TABLE "services" ADD COLUMN "offers_home_service" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "home_service_fee" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "salons_provider_category_idx" ON "salons"("provider_category");
