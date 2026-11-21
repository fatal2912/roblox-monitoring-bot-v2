-- Roblox Monitoring Bot V2 initial schema.
-- Apply in Supabase SQL Editor or through a reviewed Supabase migration workflow.

create table if not exists public.monitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('group','user','game','user_roles')),
  source_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create table if not exists public.bot_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.monitor_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source_type text not null check (source_type in ('group','user','game','system')),
  source_id text not null,
  title text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists monitor_events_occurred_at_idx on public.monitor_events (occurred_at desc);
create index if not exists monitor_events_source_idx on public.monitor_events (source_type, source_id, occurred_at desc);
create index if not exists monitor_events_type_idx on public.monitor_events (event_type, occurred_at desc);

alter table public.monitor_snapshots enable row level security;
alter table public.monitor_events enable row level security;

-- Authenticated dashboard users may read event history.
-- The worker accesses these tables with the service-role key and bypasses RLS.
create policy "bot admins can read monitor events"
on public.monitor_events for select to authenticated
using (exists (
  select 1 from public.bot_admins a where a.user_id = (select auth.uid())
));

alter table public.bot_admins enable row level security;
revoke all on public.bot_admins from anon, authenticated;

-- Snapshots are internal worker state and are not exposed to dashboard users.
revoke all on public.monitor_snapshots from anon, authenticated;
revoke insert, update, delete on public.monitor_events from anon, authenticated;
grant select on public.monitor_events to authenticated;

-- After creating your Supabase Auth account, add its UUID using the SQL editor:
-- insert into public.bot_admins (user_id) values ('YOUR-AUTH-USER-UUID');
