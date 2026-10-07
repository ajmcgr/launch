-- Rocket ID is an identity provider, not a browser-held credential. All OAuth
-- state and Rocket credentials remain available only to service-role functions.
create table public.rocket_oauth_transactions (
  state_hash text primary key check (state_hash ~ '^[0-9a-f]{64}$'),
  verifier_ciphertext text not null,
  nonce_ciphertext text not null,
  return_path text not null default '/',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rocket_oauth_transactions enable row level security;
revoke all on public.rocket_oauth_transactions from public, anon, authenticated;
grant all on public.rocket_oauth_transactions to service_role;
create index rocket_oauth_transactions_expiry_idx on public.rocket_oauth_transactions (expires_at)
  where consumed_at is null;

create table public.rocket_identities (
  rocket_subject text primary key check (length(rocket_subject) between 1 and 255),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  verified_email text not null,
  access_token_ciphertext text not null,
  token_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rocket_identities enable row level security;
revoke all on public.rocket_identities from public, anon, authenticated;
grant all on public.rocket_identities to service_role;

-- Existing pilot rows are preserved, while production identity values are
-- opaque strings rather than assuming a provider-specific UUID subject.
alter table public.orders drop constraint if exists orders_rocket_contract;
alter table public.orders alter column rocket_subject type text using rocket_subject::text;
alter table public.orders add constraint orders_rocket_contract check (
  (rocket_purchase_id is null and rocket_client_id is null and rocket_subject is null and rocket_product_id is null)
  or (rocket_purchase_id is not null and rocket_client_id is not null and rocket_client_id = 'rocket-dev-fZfbAEjB3Kp_eroMLQ_y4_fn'
      and rocket_subject is not null and rocket_product_id is not null and plan = 'skip')
);

alter table public.rocket_pro_configuration add column if not exists enabled boolean not null default false;
update public.rocket_pro_configuration set enabled = false where singleton = true;

-- A one-time update consumes the transaction even if the later provider call
-- fails, preventing an authorization code from ever being exchanged twice.
create or replace function public.consume_rocket_oauth_transaction(p_state_hash text)
returns table(verifier_ciphertext text, nonce_ciphertext text, return_path text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.rocket_oauth_transactions
  set consumed_at = now()
  where state_hash = p_state_hash
    and consumed_at is null
    and expires_at > now()
  returning rocket_oauth_transactions.verifier_ciphertext,
            rocket_oauth_transactions.nonce_ciphertext,
            rocket_oauth_transactions.return_path;
end;
$$;
revoke all on function public.consume_rocket_oauth_transaction(text) from public, anon, authenticated;
grant execute on function public.consume_rocket_oauth_transaction(text) to service_role;

create or replace function public.find_verified_launch_user_by_email(p_email text)
returns uuid language sql security definer set search_path = '' as $$
  select id
  from auth.users
  where lower(email) = lower(p_email)
    and email_confirmed_at is not null
  limit 1
$$;
revoke all on function public.find_verified_launch_user_by_email(text) from public, anon, authenticated;
grant execute on function public.find_verified_launch_user_by_email(text) to service_role;

-- A Rocket subject and a Launch account are both one-to-one. This protects an
-- existing account from email-only takeover and rejects conflicting links.
create or replace function public.link_verified_rocket_identity(
  p_user_id uuid,
  p_subject text,
  p_email text,
  p_access_token_ciphertext text,
  p_token_expires_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
declare existing_user uuid; existing_subject text;
begin
  if p_user_id is null or p_subject is null or p_email is null or p_access_token_ciphertext is null or p_token_expires_at <= now() then
    raise exception 'invalid rocket identity';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_subject, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(p_email), 0));

  select user_id into existing_user from public.rocket_identities where rocket_subject = p_subject;
  if found and existing_user <> p_user_id then raise exception 'rocket subject already linked'; end if;
  select rocket_subject into existing_subject from public.rocket_identities where user_id = p_user_id;
  if found and existing_subject <> p_subject then raise exception 'launch account already linked'; end if;

  insert into public.rocket_identities (
    rocket_subject, user_id, verified_email, access_token_ciphertext, token_expires_at, revoked_at, updated_at
  ) values (
    p_subject, p_user_id, lower(p_email), p_access_token_ciphertext, p_token_expires_at, null, now()
  ) on conflict (rocket_subject) do update set
    verified_email = excluded.verified_email,
    access_token_ciphertext = excluded.access_token_ciphertext,
    token_expires_at = excluded.token_expires_at,
    revoked_at = null,
    updated_at = now()
  where public.rocket_identities.user_id = excluded.user_id;

  if not found then raise exception 'rocket identity link conflict'; end if;
end;
$$;
revoke all on function public.link_verified_rocket_identity(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.link_verified_rocket_identity(uuid, text, text, text, timestamptz) to service_role;

drop function if exists public.fulfil_rocket_pro(uuid, uuid, uuid, uuid, uuid);
create function public.fulfil_rocket_pro(
  p_user_id uuid,
  p_subject text,
  p_purchase_id uuid,
  p_rocket_product_id uuid,
  p_product_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid; existing public.orders; cfg public.rocket_pro_configuration;
begin
  if p_user_id is null or p_subject is null or p_purchase_id is null or p_product_id is null or p_rocket_product_id is null then raise exception 'purchase required'; end if;
  if not exists(select 1 from public.rocket_identities where rocket_subject = p_subject and user_id = p_user_id and revoked_at is null) then
    raise exception 'identity not linked';
  end if;
  select * into strict cfg from public.rocket_pro_configuration where singleton = true;
  if cfg.enabled is not true or cfg.product_id is null or cfg.product_id <> p_rocket_product_id then raise exception 'canonical product unavailable'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_purchase_id::text, 0));
  select * into existing from public.orders where rocket_purchase_id = p_purchase_id;
  if found then
    if existing.user_id <> p_user_id or existing.rocket_subject <> p_subject or existing.product_id <> p_product_id or existing.rocket_product_id <> p_rocket_product_id then
      raise exception 'purchase isolation mismatch';
    end if;
    return existing.id;
  end if;

  perform 1 from public.products where id = p_product_id and owner_id = p_user_id and status = 'draft' for update;
  if not found then raise exception 'owned draft required'; end if;
  if exists(select 1 from public.orders where product_id = p_product_id) then raise exception 'draft already has an order'; end if;

  insert into public.orders(user_id, product_id, stripe_session_id, plan, rocket_purchase_id, rocket_client_id, rocket_subject, rocket_product_id)
  values (p_user_id, p_product_id, 'rocket_purchase:' || p_purchase_id::text, 'skip', p_purchase_id,
    'rocket-dev-fZfbAEjB3Kp_eroMLQ_y4_fn', p_subject, p_rocket_product_id)
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.fulfil_rocket_pro(uuid, text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.fulfil_rocket_pro(uuid, text, uuid, uuid, uuid) to service_role;
