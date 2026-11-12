import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!url || !key) return res.status(503).json({ error: 'Download service is not configured.' })
  if (!token) return res.status(401).json({ error: 'Sign in to download.' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: auth, error: authError } = await db.auth.getUser(token)
    if (authError || !auth.user) return res.status(401).json({ error: 'Your session is invalid.' })
    const { data: app, error } = await db.from('access_applications').select('login_status,payment_status,status').eq('auth_user_id', auth.user.id).maybeSingle()
    if (error) return res.status(503).json({ error: 'Could not verify your approvals.' })
    const loginApproved = app?.login_status === 'approved' || (!app?.login_status && app?.status === 'approved')
    if (!loginApproved || app?.payment_status !== 'approved') return res.status(403).json({ error: 'Both login and payment approvals are required before downloading CampusGuard.' })
    const { data: file, error: fileError } = await db.storage.from('campusguard-downloads').createSignedUrl('CampusGuard.exe', 90, { download: 'CampusGuard.exe' })
    if (fileError || !file?.signedUrl) return res.status(503).json({ error: 'The private installer is not uploaded yet. Please contact the owner.' })
    return res.status(200).json({ url: file.signedUrl })
  } catch (e) { console.error('Secure download failed:', e instanceof Error ? e.message : 'Unknown error'); return res.status(500).json({ error: 'Could not create a secure download link.' }) }
}