# NHS-LLC Business Operating System
## Product Requirements Document — v4.0
**Domain:** app.nhs-llc.com | **Stack:** Vercel + Supabase | **Updated: April 2026**

---

## 1. What This Solves

Ethan is a solo owner-operator running a service-based business (Nova Horizon Services LLC). Square handles invoices, payments, and the card reader — but the free plan removed the time clock, and Square was never designed for a sole proprietor managing time across multiple clients and properties.

This OS fills three gaps Square cannot:

1. **Time tracking** — clock in/out by category, client, and property. Every hour logged, no Square subscription required.
2. **Field communication** — Discord bot handles quick updates from a job site: mark tasks done, add calendar blocks, log time after the fact — without opening a browser.
3. **Reporting and export** — weekly and monthly timesheets downloadable as CSV or PDF, categorized by client, property, and billable vs. non-billable. The reports Square used to provide, now fully owned.

Square stays in place for what it does well: invoicing, payment processing, and the card reader. This system fills the gap, not replaces Square.

---

## 2. Tech Stack

| Service | Role | Cost |
|---|---|---|
| Vercel | Next.js dashboard + API routes | Free tier |
| Supabase | PostgreSQL database + Edge Functions (Discord bot) | Free tier |
| Anthropic Claude API | AI parsing for Discord plain-text messages | ~$3–5/mo |
| Square API | Read-only invoice + payment sync | Free |
| Discord | Field communication interface | Free |

### Architecture
```
Discord (you) → Slash command or plain text → Supabase Edge Function (bot)
Supabase Edge Function → Claude API → structured action JSON
Supabase Edge Function → writes to → Supabase PostgreSQL
app.nhs-llc.com → reads from → Supabase PostgreSQL
Square sync (Vercel cron, 30 min) → polls Square → Supabase PostgreSQL
```

---

## 3. Core Data Model

Three-level hierarchy reflecting how field service work actually happens:

```
Client
  └── Property
        └── Job
              └── Time Entry
```

### 3.1 Clients
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | e.g. "SBR Properties" |
| contact_name | String | Who you deal with |
| email | String | |
| phone | String | |
| default_hourly_rate | Decimal | Default rate for all jobs under this client |
| billable_drive_time | Boolean | Whether drive time is billed to this client |
| notes | Text | |
| square_customer_id | String | For invoice matching |
| created_at | Timestamp | |

### 3.2 Properties
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| client_id | FK → clients | |
| name | String | e.g. "Den", "Lodge" |
| address | String | |
| notes | Text | |

### 3.3 Jobs
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| client_id | FK → clients | |
| property_id | FK → properties | |
| title | String | Short description |
| description | Text | Scope of work |
| status | Enum | `scheduled` \| `in_progress` \| `complete` \| `cancelled` |
| hourly_rate | Decimal | Overrides client default if set |
| is_recurring | Boolean | |
| recurrence | String | "weekly", "biweekly", "monthly" |
| scheduled_date | Date | |
| completed_at | Timestamp | |
| square_invoice_id | String | Linked Square invoice |
| notes | Text | |
| created_at | Timestamp | |

### 3.4 Time Entries
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| job_id | FK → jobs | Optional — non-job time (admin, errand) won't have one |
| client_id | FK → clients | Optional |
| property_id | FK → properties | Optional |
| category | Enum | See section 4 |
| start_time | Timestamp | |
| end_time | Timestamp | Null if timer still running |
| duration_minutes | Integer | Calculated on clock-out |
| billable | Boolean | Set per entry — not locked to category |
| hourly_rate | Decimal | Snapshotted at time of entry |
| billable_amount | Decimal | duration_hours × hourly_rate (if billable) |
| notes | Text | What was done |
| source | Enum | `dashboard` \| `discord` \| `manual` |
| created_at | Timestamp | |

