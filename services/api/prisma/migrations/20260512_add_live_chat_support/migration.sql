-- Migration: Add live chat support fields
-- Created: 2026-05-12

-- Create TicketSource enum
DO $$ BEGIN
  CREATE TYPE "TicketSource" AS ENUM (
    'LANDING',
    'CUSTOMER_WEB',
    'CUSTOMER_APP',
    'PARTNERS_WEB',
    'PARTNERS_APP',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add fields to support_tickets table
ALTER TABLE "support_tickets" 
  ADD COLUMN IF NOT EXISTS "source" "TicketSource" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS "guest_email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "guest_name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "unread_by_agent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unread_by_user" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make user_id nullable to support guest tickets (anonymous users)
ALTER TABLE "support_tickets" ALTER COLUMN "user_id" DROP NOT NULL;

-- Add readAt field to ticket_messages table
ALTER TABLE "ticket_messages"
  ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP(3);

-- Create index for lastMessageAt sorting in support dashboard
CREATE INDEX IF NOT EXISTS "support_tickets_last_message_at_idx" ON "support_tickets"("last_message_at" DESC);

-- Create index for guest email lookups
CREATE INDEX IF NOT EXISTS "support_tickets_guest_email_idx" ON "support_tickets"("guest_email");
