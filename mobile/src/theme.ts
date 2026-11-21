// The desktop app's look (graphite glass, quiet colours, one soft blue "lens" for live status).
// No React Native imports here, so the plain logic below can be tested with Node.

export type Palette = {
  name: 'dark' | 'light';
  bg: string; blob: string; surface: string; field: string; line: string;
  text: string; textDim: string; muted: string;
  accent: string; onAccent: string; good: string; warn: string; bad: string; lens: string;
  /** Dark rounded panels (lists, nav), the mint chart panel and the lavender chip: the look of the design reference. */
  spec: string; navGlass: string; glass: string; glassEdge: string; shadow: string;
  ink: string; inkText: string; inkMuted: string; inkLine: string; mint: string; mintBar: string; lav: string; navDot: string;
  severity: Record<string, string>;
};

export const DARK: Palette = {
  name: 'dark', bg: '#050507', blob: 'rgba(255,255,255,0.045)', surface: '#16161A', field: 'rgba(255,255,255,0.06)',
  line: 'rgba(255,255,255,0.09)', text: '#F5F5F7', textDim: 'rgba(235,235,245,0.80)', muted: 'rgba(235,235,245,0.62)',
  accent: '#F5F5F7', onAccent: '#0B0B0E', good: '#8CC9A9', warn: '#D8BA8A', bad: '#E0998D', lens: '#8FA6C8',
  spec: 'rgba(255,255,255,0.16)', navGlass: 'rgba(34,34,40,0.55)', glass: 'rgba(255,255,255,0.07)', glassEdge: 'rgba(255,255,255,0.15)', shadow: 'rgba(0,0,0,0.5)',
  ink: '#26262B', inkText: '#F5F5F7', inkMuted: '#9A9AA2', inkLine: 'rgba(255,255,255,0.08)', mint: 'rgba(90,170,130,0.14)', mintBar: '#9ACDB3', lav: '#2A3042', navDot: '#F5F5F7',
  severity: { LOW: '#8CC9A9', MEDIUM: '#D8BA8A', HIGH: '#D9A57F', CRITICAL: '#E0998D' },
};

export const LIGHT: Palette = {
  name: 'light', bg: '#E8EBF2', blob: 'rgba(0,0,0,0.04)', surface: '#FFFFFF', field: 'rgba(255,255,255,0.6)',
  line: 'rgba(20,24,40,0.09)', text: '#0C0D12', textDim: 'rgba(40,44,60,0.86)', muted: 'rgba(40,44,60,0.66)',
  accent: '#0C0D12', onAccent: '#FFFFFF', good: '#2F7A58', warn: '#86672D', bad: '#B24A3E', lens: '#5B7399',
  spec: 'rgba(255,255,255,0.95)', navGlass: 'rgba(255,255,255,0.62)', glass: 'rgba(255,255,255,0.66)', glassEdge: 'rgba(255,255,255,0.95)', shadow: 'rgba(40,50,90,0.18)',
  ink: '#0C0D12', inkText: '#F5F5F7', inkMuted: '#9A9AA2', inkLine: 'rgba(255,255,255,0.10)', mint: 'rgba(80,170,130,0.16)', mintBar: '#58A785', lav: '#DDE2EE', navDot: '#0C0D12',
  severity: { LOW: '#2F7A58', MEDIUM: '#86672D', HIGH: '#9A5A32', CRITICAL: '#B24A3E' },
};

// Same names as the desktop pop-up.
export const severityLabel: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Alert', HIGH: 'Critical alert', CRITICAL: 'Danger',
};

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export function greeting(hour: number): string {
  return hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** "principal.sharma@school.edu" -> "Principal". Empty when nothing sensible can be made of it. */
export function firstName(email: string): string {
  const local = email.split('@')[0] ?? '';
  const word = local.split(/[._\-+\d]+/).find((part) => part.length > 1) ?? '';
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : '';
}
