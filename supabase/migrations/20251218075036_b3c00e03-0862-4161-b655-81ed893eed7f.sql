-- Drop the view and recreate with security_invoker
DROP VIEW IF EXISTS public.product_analytics_summary;

CREATE VIEW public.product_analytics_summary
WITH (security_invoker = true)
AS
SELECT 
  product_id,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as total_page_views,
  COUNT(*) FILTER (WHERE event_type = 'website_click') as total_website_clicks
FROM public.product_analytics
GROUP BY product_id;