-- Migration: Add OTP Table
-- Date: 2025-04-21

CREATE TABLE "otps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" VARCHAR,
    "email" VARCHAR,
    "code" VARCHAR NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "otps_phone_number_idx" ON "otps"("phone_number");
CREATE INDEX "otps_email_idx" ON "otps"("email");
CREATE INDEX "otps_expires_at_idx" ON "otps"("expires_at");
