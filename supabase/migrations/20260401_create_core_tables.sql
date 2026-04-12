-- ============================================================
-- NHS-LLC-OS Core Tables
-- PRD §3: clients, properties, jobs, time_entries, tasks,
--          calendar_blocks, square_invoices
-- Must run BEFORE 20260405 migrations (they FK into these).
-- ============================================================

-- 3.1 Clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  default_hourly_rate numeric(10,2) not null default 0,
  billable_drive_time boolean not null default false,
  notes text,
  square_customer_id text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_clients_name on clients(name);
create index if not exists idx_clients_deleted_at on clients(deleted_at);

-- 3.2 Properties
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  address text,
  type text not null default 'residential'
    check (type in ('residential', 'commercial', 'vacation_rental', 'other')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_properties_client on properties(client_id);

-- 3.3 Jobs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'active', 'complete', 'cancelled')),
  hourly_rate numeric(10,2),
  is_recurring boolean not null default false,
  recurrence text check (recurrence in ('weekly', 'biweekly', 'monthly')),
  scheduled_date date,
  completed_at timestamptz,
  square_invoice_id text,
  notes text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_jobs_client on jobs(client_id);
create index if not exists idx_jobs_property on jobs(property_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_deleted_at on jobs(deleted_at);

-- 3.4 Time Entries
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  category text not null
    check (category in ('client_work', 'drive_time', 'prep', 'admin', 'equipment_maint')),
  start_time timestamptz not null,
  end_time timestamptz,
  duration_minutes integer,
  billable boolean not null default false,
  hourly_rate numeric(10,2),
  billable_amount numeric(10,2),
  notes text,
  source text not null default 'dashboard'
    check (source in ('dashboard', 'discord', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists idx_time_entries_start on time_entries(start_time);
create index if not exists idx_time_entries_job on time_entries(job_id);
create index if not exists idx_time_entries_client on time_entries(client_id);
create index if not exists idx_time_entries_property on time_entries(property_id);
create index if not exists idx_time_entries_category on time_entries(category);

-- 3.5 Tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  title text not null,
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_tasks_priority on tasks(priority);
create index if not exists idx_tasks_due_date on tasks(due_date);
create index if not exists idx_tasks_completed on tasks(completed);
create index if not exists idx_tasks_deleted_at on tasks(deleted_at);
create index if not exists idx_tasks_client on tasks(client_id);

-- 3.6 Calendar Blocks
create table if not exists calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete set null,
  type text not null default 'job_day'
    check (type in ('booking', 'job_day', 'unavailable')),
  start_date date not null,
  end_date date not null,
  notes text,
  source text not null default 'manual'
    check (source in ('manual', 'discord')),
  created_at timestamptz not null default now()
);

create index if not exists idx_calendar_blocks_dates on calendar_blocks(start_date, end_date);
create index if not exists idx_calendar_blocks_property on calendar_blocks(property_id);

-- 3.7 Square Invoices (read-only sync from Square)
create table if not exists square_invoices (
  square_id text primary key,
  client_id uuid references clients(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'UNPAID', 'PAID', 'PARTIALLY_PAID', 'OVERDUE')),
  total_amount numeric(10,2),
  amount_paid numeric(10,2),
  amount_due numeric(10,2),
  issued_date date,
  due_date date,
  paid_date date,
  last_synced_at timestamptz not null default now()
);

create index if not exists idx_square_invoices_client on square_invoices(client_id);
create index if not exists idx_square_invoices_status on square_invoices(status);

-- ============================================================
-- Row-Level Security
-- Single-user app: allow full access when authenticated via
-- service role key (API routes) or anon key with valid JWT.
-- ============================================================

alter table clients enable row level security;
alter table properties enable row level security;
alter table jobs enable row level security;
alter table time_entries enable row level security;
alter table tasks enable row level security;
alter table calendar_blocks enable row level security;
alter table square_invoices enable row level security;

-- Service role bypasses RLS automatically.
-- For the anon key (browser), allow authenticated users full access.
-- In a single-user app this is effectively "logged in = full access".

create policy "Authenticated users full access" on clients
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on properties
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on jobs
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on time_entries
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on tasks
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on calendar_blocks
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on square_invoices
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
