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
