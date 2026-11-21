import type { GroupSnapshot, UserPresenceSnapshot, GameSnapshot } from "@rbm/shared";

const BASE = "https://groups.roblox.com";
const USERS = "https://users.roblox.com";
const PRESENCE = "https://presence.roblox.com";
const GAMES = "https://games.roblox.com";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": "RobloxMonitoringBotV2/2.0" } });
  if (response.status === 429) throw new Error(`Roblox rate limited request: ${url}`);
  if (!response.ok) throw new Error(`Roblox API ${response.status} for ${url}`);
  return response.json() as Promise<T>;
}

export async function getGroup(groupId: number): Promise<GroupSnapshot> {
  const [group, shout] = await Promise.all([
    getJson<any>(`${BASE}/v1/groups/${groupId}`),
    getJson<any>(`${BASE}/v1/groups/${groupId}`).catch(() => null)
  ]);
  return {
    groupId,
    name: String(group.name ?? `Group ${groupId}`),
    memberCount: Number(group.memberCount ?? 0),
    shoutText: shout?.shout?.body ?? null,
    shoutPosterId: shout?.shout?.poster?.userId ?? null
  };
}

export async function getUserPresence(userId: number): Promise<UserPresenceSnapshot> {
  const [user, presence] = await Promise.all([
    getJson<any>(`${USERS}/v1/users/${userId}`),
    fetch(`${PRESENCE}/v1/presence/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "RobloxMonitoringBotV2/2.0" },
      body: JSON.stringify({ userIds: [userId] })
    }).then(async r => {
      if (r.status === 429) throw new Error("Roblox presence API rate limited");
      if (!r.ok) throw new Error(`Roblox presence API ${r.status}`);
      return r.json();
    })
  ]);
  const p = presence.userPresences?.[0] ?? {};
  return {
    userId,
    userName: String(user.name ?? `User ${userId}`),
    userDisplayName: String(user.displayName ?? user.name ?? `User ${userId}`),
    userPresenceType: Number(p.userPresenceType ?? 0),
    lastLocation: p.lastLocation || null
  };
}

export async function getGame(universeId: number): Promise<GameSnapshot> {
  const data = await getJson<any>(`${GAMES}/v1/games?universeIds=${universeId}`);
  const g = data.data?.[0] ?? {};
  return {
    universeId,
    name: String(g.name ?? `Universe ${universeId}`),
    playing: Number(g.playing ?? 0),
    visits: Number(g.visits ?? 0),
    favoritedCount: Number(g.favoritedCount ?? 0)
  };
}


export async function getUserGroupRoles(userId: number, targetGroupIds: number[]) {
  const data = await getJson<any>(`${BASE}/v2/users/${userId}/groups/roles`);
  const rows = Array.isArray(data.data) ? data.data : [];
  return rows.filter((row: any) => targetGroupIds.includes(Number(row.group?.id))).map((row: any) => ({
    groupId: Number(row.group.id),
    groupName: String(row.group.name ?? `Group ${row.group.id}`),
    roleId: Number(row.role?.id ?? 0),
    roleName: String(row.role?.name ?? "Unknown"),
    rank: Number(row.role?.rank ?? 0)
  }));
}
