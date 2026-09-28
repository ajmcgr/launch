-- Preserve permanent product URLs when a maker changes a slug. The trigger is
-- the enforcement point so API, admin, and future UI updates cannot bypass it.
create table if not exists public.product_slug_history (
  old_slug text primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (old_slug = lower(old_slug))
);

create index if not exists product_slug_history_product_id_idx
  on public.product_slug_history (product_id);

alter table public.product_slug_history enable row level security;

create or replace function public.preserve_product_slug_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    if exists (
      select 1
      from public.product_slug_history h
      where h.old_slug = new.slug
        and h.product_id <> new.id
    ) then
      raise exception 'This slug is reserved by a previous product URL';
    end if;
  end if;

  if tg_op = 'UPDATE'
    and old.slug is not null
    and btrim(old.slug) <> ''
    and new.slug is distinct from old.slug then
    insert into public.product_slug_history (old_slug, product_id)
    values (old.slug, old.id)
    on conflict (old_slug) do update
      set product_id = excluded.product_id
      where public.product_slug_history.product_id = excluded.product_id;
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_product_slug_history on public.products;
create trigger preserve_product_slug_history
before insert or update of slug on public.products
for each row execute function public.preserve_product_slug_history();

revoke all on table public.product_slug_history from anon, authenticated;
revoke all on function public.preserve_product_slug_history() from public;
