-- Reservations + tracking for /reserve

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('founder_handle','product_name')),
  value text not null,
  value_lower text generated always as (lower(value)) stored,
  status text not null default 'reserved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reservations_type_value_lower_unique
  on public.reservations(type, value_lower);
create index if not exists reservations_user_idx on public.reservations(user_id);

grant select on public.reservations to anon;
grant select, insert, update on public.reservations to authenticated;
grant all on public.reservations to service_role;

alter table public.reservations enable row level security;

drop policy if exists "reservations readable" on public.reservations;
create policy "reservations readable" on public.reservations
  for select to anon, authenticated using (true);

drop policy if exists "reservations insert own" on public.reservations;
create policy "reservations insert own" on public.reservations
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "reservations update own" on public.reservations;
create policy "reservations update own" on public.reservations
  for update to authenticated using (auth.uid() = user_id);

-- Search tracking
create table if not exists public.reserve_searches (
  id uuid primary key default gen_random_uuid(),
  search_term text not null,
  found boolean,
  created_at timestamptz not null default now()
);
create index if not exists reserve_searches_term_idx on public.reserve_searches(lower(search_term));

grant insert on public.reserve_searches to anon, authenticated;
grant select on public.reserve_searches to authenticated;
grant all on public.reserve_searches to service_role;

alter table public.reserve_searches enable row level security;

drop policy if exists "reserve_searches insert anyone" on public.reserve_searches;
create policy "reserve_searches insert anyone" on public.reserve_searches
  for insert to anon, authenticated with check (true);

drop policy if exists "reserve_searches select auth" on public.reserve_searches;
create policy "reserve_searches select auth" on public.reserve_searches
  for select to authenticated using (true);

-- Success events
create table if not exists public.reserve_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null,
  value text not null,
  created_at timestamptz not null default now()
);

grant insert on public.reserve_events to authenticated;
grant select on public.reserve_events to authenticated;
grant all on public.reserve_events to service_role;

alter table public.reserve_events enable row level security;

drop policy if exists "reserve_events insert own" on public.reserve_events;
create policy "reserve_events insert own" on public.reserve_events
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "reserve_events select auth" on public.reserve_events;
create policy "reserve_events select auth" on public.reserve_events
  for select to authenticated using (true);
