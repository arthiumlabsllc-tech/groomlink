-- CreateTable
CREATE TABLE "agent_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "sound_notifications" BOOLEAN NOT NULL DEFAULT true,
    "desktop_notifications" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "away_message" VARCHAR(500),
    "auto_assign" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_bot" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "patterns" TEXT[],
    "response" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'general',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_settings_user_id_key" ON "agent_settings"("user_id");

-- CreateIndex
CREATE INDEX "agent_settings_user_id_idx" ON "agent_settings"("user_id");

-- CreateIndex
CREATE INDEX "agent_settings_status_idx" ON "agent_settings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "faq_bot_keyword_key" ON "faq_bot"("keyword");

-- CreateIndex
CREATE INDEX "faq_bot_is_active_priority_idx" ON "faq_bot"("is_active", "priority");

-- CreateIndex
CREATE INDEX "faq_bot_category_idx" ON "faq_bot"("category");

-- AddForeignKey
ALTER TABLE "agent_settings" ADD CONSTRAINT "agent_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
