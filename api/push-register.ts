import { createClient } from '@supabase/supabase-js'
import { tooManyRequests, withinLimit } from './_guard.js'

// A Firebase (FCM) registration token.
const TOKEN = /^[A-Za-z0-9_:.-]{50,4096}$/

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'POST' && req.method !== 'DELETE') { res.setHeader('Allow', 'POST, DELETE'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(503).json({ error: 'Alerts are not configured.' })
  const bearer = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!bearer) return res.status(401).json({ error: 'Sign in first.' })
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return null } })() : req.body
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!TOKEN.test(token)) return res.status(400).json({ error: 'Invalid device token.' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: auth, error: authError } = await db.auth.getUser(bearer)
    if (authError || !auth.user) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    if (!await withinLimit(db, req, 'push-register', 60, 3600, auth.user.id)) return tooManyRequests(res, 600)

    if (req.method === 'DELETE') {
      const { error } = await db.from('push_devices').delete().eq('token', token).eq('user_id', auth.user.id)
      if (error) return res.status(500).json({ error: 'Could not remove this phone.' })
      return res.status(200).json({ ok: true })
    }

    const { data: access, error: accessError } = await db.from('access_applications').select('login_status,payment_status,status').eq('auth_user_id', auth.user.id).maybeSingle()
    if (accessError) return res.status(503).json({ error: 'Could not verify your account.' })
    const loginApproved = access?.login_status === 'approved' || (!access?.login_status && access?.status === 'approved')
    if (!loginApproved || access?.payment_status !== 'approved') return res.status(403).json({ error: 'Both login and payment approvals are required for CampusGuard access.' })

    const platform = body?.platform === 'ios' ? 'ios' : 'android'
    // upsert on the token: a phone that signs in as someone else moves to that account.
    const { error } = await db.from('push_devices').upsert({ token, user_id: auth.user.id, platform, last_seen: new Date().toISOString() }, { onConflict: 'token' })
    if (error) { console.error('Push register failed:', error.message); return res.status(500).json({ error: 'Could not register this phone.' }) }
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Push register failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'Could not register this phone.' })
  }
}
