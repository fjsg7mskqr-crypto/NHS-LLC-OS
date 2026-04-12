-- Enable RLS on tables from earlier migrations that were missing it

alter table assistant_events enable row level security;
alter table active_clock_sessions enable row level security;
alter table discord_events enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

create policy "Authenticated users full access" on assistant_events
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on active_clock_sessions
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on discord_events
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on invoices
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on invoice_line_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
