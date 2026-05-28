Make new collections public by default and filter empty from sitemap.

1. Frontend (src/pages/Collections.tsx): default isPublic state to true, reset to true after creation
2. Hook (src/hooks/use-collections.tsx): default is_public to true on create and duplicate
3. Sitemap (supabase/functions/sitemap/index.ts): filter curated collections for having ≥1 product; add public user_collections with ≥1 item