import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(503).json({ error: 'Download request storage is not configured.' })
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Sign in to apply for a download.' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: auth, error: authError } = await db.auth.getUser(token)
    if (authError || !auth.user?.email) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    const { data: access, error: accessError } = await db.from('access_applications').select('status,name').eq('auth_user_id', auth.user.id).maybeSingle()
    if (accessError) return res.status(503).json({ error: 'Could not verify your approved account.' })
    if (access?.status !== 'approved') return res.status(403).json({ error: 'Your account must be approved before requesting a download.' })
    if (req.method === 'POST') {
      const { data: existing, error: lookupError } = await db.from('download_requests').select('id,status,requested_at').eq('user_id', auth.user.id).order('requested_at', { ascending: false }).limit(1).maybeSingle()
      if (lookupError) return res.status(500).json({ error: 'Could not check your existing download request.' })
      if (existing?.status === 'pending' || existing?.status === 'approved') return res.status(200).json({ request: existing, message: existing.status === 'approved' ? 'Your download request is approved.' : 'Your request is already awaiting owner review.' })
      const { data, error } = await db.from('download_requests').insert({ user_id: auth.user.id, user_email: auth.user.email, user_name: access.name || auth.user.user_metadata?.full_name || null }).select('id,status,requested_at').single()
      if (error) { console.error('Download request insert failed:', error.message); return res.status(500).json({ error: 'Could not submit your download request. Please try again.' }) }
      return res.status(201).json({ request: data, message: 'Download request submitted for owner review.' })
    }
    const { data: requests, error } = await db.from('download_requests').select('id,status,requested_at,reviewed_at').eq('user_id', auth.user.id).order('requested_at', { ascending: false }).limit(1)
    if (error) return res.status(500).json({ error: 'Could not load your download request.' })
    const request = requests?.[0] ?? null
    let downloadAvailable = false
    if (request?.status === 'approved') {
      const { data: file } = await db.storage.from('campusguard-downloads').createSignedUrl('CampusGuard.exe', 90)
      downloadAvailable = Boolean(file?.signedUrl)
    }
    return res.status(200).json({ request, downloadAvailable })
  } catch (e) { console.error('Download request API failed:', e instanceof Error ? e.message : 'Unknown error'); return res.status(500).json({ error: 'Download request service failed.' }) }
}
