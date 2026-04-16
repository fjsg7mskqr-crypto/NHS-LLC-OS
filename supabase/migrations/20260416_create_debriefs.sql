-- ============================================================
-- Daily debriefs — end-of-day reflection notes not tied to a
-- specific time entry. One row per local date. UPSERT-keyed.
-- ============================================================

create table if not exists debriefs (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  summary text,
  wins text,
  blockers text,
  followups text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_debriefs_date on debriefs(date desc);

-- Auto-bump updated_at on row update
create or replace function set_debriefs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists debriefs_set_updated_at on debriefs;
create trigger debriefs_set_updated_at
  before update on debriefs
  for each row execute function set_debriefs_updated_at();

alter table debriefs enable row level security;

create policy "Authenticated users full access" on debriefs
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
