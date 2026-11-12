import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!url || !key) return res.status(503).json({ error: 'Download status is not configured.' })
  if (!token) return res.status(401).json({ error: 'Sign in to check download access.' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: auth, error: authError } = await db.auth.getUser(token)
    if (authError || !auth.user) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    const { data: app, error } = await db.from('access_applications').select('login_status,payment_status,status').eq('auth_user_id', auth.user.id).maybeSingle()
    if (error) return res.status(503).json({ error: 'Could not verify your approval status.' })
    const loginStatus = app?.login_status || (app?.status === 'approved' ? 'approved' : app?.status === 'rejected' ? 'rejected' : 'pending')
    const paymentStatus = app?.payment_status || 'pending'
    const approved = loginStatus === 'approved' && paymentStatus === 'approved'
    let downloadAvailable = false
    if (approved) {
      const { data: file } = await db.storage.from('campusguard-downloads').createSignedUrl('CampusGuard.exe', 90)
      downloadAvailable = Boolean(file?.signedUrl)
    }
    return res.status(200).json({ login_status: loginStatus, payment_status: paymentStatus, access_granted: approved, downloadAvailable })
  } catch (e) {
    console.error('Download status failed:', e instanceof Error ? e.message : 'Unknown error')
    return res.status(500).json({ error: 'Could not load download status.' })
  }
}