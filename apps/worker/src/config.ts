import "dotenv/config";
import { csvIds } from "@rbm/shared";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};
const positiveMs = (name: string, fallback: number) => {
  const n = Number(process.env[name] ?? fallback);
  return Number.isFinite(n) && n >= 15_000 ? n : fallback;
};

export const config = {
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  discordToken: required("DISCORD_BOT_TOKEN"),
  discordChannelId: required("DISCORD_ALERT_CHANNEL_ID"),
  groupIds: csvIds(process.env.ROBLOX_GROUP_IDS),
  watchedUserIds: csvIds(process.env.ROBLOX_WATCH_USER_IDS),
  universeIds: csvIds(process.env.ROBLOX_UNIVERSE_IDS),
  groupInterval: positiveMs("GROUP_POLL_INTERVAL_MS", 300_000),
  presenceInterval: positiveMs("PRESENCE_POLL_INTERVAL_MS", 60_000),
  gameInterval: positiveMs("GAME_POLL_INTERVAL_MS", 600_000),
  port: Number(process.env.PORT ?? 8080),
  anomalyThreshold: Number(process.env.ANOMALY_MEMBER_DELTA_THRESHOLD ?? 100)
};
