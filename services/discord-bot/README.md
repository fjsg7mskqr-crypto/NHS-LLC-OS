# Discord Worker

This worker is the recommended runtime for Discord plain-text handling.

## Why a separate worker

- Discord plain-text bot behavior is gateway-oriented and long-lived.
- Supabase Edge Functions are a poor fit for a persistent Discord gateway client.
- The worker should stay thin and call the shared assistant backend over HTTP.

## Recommended deployment

- Railway

Railway is the current default choice for this repo.

## Environment Variables

- `DISCORD_BOT_TOKEN`
- `DISCORD_CHANNEL_ID`
- `DISCORD_USER_ID`
- `DISCORD_APPLICATION_ID`
- `ASSISTANT_BASE_URL`
- `ASSISTANT_SERVICE_TOKEN`
- `OPENAI_API_KEY`

## Install

```bash
cd services/discord-bot
npm install
```

## Run

```bash
npm run dev
```

## Railway Deploy

Deploy this worker as a separate Railway service.

Service settings:

- Root directory: `services/discord-bot`
- Build command: `npm install`
- Start command: `npm run start`

Required env vars:

- `DISCORD_BOT_TOKEN`
- `DISCORD_CHANNEL_ID`
- `DISCORD_USER_ID`
- `ASSISTANT_BASE_URL`
- `ASSISTANT_SERVICE_TOKEN`
- `OPENAI_API_KEY`

Optional:

- `DISCORD_APPLICATION_ID`

## Contract

The worker should never write operational data directly. It should call:

- `POST /api/assistant/execute` for structured action execution
- `POST /api/assistant/parse` for plain-text parsing backed by OpenAI function calling

## Status

This folder is scaffolded. Slash commands already work through the main app's Discord interactions route. This worker is for plain-text messages in the private channel.
