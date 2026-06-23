-- AlterTable: Add app version management fields
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "customer_app_latest_version" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "customer_app_min_version" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "partners_app_latest_version" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "partners_app_min_version" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "app_update_message" TEXT;
