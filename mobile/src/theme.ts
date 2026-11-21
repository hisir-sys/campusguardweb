// The desktop app's look (graphite glass, quiet colours, one soft blue "lens" for live status).
// No React Native imports here, so the plain logic below can be tested with Node.

export type Palette = {
  name: 'dark' | 'light';
  bg: string; blob: string; surface: string; field: string; line: string;
  text: string; textDim: string; muted: string;
  accent: string; onAccent: string; good: string; warn: string; bad: string; lens: string;
  severity: Record<string, string>;
};

export const DARK: Palette = {
  name: 'dark', bg: '#0A0A0B', blob: 'rgba(255,255,255,0.045)', surface: '#1B1B1E', field: 'rgba(255,255,255,0.06)',
  line: 'rgba(255,255,255,0.10)', text: '#F5F5F7', textDim: '#C4C4CB', muted: '#9A9AA2',
  accent: '#F5F5F7', onAccent: '#0A0A0B', good: '#8FCFA9', warn: '#E3B872', bad: '#E58B76', lens: '#8FA6C8',
  severity: { LOW: '#8DB4A0', MEDIUM: '#C4B085', HIGH: '#C79A7E', CRITICAL: '#C58790' },
};

export const LIGHT: Palette = {
  name: 'light', bg: '#E4E4E7', blob: 'rgba(0,0,0,0.04)', surface: '#FFFFFF', field: 'rgba(0,0,0,0.05)',
  line: 'rgba(0,0,0,0.08)', text: '#0B0B0D', textDim: '#3A3A40', muted: '#6B6B73',
  accent: '#0B0B0D', onAccent: '#FFFFFF', good: '#2F7D57', warn: '#94610F', bad: '#B4412F', lens: '#5B7399',
  severity: { LOW: '#3F6B57', MEDIUM: '#75613A', HIGH: '#85553A', CRITICAL: '#8B4048' },
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
