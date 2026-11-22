// Copyright (c) 2026 CampusGuard. All rights reserved. Proprietary and confidential; see LICENSE.
import type { Server } from './types';

/** A school PC that has not reported for this long is shown as offline. */
export const SERVER_STALE_MINUTES = 10;

export type ServerHealth = 'online' | 'degraded' | 'offline';

/** One word for how a school PC is doing, from when it last reported and how many cameras it sees. */
export function serverHealth(server: Server, now = Date.now()): ServerHealth {
  const silentMinutes = (now - new Date(server.last_seen).getTime()) / 60000;
  if (!Number.isFinite(silentMinutes) || silentMinutes > SERVER_STALE_MINUTES) return 'offline';
  if (server.cameras_online !== null && server.cameras_total > 0 && server.cameras_online < server.cameras_total) return 'degraded';
  return 'online';
}

export function totals(servers: Server[], now = Date.now()) {
  let cameras = 0, online = 0, open = 0, offlineServers = 0, onlineKnown = true;
  for (const server of servers) {
    cameras += server.cameras_total;
    open += server.open_incidents;
    if (serverHealth(server, now) === 'offline') { offlineServers += 1; continue; }
    if (server.cameras_online === null) onlineKnown = false; else online += server.cameras_online;
  }
  return { cameras, online, open, offlineServers, onlineKnown };
}
