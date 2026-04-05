create table if not exists assistant_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  surface text not null,
  actor_user_id uuid,
  actor_email text,
  actor_github_login text,
  actor_discord_user_id text,
  action_name text not null,
  action_args jsonb not null default '{}'::jsonb,
  action_result jsonb,
  success boolean not null default true
);

create index if not exists idx_assistant_events_created_at on assistant_events(created_at desc);
create index if not exists idx_assistant_events_surface on assistant_events(surface);
create index if not exists idx_assistant_events_action_name on assistant_events(action_name);

create table if not exists active_clock_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  category text not null,
  client_id uuid references clients(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  notes text,
  billable boolean not null default false,
  hourly_rate numeric(10,2)
);
