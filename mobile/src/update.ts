// Copyright (c) 2026 CampusGuard. All rights reserved. Proprietary and confidential; see LICENSE.
// Update check against the GitHub releases of this project. No React Native imports, so it can be tested with Node.

export const RELEASES_URL = 'https://api.github.com/repos/hisir-sys/campusguardweb/releases?per_page=10';

export type UpdateInfo = { version: string; apkUrl: string; sizeMb: number; notes: string };

/** "mobile-v1.3.0" or "1.3.0" -> [1, 3, 0]; null when it is not a version. */
export function parseVersion(text: string): number[] | null {
  const match = /^(?:mobile-)?v?(\d+)\.(\d+)\.(\d+)$/.exec(text.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate), b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

type Release = { tag_name?: string; draft?: boolean; prerelease?: boolean; body?: string; assets?: Array<{ name?: string; size?: number; browser_download_url?: string }> };

/** The newest mobile release that is newer than `current` and has an .apk attached, or null. */
export function pickUpdate(releases: Release[], current: string): UpdateInfo | null {
  let best: UpdateInfo | null = null;
  for (const release of releases) {
    if (release.draft || release.prerelease || !release.tag_name || !parseVersion(release.tag_name)) continue;
    const version = release.tag_name.replace(/^mobile-v?/, '');
    if (!isNewer(version, current) || (best && !isNewer(version, best.version))) continue;
    const apk = release.assets?.find((a) => a.name?.endsWith('.apk') && a.browser_download_url?.startsWith('https://'));
    if (!apk) continue;
    best = { version, apkUrl: apk.browser_download_url as string, sizeMb: Math.round(((apk.size ?? 0) / 1e6) * 10) / 10, notes: (release.body ?? '').trim() };
  }
  return best;
}

export async function checkForUpdate(current: string): Promise<UpdateInfo | null> {
  try {
    const response = await fetch(RELEASES_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return null;
    return pickUpdate(await response.json(), current);
  } catch {
    return null; // offline or rate-limited: try again later
  }
}
