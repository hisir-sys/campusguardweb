import { createClient } from '@supabase/supabase-js'

async function verifiedOwner(req: any, res: any, db: ReturnType<typeof createClient>) {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (!ownerEmail) { res.status(503).json({ error: 'Admin access is not configured.' }); return false }
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!token) { res.status(401).json({ error: 'Owner sign-in required.' }); return false }
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) { res.status(401).json({ error: 'Invalid owner session.' }); return false }
  if ((data.user.email || '').trim().toLowerCase() !== ownerEmail || !data.user.email_confirmed_at) { res.status(403).json({ error: 'Not authorised as owner.' }); return false }
  return true
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(503).json({ error: 'Download administration is not configured.' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    if (!await verifiedOwner(req, res, db)) return
    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const id = typeof body.id === 'string' ? body.id : '', status = body.status
      const paymentConfirmed = body.payment_confirmed === true
      if (!/^[0-9a-f-]{36}$/i.test(id) || !['approved', 'rejected'].includes(status) || (status === 'approved' && !paymentConfirmed)) return res.status(400).json({ error: 'Confirm payment and choose approve, or choose reject.' })
      const { data, error } = await db.from('download_requests').update({ status, payment_confirmed: status === 'approved', reviewed_at: new Date().toISOString(), reviewed_by: process.env.ADMIN_EMAIL }).eq('id', id).eq('status', 'pending').select('id,status,payment_confirmed').maybeSingle()
      if (error) { console.error('Download approval failed:', error.message); return res.status(500).json({ error: 'Could not update this download request.' }) }
      if (!data) return res.status(409).json({ error: 'This request was already reviewed. Refresh and try again.' })
    }
    const { data, error } = await db.from('download_requests').select('id,user_id,user_email,user_name,product,status,payment_confirmed,owner_note,requested_at,reviewed_at').order('requested_at', { ascending: false }).limit(500)
    if (error) { console.error('Download request list failed:', error.message); return res.status(500).json({ error: 'Could not load download requests. Run the SQL migration first.' }) }
    return res.status(200).json({ requests: data ?? [] })
  } catch (e) { console.error('Download admin API failed:', e instanceof Error ? e.message : 'Unknown error'); return res.status(500).json({ error: 'Download administration failed.' }) }
}
