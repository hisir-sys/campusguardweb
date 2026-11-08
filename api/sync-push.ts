import { createClient } from '@supabase/supabase-js'

const SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const count = (value: unknown) => (Number.isFinite(Number(value)) ? Math.max(0, Math.min(100000, Math.trunc(Number(value)))) : 0)

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }) }

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(503).json({ error: 'Sync storage is not configured.' })
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Sign in first.' })

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return null } })() : req.body
  const server = body?.server
  const incidents: any[] = Array.isArray(body?.incidents) ? body.incidents.slice(0, 200) : []
  const serverId = text(server?.server_id, 80)
  if (!serverId) return res.status(400).json({ error: 'Missing server id.' })

  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: auth, error: authError } = await db.auth.getUser(token)
    if (authError || !auth.user) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    const { data: access, error: accessError } = await db.from('access_applications').select('status').eq('auth_user_id', auth.user.id).maybeSingle()
    if (accessError) return res.status(503).json({ error: 'Could not verify your account.' })
    if (access?.status !== 'approved') return res.status(403).json({ error: 'Your account is not approved.' })

    const now = new Date().toISOString()
    const online = server?.cameras_online
    const { error: serverError } = await db.from('account_servers').upsert({
      user_id: auth.user.id, server_id: serverId, server_name: text(server?.server_name, 60) || serverId,
      app_version: text(server?.version, 40) || null,
      cameras_total: count(server?.cameras_total), cameras_ai_enabled: count(server?.cameras_ai_enabled),
      cameras_online: online === null || online === undefined ? null : count(online),
      open_incidents: count(server?.open_incidents), last_seen: now,
    }, { onConflict: 'user_id,server_id' })
    if (serverError) { console.error('Server upsert failed:', serverError.message); return res.status(500).json({ error: 'Could not save sync data.' }) }

    const rows = incidents.flatMap(item => {
      const incidentId = text(item?.incident_id, 40)
      const happened = new Date(String(item?.happened_at ?? ''))
      const severity = text(item?.severity, 12).toUpperCase()
      const confidence = Number(item?.confidence)
      if (!incidentId || Number.isNaN(happened.getTime()) || !SEVERITIES.has(severity) || !Number.isFinite(confidence)) return []
      return [{
        user_id: auth.user!.id, server_id: serverId, incident_id: incidentId,
        camera_name: text(item?.camera_name, 80) || 'Camera', happened_at: happened.toISOString(),
        event: text(item?.event, 60) || 'Fight', confidence: Math.max(0, Math.min(1, confidence > 1 ? confidence / 100 : confidence)),
        severity, status: text(item?.status, 20) || 'NEW', has_footage: item?.has_footage === true,
        source_seq: count(item?.seq), updated_at: now,
      }]
    })
    if (rows.length) {
      const { error } = await db.from('account_incidents').upsert(rows, { onConflict: 'user_id,server_id,incident_id' })
      if (error) { console.error('Incident upsert failed:', error.message); return res.status(500).json({ error: 'Could not save incidents.' }) }
    }
    return res.status(200).json({ ok: true, accepted: rows.length })
  } catch (error) {
    console.error('Sync push failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'Sync failed.' })
  }
}
