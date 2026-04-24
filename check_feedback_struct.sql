SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'platform_feedback'
ORDER BY ordinal_position;
