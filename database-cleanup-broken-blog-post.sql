-- Run in Supabase SQL editor to remove the broken/empty blog post
DELETE FROM public.blog_posts
WHERE slug = 'beyond-product-hunt-niche-launchpads-guide'
   OR length(trim(content_md)) < 500;
