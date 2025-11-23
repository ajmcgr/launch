-- Schedule daily winner detection at midnight UTC
-- This runs every day at 00:00 UTC
SELECT cron.schedule(
  'daily-winner-detection',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/detect-winners',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cHlweGdka3hkeW5vdnBsb3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjUwMTUsImV4cCI6MjA3OTE0MTAxNX0.xG-0pm8FikCl-SL_nJORxHEmLSHY9KN77pEkOoEvZis"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);