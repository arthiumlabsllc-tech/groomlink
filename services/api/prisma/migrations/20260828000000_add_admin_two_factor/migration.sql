-- Add TOTP two-factor authentication fields (admin login hardening)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_backup_codes" JSONB;
