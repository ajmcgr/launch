create view public.launch_post_referral_funnel
with (security_invoker = true) as
select
  (
    select count(distinct owner_id)
    from public.products
    where status = 'launched'
      and launch_date <= now() - interval '24 hours'
  ) as eligible_owners,
  count(*) as impressions,
  count(*) filter (where clicked_at is not null) as clicks
from public.launch_post_referrals
where campaign = 'post_launch_analytics';

revoke all on public.launch_post_referral_funnel from anon, authenticated;
