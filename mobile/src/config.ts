export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

/** How often the open app refreshes (push covers the time it is closed). */
export const REFRESH_SECONDS = 15;
