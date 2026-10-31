create table public.launch_x_post_control (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  next_post_at timestamptz not null default now()
);
insert into public.launch_x_post_control (singleton) values (true);

create table public.launch_x_post_queue (
  product_id uuid primary key references public.products(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','posting','posted','review','failed','skipped')),
  enqueued_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  attempt_id uuid,
  claimed_at timestamptz,
  attempts integer not null default 0,
  posted_at timestamptz,
  x_post_id text,
  last_error text
);
create index launch_x_post_queue_pending on public.launch_x_post_queue (enqueued_at, product_id) where status = 'queued';
alter table public.launch_x_post_control enable row level security;
alter table public.launch_x_post_queue enable row level security;
revoke all on public.launch_x_post_control, public.launch_x_post_queue from public, anon, authenticated;
grant select, insert, update, delete on public.launch_x_post_control, public.launch_x_post_queue to service_role;

-- Capture future publications only, including paths that bypass launch-scheduler.
create function public.enqueue_launch_x_post() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'launched' then
    if tg_op = 'UPDATE' and old.status is not distinct from new.status then
      return new;
    end if;
    if not exists (
      select 1 from public.product_analytics
      where product_id = new.id and event_type = 'launch_tweet_posted_trylaunchai'
    ) then
      insert into public.launch_x_post_queue (product_id) values (new.id)
      on conflict (product_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enqueue_launch_x_post() from public, anon, authenticated;
create trigger enqueue_launch_x_post after insert or update of status on public.products
for each row execute function public.enqueue_launch_x_post();

create function public.claim_launch_x_post() returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  control public.launch_x_post_control%rowtype;
  job public.launch_x_post_queue%rowtype;
begin
  select * into control from public.launch_x_post_control where singleton for update skip locked;
  if not found or not control.enabled or control.next_post_at > now() then
    return null;
  end if;
  -- A timeout may have happened after X accepted a post: never blindly resend it.
  update public.launch_x_post_queue set status = 'review', last_error = 'Posting timed out; check X before retrying'
  where status = 'posting' and claimed_at < now() - interval '10 minutes';
  if exists (select 1 from public.launch_x_post_queue where status = 'posting') then
    return null;
  end if;
  select * into job from public.launch_x_post_queue
  where status = 'queued' and next_attempt_at <= now()
  order by enqueued_at, product_id limit 1 for update skip locked;
  if not found then return null; end if;
  update public.launch_x_post_queue
  set status = 'posting', claimed_at = now(), attempt_id = gen_random_uuid(), attempts = attempts + 1
  where product_id = job.product_id returning * into job;
  update public.launch_x_post_control set next_post_at = now() + interval '15 minutes' where singleton;
  return to_jsonb(job);
end;
$$;

create function public.finish_launch_x_post(p_attempt_id uuid, p_status text, p_post_id text default null, p_error text default null) returns boolean
language plpgsql security invoker set search_path = public, pg_temp as $$
declare job public.launch_x_post_queue%rowtype;
begin
  if p_status not in ('queued','posted','review','failed','skipped') then
    raise exception 'Invalid post result';
  end if;
  select * into job from public.launch_x_post_queue
  where attempt_id = p_attempt_id and status = 'posting' for update;
  if not found then return false; end if;
  update public.launch_x_post_queue set
    status = case when p_status = 'queued' and attempts >= 5 then 'failed' else p_status end,
    next_attempt_at = now() + interval '1 hour',
    posted_at = case when p_status = 'posted' then now() else null end,
    x_post_id = left(p_post_id, 100), last_error = left(p_error, 500)
  where product_id = job.product_id;
  return true;
end;
$$;
revoke all on function public.claim_launch_x_post(), public.finish_launch_x_post(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.claim_launch_x_post(), public.finish_launch_x_post(uuid,text,text,text) to service_role;
