export type MonitorEventType =
  | "group.member_count_changed"
  | "group.shout_changed"
  | "group.role_changed"
  | "user.presence_changed"
  | "game.stats_changed"
  | "monitor.anomaly"
  | "system.poll_error";

export interface MonitorEvent {
  event_type: MonitorEventType;
  source_type: "group" | "user" | "game" | "system";
  source_id: string;
  title: string;
  summary: string;
  details: Record<string, unknown>;
  occurred_at: string;
}

export interface GroupSnapshot {
  groupId: number;
  name: string;
  memberCount: number;
  shoutText: string | null;
  shoutPosterId: number | null;
}

export interface UserPresenceSnapshot {
  userId: number;
  userName: string;
  userDisplayName: string;
  userPresenceType: number;
  lastLocation: string | null;
}

export interface GameSnapshot {
  universeId: number;
  name: string;
  playing: number;
  visits: number;
  favoritedCount: number;
}

export const csvIds = (value: string | undefined): number[] =>
  (value ?? "").split(",").map(v => Number(v.trim())).filter(v => Number.isSafeInteger(v) && v > 0);

export interface GroupRoleSnapshot {
  groupId: number;
  groupName: string;
  roleId: number;
  roleName: string;
  rank: number;
}
