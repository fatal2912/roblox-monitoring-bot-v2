import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { config } from "./config.js";
import type { MonitorEvent } from "@rbm/shared";
import { logger } from "./logger.js";

export const discord = new Client({ intents: [GatewayIntentBits.Guilds] });

export async function startDiscord() {
  discord.once("ready", () => logger.info(`Discord connected as ${discord.user?.tag}`));
  await discord.login(config.discordToken);
}

export async function sendAlert(event: MonitorEvent) {
  const channel = await discord.channels.fetch(config.discordChannelId);
  if (!channel?.isTextBased() || !("send" in channel)) {
    logger.warn({ channelId: config.discordChannelId }, "Alert channel unavailable or not text based");
    return;
  }
  const embed = new EmbedBuilder()
    .setTitle(event.title.slice(0, 256))
    .setDescription(event.summary.slice(0, 4000))
    .addFields(
      { name: "Event", value: event.event_type, inline: true },
      { name: "Source", value: `${event.source_type}:${event.source_id}`, inline: true }
    )
    .setTimestamp(new Date(event.occurred_at));
  await channel.send({ embeds: [embed] });
}
