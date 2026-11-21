import express from "express";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { startDiscord, discord } from "./discord.js";
import { runGroupPoll, runPresencePoll, runGamePoll } from "./monitors.js";

const app = express();
let startedAt = Date.now();
let lastPoll = { groups: null as string | null, presence: null as string | null, games: null as string | null };

app.get("/health", (_req, res) => res.json({
  status: "ok", uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  discordReady: discord.isReady(), lastPoll
}));
app.listen(config.port, () => logger.info({ port: config.port }, "Health server listening"));

async function tick(label: keyof typeof lastPoll, task: () => Promise<void>) {
  await task();
  lastPoll[label] = new Date().toISOString();
}
async function loop(label: keyof typeof lastPoll, interval: number, task: () => Promise<void>) {
  const run = async () => {
    try { await tick(label, task); }
    catch (error) { logger.error({ error, label }, "Poll cycle failed"); }
    setTimeout(run, interval);
  };
  await run();
}

await startDiscord();
logger.info("Roblox Monitoring Bot V2 worker started");
await Promise.all([
  loop("groups", config.groupInterval, runGroupPoll),
  loop("presence", config.presenceInterval, runPresencePoll),
  loop("games", config.gameInterval, runGamePoll)
]);

process.on("SIGTERM", async () => { logger.info("SIGTERM received; shutting down"); await discord.destroy(); process.exit(0); });
process.on("SIGINT", async () => { logger.info("SIGINT received; shutting down"); await discord.destroy(); process.exit(0); });
