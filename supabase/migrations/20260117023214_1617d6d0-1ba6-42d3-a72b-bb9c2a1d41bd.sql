-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule renewal reminders to run daily at 9 AM UTC
SELECT cron.schedule(
  'send-renewal-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/send-renewal-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cHlweGdka3hkeW5vdnBsb3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwOTQ1MzUsImV4cCI6MjA1OTY3MDUzNX0.bRpJjvlXuMGpOdZOPWAJXbB8c8tF5B91AhZPaT0BFEE"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);