# Deployment runbook

## 1. Create a private Git repository
Upload this project to a private GitHub repository. Do not upload `.env` or secrets.

## 2. Supabase
1. Open the intended Supabase project.
2. Apply `supabase/migrations/0001_initial.sql`.
3. Confirm RLS is enabled on both tables.
4. Enable Supabase Auth and create an administrator account.
5. If dashboard reads fail, check Data API exposure and the `authenticated` SELECT grant/policy.
6. Keep the service-role key only in the worker's cloud environment.

## 3. Discord
1. Create a Discord application and bot in the Developer Portal.
2. Invite it to your server with View Channel and Send Messages permissions in the alert channel.
3. Copy the bot token into the cloud worker's `DISCORD_BOT_TOKEN` secret.
4. Copy the target channel ID into `DISCORD_ALERT_CHANNEL_ID`.
5. Do not publish the token or grant Administrator permission unless truly required.

## 4. Worker host
Create a persistent/background worker from the private repository.
- Root: repository root
- Build: `npm ci && npm run build:worker`
- Start: `npm run start --workspace @rbm/worker`
- Health path: `/health`
- Port: `8080` (or provider-injected `PORT`)
- Replicas: 1
Add the worker environment variables from `.env.example`.

## 5. Dashboard host
Create a static site from the same repository.
- Build: `npm ci && npm run build:dashboard`
- Output directory: `apps/dashboard/dist`
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
Do not set service-role or Discord secrets in the dashboard environment.

## 6. Smoke tests
- Visit worker `/health`; expect JSON with `status: "ok"`.
- Confirm Discord bot appears online.
- Confirm a baseline snapshot is created for each configured target.
- Make a harmless test change (e.g. group shout) and verify one event row and one Discord alert.
- Confirm dashboard displays events after signing in.
- Check logs for HTTP 429 and increase polling intervals if rate-limited.

## Known next implementation steps
- Add Roblox group membership/role lookups for configured watched users using currently supported public endpoints.
- Add per-event Discord channel routing and configurable notification preferences.
- Add dashboard Auth UI, monitor-target CRUD, alert rules, pagination, and realtime subscriptions.
- Add distributed lease/lock before enabling more than one worker replica.
- Add retry queue/outbox for Discord delivery, exponential backoff, and event deduplication.
- Add integration tests with mocked Roblox API responses.