### 3.5 Tasks
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| job_id | FK → jobs | Optional |
| client_id | FK → clients | Optional |
| property_id | FK → properties | Optional |
| title | String | |
| priority | Enum | `high` \| `medium` \| `low` |
| due_date | Date | Optional |
| completed | Boolean | |
| completed_at | Timestamp | |
| created_at | Timestamp | |

### 3.6 Calendar Blocks
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| property_id | FK → properties | Which property is affected |
| type | Enum | `booking` \| `job_day` \| `unavailable` |
| start_date | Date | |
| end_date | Date | |
| notes | Text | Guest name, reason, etc. |
| source | Enum | `manual` \| `discord` |
| created_at | Timestamp | |

### 3.7 Square Invoices (read-only, synced from Square)
| Field | Type | Notes |
|---|---|---|
| square_id | String | Primary key from Square |
| client_id | FK → clients | Matched by email or name |
| job_id | FK → jobs | Manually linked in dashboard |
| status | String | DRAFT \| UNPAID \| PAID \| PARTIALLY_PAID \| OVERDUE |
| total_amount | Decimal | |
| amount_paid | Decimal | |
| amount_due | Decimal | |
| issued_date | Date | |
| due_date | Date | |
| paid_date | Date | |
| last_synced_at | Timestamp | |

---

## 4. Time Categories

| Category | Billable Default | Description |
|---|---|---|
| `client_work` | Yes | Direct service at a client property |
| `drive_time` | Per client setting | Travel to/from a job site |
| `errand` | No | Supply runs, hardware store |
| `prep` | No | Loading truck, staging, property walk-through |
| `admin` | No | Invoicing, scheduling, email, bookkeeping |
| `equipment_maint` | No | Tool and equipment servicing |

The billable flag is always set **at the time-entry level** — not locked to the category. Any entry can be overridden.

---

## 5. Dashboard — app.nhs-llc.com

Single-user application. No login screen — protected by environment-level auth or a simple access token.

### 5.1 Overview Tab
- **Clock In / Clock Out widget** — category, client, property, job (optional) selectors; one button to start/stop
- Live elapsed timer visible in the header across all tabs while clocked in
- Four stat cards: Active Jobs | Hours This Week | Billable MTD | Square Unpaid
- Active jobs table: client, property, hours logged, billed value
- Tasks due soon with priority badges
- Mini calendar: job days (green) and property bookings (orange)

### 5.2 Time Tab
- Day-level date navigation
- Daily timeline: visual color-coded bars per entry (7am–7pm)
- Weekly stacked bar chart by category
- Category breakdown donut chart
- **Timesheet Export Panel** ← first-class feature
  - Date range presets: This Week / Last Week / This Month / Last Month / Custom
  - Filter: All clients / specific client / specific property / billable only / specific category
  - **Export CSV** — one row per time entry, columns: `date, day, start, end, duration_min, duration_hr, client, property, job, category, billable, rate, amount, notes`
  - **Export PDF** — formatted timesheet grouped by client → property, subtotals per client, grand total with billable/non-billable breakdown. Suitable for tax records.
- Manual time entry form — for adding past entries
- Job profitability table: job | total hours | billed | effective $/hr | flag if >20% below target

### 5.3 Jobs Tab
- Full job list with filter by status (scheduled / in_progress / complete / cancelled), client, property
- Job detail: description, all linked time entries, linked Square invoice, effective rate
- Create / edit / mark complete
- Recurring job indicator and next scheduled date

### 5.4 Clients Tab
- Client list: name, default rate, hours YTD, billed YTD
- Client detail page: all properties, jobs, time entries, Square invoices, effective rate history

### 5.5 Tasks Tab
- Task list sorted by priority → due date
- Filter by client or property
- One-click complete
- Add task: title (required), priority, due date, client, property, job — all optional except title

### 5.6 Calendar Tab
- Monthly view
- Job days (green dots) and property booking blocks (orange) — useful for tracking when client properties are rented out
- Click any day: see jobs scheduled and time logged
- Add / remove calendar blocks manually or via Discord

