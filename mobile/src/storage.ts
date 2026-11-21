import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore keeps small values only, and a sign-in session is bigger, so it is stored in pieces.
const CHUNK = 1800;
const key = (name: string, index: number) => `${name.replace(/[^A-Za-z0-9._-]/g, '_')}.${index}`;

async function getItem(name: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return globalThis.localStorage?.getItem(name) ?? null; } catch { return null; }
  }
  const count = Number(await SecureStore.getItemAsync(key(name, -1)));
  if (!Number.isFinite(count) || count <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(key(name, i));
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function removeItem(name: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { globalThis.localStorage?.removeItem(name); } catch { /* ignore */ }
    return;
  }
  const count = Number(await SecureStore.getItemAsync(key(name, -1))) || 0;
  for (let i = 0; i < count; i += 1) await SecureStore.deleteItemAsync(key(name, i));
  await SecureStore.deleteItemAsync(key(name, -1));
}

async function setItem(name: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { globalThis.localStorage?.setItem(name, value); } catch { /* ignore */ }
    return;
  }
  await removeItem(name);
  const pieces = Math.ceil(value.length / CHUNK);
  for (let i = 0; i < pieces; i += 1) {
    await SecureStore.setItemAsync(key(name, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
  }
  await SecureStore.setItemAsync(key(name, -1), String(pieces));
}

export const secureStorage = { getItem, setItem, removeItem };
