-- Platform Feedback Migration
CREATE TABLE IF NOT EXISTS platform_feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    rating INTEGER NOT NULL,
    comment TEXT,
    user_type VARCHAR NOT NULL,
    user_id UUID,
    email VARCHAR,
    device_id VARCHAR,
    app_version VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT platform_feedback_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS platform_feedback_user_type_idx ON platform_feedback(user_type);
CREATE INDEX IF NOT EXISTS platform_feedback_rating_idx ON platform_feedback(rating);
CREATE INDEX IF NOT EXISTS platform_feedback_status_idx ON platform_feedback(status);
CREATE INDEX IF NOT EXISTS platform_feedback_created_at_idx ON platform_feedback(created_at);
