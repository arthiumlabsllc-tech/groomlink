-- Migration: Create ai_accountant_alerts table for the AI Accountant anomaly detection
-- Date: 2026-08-09

CREATE TABLE IF NOT EXISTS "ai_accountant_alerts" (
    "id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_accountant_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_accountant_alerts_status_created_at_idx" ON "ai_accountant_alerts"("status", "created_at");
CREATE INDEX IF NOT EXISTS "ai_accountant_alerts_alert_type_created_at_idx" ON "ai_accountant_alerts"("alert_type", "created_at");
