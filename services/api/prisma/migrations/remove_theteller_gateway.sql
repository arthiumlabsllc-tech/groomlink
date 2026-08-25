-- Remove TheTeller payment gateway (retired — platform standardizes on Paystack + Hubtel).
--
-- 1) Ensure the active gateway no longer points at theteller
UPDATE "SiteSettings" SET "paymentGateway" = 'paystack' WHERE "paymentGateway" = 'theteller';

-- 2) Drop the stored TheTeller credentials
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "theteller_api_key";
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "theteller_api_user";
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "theteller_merchant_id";

-- NOTE: The "PaymentProvider"."THETELLER" enum value is intentionally kept so
-- historical Payment rows that were processed via TheTeller remain readable.
-- Nothing in the codebase can create new payments with that value.
