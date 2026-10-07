-- An additional payment channel; all existing Stripe orders remain untouched.
alter table public.orders add column rocket_purchase_id uuid,
  add column rocket_client_id text,
  add column rocket_subject uuid,
  add column rocket_product_id uuid;
alter table public.orders add constraint orders_rocket_contract check (
  (rocket_purchase_id is null and rocket_client_id is null and rocket_subject is null and rocket_product_id is null)
  or (rocket_purchase_id is not null and rocket_client_id is not null and rocket_client_id='rocket-dev-fZfbAEjB3Kp_eroMLQ_y4_fn'
      and rocket_subject is not null and rocket_product_id is not null and plan='skip')
);
create unique index orders_rocket_purchase_unique on public.orders(rocket_purchase_id) where rocket_purchase_id is not null;

create table public.rocket_identity_links (
  rocket_subject uuid primary key,
  user_id uuid not null unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.rocket_identity_links enable row level security;
revoke all on public.rocket_identity_links from public,anon,authenticated;
grant all on public.rocket_identity_links to service_role;

-- Canonical identifiers are populated only after actual production registration.
-- No invented ID, legacy product, or browser-supplied contract is accepted.
create table public.rocket_pro_configuration (
  singleton boolean primary key default true check(singleton),
  product_id uuid,
  product_key text,
  check ((product_id is null and product_key is null) or (product_id is not null and product_key is not null and length(product_key)>0))
);
insert into public.rocket_pro_configuration(singleton) values(true);
alter table public.rocket_pro_configuration enable row level security;
revoke all on public.rocket_pro_configuration from public,anon,authenticated;
grant all on public.rocket_pro_configuration to service_role;

-- Called only after the Edge Function verifies BOTH independent identities.
create function public.link_rocket_identity(p_user_id uuid,p_subject uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_user_id is null or p_subject is null then raise exception 'identity required'; end if;
  insert into public.rocket_identity_links(rocket_subject,user_id) values(p_subject,p_user_id)
    on conflict(rocket_subject) do nothing;
  if not exists(select 1 from public.rocket_identity_links where rocket_subject=p_subject and user_id=p_user_id) then
    raise exception 'identity already linked';
  end if;
end $$;
revoke all on function public.link_rocket_identity(uuid,uuid) from public,anon,authenticated;
grant execute on function public.link_rocket_identity(uuid,uuid) to service_role;

-- Persists one paid Pro order for an owned draft. Existing Submit consumes that
-- same order using its unchanged Pro scheduling path. Never a second credit system.
create function public.fulfil_rocket_pro(p_user_id uuid,p_subject uuid,p_purchase_id uuid,p_rocket_product_id uuid,p_product_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; existing public.orders; cfg public.rocket_pro_configuration;
begin
  if p_user_id is null or p_subject is null or p_purchase_id is null or p_product_id is null or p_rocket_product_id is null then raise exception 'purchase required'; end if;
  if not exists(select 1 from public.rocket_identity_links where rocket_subject=p_subject and user_id=p_user_id) then raise exception 'identity not linked'; end if;
  select * into strict cfg from public.rocket_pro_configuration where singleton=true;
  if cfg.product_id is null or cfg.product_id<>p_rocket_product_id then raise exception 'canonical product unavailable'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_purchase_id::text,0));
  select * into existing from public.orders where rocket_purchase_id=p_purchase_id;
  if found then
    if existing.user_id<>p_user_id or existing.rocket_subject<>p_subject or existing.product_id<>p_product_id or existing.rocket_product_id<>p_rocket_product_id then raise exception 'purchase isolation mismatch'; end if;
    return existing.id;
  end if;
  perform 1 from public.products where id=p_product_id and owner_id=p_user_id and status='draft' for update;
  if not found then raise exception 'owned draft required'; end if;
  if exists(select 1 from public.orders where product_id=p_product_id) then raise exception 'draft already has an order'; end if;
  insert into public.orders(user_id,product_id,stripe_session_id,plan,rocket_purchase_id,rocket_client_id,rocket_subject,rocket_product_id)
    values(p_user_id,p_product_id,'rocket_purchase:'||p_purchase_id::text,'skip',p_purchase_id,'rocket-dev-fZfbAEjB3Kp_eroMLQ_y4_fn',p_subject,p_rocket_product_id)
    returning id into result_id;
  return result_id;
end $$;
revoke all on function public.fulfil_rocket_pro(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.fulfil_rocket_pro(uuid,uuid,uuid,uuid,uuid) to service_role;

-- Existing orders RLS may permit INSERT/UPDATE. Reject Rocket metadata on that
-- path so a browser cannot manufacture a paid order or reassign a purchase.
create function public.guard_rocket_order() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if TG_OP='DELETE' then
    if old.rocket_purchase_id is not null then raise exception 'financial purchase history retained'; end if;
    return old;
  end if;
  if (new.rocket_purchase_id is not null or (TG_OP='UPDATE' and old.rocket_purchase_id is not null))
    and current_user not in ('postgres','service_role','supabase_admin') then raise exception 'server verified purchase required'; end if;
  if TG_OP='UPDATE' and old.rocket_purchase_id is not null and
    (new.rocket_purchase_id is distinct from old.rocket_purchase_id or new.user_id is distinct from old.user_id or
     new.product_id is distinct from old.product_id or new.rocket_subject is distinct from old.rocket_subject or
     new.rocket_product_id is distinct from old.rocket_product_id or new.rocket_client_id is distinct from old.rocket_client_id or new.plan is distinct from old.plan)
    then raise exception 'purchase binding immutable'; end if;
  return new;
end $$;
create trigger guard_rocket_order before insert or update or delete on public.orders for each row execute function public.guard_rocket_order();
