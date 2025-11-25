# Product Archive Setup

This document explains how to set up automatic archiving of top products each year.

## Overview

The archive system stores the top 100 products for each time period (today, week, month, year) at the end of each calendar year. This data is accessible through the `/products` page under the "Archived" section.

## Database Schema

The `product_archives` table stores archived product data with the following structure:
- `year`: The year this archive belongs to
- `period`: The time period (today, week, month, year)
- `product_id`: Reference to the product
- `rank`: The rank of the product (1-100)
- `net_votes`: The net votes at the time of archiving

## Automatic Archiving with Cron

To automatically archive products on January 1st of each year, set up a Supabase cron job:

### 1. Enable Required Extensions

In your Supabase SQL Editor, run:

```sql
-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 2. Create the Cron Job

Run the following SQL to schedule the archiving function to run every January 1st at 2:00 AM UTC:

```sql
SELECT cron.schedule(
  'archive-year-products',
  '0 2 1 1 *',  -- At 2:00 AM on January 1st
  $$
  SELECT
    net.http_post(
      url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/archive-year-products',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cHlweGdka3hkeW5vdnBsb3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjUwMTUsImV4cCI6MjA3OTE0MTAxNX0.xG-0pm8FikCl-SL_nJORxHEmLSHY9KN77pEkOoEvZis"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

### 3. Verify the Cron Job

Check that the job was created:

```sql
SELECT * FROM cron.job WHERE jobname = 'archive-year-products';
```

### 4. Manual Trigger (Optional)

To manually trigger the archiving process for testing:

```sql
SELECT
  net.http_post(
    url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/archive-year-products',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cHlweGdka3hkeW5vdnBsb3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjUwMTUsImV4cCI6MjA3OTE0MTAxNX0.xG-0pm8FikCl-SL_nJORxHEmLSHY9KN77pEkOoEvZis"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
```

## How It Works

1. **On January 1st at 2:00 AM UTC**, the cron job triggers
2. The edge function `archive-year-products` runs
3. For each period (today, week, month, year):
   - Fetches all launched products from the previous year
   - Gets vote counts for each product
   - Sorts by votes and takes the top 100
   - Stores them in the `product_archives` table with their rank

## Viewing Archives

Users can view archived data by:
1. Going to `/products`
2. Clicking on a year under the "Archived" section in the left sidebar
3. Selecting a time period (Today, This Week, This Month, This Year)

## Notes

- Archives store the top 100 products per period
- The archiving process uses the previous year's data
- Archives are read-only for non-admin users
- The system uses RLS policies to control access
