-- Add service timer fields to SalonQueue for freelancer/home-service countdown
-- startedAt: tracks when IN_SERVICE began (enables countdown timer)
-- isHomeService: flags freelancer home visits for UI differentiation

ALTER TABLE "salon_queues"
  ADD COLUMN "started_at" TIMESTAMPTZ,
  ADD COLUMN "is_home_service" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: set startedAt for existing IN_SERVICE entries that don't have it
UPDATE "salon_queues"
  SET "started_at" = "called_at"
  WHERE "status" = 'IN_SERVICE' AND "started_at" IS NULL AND "called_at" IS NOT NULL;
