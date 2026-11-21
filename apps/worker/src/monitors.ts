import type { MonitorEvent, GroupSnapshot, UserPresenceSnapshot, GameSnapshot } from "@rbm/shared";
import { config } from "./config.js";
import { getGroup, getUserPresence, getGame, getUserGroupRoles } from "./roblox.js";
import { readSnapshot, writeSnapshot, recordEvent } from "./store.js";
import { sendAlert } from "./discord.js";
import { logger } from "./logger.js";

const now = () => new Date().toISOString();

async function emit(event: MonitorEvent) {
  await recordEvent(event);
  try { await sendAlert(event); }
  catch (error) { logger.error({ error }, "Discord alert delivery failed"); }
}

async function monitorGroup(id: number) {
  const current: GroupSnapshot = await getGroup(id);
  const previous = await readSnapshot("group", String(id));
  if (previous) {
    const delta = current.memberCount - Number(previous.memberCount ?? current.memberCount);
    if (delta !== 0) {
      await emit({
        event_type: "group.member_count_changed", source_type: "group", source_id: String(id),
        title: `${current.name}: member count changed`,
        summary: `Member count changed from ${previous.memberCount} to ${current.memberCount} (${delta > 0 ? "+" : ""}${delta}).`,
        details: { before: previous.memberCount, after: current.memberCount, delta }, occurred_at: now()
      });
      if (Math.abs(delta) >= config.anomalyThreshold) {
        await emit({
          event_type: "monitor.anomaly", source_type: "group", source_id: String(id),
          title: `${current.name}: unusually large member-count change`,
          summary: `Observed a member-count delta of ${delta}. Review the group activity; this heuristic is not proof of abuse.`,
          details: { delta, threshold: config.anomalyThreshold }, occurred_at: now()
        });
      }
    }
    if ((previous.shoutText ?? null) !== current.shoutText) {
      await emit({
        event_type: "group.shout_changed", source_type: "group", source_id: String(id),
        title: `${current.name}: group shout changed`,
        summary: current.shoutText ? current.shoutText.slice(0, 1500) : "The group shout was cleared.",
        details: { previous: previous.shoutText ?? null, current: current.shoutText, posterId: current.shoutPosterId },
        occurred_at: now()
      });
    }
  }
  await writeSnapshot("group", String(id), current);
}

async function monitorUser(id: number) {
  const current: UserPresenceSnapshot = await getUserPresence(id);
  const previous = await readSnapshot("user", String(id));
  if (previous && Number(previous.userPresenceType) !== current.userPresenceType) {
    const names = ["Offline", "Online", "In Game", "In Studio"];
    const from = names[Number(previous.userPresenceType)] ?? "Unknown";
    const to = names[current.userPresenceType] ?? "Unknown";
    await emit({
      event_type: "user.presence_changed", source_type: "user", source_id: String(id),
      title: `${current.userDisplayName}: presence changed`,
      summary: `${current.userDisplayName} changed from ${from} to ${to}.`,
      details: { from: previous.userPresenceType, to: current.userPresenceType, lastLocation: current.lastLocation },
      occurred_at: now()
    });
  }
  await writeSnapshot("user", String(id), current);

  if (config.groupIds.length > 0) {
    const roles = await getUserGroupRoles(id, config.groupIds);
    const roleKey = `user:${id}:group_roles`;
    const previousRoles = await readSnapshot("user_roles", String(id));
    if (previousRoles) {
      const before = new Map((previousRoles.roles ?? []).map((r: any) => [Number(r.groupId), r]));
      for (const role of roles) {
        const old: any = before.get(role.groupId);
        if (old && (Number(old.roleId) !== role.roleId || Number(old.rank) !== role.rank)) {
          await emit({
            event_type: "group.role_changed", source_type: "group", source_id: String(role.groupId),
            title: `${current.userDisplayName}: group role changed`,
            summary: `${current.userDisplayName} changed from ${old.roleName} (rank ${old.rank}) to ${role.roleName} (rank ${role.rank}) in ${role.groupName}.`,
            details: { userId: id, groupId: role.groupId, previous: old, current: role }, occurred_at: now()
          });
        }
      }
    }
    await writeSnapshot("user_roles", String(id), { roles });
  }
}

async function monitorGame(id: number) {
  const current: GameSnapshot = await getGame(id);
  const previous = await readSnapshot("game", String(id));
  if (previous && (previous.playing !== current.playing || previous.visits !== current.visits)) {
    await emit({
      event_type: "game.stats_changed", source_type: "game", source_id: String(id),
      title: `${current.name}: public statistics changed`,
      summary: `Playing: ${previous.playing} → ${current.playing}. Visits: ${previous.visits} → ${current.visits}.`,
      details: { previous, current }, occurred_at: now()
    });
  }
  await writeSnapshot("game", String(id), current);
}

async function safe(label: string, task: () => Promise<void>) {
  try { await task(); }
  catch (error) {
    logger.error({ error, monitor: label }, "Monitor poll failed");
    try {
      await emit({
        event_type: "system.poll_error", source_type: "system", source_id: label,
        title: `Monitoring poll failed: ${label}`,
        summary: error instanceof Error ? error.message : String(error),
        details: {}, occurred_at: now()
      });
    } catch (writeError) { logger.error({ error: writeError }, "Could not persist poll error"); }
  }
}

export async function runGroupPoll() {
  for (const id of config.groupIds) await safe(`group:${id}`, () => monitorGroup(id));
}
export async function runPresencePoll() {
  for (const id of config.watchedUserIds) await safe(`user:${id}`, () => monitorUser(id));
}
export async function runGamePoll() {
  for (const id of config.universeIds) await safe(`game:${id}`, () => monitorGame(id));
}
