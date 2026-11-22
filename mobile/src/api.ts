// Copyright (c) 2026 CampusGuard. All rights reserved. Proprietary and confidential; see LICENSE.
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { API_BASE, SUPABASE_KEY, SUPABASE_URL } from './config';
import { secureStorage } from './storage';
import type { Profile, SyncData } from './types';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Refresh the sign-in only while the app is on screen.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call(path: string, init: RequestInit = {}): Promise<any> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('Sign in first.', 401);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  } catch {
    throw new ApiError('No connection. Check your internet and try again.', 0);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(typeof body?.error === 'string' ? body.error : 'Something went wrong.', response.status);
  return body;
}

export const fetchSyncData = (): Promise<SyncData> => call('/api/sync-data');

export const registerPushToken = (token: string, platform: string) =>
  call('/api/push-register', { method: 'POST', body: JSON.stringify({ token, platform }) });

export const unregisterPushToken = (token: string) =>
  call('/api/push-register', { method: 'DELETE', body: JSON.stringify({ token }) });

export const fetchProfile = (): Promise<Profile> => call('/api/profile');

export const saveProfile = (details: Pick<Profile, 'full_name' | 'school_name' | 'phone' | 'alert_phones'>): Promise<Profile> =>
  call('/api/profile', { method: 'PUT', body: JSON.stringify(details) });
