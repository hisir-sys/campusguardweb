import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(503).json({ error: 'Sync storage is not configured.' })
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Sign in first.' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: auth, error: authError } = await db.auth.getUser(token)
    if (authError || !auth.user) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    const { data: access } = await db.from('access_applications').select('status').eq('auth_user_id', auth.user.id).maybeSingle()
    if (access?.status !== 'approved') return res.status(403).json({ error: 'Your account is not approved.' })
    const [servers, incidents] = await Promise.all([
      db.from('school_servers').select('server_id,server_name,app_version,cameras_total,cameras_ai_enabled,cameras_online,open_incidents,last_seen').eq('user_id', auth.user.id).order('server_name'),
      db.from('school_incidents').select('server_id,incident_id,camera_name,happened_at,event,confidence,severity,status,has_footage').eq('user_id', auth.user.id).order('happened_at', { ascending: false }).limit(100),
    ])
    if (servers.error || incidents.error) return res.status(500).json({ error: 'Could not load synced data.' })
    return res.status(200).json({ servers: servers.data ?? [], incidents: incidents.data ?? [] })
  } catch (error) {
    console.error('Sync data failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'Could not load synced data.' })
  }
}
