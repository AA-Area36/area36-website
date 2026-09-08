UPDATE errors_daily
SET sample_message = NULL
WHERE sample_message IS NOT NULL;
