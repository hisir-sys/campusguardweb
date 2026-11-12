import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Please sign in first.' })
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(503).json({ error: 'Access checks are temporarily unavailable.' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: auth, error: authError } = await db.auth.getUser(token)
    if (authError || !auth.user) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    const { data: app, error } = await db.from('access_applications')
      .select('status,login_status,payment_status').eq('auth_user_id', auth.user.id).maybeSingle()
    if (error) { console.error('Access status lookup failed:', error.message); return res.status(503).json({ error: 'We could not verify your application status.' }) }
    if (!app) return res.status(403).json({ status: 'missing', login_status: 'pending', payment_status: 'pending', access_granted: false })
    const loginStatus = app.login_status || (app.status === 'approved' ? 'approved' : app.status === 'rejected' ? 'rejected' : 'pending')
    const paymentStatus = app.payment_status || 'pending'
    const accessGranted = loginStatus === 'approved' && paymentStatus === 'approved'
    return res.status(200).json({ status: accessGranted ? 'approved' : (loginStatus === 'rejected' || paymentStatus === 'rejected' ? 'rejected' : 'pending'), login_status: loginStatus, payment_status: paymentStatus, access_granted: accessGranted })
  } catch (error) {
    console.error('Access status check failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'We could not verify your application status.' })
  }
}