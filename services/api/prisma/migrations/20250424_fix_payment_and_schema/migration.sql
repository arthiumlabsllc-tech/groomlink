-- Migration: Fix payment schema and add missing columns
-- Date: 2025-04-24
-- Description: Adds paystack_transaction_id, payment_gateway, gateway_transaction_id,
--              paystack_access_code to payments table. Also fixes escrow_accounts and
--              bookings defaults, and adds PAYSTACK to PaymentProvider enum.

-- Add PAYSTACK to PaymentProvider enum
ALTER TYPE "PaymentProvider" ADD VALUE 'PAYSTACK';

-- Fix bookings reference default
ALTER TABLE "bookings" ALTER COLUMN "reference" SET DEFAULT 'GL-' || substr(md5(random()::text), 1, 8);

-- Add missing columns to escrow_accounts
ALTER TABLE "escrow_accounts" 
    ADD COLUMN "payout_gateway" TEXT,
    ADD COLUMN "paystack_payout_reference" TEXT,
    ADD COLUMN "paystack_recipient_code" TEXT;

-- Add missing columns to payments (CRITICAL FIX)
ALTER TABLE "payments" 
    ADD COLUMN "gateway_transaction_id" TEXT,
    ADD COLUMN "payment_gateway" TEXT,
    ADD COLUMN "paystack_access_code" TEXT,
    ADD COLUMN "paystack_transaction_id" TEXT;

-- Create index on payment_gateway for performance
CREATE INDEX "payments_payment_gateway_idx" ON "payments"("payment_gateway");
