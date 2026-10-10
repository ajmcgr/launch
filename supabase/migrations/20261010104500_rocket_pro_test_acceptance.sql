-- A Stripe TEST purchase must never create a live Launch order or paid benefit.
-- This isolated receipt exercises the same verified-purchase/idempotency contract.
create table public.rocket_pro_test_configuration (
  singleton boolean primary key default true check (singleton),
  client_id text,
  product_id uuid,
  product_key text,
  allowed_user_id uuid references auth.users(id) on delete restrict,
  enabled boolean not null default false,
  check (not enabled or (client_id is not null and product_id is not null and product_key is not null and allowed_user_id is not null))
);
insert into public.rocket_pro_test_configuration(singleton) values (true);

create table public.rocket_test_oauth_transactions (
  state_hash text primary key check (state_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete restrict,
  verifier_ciphertext text not null,
  nonce_ciphertext text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.rocket_test_identities (
  user_id uuid primary key references auth.users(id) on delete restrict,
  rocket_subject text not null unique check (length(rocket_subject) between 1 and 255),
  verified_email text not null,
  access_token_ciphertext text not null,
  token_expires_at timestamptz not null,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.rocket_pro_test_fulfilments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  launch_product_id uuid not null references public.products(id) on delete restrict,
  rocket_client_id text not null,
  rocket_subject text not null,
  rocket_product_id uuid not null,
  created_at timestamptz not null default now()
);
create unique index rocket_pro_test_fulfilments_product_idx on public.rocket_pro_test_fulfilments(launch_product_id);

alter table public.rocket_pro_test_configuration enable row level security;
alter table public.rocket_test_oauth_transactions enable row level security;
alter table public.rocket_test_identities enable row level security;
alter table public.rocket_pro_test_fulfilments enable row level security;
revoke all on public.rocket_pro_test_configuration, public.rocket_test_oauth_transactions,
  public.rocket_test_identities, public.rocket_pro_test_fulfilments from public, anon, authenticated;
grant all on public.rocket_pro_test_configuration, public.rocket_test_oauth_transactions,
  public.rocket_test_identities, public.rocket_pro_test_fulfilments to service_role;

create function public.consume_rocket_test_oauth_transaction(p_state_hash text)
returns table(user_id uuid, verifier_ciphertext text, nonce_ciphertext text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.rocket_test_oauth_transactions
  set consumed_at = now()
  where state_hash = p_state_hash and consumed_at is null and expires_at > now()
  returning rocket_test_oauth_transactions.user_id,
            rocket_test_oauth_transactions.verifier_ciphertext,
            rocket_test_oauth_transactions.nonce_ciphertext;
end;
$$;
revoke all on function public.consume_rocket_test_oauth_transaction(text) from public, anon, authenticated;
grant execute on function public.consume_rocket_test_oauth_transaction(text) to service_role;

create function public.fulfil_rocket_pro_test(
  p_user_id uuid, p_subject text, p_purchase_id uuid,
  p_rocket_product_id uuid, p_launch_product_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare cfg public.rocket_pro_test_configuration; existing public.rocket_pro_test_fulfilments; result_id uuid;
begin
  if p_user_id is null or p_subject is null or p_purchase_id is null or
     p_rocket_product_id is null or p_launch_product_id is null then raise exception 'purchase required'; end if;
  select * into strict cfg from public.rocket_pro_test_configuration where singleton = true;
  if not cfg.enabled or cfg.allowed_user_id <> p_user_id or cfg.product_id <> p_rocket_product_id then
    raise exception 'test configuration unavailable';
  end if;
  if not exists (select 1 from public.rocket_test_identities
                 where user_id = p_user_id and rocket_subject = p_subject and revoked_at is null) then
    raise exception 'test identity not linked';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_purchase_id::text, 0));
  select * into existing from public.rocket_pro_test_fulfilments where purchase_id = p_purchase_id;
  if found then
    if existing.user_id <> p_user_id or existing.rocket_subject <> p_subject or
       existing.launch_product_id <> p_launch_product_id or
       existing.rocket_product_id <> p_rocket_product_id or existing.rocket_client_id <> cfg.client_id then
      raise exception 'test purchase isolation mismatch';
    end if;
    return existing.id;
  end if;
  perform 1 from public.products where id = p_launch_product_id and owner_id = p_user_id and status = 'draft' for update;
  if not found then raise exception 'owned unpaid draft required'; end if;
  if exists (select 1 from public.orders where product_id = p_launch_product_id) then
    raise exception 'live order already exists';
  end if;
  insert into public.rocket_pro_test_fulfilments(
    purchase_id, user_id, launch_product_id, rocket_client_id, rocket_subject, rocket_product_id
  ) values (p_purchase_id, p_user_id, p_launch_product_id, cfg.client_id, p_subject, p_rocket_product_id)
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.fulfil_rocket_pro_test(uuid, text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.fulfil_rocket_pro_test(uuid, text, uuid, uuid, uuid) to service_role;
