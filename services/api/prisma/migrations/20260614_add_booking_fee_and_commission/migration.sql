-- AlterTable: Add bookingFee and commission fields to EscrowAccount
ALTER TABLE "escrow_accounts" ADD COLUMN "bookingFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "escrow_accounts" ADD COLUMN "commission" DECIMAL(10,2);

-- Insert new policy entries for the new fee model
INSERT INTO "platform_policies" ("id", "policyName", "policyValue", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'platform_booking_fee', '2', 'Flat booking fee charged to customers (GHS)', NOW(), NOW()),
  (gen_random_uuid(), 'partner_commission_percentage', '5', 'Commission percentage charged to partners on completed services', NOW(), NOW())
ON CONFLICT ("policyName") DO UPDATE SET "policyValue" = EXCLUDED."policyValue", "description" = EXCLUDED."description", "updatedAt" = NOW();

-- Mark old policy as deprecated
UPDATE "platform_policies"
SET "description" = 'DEPRECATED: Use platform_booking_fee + partner_commission_percentage instead', "updatedAt" = NOW()
WHERE "policyName" = 'platform_fee_percentage';
