-- Migration: Add Platform Feedback Table
-- Date: 2025-04-19

CREATE TABLE "platform_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "user_type" VARCHAR NOT NULL,
    "user_id" UUID,
    "email" VARCHAR,
    "device_id" VARCHAR,
    "app_version" VARCHAR,
    "status" VARCHAR NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_feedback_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "platform_feedback_user_type_idx" ON "platform_feedback"("user_type");
CREATE INDEX "platform_feedback_rating_idx" ON "platform_feedback"("rating");
CREATE INDEX "platform_feedback_status_idx" ON "platform_feedback"("status");
CREATE INDEX "platform_feedback_created_at_idx" ON "platform_feedback"("created_at");
