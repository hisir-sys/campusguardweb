import type { Incident } from './types';

export const FRESH_MINUTES = 15;
export const incidentKey = (i: Incident) => `${i.server_id}:${i.incident_id}`;

/**
 * Which incidents should buzz the phone now? Only ones not seen before, still marked NEW and from the last
 * few minutes. The first call (nothing seen yet) only learns what is already there, so opening the app never
 * replays old alerts. `seen` is updated in place.
 */
export function freshIncidents(seen: Set<string>, incidents: Incident[], now = Date.now()): Incident[] {
  const first = seen.size === 0;
  const fresh: Incident[] = [];
  for (const incident of incidents) {
    const key = incidentKey(incident);
    if (seen.has(key)) continue;
    seen.add(key);
    const age = (now - new Date(incident.happened_at).getTime()) / 60000;
    if (!first && incident.status === 'NEW' && age >= 0 && age <= FRESH_MINUTES) fresh.push(incident);
  }
  return fresh;
}

// Same names as the desktop pop-up.
export const LEVEL: Record<string, string> = { LOW: 'Low', MEDIUM: 'Alert', HIGH: 'Critical alert', CRITICAL: 'Danger' };
const HEADLINE: Record<string, string> = { LOW: 'Low alert', MEDIUM: 'Possible fight', HIGH: 'Fight detected', CRITICAL: 'Fight detected' };
const RANK = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const worstOf = (incidents: Incident[]): Incident =>
  [...incidents].sort((a, b) => RANK.indexOf(b.severity) - RANK.indexOf(a.severity))[0];

/** One notification for however many new incidents arrived together. */
export function notificationFor(incidents: Incident[]): { title: string; body: string } | null {
  if (!incidents.length) return null;
  const worst = worstOf(incidents);
  const detail = `${LEVEL[worst.severity] ?? worst.severity} · ${worst.camera_name} · ${Math.round(worst.confidence * 100)}% sure`;
  if (incidents.length === 1) return { title: HEADLINE[worst.severity] ?? 'CampusGuard alert', body: detail };
  return { title: `${incidents.length} new alerts`, body: `Most serious: ${detail}` };
}

/** How many alerts fell in each recent time bucket, oldest first (for the little bar chart). */
export function alertsByBucket(incidents: Incident[], now = Date.now(), buckets = 12, hoursPerBucket = 2): number[] {
  const size = hoursPerBucket * 3600 * 1000;
  const counts = new Array<number>(buckets).fill(0);
  for (const incident of incidents) {
    const age = now - new Date(incident.happened_at).getTime();
    if (!Number.isFinite(age) || age < 0 || age >= size * buckets) continue;
    counts[buckets - 1 - Math.floor(age / size)] += 1;
  }
  return counts;
}

/** Cameras with the most alerts lately, busiest first. */
export function hotspots(incidents: Incident[], now = Date.now(), hours = 24, limit = 3): { camera: string; count: number; worst: Incident['severity'] }[] {
  const since = now - hours * 3600 * 1000;
  const map = new Map<string, { camera: string; count: number; worst: Incident['severity'] }>();
  for (const i of incidents) {
    const at = new Date(i.happened_at).getTime();
    if (!Number.isFinite(at) || at < since) continue;
    const entry = map.get(i.camera_name) ?? { camera: i.camera_name, count: 0, worst: i.severity };
    entry.count += 1;
    if (RANK.indexOf(i.severity) > RANK.indexOf(entry.worst)) entry.worst = i.severity;
    map.set(i.camera_name, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export type GuardLevel = 'unknown' | 'secure' | 'watch' | 'alert';

/** One word for how the campus is doing: a serious unreviewed alert in the last hour, trouble with the system, or all calm. */
export function guardStatus(args: { servers: number; cameras: number; online: number | null; offlineServers: number }, incidents: Incident[], now = Date.now()): GuardLevel {
  if (!args.servers) return 'unknown';
  const recent = incidents.some((i) => i.status === 'NEW' && (i.severity === 'HIGH' || i.severity === 'CRITICAL')
    && now - new Date(i.happened_at).getTime() < 3600 * 1000);
  if (recent) return 'alert';
  if (args.offlineServers > 0 || (args.online !== null && args.online < args.cameras)) return 'watch';
  return 'secure';
}
