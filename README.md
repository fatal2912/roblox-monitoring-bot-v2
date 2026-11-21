# Roblox Monitoring Bot V2

A cloud-ready starter monorepo for monitoring public Roblox group/user/game data, sending Discord alerts, and viewing events in a React dashboard.

## Architecture

- `apps/worker`: long-running Node.js worker. Polls configured Roblox resources, normalizes changes, persists snapshots/events to Supabase, and sends configured Discord alerts.
- `apps/dashboard`: React + Vite dashboard. Reads monitoring data through Supabase using the public anon/publishable key and authenticated user session.
- `supabase/migrations`: schema, indexes, and row-level security.
- `packages/shared`: shared TypeScript types and environment parsing.

## Important behavior / limits

- Roblox does not provide a universal public historical event stream for arbitrary groups or users. This bot detects changes by polling public endpoints and comparing snapshots.
- User join/leave monitoring is represented as **online/offline presence transitions** for explicitly configured Roblox user IDs. It does not reveal private server membership or hidden activity.
- Group member-count changes are observed as deltas; they do not identify which member joined/left unless a public, permitted source provides that detail.
- Group role changes are detected for configured watched users in the configured groups by comparing public group-role data.
- Roblox API routes, access rules, and rate limits can change. Keep polling conservative and review Roblox's current terms and API documentation before production use.
- The `games` monitor tracks configured public experiences' public metadata/statistics when available. It does not inspect private game servers.
- “Suspicious events” are configurable operational heuristics (for example, unusually large member-count deltas), not proof of abuse or wrongdoing.

## Requirements

- Node.js 20+
- Supabase project
- Discord application/bot token and a Discord channel ID
- Roblox group ID, watched user IDs, and/or public universe IDs

## Local setup

1. Copy `.env.example` to `.env` and fill in values. Never commit `.env`.
2. Install dependencies: `npm install`
3. Apply `supabase/migrations/0001_initial.sql` in the Supabase SQL editor, or use Supabase CLI migration workflow.
4. Run worker: `npm run dev:worker`
5. Run dashboard: `npm run dev:dashboard`

The dashboard includes email/password sign-in through Supabase Auth. Create an Auth user, then insert its UUID into `public.bot_admins` using the SQL comment at the end of the migration. The dashboard is read-only except for display filters; monitor targets are configured through worker environment variables in this initial release.

## Cloud deployment

Recommended first deployment: a continuously running worker service (Railway, Render Background Worker, Fly.io Machine, or equivalent) plus a static dashboard host (Cloudflare Pages, Vercel, or Netlify).

Deploy `apps/worker` as a persistent process with:
- Build: `npm ci && npm run build --workspace @rbm/worker`
- Start: `npm run start --workspace @rbm/worker`
- Health check: `GET /health` on `PORT` (default 8080)
- Restart policy: on failure
- At least one worker replica initially. Do not run multiple replicas until a distributed lock/leader-election mechanism is added.

Deploy `apps/dashboard` as a static Vite app:
- Build: `npm ci && npm run build --workspace @rbm/dashboard`
- Output: `apps/dashboard/dist`
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or publishable key).

## Secrets

Worker-only secrets:
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_ALERT_CHANNEL_ID`

Never put service-role keys or Discord bot tokens in dashboard variables, frontend code, GitHub, screenshots, or public repositories. Use the hosting provider's encrypted environment-variable settings.

## Monitoring config

Comma-separated values:
- `ROBLOX_GROUP_IDS=123456`
- `ROBLOX_WATCH_USER_IDS=123,456`
- `ROBLOX_UNIVERSE_IDS=1234567`

Polling defaults are deliberately conservative:
- group: 5 minutes
- watched-user presence: 60 seconds
- games: 10 minutes

Do not lower intervals aggressively. Respect Roblox rate limits and back off on 429/5xx responses.

## Event types

- `group.member_count_changed`
- `group.shout_changed`
- `group.role_changed`
- `user.presence_changed`
- `game.stats_changed`
- `monitor.anomaly`
- `system.poll_error`

## Production checklist

- [ ] Rotate any credentials previously pasted into chats or committed to files.
- [ ] Configure Supabase Auth and dashboard admin users.
- [ ] Review RLS policies and test with a non-admin account.
- [ ] Configure Discord bot intents/permissions and restrict the alert channel.
- [ ] Set conservative polling intervals and one worker replica.
- [ ] Add uptime monitoring for `/health`.
- [ ] Add a retention policy for old events and snapshots.
- [ ] Validate Roblox API responses and rate limits before relying on alerts.
