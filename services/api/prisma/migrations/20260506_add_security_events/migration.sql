-- Security event log for the security-alert pipeline
-- Each row represents a suspected attack, anomaly or policy violation.

CREATE TABLE IF NOT EXISTS "security_events" (
    "id"          TEXT NOT NULL,
    "event_type"  TEXT NOT NULL,
    "severity"    TEXT NOT NULL,
    "source"      TEXT NOT NULL DEFAULT 'app',
    "ip_address"  TEXT,
    "user_id"     TEXT,
    "user_email"  TEXT,
    "user_agent"  TEXT,
    "endpoint"    TEXT,
    "method"      TEXT,
    "message"     TEXT NOT NULL,
    "details"     JSONB,
    "resolved"    BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "security_events_created_at_idx"
    ON "security_events" ("created_at");

CREATE INDEX IF NOT EXISTS "security_events_severity_resolved_idx"
    ON "security_events" ("severity", "resolved");

CREATE INDEX IF NOT EXISTS "security_events_event_type_created_at_idx"
    ON "security_events" ("event_type", "created_at");

CREATE INDEX IF NOT EXISTS "security_events_ip_address_idx"
    ON "security_events" ("ip_address");