### 5.7 Invoices Tab (read-only)
- Invoice list synced from Square: status, client, amount due, due date
- Revenue summary: MTD, YTD, total unpaid
- Link a Square invoice to a specific job for traceability
- Last synced timestamp + manual sync button
- Note: invoices are created and sent in Square — this tab is display only

---

## 6. Discord Bot

One private channel (`#nhs-os`). Only your Discord user ID is authorized.

The bot supports two input modes simultaneously — slash commands for structured operations, plain text for natural field-side logging.

### Slash Commands
| Command | Parameters | Action |
|---|---|---|
| `/clockin` | category, client, property, job (optional) | Start a timer now |
| `/clockout` | notes (optional) | Stop timer, write time entry to database |
| `/log` | duration, category, client (optional), notes | Add a time entry after the fact |
| `/task add` | title, priority (optional), client (optional), property (optional) | Create a task |
| `/task done` | title or ID | Mark a task complete |
| `/block` | property, start date, end date, notes (optional) | Block calendar dates |
| `/status` | — | Current clock-in status + today's summary |
| `/sync` | — | Trigger Square sync manually |

### Plain Text (AI-parsed by Claude)
You talk normally in `#nhs-os`; Claude interprets the message and writes to the database.

| You say | Claude does |
|---|---|
| "Just got back from Home Depot, 40 min supply run" | `log_time: 40min, errand, non-billable` |
| "Done at the Lodge, took about 2.5 hours" | `clock_out + log: 2.5hr, client_work` |
| "Den is booked April 24–26, Henderson family" | `block_calendar: Den, Apr 24–26, notes: Henderson family` |
| "Add order more stain to my list, high priority" | `create_task: high priority, no client` |
| "What did I bill this month?" | `query: billable MTD` |
| "Am I clocked in?" | `query: current timer status` |

---

## 7. Square Integration

Square stays in place for invoicing and payments. This system syncs read-only data on a 30-minute cron (Vercel):

- Pull all invoices and their current status
- Match to clients by email or name
- Display in Invoices tab — no edits, no invoice creation from this side
- Manual link: assign a Square invoice to an NHS job for full job profitability tracking

---

## 8. Export — Replaces Square's Time Reports

This is a first-class feature, not an afterthought. The export fills the hole left by Square's free plan removing time reports.

**CSV export columns:**
```
date, day_of_week, start_time, end_time, duration_minutes, duration_hours,
client, property, job, category, billable, hourly_rate, billable_amount, notes
```

**PDF timesheet layout:**
- Header: business name, date range, total hours, total billable amount
- Grouped by: Client → Property
- Subtotals per client
- Grand total with billable / non-billable breakdown
- Suitable for client billing records and IRS documentation (3-year retention)

**Preset ranges:** This Week, Last Week, This Month, Last Month, Custom Range
**Filter options:** All clients, specific client, specific property, billable only, category filter

---

## 9. Build Order

| Phase | Goal | Deliverable |
|---|---|---|
| **1** | Supabase schema + live data layer | All tables created, API routes replace mock data, clock-out writes real time entries |
| **2** | Complete dashboard | All 7 tabs reading/writing real data, export (CSV + PDF) working |
| **3** | Discord bot | Slash commands + plain text AI parsing wired to Supabase |
| **4** | Square sync | 30-min Vercel cron, invoice matching, Invoices tab live |
| **5** | Polish + automation | Recurring jobs, daily Discord summary, mobile polish |

---

## 10. Environment Variables Required

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key (for API routes + Edge Functions) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `DISCORD_BOT_TOKEN` | Discord bot token |
| `DISCORD_CHANNEL_ID` | ID of the `#nhs-os` channel |
| `DISCORD_USER_ID` | Your Discord user ID (bot only responds to you) |
| `SQUARE_ACCESS_TOKEN` | Square production API key (read-only) |
| `SQUARE_LOCATION_ID` | Your Square business location ID |
