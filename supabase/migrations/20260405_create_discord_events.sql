create table if not exists discord_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  discord_user_id text not null,
  discord_channel_id text,
  command_name text,
  interaction_type integer not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_discord_events_created_at on discord_events(created_at desc);
create index if not exists idx_discord_events_user_id on discord_events(discord_user_id);
