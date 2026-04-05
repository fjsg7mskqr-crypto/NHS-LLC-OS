# NHS-LLC-OS

NHS-LLC operating system for CRM and reporting.

## Assistant MVP

This repo now includes a shared assistant backend for the web app:

- shared domain/action layer in `lib/domain/*` and `lib/assistant/*`
- authenticated assistant API at `app/api/assistant/route.ts`
- service-to-service action execution endpoint at `app/api/assistant/execute/route.ts`
- Discord interactions endpoint at `app/api/discord/interactions/route.ts`
- authenticated slash-command registration endpoint at `app/api/discord/register/route.ts`
- in-app assistant drawer mounted from `app/dashboard/layout.tsx`
- assistant audit log migration plus persistent server-side clock session support

Current parsing is deterministic and intentionally narrow. It supports:

- `get_status`
- `get_hours_summary`
- `get_billable_summary`
- `get_open_tasks`
- `create_task`
- `complete_task`
- `log_time`
- `create_calendar_block`
- `clock_in`
- `clock_out`
- `trigger_square_sync`

## Required Environment Variables

Existing app/runtime variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTHORIZED_GITHUB_LOGINS`
- `ASSISTANT_SERVICE_TOKEN`

Square sync:

- `SQUARE_ACCESS_TOKEN`
- `SQUARE_ENVIRONMENT` with `production` or `sandbox`

Current Discord/runtime variables:

- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_CHANNEL_ID`
- `DISCORD_USER_ID`

Planned next-phase variables for hosted LLM parsing:

- `OPENAI_API_KEY`

## Schema Migrations

Run the Supabase migrations before using assistant writes or server-side clock sessions:

```bash
supabase db push
```

New migration added:

- `supabase/migrations/20260405_create_assistant_events.sql`
- `supabase/migrations/20260405_create_discord_events.sql`

This creates:

- `assistant_events`
- `active_clock_sessions`
- `discord_events`

## Local Run

1. Install dependencies.
2. Configure the environment variables above.
3. Apply Supabase migrations.
4. Start the app:

```bash
npm run dev
```

The assistant is available from the floating launcher inside `/dashboard`.

## Discord Slash Commands

Current Discord work is slash-command only. Plain-text AI message parsing is not implemented yet.

To enable the slash-command surface:

1. Create a Discord application and bot.
2. Configure the Interactions Endpoint URL to:

```text
https://<your-domain>/api/discord/interactions
```

3. Set the Discord environment variables listed above.
4. While signed into the app, register guild commands:

```bash
curl -X POST https://<your-domain>/api/discord/register
```

Supported commands:

- `/clockin`
- `/clockout`
- `/log`
- `/task add`
- `/task done`
- `/block`
- `/status`
- `/sync`

## Recommended Decision

Best current architecture decision:

- Use the main Next.js app for shared assistant actions and slash-command interactions.
- Use a dedicated Node worker for Discord plain-text handling.
- Standardize on OpenAI function calling for natural-language parsing.
- Keep conversation history ephemeral at first.
- Require clarification instead of auto-executing low-confidence writes.
- Keep the dedicated `active_clock_sessions` table.

Why:

- Discord plain-text handling is a long-lived gateway workload.
- Shared action execution is already centralized in the app.
- The worker can stay thin and call `POST /api/assistant/execute`.
- This avoids duplicating mutation logic across runtimes.

Current deployment default for the worker:

- Railway

Worker scaffold:

- `services/discord-bot/README.md`
- `services/discord-bot/package.json`
- `services/discord-bot/src/index.mjs`
- `render.yaml`

Plain-text parsing endpoint:

- `app/api/assistant/parse/route.ts`
- `lib/assistant/openai-parse.ts`

## Verification

Verified for the touched files with:

```bash
npx eslint app/api/assistant/route.ts app/api/clock/route.ts app/api/tasks/route.ts app/api/calendar-blocks/route.ts app/api/stats/route.ts app/api/square/sync/route.ts app/dashboard/layout.tsx lib/assistant/actions.ts lib/assistant/context.ts lib/assistant/format.ts lib/assistant/parser.ts lib/assistant/types.ts lib/domain/time.ts lib/domain/tasks.ts lib/domain/calendar.ts lib/domain/reports.ts lib/domain/square.ts lib/domain/audit.ts components/assistant/AssistantLauncher.tsx components/assistant/AssistantMessage.tsx components/assistant/AssistantPanel.tsx
npx tsc --noEmit
```

Note: `npm run lint` still fails in pre-existing dashboard components unrelated to this assistant slice because of React `set-state-in-effect` rule violations.
