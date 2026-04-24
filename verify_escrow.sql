SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'escrow_accounts'
ORDER BY ordinal_position;
