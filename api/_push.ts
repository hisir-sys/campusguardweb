// Copyright (c) 2026 CampusGuard. All rights reserved. Proprietary and confidential; see LICENSE.
/**
 * Sends phone notifications straight through Firebase Cloud Messaging (HTTP v1).
 * Needs the env var FIREBASE_SERVICE_ACCOUNT (the service-account JSON). Never throws:
 * a failed push must not fail a sync.
 */
import { createSign } from 'node:crypto'

export type NewIncident = { camera_name: string; severity: string; confidence: number; event: string }

// Same names as the desktop pop-up and the phone app.
const LEVEL: Record<string, string> = { LOW: 'Low', MEDIUM: 'Alert', HIGH: 'Critical alert', CRITICAL: 'Danger' }
const HEADLINE: Record<string, string> = { LOW: 'Low alert', MEDIUM: 'Possible fight', HIGH: 'Fight detected', CRITICAL: 'Fight detected' }
const RANK = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

/** Several new incidents in one sync become one notification, so a busy moment does not flood the phone. */
export function messageFor(incidents: NewIncident[]): { title: string; body: string } | null {
  if (!incidents.length) return null
  const worst = [...incidents].sort((a, b) => RANK.indexOf(b.severity) - RANK.indexOf(a.severity))[0]
  const detail = `${LEVEL[worst.severity] ?? worst.severity} · ${worst.camera_name} · ${Math.round(worst.confidence * 100)}% sure`
  if (incidents.length === 1) return { title: HEADLINE[worst.severity] ?? 'CampusGuard alert', body: detail }
  return { title: `${incidents.length} new alerts`, body: `Most serious: ${detail}` }
}

type ServiceAccount = { project_id: string; client_email: string; private_key: string }

export function readServiceAccount(raw = process.env.FIREBASE_SERVICE_ACCOUNT): ServiceAccount | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      return { project_id: parsed.project_id, client_email: parsed.client_email, private_key: String(parsed.private_key).replace(/\\n/g, '\n') }
    }
  } catch { /* fall through */ }
  return null
}

const b64url = (value: Buffer | string) => Buffer.from(value).toString('base64url')

export function signJwt(account: ServiceAccount, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }))
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.private_key)
  return `${header}.${claims}.${b64url(signature)}`
}

let cached: { token: string; expires: number } | null = null

async function accessToken(account: ServiceAccount): Promise<string | null> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(account) }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) { console.error('Firebase sign-in failed:', response.status); return null }
  const body = await response.json() as { access_token?: string; expires_in?: number }
  if (!body.access_token) return null
  cached = { token: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 }
  return cached.token
}

/** Returns the tokens Firebase says no longer exist, so the caller can delete them. */
export async function sendPush(tokens: string[], message: { title: string; body: string } | null): Promise<string[]> {
  if (!tokens.length || !message) return []
  const account = readServiceAccount()
  if (!account) { console.error('Push skipped: FIREBASE_SERVICE_ACCOUNT is not set or is not valid JSON.'); return [] }
  try {
    const bearer = await accessToken(account)
    if (!bearer) return []
    const dead: string[] = []
    await Promise.all(tokens.map(async token => {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
        body: JSON.stringify({ message: {
          token,
          notification: { title: message.title, body: message.body },
          android: { priority: 'HIGH', notification: { channel_id: 'alerts', sound: 'default' } },
          data: { type: 'incident' },
        } }),
        signal: AbortSignal.timeout(8000),
      })
      if (response.ok) return
      const text = await response.text().catch(() => '')
      if (response.status === 404 || /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/.test(text)) dead.push(token)
      else console.error('Push send failed:', response.status, text.slice(0, 200))
    }))
    return dead
  } catch (error) {
    console.error('Push send failed:', error instanceof Error ? error.message : 'Unknown error')
    return []
  }
}
