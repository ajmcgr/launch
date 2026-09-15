create table public.launch_post_referrals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign text not null default 'post_launch_analytics'
    check (campaign = 'post_launch_analytics'),
  impression_at timestamptz not null default now(),
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create index launch_post_referrals_product_created_idx
  on public.launch_post_referrals (product_id, created_at desc);

alter table public.launch_post_referrals enable row level security;
revoke all on public.launch_post_referrals from anon, authenticated;

create or replace function public.create_launch_post_referral(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  referral_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.products
    where id = p_product_id and owner_id = auth.uid() and status = 'launched'
  ) then
    raise exception 'Product ownership required';
  end if;

  insert into public.launch_post_referrals (product_id, owner_id)
  values (p_product_id, auth.uid())
  returning id into referral_id;

  return referral_id;
end;
$$;

create or replace function public.mark_launch_post_referral_clicked(p_referral_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.launch_post_referrals
  set clicked_at = coalesce(clicked_at, now())
  where id = p_referral_id and owner_id = auth.uid();

  if not found then
    raise exception 'Referral ownership required';
  end if;
end;
$$;

revoke all on function public.create_launch_post_referral(uuid) from public;
revoke all on function public.mark_launch_post_referral_clicked(uuid) from public;
grant execute on function public.create_launch_post_referral(uuid) to authenticated;
grant execute on function public.mark_launch_post_referral_clicked(uuid) to authenticated;
