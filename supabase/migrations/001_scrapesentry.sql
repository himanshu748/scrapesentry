create table if not exists public.scrapesentry_collectors (
  id text primary key,
  updated_at timestamptz,
  payload jsonb not null
);

create table if not exists public.scrapesentry_runs (
  id text primary key,
  collector_id text not null,
  created_at timestamptz not null default now(),
  payload jsonb not null
);
create index if not exists scrapesentry_runs_collector_created_idx
  on public.scrapesentry_runs (collector_id, created_at desc);

create table if not exists public.scrapesentry_repairs (
  id text primary key,
  collector_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null
);
create index if not exists scrapesentry_repairs_collector_created_idx
  on public.scrapesentry_repairs (collector_id, created_at desc);

create table if not exists public.scrapesentry_events (
  id text primary key,
  collector_id text not null,
  created_at timestamptz not null default now(),
  payload jsonb not null
);
create index if not exists scrapesentry_events_collector_created_idx
  on public.scrapesentry_events (collector_id, created_at desc);

create table if not exists public.scrapesentry_last_known_good (
  collector_id text primary key,
  captured_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.scrapesentry_idempotency (
  operation text not null,
  collector_id text not null,
  key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (operation, collector_id, key)
);

alter table public.scrapesentry_collectors enable row level security;
alter table public.scrapesentry_runs enable row level security;
alter table public.scrapesentry_repairs enable row level security;
alter table public.scrapesentry_events enable row level security;
alter table public.scrapesentry_last_known_good enable row level security;
alter table public.scrapesentry_idempotency enable row level security;

revoke all on public.scrapesentry_collectors from anon, authenticated;
revoke all on public.scrapesentry_runs from anon, authenticated;
revoke all on public.scrapesentry_repairs from anon, authenticated;
revoke all on public.scrapesentry_events from anon, authenticated;
revoke all on public.scrapesentry_last_known_good from anon, authenticated;
revoke all on public.scrapesentry_idempotency from anon, authenticated;
